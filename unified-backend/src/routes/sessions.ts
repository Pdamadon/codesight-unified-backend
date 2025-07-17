import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { body, param, query, validationResult } from 'express-validator';
import { Logger } from '../utils/logger';
import { DataProcessingPipeline } from '../services/data-processing-pipeline';
import { getErrorMessage } from '../utils/type-helpers';

const router = Router();
const prisma = new PrismaClient();
const logger = new Logger('SessionRoutes');

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

// GET /api/sessions - List sessions with filtering and pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('type').optional().isIn(['HUMAN', 'AUTOMATED', 'HYBRID']),
  query('status').optional().isIn(['ACTIVE', 'PAUSED', 'COMPLETED', 'PROCESSING', 'ARCHIVED', 'FAILED']),
  query('minQuality').optional().isFloat({ min: 0, max: 100 }),
  query('workerId').optional().isString(),
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      minQuality,
      workerId,
      startDate,
      endDate
    } = req.query;

    // Build filter conditions
    const where: any = {};
    
    if (type) where.type = type;
    if (status) where.status = status;
    if (minQuality) where.qualityScore = { gte: parseFloat(minQuality as string) };
    if (workerId) where.workerId = workerId;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    // Get total count for pagination
    const totalCount = await prisma.unifiedSession.count({ where });

    // Get sessions with pagination
    const sessions = await prisma.unifiedSession.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        _count: {
          select: {
            interactions: true,
            screenshots: true,
            archives: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / Number(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Failed to list sessions', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list sessions',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/sessions/:id - Get specific session with details
router.get('/:id', [
  param('id').isUUID()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { includeInteractions = 'false', includeScreenshots = 'false' } = req.query;

    const session = await prisma.unifiedSession.findUnique({
      where: { id },
      include: {
        interactions: includeInteractions === 'true' ? {
          orderBy: { timestamp: 'asc' },
          take: 1000 // Limit to prevent huge responses
        } : false,
        screenshots: includeScreenshots === 'true' ? {
          orderBy: { timestamp: 'asc' },
          take: 100
        } : false,
        archives: true,
        _count: {
          select: {
            interactions: true,
            screenshots: true
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    res.json({
      success: true,
      data: session
    });

  } catch (error) {
    logger.error('Failed to get session', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session',
      details: getErrorMessage(error)
    });
  }
});

// POST /api/sessions - Create new session
router.post('/', [
  body('type').optional().isIn(['HUMAN', 'AUTOMATED', 'HYBRID']),
  body('workerId').optional().isString(),
  body('config').optional().isObject(),
  body('userAgent').optional().isString(),
  body('ipAddress').optional().isIP()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const {
      type = 'HUMAN',
      workerId,
      config = {},
      userAgent,
      ipAddress
    } = req.body;

    const session = await prisma.unifiedSession.create({
      data: {
        type,
        workerId,
        config,
        userAgent,
        ipAddress,
        status: 'ACTIVE',
        processingStatus: 'PENDING'
      }
    });

    logger.info('Session created', {
      sessionId: session.id,
      type: session.type,
      workerId: session.workerId
    });

    res.status(201).json({
      success: true,
      data: session
    });

  } catch (error) {
    logger.error('Failed to create session', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session',
      details: getErrorMessage(error)
    });
  }
});

// PUT /api/sessions/:id - Update session
router.put('/:id', [
  param('id').isUUID(),
  body('status').optional().isIn(['ACTIVE', 'PAUSED', 'COMPLETED', 'PROCESSING', 'ARCHIVED', 'FAILED']),
  body('config').optional().isObject(),
  body('qualityScore').optional().isFloat({ min: 0, max: 100 }),
  body('completeness').optional().isFloat({ min: 0, max: 100 }),
  body('reliability').optional().isFloat({ min: 0, max: 100 })
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const session = await prisma.unifiedSession.update({
      where: { id },
      data: updateData
    });

    logger.info('Session updated', {
      sessionId: session.id,
      updates: Object.keys(updateData)
    });

    res.json({
      success: true,
      data: session
    });

  } catch (error) {
    if ((error as any).code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    logger.error('Failed to update session', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update session',
      details: getErrorMessage(error)
    });
  }
});

// POST /api/sessions/:id/complete - Complete session and trigger processing
router.post('/:id/complete', [
  param('id').isUUID(),
  body('summary').optional().isObject(),
  body('finalQualityCheck').optional().isBoolean()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { summary, finalQualityCheck = true } = req.body;

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update session status
      const session = await tx.unifiedSession.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          endTime: new Date(),
          processingStatus: 'PENDING'
        }
      });

      return session;
    });

    // Trigger processing pipeline (outside transaction to avoid long-running operations)
    const dataProcessingPipeline = req.app.locals.dataProcessingPipeline as DataProcessingPipeline;
    const processingResult = await dataProcessingPipeline.completeSession(id, {
      summary,
      finalQualityCheck
    });

    logger.info('Session completed and processing started', {
      sessionId: id,
      processingId: processingResult.processingId
    });

    res.json({
      success: true,
      data: {
        session: result,
        processing: processingResult
      }
    });

  } catch (error) {
    logger.error('Failed to complete session', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete session',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/sessions/:id/quality - Get quality report for session
router.get('/:id/quality', [
  param('id').isUUID()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const qualityReport = await prisma.qualityReport.findFirst({
      where: { sessionId: id },
      orderBy: { generatedAt: 'desc' }
    });

    if (!qualityReport) {
      return res.status(404).json({
        success: false,
        error: 'Quality report not found'
      });
    }

    res.json({
      success: true,
      data: qualityReport
    });

  } catch (error) {
    logger.error('Failed to get quality report', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get quality report',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/sessions/:id/training-data - Get training data for session
router.get('/:id/training-data', [
  param('id').isUUID()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const trainingData = await prisma.trainingData.findFirst({
      where: { sessionId: id },
      orderBy: { createdAt: 'desc' }
    });

    if (!trainingData) {
      return res.status(404).json({
        success: false,
        error: 'Training data not found'
      });
    }

    res.json({
      success: true,
      data: trainingData
    });

  } catch (error) {
    logger.error('Failed to get training data', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get training data',
      details: getErrorMessage(error)
    });
  }
});

// DELETE /api/sessions/:id - Delete session (soft delete)
router.delete('/:id', [
  param('id').isUUID()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Soft delete by updating status
    const session = await prisma.unifiedSession.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        processingStatus: 'COMPLETED'
      }
    });

    logger.info('Session deleted (archived)', {
      sessionId: id
    });

    res.json({
      success: true,
      message: 'Session archived successfully',
      data: { id: session.id, status: session.status }
    });

  } catch (error) {
    if ((error as any).code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    logger.error('Failed to delete session', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete session',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/sessions/stats - Get session statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const [
      totalSessions,
      activeSessions,
      completedSessions,
      processingStats,
      qualityStats
    ] = await Promise.all([
      prisma.unifiedSession.count(),
      prisma.unifiedSession.count({ where: { status: 'ACTIVE' } }),
      prisma.unifiedSession.count({ where: { status: 'COMPLETED' } }),
      prisma.unifiedSession.groupBy({
        by: ['processingStatus'],
        _count: true
      }),
      prisma.unifiedSession.aggregate({
        _avg: { qualityScore: true },
        _min: { qualityScore: true },
        _max: { qualityScore: true }
      })
    ]);

    const recentSessions = await prisma.unifiedSession.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        qualityScore: true,
        createdAt: true,
        workerId: true
      }
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalSessions,
          activeSessions,
          completedSessions,
          processingStats: processingStats.reduce((acc, stat) => {
            acc[stat.processingStatus] = stat._count;
            return acc;
          }, {} as Record<string, number>)
        },
        quality: {
          averageScore: qualityStats._avg.qualityScore || 0,
          minScore: qualityStats._min.qualityScore || 0,
          maxScore: qualityStats._max.qualityScore || 0
        },
        recentSessions
      }
    });

  } catch (error) {
    logger.error('Failed to get session stats', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session stats',
      details: getErrorMessage(error)
    });
  }
});

