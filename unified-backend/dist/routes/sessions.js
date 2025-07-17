"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionRoutes = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const express_validator_1 = require("express-validator");
const logger_1 = require("../utils/logger");
const type_helpers_1 = require("../utils/type-helpers");
const router = (0, express_1.Router)();
exports.sessionRoutes = router;
const prisma = new client_1.PrismaClient();
const logger = new logger_1.Logger('SessionRoutes');
// Validation middleware
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
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
    (0, express_validator_1.query)('page').optional().isInt({ min: 1 }),
    (0, express_validator_1.query)('limit').optional().isInt({ min: 1, max: 100 }),
    (0, express_validator_1.query)('type').optional().isIn(['HUMAN', 'AUTOMATED', 'HYBRID']),
    (0, express_validator_1.query)('status').optional().isIn(['ACTIVE', 'PAUSED', 'COMPLETED', 'PROCESSING', 'ARCHIVED', 'FAILED']),
    (0, express_validator_1.query)('minQuality').optional().isFloat({ min: 0, max: 100 }),
    (0, express_validator_1.query)('workerId').optional().isString(),
    (0, express_validator_1.query)('startDate').optional().isISO8601(),
    (0, express_validator_1.query)('endDate').optional().isISO8601()
], handleValidationErrors, async (req, res) => {
    try {
        const { page = 1, limit = 20, type, status, minQuality, workerId, startDate, endDate } = req.query;
        // Build filter conditions
        const where = {};
        if (type)
            where.type = type;
        if (status)
            where.status = status;
        if (minQuality)
            where.qualityScore = { gte: parseFloat(minQuality) };
        if (workerId)
            where.workerId = workerId;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = new Date(startDate);
            if (endDate)
                where.createdAt.lte = new Date(endDate);
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
    }
    catch (error) {
        logger.error('Failed to list sessions', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list sessions',
            details: (0, type_helpers_1.getErrorMessage)(error)
        });
    }
});
// GET /api/sessions/:id - Get specific session with details
router.get('/:id', [
    (0, express_validator_1.param)('id').isUUID()
], handleValidationErrors, async (req, res) => {
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
    }
    catch (error) {
        logger.error('Failed to get session', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get session',
            details: (0, type_helpers_1.getErrorMessage)(error)
        });
    }
});
// POST /api/sessions - Create new session
router.post('/', [
    (0, express_validator_1.body)('type').optional().isIn(['HUMAN', 'AUTOMATED', 'HYBRID']),
    (0, express_validator_1.body)('workerId').optional().isString(),
    (0, express_validator_1.body)('config').optional().isObject(),
    (0, express_validator_1.body)('userAgent').optional().isString(),
    (0, express_validator_1.body)('ipAddress').optional().isIP()
], handleValidationErrors, async (req, res) => {
    try {
        const { type = 'HUMAN', workerId, config = {}, userAgent, ipAddress } = req.body;
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
    }
    catch (error) {
        logger.error('Failed to create session', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create session',
            details: (0, type_helpers_1.getErrorMessage)(error)
        });
    }
});
// PUT /api/sessions/:id - Update session
router.put('/:id', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('status').optional().isIn(['ACTIVE', 'PAUSED', 'COMPLETED', 'PROCESSING', 'ARCHIVED', 'FAILED']),
    (0, express_validator_1.body)('config').optional().isObject(),
    (0, express_validator_1.body)('qualityScore').optional().isFloat({ min: 0, max: 100 }),
    (0, express_validator_1.body)('completeness').optional().isFloat({ min: 0, max: 100 }),
    (0, express_validator_1.body)('reliability').optional().isFloat({ min: 0, max: 100 })
], handleValidationErrors, async (req, res) => {
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
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        logger.error('Failed to update session', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update session',
            details: (0, type_helpers_1.getErrorMessage)(error)
        });
    }
});
// POST /api/sessions/:id/complete - Complete session and trigger processing
router.post('/:id/complete', [
    (0, express_validator_1.param)('id').isUUID(),
    (0, express_validator_1.body)('summary').optional().isObject(),
    (0, express_validator_1.body)('finalQualityCheck').optional().isBoolean()
], handleValidationErrors, async (req, res) => {
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
        const dataProcessingPipeline = req.app.locals.dataProcessingPipeline;
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
    }
    catch (error) {
        logger.error('Failed to complete session', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete session',
            details: (0, type_helpers_1.getErrorMessage)(error)
        });
    }
});
// GET /api/sessions/:id/quality - Get quality report for session
router.get('/:id/quality', [
    (0, express_validator_1.param)('id').isUUID()
], handleValidationErrors, async (req, res) => {
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
    }
    catch (error) {
        logger.error('Failed to get quality report', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get quality report',
            details: (0, type_helpers_1.getErrorMessage)(error)
        });
    }
});
// GET /api/sessions/:id/training-data - Get training data for session
router.get('/:id/training-data', [
    (0, express_validator_1.param)('id').isUUID()
], handleValidationErrors, async (req, res) => {
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
    }
    catch (error) {
        logger.error('Failed to get training data', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get training data',
            details: (0, type_helpers_1.getErrorMessage)(error)
        });
    }
});
// DELETE /api/sessions/:id - Delete session (soft delete)
router.delete('/:id', [
    (0, express_validator_1.param)('id').isUUID()
], handleValidationErrors, async (req, res) => {
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
    }
    catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        logger.error('Failed to delete session', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete session',
            details: (0, type_helpers_1.getErrorMessage)(error)
        });
    }
});
// GET /api/sessions/stats - Get session statistics
router.get('/stats/overview', async (req, res) => {
    try {
        const [totalSessions, activeSessions, completedSessions, processingStats, qualityStats] = await Promise.all([
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
                    }, {})
                },
                quality: {
                    averageScore: qualityStats._avg.qualityScore || 0,
                    minScore: qualityStats._min.qualityScore || 0,
                    maxScore: qualityStats._max.qualityScore || 0
                },
                recentSessions
            }
        });
    }
    catch (error) {
        logger.error('Failed to get session stats', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get session stats',
            details: (0, type_helpers_1.getErrorMessage)(error)
        });
    }
});
