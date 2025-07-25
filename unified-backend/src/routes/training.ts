import { Router, Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Logger } from '../utils/logger';
import { OpenAIIntegrationService } from '../services/openai-integration-clean';
import { prisma } from '../lib/database';
import { getErrorMessage } from '../utils/type-helpers';

const router = Router();
const logger = new Logger('TrainingRoutes');
// Using shared prisma instance from lib/database

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

// POST /api/training/generate - Generate training data from sessions
router.post('/generate', [
  body('sessionIds').isArray().withMessage('sessionIds must be an array'),
  body('sessionIds.*').isUUID().withMessage('Each sessionId must be a valid UUID'),
  body('config').optional().isObject()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { sessionIds, config = {} } = req.body;

    const openaiService = new OpenAIIntegrationService();
    
    // Generate training data from sessions
    let totalExamples = 0;
    let totalQuality = 0;
    
    for (const sessionId of sessionIds) {
      try {
        const session = await prisma.unifiedSession.findUnique({
          where: { id: sessionId },
          include: { interactions: true, screenshots: true }
        });
        if (session) {
          const trainingData = await openaiService.generateTrainingData(session);
          totalExamples += trainingData.messages.length;
          totalQuality += trainingData.trainingValue;
        }
      } catch (error) {
        logger.warn(`Failed to process session ${sessionId}`, error);
      }
    }
    
    const result = {
      totalExamples,
      averageQuality: totalExamples > 0 ? totalQuality / sessionIds.length : 0
    };

    logger.info('Training data generated', {
      sessionCount: sessionIds.length,
      totalExamples: result.totalExamples,
      averageQuality: result.averageQuality
    });

    res.json({
      success: true,
      data: {
        totalExamples: result.totalExamples,
        averageQuality: result.averageQuality,
        trainingDataSize: 0, // Not available in current implementation
        processingResults: [] // Not available in current implementation
      }
    });

  } catch (error) {
    logger.error('Failed to generate training data', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate training data',
      details: getErrorMessage(error)
    });
  }
});

