import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/database';
import { body, param, query, validationResult } from 'express-validator';
import { Logger } from '../utils/logger';
import { getErrorMessage } from '../utils/type-helpers';

const router = Router();
// Using shared prisma instance from lib/database
const logger = new Logger('InteractionRoutes');

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// GET /api/interactions - List interactions with filtering
router.get('/', [
  query('sessionId').optional().isUUID(),
  query('type').optional().isIn(['CLICK', 'INPUT', 'SCROLL', 'NAVIGATION', 'HOVER', 'FOCUS', 'BLUR', 'FORM_SUBMIT', 'KEY_PRESS', 'DRAG', 'DROP', 'TOUCH']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 1000 }),
  query('startTime').optional().isISO8601(),
  query('endTime').optional().isISO8601(),
  query('minConfidence').optional().isFloat({ min: 0, max: 1 })
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const {
      sessionId,
      type,
      page = 1,
      limit = 100,
      startTime,
      endTime,
      minConfidence
    } = req.query;

    // Build filter conditions
    const where: any = {};
    
    if (sessionId) where.sessionId = sessionId;
    if (type) where.type = type;
    if (minConfidence) where.confidence = { gte: parseFloat(minConfidence as string) };
    
    if (startTime || endTime) {
      where.timestamp = {};
      if (startTime) where.timestamp.gte = BigInt(new Date(startTime as string).getTime());
      if (endTime) where.timestamp.lte = BigInt(new Date(endTime as string).getTime());
    }

    // Get total count for pagination
    const totalCount = await prisma.interaction.count({ where });

    // Get interactions with pagination
    const interactions = await prisma.interaction.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        relatedScreenshots: {
          select: {
            id: true,
            eventType: true,
            s3Key: true,
            quality: true
          }
        }
      }
    });

    // Convert BigInt timestamps to numbers for JSON serialization
    const serializedInteractions = interactions.map(interaction => ({
      ...interaction,
      timestamp: Number(interaction.timestamp)
    }));

    res.json({
      success: true,
      data: {
        interactions: serializedInteractions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / Number(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Failed to list interactions', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list interactions',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/interactions/:id - Get specific interaction
router.get('/:id', [
  param('id').isUUID()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const interaction = await prisma.interaction.findUnique({
      where: { id },
      include: {
        session: {
          select: {
            id: true,
            type: true,
            status: true,
            qualityScore: true
          }
        },
        relatedScreenshots: true
      }
    });

    if (!interaction) {
      return res.status(404).json({
        success: false,
        error: 'Interaction not found'
      });
    }

    // Convert BigInt timestamp to number
    const serializedInteraction = {
      ...interaction,
      timestamp: Number(interaction.timestamp)
    };

    res.json({
      success: true,
      data: serializedInteraction
    });

  } catch (error) {
    logger.error('Failed to get interaction', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get interaction',
      details: getErrorMessage(error)
    });
  }
});

// POST /api/interactions - Create new interaction
router.post('/', [
  body('sessionId').isUUID(),
  body('type').isIn(['CLICK', 'INPUT', 'SCROLL', 'NAVIGATION', 'HOVER', 'FOCUS', 'BLUR', 'FORM_SUBMIT', 'KEY_PRESS', 'DRAG', 'DROP', 'TOUCH']),
  body('timestamp').isInt({ min: 0 }),
  // Enhanced structure validation - accept either new or legacy format
  body('selectors').optional().isObject(),
  body('visual').optional().isObject(),
  body('element').optional().isObject(),
  body('context').optional().isObject(),
  body('state').optional().isObject(),
  body('interaction').optional().isObject(),
  // Legacy format validation (for backward compatibility)
  body('primarySelector').optional().isString(),
  body('elementTag').optional().isString(),
  body('url').optional().isURL(),
  body('pageTitle').optional().isString(),
  body('confidence').optional().isFloat({ min: 0, max: 1 })
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    // Detect if this is enhanced or legacy format
    const isEnhancedFormat = !!(req.body.selectors || req.body.visual || req.body.element || 
                              req.body.context || req.body.state || req.body.interaction);
    
    let interactionData: any;
    
    if (isEnhancedFormat) {
      // Enhanced structure format
      interactionData = {
        sessionId: req.body.sessionId,
        type: req.body.type,
        timestamp: BigInt(req.body.timestamp),
        sessionTime: req.body.sessionTime || 0,
        sequence: req.body.sequence,

        // Enhanced structured data (6 JSON objects)
        selectors: req.body.selectors || {},
        visual: req.body.visual || {},
        element: req.body.element || {},
        context: req.body.context || {},
        state: req.body.state || {},
        interaction: req.body.interaction || {},

        // Quality and metadata
        qualityScore: req.body.qualityScore || 0,
        confidence: req.body.confidence || 0.8,

        // Store legacy data if any flat fields are present for migration
        legacyData: extractLegacyFields(req.body)
      };
    } else {
      // Legacy flat structure format - convert to enhanced format
      interactionData = {
        sessionId: req.body.sessionId,
        type: req.body.type,
        timestamp: BigInt(req.body.timestamp),
        sessionTime: req.body.sessionTime || 0,
        sequence: req.body.sequence,

        // Convert flat fields to enhanced structure
        selectors: {
          primary: req.body.primarySelector || '',
          alternatives: req.body.selectorAlternatives || [],
          xpath: req.body.xpath || '',
          fullPath: req.body.cssPath || ''
        },
        visual: {
          boundingBox: req.body.boundingBox || {},
          viewport: req.body.viewport || {},
          isInViewport: req.body.isInViewport || false,
          percentVisible: req.body.percentVisible || 0,
          screenshot: req.body.screenshotId
        },
        element: {
          tagName: req.body.elementTag || '',
          text: req.body.elementText || '',
          value: req.body.elementValue || '',
          attributes: req.body.elementAttributes || {},
          computedStyles: {},
          isInteractive: true,
          role: req.body.elementRole || ''
        },
        context: {
          parentElements: req.body.parentElements || [],
          siblings: req.body.siblingElements || [],
          nearbyElements: req.body.nearbyElements || [],
          pageStructure: req.body.pageStructure || {}
        },
        state: {
          before: req.body.stateBefore || {},
          url: req.body.url || '',
          pageTitle: req.body.pageTitle || '',
          activeElement: req.body.activeElement,
          after: req.body.stateAfter,
          changes: req.body.stateChanges
        },
        interaction: {
          coordinates: {
            clientX: req.body.clientX,
            clientY: req.body.clientY,
            pageX: req.body.pageX,
            pageY: req.body.pageY,
            offsetX: req.body.offsetX,
            offsetY: req.body.offsetY
          },
          modifiers: req.body.modifiers || {},
          button: req.body.button
        },

        // Quality and metadata
        qualityScore: req.body.qualityScore || 0,
        confidence: req.body.confidence || 0.8,

        // Store original flat data for rollback
        legacyData: req.body
      };
    }

    const interaction = await prisma.interaction.create({
      data: interactionData
    });

    logger.info('Interaction created', {
      interactionId: interaction.id,
      sessionId: interaction.sessionId,
      type: interaction.type,
      format: isEnhancedFormat ? 'enhanced' : 'legacy'
    });

    // Convert BigInt timestamp back to number for response
    const serializedInteraction = {
      ...interaction,
      timestamp: Number(interaction.timestamp)
    };

    res.status(201).json({
      success: true,
      data: serializedInteraction
    });

  } catch (error) {
    logger.error('Failed to create interaction', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create interaction',
      details: getErrorMessage(error)
    });
  }
});

