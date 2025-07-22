import { Router, Request, Response } from 'express';
import { body, validationResult, query } from 'express-validator';
import { prisma } from '../lib/database';
import { Logger } from '../utils/logger';
import { TaskGenerationService } from '../services/task-generation';

const router = Router();
const logger = new Logger('TestRoutes');

// Test endpoint to directly create sessions in database
router.post('/database', 
  body('action').isIn(['create_session', 'create_interaction']),
  body('data').isObject(),
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { action, data } = req.body;
      logger.info('Direct database test request', { action, dataKeys: Object.keys(data) });

      let result;

      switch (action) {
        case 'create_session':
          result = await prisma.unifiedSession.create({
            data: {
              id: data.id,
              type: data.type || 'HUMAN',
              status: 'ACTIVE',
              config: data.config || {},
              workerId: data.workerId,
              userAgent: data.userAgent,
              ipAddress: data.ipAddress,
              startTime: new Date(),
              qualityScore: 0,
              completeness: 0,
              reliability: 0,
              trainingValue: 0,
              processingStatus: 'PENDING'
            }
          });
          logger.info('Session created directly in database', { sessionId: result.id });
          break;

        case 'create_interaction':
          result = await prisma.interaction.create({
            data: {
              sessionId: data.sessionId,
              type: data.type,
              timestamp: BigInt(data.timestamp || Date.now()),
              sessionTime: 0,
              // Store in new JSON format
              selectors: {
                primary: data.elementSelector
              },
              element: {
                tag: data.elementTag || 'unknown',
                text: data.elementText
              },
              context: {
                url: data.url || 'test-url',
                pageTitle: data.pageTitle || 'Test Page'
              },
              visual: {
                viewport: data.viewport || {},
                boundingBox: data.boundingBox || {}
              },
              state: {
                before: {},
                after: {}
              },
              interaction: {
                confidence: 0.5
              },
              confidence: 50 // Default quality score
            }
          });
          logger.info('Interaction created directly in database', { interactionId: result.id });
          break;

        default:
          return res.status(400).json({
            success: false,
            error: 'Invalid action'
          });
      }

      res.json({
        success: true,
        message: `${action} completed successfully`,
        data: {
          id: result.id,
          createdAt: action === 'create_session' ? (result as any).startTime : new Date((result as any).timestamp ? Number((result as any).timestamp) : Date.now())
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Direct database test failed', { error: errorMessage });
      
      res.status(500).json({
        success: false,
        error: 'Database operation failed',
        message: errorMessage
      });
    }
  }
);

// Get test data from database
router.get('/database', async (req: Request, res: Response) => {
  try {
    const sessions = await prisma.unifiedSession.findMany({
      take: 5,
      orderBy: { startTime: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        startTime: true,
        workerId: true
      }
    });

    const interactions = await prisma.interaction.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        type: true,
        sessionId: true,
        timestamp: true
      }
    });

    const totals = {
      sessions: await prisma.unifiedSession.count(),
      interactions: await prisma.interaction.count()
    };

    res.json({
      success: true,
      data: {
        recentSessions: sessions,
        recentInteractions: interactions,
        totals
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to fetch test data', { error: errorMessage });
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch data',
      message: errorMessage
    });
  }
});

// Test task generation endpoint (bypasses auth)
router.get('/task/random', async (req: Request, res: Response) => {
  try {
    const { difficulty = 'beginner', category, sessionId } = req.query;
    
    // Random popular e-commerce sites (Seattle-focused for local testing)
    const websites = [
      'https://www.rei.com',      // Seattle-based outdoor retailer
      'https://www.nordstrom.com', // Seattle-based department store  
      'https://www.starbucks.com', // Seattle-based coffee
      'https://www.nike.com',
      'https://www.amazon.com',
      'https://www.uniqlo.com'
    ];
    
    const randomWebsite = websites[Math.floor(Math.random() * websites.length)];
    
    const taskService = new TaskGenerationService(prisma);
    
    logger.info('Generating test task', { website: randomWebsite, difficulty, category, sessionId });
    
    const task = await taskService.generateTask(
      randomWebsite, 
      difficulty as string, 
      category as string
    );
    
    // If sessionId provided, create task assignment for training data context
    if (sessionId) {
      try {
        await taskService.assignTask(task.id, sessionId as string);
        logger.info('Task assigned to session', { taskId: task.id, sessionId, title: task.title });
      } catch (assignError) {
        logger.warn('Failed to assign task to session', { sessionId, taskId: task.id, error: assignError });
        // Don't fail the whole request if assignment fails
      }
    }
    
    res.json({
      success: true,
      task,
      message: 'Test task generated successfully'
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Test task generation failed', { error: errorMessage });
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate test task',
      message: errorMessage
    });
  }
});

export default router;