// POST /api/training/pipeline - Create complete training pipeline
router.post('/pipeline', [
  body('sessionIds').isArray().withMessage('sessionIds must be an array'),
  body('sessionIds.*').isUUID().withMessage('Each sessionId must be a valid UUID'),
  body('config').optional().isObject(),
  body('config.suffix').optional().isString(),
  body('config.epochs').optional().isInt({ min: 1, max: 10 }),
  body('config.batchSize').optional().isInt({ min: 1, max: 8 }),
  body('config.learningRate').optional().isFloat({ min: 0.01, max: 1.0 })
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { sessionIds, config = {} } = req.body;

    const openaiService = new OpenAIIntegrationService();
    
    // Create complete training pipeline using available methods
    let allTrainingData: any[] = [];
    
    // Generate training data for all sessions
    for (const sessionId of sessionIds) {
      try {
        const session = await prisma.unifiedSession.findUnique({
          where: { id: sessionId },
          include: { interactions: true, screenshots: true }
        });
        if (session) {
          const trainingData = await openaiService.generateTrainingData(session);
          allTrainingData.push(...trainingData.messages);
        }
      } catch (error) {
        logger.warn(`Failed to process session ${sessionId}`, error);
      }
    }
    
    // Upload training file and create fine-tuning job
    const fileId = await openaiService.uploadTrainingFile({ messages: allTrainingData }, config);
    const jobId = await openaiService.createFineTuningJob(fileId, {
      model: 'gpt-4o-mini-2024-07-18',
      hyperparameters: {
        n_epochs: config.epochs || 3,
        batch_size: config.batchSize || 1,
        learning_rate_multiplier: config.learningRate || 0.1
      },
      suffix: config.suffix
    });
    
    const pipeline = {
      trainingRecordId: `training_${Date.now()}`,
      jobId,
      totalExamples: allTrainingData.length,
      fileId
    };

    logger.info('Training pipeline created', {
      trainingRecordId: pipeline.trainingRecordId,
      jobId: pipeline.jobId,
      totalExamples: pipeline.totalExamples
    });

    res.json({
      success: true,
      data: pipeline
    });

  } catch (error) {
    logger.error('Failed to create training pipeline', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create training pipeline',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/training/jobs/:jobId - Get training job status
router.get('/jobs/:jobId', [
  param('jobId').isString().withMessage('jobId must be a string')
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    const openaiService = new OpenAIIntegrationService();
    const status = await openaiService.monitorTraining(jobId);

    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Failed to get training job status', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get training job status',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/training/models - List fine-tuned models
router.get('/models', async (req, res) => {
  try {
    // Note: listFineTunedModels method not implemented yet
    // For now, return empty array
    const models: any[] = [];

    res.json({
      success: true,
      data: {
        models,
        count: models.length
      }
    });

  } catch (error) {
    logger.error('Failed to list fine-tuned models', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list fine-tuned models',
      details: getErrorMessage(error)
    });
  }
});

// POST /api/training/models/:modelId/test - Test a trained model
router.post('/models/:modelId/test', [
  param('modelId').isString().withMessage('modelId must be a string'),
  body('prompt').isString().withMessage('prompt is required')
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { modelId } = req.params;
    const { prompt } = req.body;

    // Note: testModel method not implemented yet
    // For now, return a placeholder response
    const result = {
      modelId,
      prompt,
      response: "Model testing not yet implemented",
      timestamp: new Date()
    };

    logger.info('Model tested', { modelId, promptLength: prompt.length });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('Failed to test model', error);
    res.status(500).json({
      success: false,
      error: 'Failed to test model',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/training/data - List training data records
router.get('/data', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['PENDING', 'GENERATING', 'UPLOADING', 'TRAINING', 'COMPLETED', 'FAILED'])
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status
    } = req.query;

    const where: any = {};
    if (status) where.status = status;

    const totalCount = await prisma.trainingData.count({ where });

    const trainingData = await prisma.trainingData.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      select: {
        id: true,
        sessionId: true,
        openaiFileId: true,
        trainingJobId: true,
        modelId: true,
        status: true,
        trainingQuality: true,
        fileSize: true,
        createdAt: true,
        completedAt: true
      }
    });

    res.json({
      success: true,
      data: {
        trainingData,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / Number(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Failed to list training data', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list training data',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/training/data/:id - Get specific training data record
router.get('/data/:id', [
  param('id').isUUID()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const trainingData = await prisma.trainingData.findUnique({
      where: { id }
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

// GET /api/training/stats - Get training statistics
router.get('/stats', async (req, res) => {
  try {
    const [
      totalTrainingData,
      completedTraining,
      activeTraining,
      trainingStats
    ] = await Promise.all([
      prisma.trainingData.count(),
      prisma.trainingData.count({ where: { status: 'COMPLETED' } }),
      prisma.trainingData.count({ 
        where: { 
          status: { 
            in: ['PENDING', 'GENERATING', 'UPLOADING', 'TRAINING'] 
          } 
        } 
      }),
      prisma.trainingData.aggregate({
        _avg: { trainingQuality: true },
        _sum: { fileSize: true }
      })
    ]);

    const recentTraining = await prisma.trainingData.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        sessionId: true,
        status: true,
        trainingQuality: true,
        createdAt: true,
        modelId: true
      }
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalTrainingData,
          completedTraining,
          activeTraining,
          averageQuality: Math.round(trainingStats._avg.trainingQuality || 0),
          totalDataSize: Number(trainingStats._sum.fileSize || 0)
        },
        recentTraining
      }
    });

  } catch (error) {
    logger.error('Failed to get training statistics', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get training statistics',
      details: getErrorMessage(error)
    });
  }
});

export { router as trainingRoutes };