import { Router, Request, Response, NextFunction } from 'express';
import { param, query, validationResult } from 'express-validator';
import { Logger } from '../utils/logger';
import { StorageManager } from '../services/storage-manager-clean';
import { PrismaClient } from '@prisma/client';
import { getErrorMessage } from '../utils/type-helpers';

const router = Router();
const logger = new Logger('ArchiveRoutes');
const prisma = new PrismaClient();

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

// GET /api/archives - List session archives
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['CREATING', 'UPLOADING', 'COMPLETED', 'FAILED']),
  query('sessionId').optional().isUUID()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      sessionId
    } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (sessionId) where.sessionId = sessionId;

    const totalCount = await prisma.sessionArchive.count({ where });

    const archives = await prisma.sessionArchive.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        session: {
          select: {
            id: true,
            type: true,
            status: true,
            qualityScore: true,
            createdAt: true
          }
        }
      }
    });

    // Convert BigInt to number for JSON serialization
    const serializedArchives = archives.map(archive => ({
      ...archive,
      fileSize: Number(archive.fileSize)
    }));

    res.json({
      success: true,
      data: {
        archives: serializedArchives,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / Number(limit))
        }
      }
    });

  } catch (error) {
    logger.error('Failed to list archives', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list archives',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/archives/:id - Get specific archive
router.get('/:id', [
  param('id').isUUID()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const archive = await prisma.sessionArchive.findUnique({
      where: { id },
      include: {
        session: {
          select: {
            id: true,
            type: true,
            status: true,
            qualityScore: true,
            createdAt: true,
            endTime: true,
            workerId: true
          }
        }
      }
    });

    if (!archive) {
      return res.status(404).json({
        success: false,
        error: 'Archive not found'
      });
    }

    // Parse manifest
    let manifest = null;
    try {
      manifest = JSON.parse(archive.manifest as string);
    } catch (e) {
      logger.warn('Failed to parse archive manifest', { archiveId: id });
    }

    const serializedArchive = {
      ...archive,
      fileSize: Number(archive.fileSize),
      manifest
    };

    res.json({
      success: true,
      data: serializedArchive
    });

  } catch (error) {
    logger.error('Failed to get archive', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get archive',
      details: getErrorMessage(error)
    });
  }
});