// Helper function to extract legacy fields for migration
function extractLegacyFields(body: any): any | null {
  const legacyFields = [
    'primarySelector', 'selectorAlternatives', 'xpath', 'cssPath', 'elementTag', 
    'elementText', 'elementValue', 'elementAttributes', 'clientX', 'clientY', 
    'pageX', 'pageY', 'offsetX', 'offsetY', 'modifiers', 'boundingBox', 
    'viewport', 'isInViewport', 'isVisible', 'percentVisible', 'url', 
    'pageTitle', 'pageStructure', 'parentElements', 'siblingElements', 
    'nearbyElements', 'stateBefore', 'stateAfter', 'stateChanges', 
    'selectorReliability', 'userIntent', 'userReasoning', 'visualCues'
  ];
  
  const hasLegacyFields = legacyFields.some(field => body[field] !== undefined);
  
  if (!hasLegacyFields) return null;
  
  const legacy: any = {};
  legacyFields.forEach(field => {
    if (body[field] !== undefined) {
      legacy[field] = body[field];
    }
  });
  
  return legacy;
}

// PUT /api/interactions/:id - Update interaction
router.put('/:id', [
  param('id').isUUID(),
  body('confidence').optional().isFloat({ min: 0, max: 1 }),
  body('userIntent').optional().isString(),
  body('userReasoning').optional().isString(),
  body('visualCues').optional().isArray()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // Handle JSON fields
    if (updateData.visualCues) {
      updateData.visualCues = JSON.stringify(updateData.visualCues);
    }

    const interaction = await prisma.interaction.update({
      where: { id },
      data: updateData
    });

    logger.info('Interaction updated', {
      interactionId: id,
      updates: Object.keys(updateData)
    });

    // Convert BigInt timestamp to number
    const serializedInteraction = {
      ...interaction,
      timestamp: Number(interaction.timestamp)
    };

    res.json({
      success: true,
      data: serializedInteraction
    });

  } catch (error) {
    if ((error as any).code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Interaction not found'
      });
    }

    logger.error('Failed to update interaction', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update interaction',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/interactions/session/:sessionId/timeline - Get interaction timeline
router.get('/session/:sessionId/timeline', [
  param('sessionId').isUUID(),
  query('includeScreenshots').optional().isBoolean()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { includeScreenshots = false } = req.query;

    const interactions = await prisma.interaction.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' },
      include: {
        relatedScreenshots: includeScreenshots ? {
          select: {
            id: true,
            eventType: true,
            s3Key: true,
            quality: true,
            timestamp: true
          }
        } : false
      }
    });

    // Convert BigInt timestamps and create timeline
    const timeline = interactions.map(interaction => ({
      ...interaction,
      timestamp: Number(interaction.timestamp),
      relatedScreenshots: interaction.relatedScreenshots?.map(screenshot => ({
        ...screenshot,
        timestamp: Number(screenshot.timestamp)
      }))
    }));

    // Calculate session metrics
    const metrics = {
      totalInteractions: timeline.length,
      duration: timeline.length > 0 ? 
        Number(timeline[timeline.length - 1].timestamp) - Number(timeline[0].timestamp) : 0,
      interactionTypes: timeline.reduce((acc, interaction) => {
        acc[interaction.type] = (acc[interaction.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averageConfidence: timeline.reduce((sum, interaction) => sum + interaction.confidence, 0) / timeline.length || 0,
      averageQualityScore: timeline.reduce((sum, interaction) => sum + (interaction.qualityScore || 0), 0) / timeline.length || 0,
      pagesVisited: Array.from(new Set(timeline.map(interaction => {
        // Extract URL from enhanced structure or legacy field
        return (interaction.state as any)?.url || interaction.url;
      }).filter(Boolean))).length,
      enhancedStructureStats: {
        enhancedFormat: timeline.filter(i => !!(i.selectors)).length,
        legacyFormat: timeline.filter(i => !!(i.primarySelector) && !(i.selectors)).length,
        migrated: timeline.filter(i => !!(i.selectors) && !!(i.primarySelector)).length
      }
    };

    res.json({
      success: true,
      data: {
        timeline,
        metrics
      }
    });

  } catch (error) {
    logger.error('Failed to get interaction timeline', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get interaction timeline',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/interactions/analyze/selectors - Analyze selector reliability
router.get('/analyze/selectors', [
  query('sessionId').optional().isUUID(),
  query('url').optional().isURL(),
  query('elementTag').optional().isString()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { sessionId, url, elementTag } = req.query;

    // Build filter conditions
    const where: any = {};
    if (sessionId) where.sessionId = sessionId;
    if (url) where.url = url;
    if (elementTag) where.elementTag = elementTag;

    const interactions = await prisma.interaction.findMany({
      where,
      select: {
        id: true,
        selectors: true,
        element: true,
        state: true,
        confidence: true,
        qualityScore: true,
        // Include legacy fields for backward compatibility
        primarySelector: true,
        selectorAlternatives: true,
        elementTag: true,
        url: true,
        selectorReliability: true
      }
    });

    // Filter by url and elementTag after retrieval (due to JSON field complexity)
    const filteredInteractions = interactions.filter(interaction => {
      if (url) {
        const interactionUrl = (interaction.state as any)?.url || interaction.url;
        if (interactionUrl !== url) return false;
      }
      
      if (elementTag) {
        const interactionElementTag = (interaction.element as any)?.tagName || interaction.elementTag;
        if (interactionElementTag !== elementTag) return false;
      }
      
      return true;
    });

    // Analyze selector patterns for enhanced structure
    const selectorAnalysis = {
      totalInteractions: filteredInteractions.length,
      selectorTypes: {} as Record<string, number>,
      reliabilityStats: {
        high: 0, // > 0.8
        medium: 0, // 0.5 - 0.8
        low: 0 // < 0.5
      },
      commonPatterns: {} as Record<string, number>,
      enhancedStructureStats: {
        enhancedFormat: 0,
        legacyFormat: 0,
        migrated: 0
      }
    };

    filteredInteractions.forEach(interaction => {
      // Determine if this is enhanced or legacy format
      const isEnhanced = !!(interaction.selectors);
      const isLegacy = !!(interaction.primarySelector);
      
      if (isEnhanced) {
        selectorAnalysis.enhancedStructureStats.enhancedFormat++;
        if (isLegacy) selectorAnalysis.enhancedStructureStats.migrated++;
      } else {
        selectorAnalysis.enhancedStructureStats.legacyFormat++;
      }

      // Get selector data (enhanced or legacy)
      const selectorData = interaction.selectors as any;
      const primarySelector = selectorData?.primary || interaction.primarySelector;
      const elementTagName = (interaction.element as any)?.tagName || interaction.elementTag;

      if (primarySelector) {
        // Analyze selector types
        if (primarySelector.startsWith('#')) {
          selectorAnalysis.selectorTypes['id'] = (selectorAnalysis.selectorTypes['id'] || 0) + 1;
        } else if (primarySelector.startsWith('.')) {
          selectorAnalysis.selectorTypes['class'] = (selectorAnalysis.selectorTypes['class'] || 0) + 1;
        } else if (primarySelector.includes('[data-')) {
          selectorAnalysis.selectorTypes['data-attribute'] = (selectorAnalysis.selectorTypes['data-attribute'] || 0) + 1;
        } else if (primarySelector.includes('[')) {
          selectorAnalysis.selectorTypes['attribute'] = (selectorAnalysis.selectorTypes['attribute'] || 0) + 1;
        } else {
          selectorAnalysis.selectorTypes['tag'] = (selectorAnalysis.selectorTypes['tag'] || 0) + 1;
        }

        // Track common patterns
        if (elementTagName) {
          const pattern = `${elementTagName}:${primarySelector.split(/[#.\[\]]/)[0]}`;
          selectorAnalysis.commonPatterns[pattern] = (selectorAnalysis.commonPatterns[pattern] || 0) + 1;
        }
      }

      // Analyze reliability using confidence or qualityScore
      const confidence = interaction.confidence || (interaction.qualityScore / 100);
      if (confidence > 0.8) {
        selectorAnalysis.reliabilityStats.high++;
      } else if (confidence > 0.5) {
        selectorAnalysis.reliabilityStats.medium++;
      } else {
        selectorAnalysis.reliabilityStats.low++;
      }
    });

    res.json({
      success: true,
      data: selectorAnalysis
    });

  } catch (error) {
    logger.error('Failed to analyze selectors', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze selectors',
      details: getErrorMessage(error)
    });
  }
});

// DELETE /api/interactions/:id - Delete interaction
router.delete('/:id', [
  param('id').isUUID()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.interaction.delete({
      where: { id }
    });

    logger.info('Interaction deleted', { interactionId: id });

    res.json({
      success: true,
      message: 'Interaction deleted successfully'
    });

  } catch (error) {
    if ((error as any).code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Interaction not found'
      });
    }

    logger.error('Failed to delete interaction', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete interaction',
      details: getErrorMessage(error)
    });
  }
});

export { router as interactionRoutes };