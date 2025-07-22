import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient, TaskAssignmentStatus } from '@prisma/client';
import { Logger } from '../utils/logger';
import { TaskGenerationService } from '../services/task-generation';
import { OpenAIIntegrationService } from '../services/openai-integration-clean';

const router = express.Router();
const logger = new Logger('TaskRoutes');

// Validation middleware
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET /api/tasks/generate - Generate a new task
router.get('/generate', [
  query('website').isURL().withMessage('Valid website URL required'),
  query('userLevel').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid user level'),
  query('category').optional().isString().withMessage('Category must be string'),
  query('sessionId').optional().isString().withMessage('Session ID must be string')
], validateRequest, async (req: express.Request, res: express.Response) => {
  try {
    const { website, userLevel = 'beginner', category, sessionId } = req.query;
    
    const prisma = req.app.locals.prisma as PrismaClient;
    const openaiService = req.app.locals.openaiService as OpenAIIntegrationService;
    const taskService = new TaskGenerationService(prisma);
    
    logger.info('Generating task', { website, userLevel, category, sessionId });
    
    // Generate task
    const task = await taskService.generateTask(
      website as string, 
      userLevel as string, 
      category as string
    );
    
    // If sessionId provided, assign task to session
    let assignment = null;
    if (sessionId) {
      assignment = await taskService.assignTask(task.id, sessionId as string);
      await taskService.updateTaskStatus(sessionId as string, TaskAssignmentStatus.IN_PROGRESS);
    }
    
    res.json({
      success: true,
      task,
      assignment,
      message: 'Task generated successfully'
    });
    
  } catch (error) {
    logger.error('Task generation failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate task',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/tasks/session/:sessionId - Get task for specific session
router.get('/session/:sessionId', [
  param('sessionId').isString().notEmpty().withMessage('Session ID required')
], validateRequest, async (req: express.Request, res: express.Response) => {
  try {
    const { sessionId } = req.params;
    
    const prisma = req.app.locals.prisma as PrismaClient;
    const openaiService = req.app.locals.openaiService as OpenAIIntegrationService;
    const taskService = new TaskGenerationService(prisma);
    
    const result = await taskService.getSessionTask(sessionId);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'No task found for session'
      });
    }
    
    res.json({
      success: true,
      ...result,
      message: 'Task retrieved successfully'
    });
    
  } catch (error) {
    logger.error('Failed to get session task', { sessionId: req.params.sessionId, error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve task'
    });
  }
});

// POST /api/tasks/session/:sessionId/status - Update task status
router.post('/session/:sessionId/status', [
  param('sessionId').isString().notEmpty().withMessage('Session ID required'),
  body('status').isIn(['ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'ABANDONED']).withMessage('Invalid status'),
  body('automationSequence').optional().isArray().withMessage('Automation sequence must be array'),
  body('completionTime').optional().isNumeric().withMessage('Completion time must be number')
], validateRequest, async (req: express.Request, res: express.Response) => {
  try {
    const { sessionId } = req.params;
    const { status, automationSequence, completionTime } = req.body;
    
    const prisma = req.app.locals.prisma as PrismaClient;
    const openaiService = req.app.locals.openaiService as OpenAIIntegrationService;
    const taskService = new TaskGenerationService(prisma);
    
    await taskService.updateTaskStatus(sessionId, status, automationSequence, completionTime);
    
    res.json({
      success: true,
      message: 'Task status updated successfully'
    });
    
  } catch (error) {
    logger.error('Failed to update task status', { sessionId: req.params.sessionId, error });
    res.status(500).json({
      success: false,
      error: 'Failed to update task status'
    });
  }
});

// GET /api/tasks/random - Get a random task for any website
router.get('/random', [
  query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid difficulty'),
  query('category').optional().isString().withMessage('Category must be string'),
  query('sessionId').optional().isString().withMessage('Session ID must be string')
], validateRequest, async (req: express.Request, res: express.Response) => {
  try {
    const { difficulty = 'beginner', category, sessionId } = req.query;
    
    // Random popular e-commerce sites
    const websites = [
      'https://www.amazon.com',
      'https://www.nike.com', 
      'https://www.uniqlo.com',
      'https://www.nordstrom.com',
      'https://www.target.com',
      'https://www.bestbuy.com'
    ];
    
    const randomWebsite = websites[Math.floor(Math.random() * websites.length)];
    
    const prisma = req.app.locals.prisma as PrismaClient;
    const openaiService = req.app.locals.openaiService as OpenAIIntegrationService;
    const taskService = new TaskGenerationService(prisma);
    
    const task = await taskService.generateTask(
      randomWebsite, 
      difficulty as string, 
      category as string
    );
    
    // If sessionId provided, assign task to session
    let assignment = null;
    if (sessionId) {
      assignment = await taskService.assignTask(task.id, sessionId as string);
      await taskService.updateTaskStatus(sessionId as string, TaskAssignmentStatus.IN_PROGRESS);
    }
    
    res.json({
      success: true,
      task,
      assignment,
      message: 'Random task generated successfully'
    });
    
  } catch (error) {
    logger.error('Random task generation failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate random task'
    });
  }
});

// GET /api/tasks/stats - Get task completion statistics
router.get('/stats', async (req, res) => {
  try {
    const prisma = req.app.locals.prisma as PrismaClient;
    
    const stats = await Promise.all([
      prisma.generatedTask.count(),
      prisma.taskAssignment.count(),
      prisma.taskAssignment.count({ where: { status: TaskAssignmentStatus.COMPLETED } }),
      prisma.taskAssignment.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      prisma.generatedTask.groupBy({
        by: ['type'],
        _count: { id: true }
      }),
      prisma.generatedTask.groupBy({
        by: ['difficulty'],
        _count: { id: true }
      })
    ]);
    
    const [
      totalTasks,
      totalAssignments, 
      completedTasks,
      statusDistribution,
      typeDistribution,
      difficultyDistribution
    ] = stats;
    
    res.json({
      success: true,
      stats: {
        totalTasks,
        totalAssignments,
        completedTasks,
        completionRate: totalAssignments > 0 ? (completedTasks / totalAssignments * 100).toFixed(1) : 0,
        statusDistribution: statusDistribution.reduce((acc: any, item: any) => {
          acc[item.status] = item._count.id;
          return acc;
        }, {}),
        typeDistribution: typeDistribution.reduce((acc: any, item: any) => {
          acc[item.type] = item._count.id;
          return acc;
        }, {}),
        difficultyDistribution: difficultyDistribution.reduce((acc: any, item: any) => {
          acc[item.difficulty] = item._count.id;
          return acc;
        }, {})
      }
    });
    
  } catch (error) {
    logger.error('Failed to get task stats', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve statistics'
    });
  }
});

export default router;