// POST /api/archives/create/:sessionId - Create archive for session
router.post('/create/:sessionId', [
  param('sessionId').isUUID()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Use transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Check if session exists
      const session = await tx.unifiedSession.findUnique({
        where: { id: sessionId }
      });

      if (!session) {
        throw new Error('Session not found');
      }

      // Check if archive already exists
      const existingArchive = await tx.sessionArchive.findFirst({
        where: { sessionId, status: 'COMPLETED' }
      });

      if (existingArchive) {
        throw new Error('Archive already exists for this session');
      }

      // Create archive placeholder record
      const archiveRecord = await tx.sessionArchive.create({
        data: {
          sessionId,
          status: 'CREATING',
          s3Bucket: process.env.S3_BUCKET || 'codesight-archives',
          s3Key: `temp-${sessionId}-${Date.now()}`,
          fileSize: BigInt(0),
          checksum: '',
          manifest: {},
          createdAt: new Date()
        }
      });

      return { session, archiveRecord };
    });

    // Create archive (outside transaction to avoid long-running operations)
    const storageManager = new StorageManager(prisma);
    const archiveResult = await storageManager.createSessionArchive(sessionId);

    // Update archive record with completion data
    await prisma.sessionArchive.update({
      where: { id: result.archiveRecord.id },
      data: {
        status: 'COMPLETED',
        s3Key: archiveResult.s3Key,
        fileSize: archiveResult.fileSize,
        compressionRatio: archiveResult.compressionRatio,
        checksum: archiveResult.checksum
      }
    });

    logger.info('Archive created successfully', {
      sessionId,
      s3Key: archiveResult.s3Key,
      fileSize: archiveResult.fileSize
    });

    res.json({
      success: true,
      data: {
        archiveId: result.archiveRecord.id,
        s3Key: archiveResult.s3Key,
        fileSize: archiveResult.fileSize,
        compressionRatio: archiveResult.compressionRatio,
        checksum: archiveResult.checksum
      }
    });

  } catch (error) {
    logger.error('Failed to create archive', error);
    
    if (getErrorMessage(error) === 'Session not found') {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }
    
    if (getErrorMessage(error) === 'Archive already exists for this session') {
      return res.status(409).json({
        success: false,
        error: 'Archive already exists for this session'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create archive',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/archives/:id/download - Get download URL for archive
router.get('/:id/download', [
  param('id').isUUID(),
  query('expiresIn').optional().isInt({ min: 300, max: 86400 }) // 5 minutes to 24 hours
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { expiresIn = 3600 } = req.query; // Default 1 hour

    const archive = await prisma.sessionArchive.findUnique({
      where: { id }
    });

    if (!archive) {
      return res.status(404).json({
        success: false,
        error: 'Archive not found'
      });
    }

    if (archive.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'Archive is not ready for download',
        data: { status: archive.status }
      });
    }

    const storageManager = new StorageManager(prisma);
    const downloadUrl = await storageManager.generateArchiveDownloadUrl(archive.sessionId, Number(expiresIn));

    logger.info('Download URL generated', {
      archiveId: id,
      expiresIn: Number(expiresIn)
    });

    res.json({
      success: true,
      data: {
        downloadUrl,
        expiresIn: Number(expiresIn),
        fileSize: Number(archive.fileSize),
        filename: `session_${archive.sessionId}.zip`
      }
    });

  } catch (error) {
    logger.error('Failed to generate download URL', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate download URL',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/archives/session/:sessionId - Get archives for specific session
router.get('/session/:sessionId', [
  param('sessionId').isUUID()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    const archives = await prisma.sessionArchive.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' }
    });

    const serializedArchives = archives.map(archive => ({
      ...archive,
      fileSize: Number(archive.fileSize),
      manifest: archive.manifest ? JSON.parse(archive.manifest as string) : null
    }));

    res.json({
      success: true,
      data: {
        archives: serializedArchives,
        count: archives.length
      }
    });

  } catch (error) {
    logger.error('Failed to get session archives', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get session archives',
      details: getErrorMessage(error)
    });
  }
});

// DELETE /api/archives/:id - Delete archive (mark as archived)
router.delete('/:id', [
  param('id').isUUID()
], handleValidationErrors, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const archive = await prisma.sessionArchive.findUnique({
      where: { id }
    });

    if (!archive) {
      return res.status(404).json({
        success: false,
        error: 'Archive not found'
      });
    }

    // Actually delete the archive record (hard delete)
    await prisma.sessionArchive.delete({
      where: { id }
    });

    logger.info('Archive deleted', { archiveId: id });

    res.json({
      success: true,
      message: 'Archive deleted',
      data: { id }
    });

  } catch (error) {
    logger.error('Failed to delete archive', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete archive',
      details: getErrorMessage(error)
    });
  }
});

// GET /api/archives/stats/overview - Archive statistics
router.get('/stats/overview', async (req, res) => {
  try {
    const [
      totalArchives,
      completedArchives,
      failedArchives,
      archiveStats,
      recentArchives
    ] = await Promise.all([
      prisma.sessionArchive.count(),
      prisma.sessionArchive.count({ where: { status: 'COMPLETED' } }),
      prisma.sessionArchive.count({ where: { status: 'FAILED' } }),
      prisma.sessionArchive.aggregate({
        _sum: { fileSize: true },
        _avg: { compressionRatio: true }
      }),
      prisma.sessionArchive.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          sessionId: true,
          status: true,
          fileSize: true,
          compressionRatio: true,
          createdAt: true
        }
      })
    ]);

    const serializedRecentArchives = recentArchives.map(archive => ({
      ...archive,
      fileSize: Number(archive.fileSize)
    }));

    res.json({
      success: true,
      data: {
        overview: {
          totalArchives,
          completedArchives,
          failedArchives,
          totalSize: Number(archiveStats._sum.fileSize || 0),
          averageCompressionRatio: archiveStats._avg.compressionRatio || 0,
          successRate: totalArchives > 0 ? 
            Math.round((completedArchives / totalArchives) * 100) : 0
        },
        recentArchives: serializedRecentArchives
      }
    });

  } catch (error) {
    logger.error('Failed to get archive statistics', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get archive statistics',
      details: getErrorMessage(error)
    });
  }
});

export { router as archiveRoutes };