// POST /api/sessions/:id/screenshots - Add screenshot to session
router.post('/:id/screenshots', [
  param('id').isUUID(),
  body('timestamp').isInt(),
  body('eventType').isString().notEmpty(),
  body('dataUrl').optional().isString(),
  body('s3Key').optional().isString(),
  body('viewport').isObject(),
  body('quality').optional().isFloat({ min: 0, max: 100 }),
  body('trigger').optional().isString(),
  body('burstId').optional().isString(),
  body('burstIndex').optional().isInt(),
  body('burstTotal').optional().isInt(),
  body('compressionRatio').optional().isFloat({ min: 0, max: 1 }),
  body('format').optional().isIn(['png', 'webp', 'jpg']),
  body('interactionId').optional().isUUID()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id: sessionId } = req.params;
    const {
      timestamp,
      eventType,
      dataUrl,
      s3Key,
      viewport,
      quality = 0,
      trigger,
      burstId,
      burstIndex,
      burstTotal,
      compressionRatio,
      format = 'png',
      interactionId
    } = req.body;

    // Verify session exists
    const session = await prisma.unifiedSession.findUnique({
      where: { id: sessionId }
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Calculate file size from dataUrl if provided
    let fileSize: number | undefined;
    if (dataUrl) {
      const base64Data = dataUrl.split(',')[1];
      if (base64Data) {
        fileSize = Math.floor(base64Data.length * 0.75); // Base64 to bytes approximation
      }
    }

    // Create screenshot
    const screenshot = await prisma.screenshot.create({
      data: {
        sessionId,
        interactionId,
        timestamp: BigInt(timestamp),
        eventType,
        dataUrl,
        s3Key,
        viewport: JSON.stringify(viewport),
        quality,
        trigger,
        burstId,
        burstIndex,
        burstTotal,
        compressionRatio,
        format,
        fileSize,
        compressed: !!s3Key, // If s3Key exists, assume it's compressed
      }
    });

    // Convert BigInt to number for JSON response
    const responseData = {
      ...screenshot,
      timestamp: Number(screenshot.timestamp),
      viewport: screenshot.viewport ? JSON.parse(screenshot.viewport) : {}
    };

    logger.info('Screenshot created', {
      screenshotId: screenshot.id,
      sessionId,
      eventType,
      burstId,
      burstIndex
    });

    res.status(201).json({
      success: true,
      data: responseData
    });

  } catch (error) {
    logger.error('Failed to create screenshot', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create screenshot',
      details: getErrorMessage(error)
    });
  }
});

export { router as sessionRoutes };