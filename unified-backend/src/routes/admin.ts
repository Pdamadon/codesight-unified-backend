import { Router, Request, Response, NextFunction } from 'express';
import { query, validationResult } from 'express-validator';
import { Logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { QualityControlService } from '../services/quality-control-clean';
import { StorageManager } from '../services/storage-manager-clean';
import { requireAdmin } from '../middleware/auth';
import { getErrorMessage, AuthenticatedRequest } from '../utils/type-helpers';

const router = Router();
const logger = new Logger('AdminRoutes');
const prisma = new PrismaClient();

// Apply admin authentication to all routes
router.use(requireAdmin as any);

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

// GET /api/admin/dashboard - Admin dashboard overview
router.get('/dashboard', async (req, res) => {
  try {
    const [
      sessionStats,
      interactionStats,
      screenshotStats,
      trainingStats,
      qualityStats
    ] = await Promise.all([
      // Session statistics
      prisma.unifiedSession.groupBy({
        by: ['status'],
        _count: true
      }),
      
      // Interaction statistics
      prisma.interaction.groupBy({
        by: ['type'],
        _count: true
      }),
      
      // Screenshot statistics
      prisma.screenshot.aggregate({
        _count: true,
        _sum: { fileSize: true }
      }),
      
      // Training statistics
      prisma.trainingData.groupBy({
        by: ['status'],
        _count: true
      }),
      
      // Quality statistics
      prisma.qualityReport.aggregate({
        _avg: { overallScore: true },
        _count: true
      })
    ]);

    // Recent activity
    const recentSessions = await prisma.unifiedSession.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        qualityScore: true,
        createdAt: true,
        workerId: true,
        _count: {
          select: {
            interactions: true,
            screenshots: true
          }
        }
      }
    });

    const systemHealth = {
      database: 'connected',
      storage: 'connected', // Would check S3 in real implementation
      openai: 'connected'   // Would check OpenAI in real implementation
    };

    res.json({
      success: true,
      data: {
        overview: {
          sessions: sessionStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count;
            return acc;
          }, {} as Record<string, number>),
          
          interactions: interactionStats.reduce((acc, stat) => {
            acc[stat.type] = stat._count;
            return acc;
          }, {} as Record<string, number>),
          
          screenshots: {
            total: screenshotStats._count,
            totalSize: Number(screenshotStats._sum.fileSize || 0)
          },
          
          training: trainingStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count;
            return acc;
          }, {} as Record<string, number>),
          
          quality: {
            totalReports: qualityStats._count,
            averageScore: Math.round(qualityStats._avg.overallScore || 0)
          }
        },
        
        recentActivity: recentSessions,
        systemHealth
      }
    });

  } catch (error) {
    logger.error('Failed to get admin dashboard data', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get dashboard data',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/admin/quality/overview - Quality control overview
router.get('/quality/overview', async (req, res) => {
  try {
    const qualityService = new QualityControlService();
    const stats = await qualityService.getQualityStats();

    // Get sessions by quality ranges
    const qualityRanges = await Promise.all([
      prisma.unifiedSession.count({ where: { qualityScore: { gte: 80 } } }),
      prisma.unifiedSession.count({ where: { qualityScore: { gte: 60, lt: 80 } } }),
      prisma.unifiedSession.count({ where: { qualityScore: { gte: 40, lt: 60 } } }),
      prisma.unifiedSession.count({ where: { qualityScore: { lt: 40 } } })
    ]);

    res.json({
      success: true,
      data: {
        ...stats,
        qualityDistribution: {
          excellent: qualityRanges[0], // 80-100
          good: qualityRanges[1],      // 60-79
          fair: qualityRanges[2],      // 40-59
          poor: qualityRanges[3]       // 0-39
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get quality overview', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get quality overview',
      details: getErrorMessage(error)
    });
  }
});

// POST /api/admin/quality/batch-assess - Batch quality assessment
router.post('/quality/batch-assess', [
  query('minQuality').optional().isFloat({ min: 0, max: 100 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { minQuality = 0, limit = 50 } = req.query;

    // Get sessions that need quality assessment
    const sessions = await prisma.unifiedSession.findMany({
      where: {
        status: 'COMPLETED',
        qualityScore: { lt: Number(minQuality) }
      },
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      select: { id: true }
    });

    const sessionIds = sessions.map(s => s.id);

    if (sessionIds.length === 0) {
      return res.json({
        success: true,
        message: 'No sessions found for quality assessment',
        data: { assessedSessions: 0 }
      });
    }

    const qualityService = new QualityControlService();
    const reports = await qualityService.validateMultipleSessions(sessionIds);

    logger.info('Batch quality assessment completed', {
      totalSessions: sessionIds.length,
      successfulAssessments: reports.length
    });

    res.json({
      success: true,
      data: {
        assessedSessions: reports.length,
        averageQuality: reports.reduce((sum: number, r: any) => sum + r.score, 0) / reports.length,
        qualityDistribution: {
          trainingReady: reports.filter((r: any) => r.isValid).length,
          needsImprovement: reports.filter((r: any) => !r.isValid).length
        }
      }
    });

  } catch (error) {
    logger.error('Failed to perform batch quality assessment', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform batch quality assessment',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/admin/storage/overview - Storage usage overview
router.get('/storage/overview', async (req, res) => {
  try {
    const [
      screenshotStats,
      archiveStats,
      sessionStats
    ] = await Promise.all([
      prisma.screenshot.aggregate({
        _count: true,
        _sum: { fileSize: true }
      }),
      
      prisma.sessionArchive.aggregate({
        _count: true,
        _sum: { fileSize: true }
      }),
      
      prisma.unifiedSession.count()
    ]);

    const totalStorageUsed = Number(screenshotStats._sum.fileSize || 0) + 
                           Number(archiveStats._sum.fileSize || 0);

    // Estimate costs (rough calculation)
    const estimatedMonthlyCost = (totalStorageUsed / (1024 * 1024 * 1024)) * 0.023; // $0.023 per GB for S3 Standard-IA

    res.json({
      success: true,
      data: {
        storage: {
          screenshots: {
            count: screenshotStats._count,
            totalSize: Number(screenshotStats._sum.fileSize || 0),
            averageSize: screenshotStats._count > 0 ? 
              Number(screenshotStats._sum.fileSize || 0) / screenshotStats._count : 0
          },
          archives: {
            count: archiveStats._count,
            totalSize: Number(archiveStats._sum.fileSize || 0),
            averageSize: archiveStats._count > 0 ? 
              Number(archiveStats._sum.fileSize || 0) / archiveStats._count : 0
          },
          total: {
            size: totalStorageUsed,
            estimatedMonthlyCost: Math.round(estimatedMonthlyCost * 100) / 100
          }
        },
        sessions: {
          total: sessionStats,
          withScreenshots: screenshotStats._count > 0 ? 
            await prisma.unifiedSession.count({
              where: { screenshots: { some: {} } }
            }) : 0,
          withArchives: archiveStats._count > 0 ?
            await prisma.unifiedSession.count({
              where: { archives: { some: {} } }
            }) : 0
        }
      }
    });

  } catch (error) {
    logger.error('Failed to get storage overview', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get storage overview',
      details: getErrorMessage(error)
    });
  }
});

// POST /api/admin/storage/cleanup - Cleanup old storage
router.post('/storage/cleanup', [
  query('olderThanDays').optional().isInt({ min: 1, max: 365 })
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { olderThanDays = 90 } = req.query;

    const storageManager = new StorageManager(prisma);
    // Use optimizeStorage instead of cleanupOldArchives
    const optimizationResult = await storageManager.optimizeStorage();
    const cleanedCount = optimizationResult.archivesOptimized || 0;

    logger.info('Storage cleanup completed', {
      cleanedCount,
      olderThanDays: Number(olderThanDays)
    });

    res.json({
      success: true,
      data: {
        cleanedArchives: cleanedCount,
        olderThanDays: Number(olderThanDays)
      }
    });

  } catch (error) {
    logger.error('Failed to cleanup storage', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup storage',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/admin/training/overview - Training overview
router.get('/training/overview', async (req, res) => {
  try {
    const [
      trainingStats,
      modelStats,
      recentJobs
    ] = await Promise.all([
      prisma.trainingData.groupBy({
        by: ['status'],
        _count: true,
        _avg: { trainingQuality: true }
      }),
      
      prisma.trainingData.count({
        where: { modelId: { not: null } }
      }),
      
      prisma.trainingData.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          sessionId: true,
          status: true,
          trainingQuality: true,
          createdAt: true,
          completedAt: true,
          modelId: true
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        training: trainingStats.reduce((acc, stat) => {
          acc[stat.status] = {
            count: stat._count,
            averageQuality: Math.round(stat._avg.trainingQuality || 0)
          };
          return acc;
        }, {} as Record<string, any>),
        
        models: {
          totalTrained: modelStats
        },
        
        recentJobs
      }
    });

  } catch (error) {
    logger.error('Failed to get training overview', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get training overview',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/admin/system/health - System health check
router.get('/system/health', async (req, res) => {
  try {
    // Check database connectivity
    const dbHealth = await prisma.$queryRaw`SELECT 1 as health`;
    
    // Check recent activity
    const recentActivity = await prisma.unifiedSession.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    });

    // Check for any critical issues
    const criticalIssues = await prisma.qualityReport.count({
      where: {
        validationResults: {
          path: ['criticalIssues'],
          gt: 0
        }
      }
    });

    const health = {
      database: dbHealth ? 'healthy' : 'unhealthy',
      recentActivity: recentActivity > 0 ? 'active' : 'inactive',
      criticalIssues: criticalIssues === 0 ? 'none' : `${criticalIssues} sessions`,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: health
    });

  } catch (error) {
    logger.error('Failed to get system health', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get system health',
      details: getErrorMessage(error)
    });
  }
});

export { router as adminRoutes };