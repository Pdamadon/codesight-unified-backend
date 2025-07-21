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
  body('primarySelector').isString().isLength({ min: 1 }),
  body('elementTag').isString().isLength({ min: 1 }),
  body('url').isURL(),
  body('pageTitle').isString(),
  body('confidence').optional().isFloat({ min: 0, max: 1 })
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const interactionData = {
      ...req.body,
      timestamp: BigInt(req.body.timestamp),
      selectorAlternatives: JSON.stringify(req.body.selectorAlternatives || []),
      elementAttributes: JSON.stringify(req.body.elementAttributes || {}),
      boundingBox: JSON.stringify(req.body.boundingBox || {}),
      viewport: JSON.stringify(req.body.viewport || {}),
      pageStructure: JSON.stringify(req.body.pageStructure || {}),
      parentElements: JSON.stringify(req.body.parentElements || []),
      siblingElements: JSON.stringify(req.body.siblingElements || []),
      nearbyElements: JSON.stringify(req.body.nearbyElements || []),
      stateBefore: JSON.stringify(req.body.stateBefore || {}),
      stateAfter: JSON.stringify(req.body.stateAfter || {}),
      stateChanges: JSON.stringify(req.body.stateChanges || {}),
      selectorReliability: JSON.stringify(req.body.selectorReliability || {}),
      visualCues: JSON.stringify(req.body.visualCues || [])
    };

    const interaction = await prisma.interaction.create({
      data: interactionData
    });

    logger.info('Interaction created', {
      interactionId: interaction.id,
      sessionId: interaction.sessionId,
      type: interaction.type
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
      pagesVisited: Array.from(new Set(timeline.map(interaction => 
        typeof interaction.context === 'object' && interaction.context && 'url' in interaction.context 
          ? interaction.context.url as string 
          : 'unknown'
      ))).length
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
    // Note: url and elementTag are now stored in JSON fields, so we skip these filters for now
    // if (url) where.url = url;
    // if (elementTag) where.elementTag = elementTag;

    const interactions = await prisma.interaction.findMany({
      where,
      select: {
        id: true,
        selectors: true,
        element: true,
        context: true,
        confidence: true,
        type: true,
        timestamp: true
      }
    });

    // Analyze selector patterns
    const selectorAnalysis = {
      totalInteractions: interactions.length,
      selectorTypes: {} as Record<string, number>,
      reliabilityStats: {
        high: 0, // > 0.8
        medium: 0, // 0.5 - 0.8
        low: 0 // < 0.5
      },
      commonPatterns: {} as Record<string, number>
    };

    interactions.forEach(interaction => {
      // Analyze selector types from JSON fields
      const selectorData = typeof interaction.selectors === 'object' && interaction.selectors ? interaction.selectors as any : null;
      const selector = selectorData?.primary || '';
      if (selector.startsWith('#')) {
        selectorAnalysis.selectorTypes['id'] = (selectorAnalysis.selectorTypes['id'] || 0) + 1;
      } else if (selector.startsWith('.')) {
        selectorAnalysis.selectorTypes['class'] = (selectorAnalysis.selectorTypes['class'] || 0) + 1;
      } else if (selector.includes('[data-')) {
        selectorAnalysis.selectorTypes['data-attribute'] = (selectorAnalysis.selectorTypes['data-attribute'] || 0) + 1;
      } else if (selector.includes('[')) {
        selectorAnalysis.selectorTypes['attribute'] = (selectorAnalysis.selectorTypes['attribute'] || 0) + 1;
      } else {
        selectorAnalysis.selectorTypes['tag'] = (selectorAnalysis.selectorTypes['tag'] || 0) + 1;
      }

      // Analyze reliability
      const confidence = interaction.confidence;
      if (confidence > 0.8) {
        selectorAnalysis.reliabilityStats.high++;
      } else if (confidence > 0.5) {
        selectorAnalysis.reliabilityStats.medium++;
      } else {
        selectorAnalysis.reliabilityStats.low++;
      }

      // Track common patterns
      const elementData = typeof interaction.element === 'object' && interaction.element ? interaction.element as any : null;
      const elementTag = elementData?.tag || 'unknown';
      const pattern = `${elementTag}:${selector.split(/[#.\[\]]/)[0]}`;
      selectorAnalysis.commonPatterns[pattern] = (selectorAnalysis.commonPatterns[pattern] || 0) + 1;
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