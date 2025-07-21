import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { prisma } from '../lib/database';
import { Logger } from '../utils/logger';

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

export default router;