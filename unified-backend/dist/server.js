"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = require("dotenv");
const http_1 = require("http");
const client_1 = require("@prisma/client");
const websocket_server_1 = require("./services/websocket-server");
const data_processing_pipeline_1 = require("./services/data-processing-pipeline");
const storage_manager_clean_1 = require("./services/storage-manager-clean");
const openai_integration_clean_1 = require("./services/openai-integration-clean");
const quality_control_clean_1 = require("./services/quality-control-clean");
const sessions_1 = require("./routes/sessions");
const interactions_1 = require("./routes/interactions");
const training_1 = require("./routes/training");
const archives_1 = require("./routes/archives");
const admin_1 = require("./routes/admin");
const analytics_1 = require("./routes/analytics");
const error_handler_1 = require("./middleware/error-handler");
const auth_1 = require("./middleware/auth");
const validation_1 = require("./middleware/validation");
const logger_1 = require("./utils/logger");
const env_validator_1 = require("./utils/env-validator");
// Load environment variables
(0, dotenv_1.config)();
// Validate environment variables
try {
    (0, env_validator_1.validateEnvironment)();
}
catch (error) {
    console.error('Environment validation failed:', error);
    process.exit(1);
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
const logger = new logger_1.Logger("UnifiedServer");
// Initialize database
const prisma = new client_1.PrismaClient();
// Initialize services
const storageManager = new storage_manager_clean_1.StorageManager(prisma);
const openaiService = new openai_integration_clean_1.OpenAIIntegrationService();
const qualityControl = new quality_control_clean_1.QualityControlService();
const dataProcessingPipeline = new data_processing_pipeline_1.DataProcessingPipeline(prisma, storageManager, openaiService, qualityControl);
// Security middleware
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "wss:", "ws:"],
        },
    },
}));
// CORS configuration
const allowedOrigins = process.env.NODE_ENV === "production"
    ? [
        process.env.FRONTEND_URL,
        "https://codesight-unified.vercel.app",
        "https://codesight-unified-git-main-peteramadon.vercel.app",
        "https://codesight-unified-peteramadon.vercel.app",
    ].filter(Boolean)
    : [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080",
    ];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin)
            return callback(null, true);
        const isAllowed = allowedOrigins.some((allowed) => {
            if (!allowed || typeof allowed !== "string")
                return false;
            if (origin === allowed)
                return true;
            if (allowed.includes("*")) {
                const pattern = allowed.replace(/\*/g, ".*");
                return new RegExp(pattern).test(origin);
            }
            return false;
        });
        callback(null, isAllowed);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
});
app.use("/api/", limiter);
// Basic middleware
app.use(express_1.default.json({ limit: "50mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "50mb" }));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
}));
// Enhanced validation middleware
app.use((0, validation_1.validateRequestSize)(50 * 1024 * 1024)); // 50MB limit
app.use((0, validation_1.validateContentType)());
app.use(validation_1.sanitizeInput);
// Health check endpoints
app.get("/health", async (_req, res) => {
    try {
        // Check database connection
        await prisma.$queryRaw `SELECT 1`;
        res.json({
            status: "healthy",
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: process.env.NODE_ENV || "development",
            version: "2.0.0",
            services: {
                database: "connected",
                storage: await storageManager.healthCheck(),
                openai: await openaiService.healthCheck(),
                processing: dataProcessingPipeline.getStatus(),
            },
        });
    }
    catch (error) {
        logger.error("Health check failed", error);
        res.status(503).json({
            status: "unhealthy",
            error: error instanceof Error ? error.message : "Unknown error",
            timestamp: new Date().toISOString(),
        });
    }
});
app.get("/api/health", (_req, res) => {
    res.json({
        status: "API healthy - Unified CodeSight v2.0",
        timestamp: new Date().toISOString(),
    });
});
// Database status endpoint
app.get("/api/status", async (_req, res) => {
    try {
        const [sessionCount, interactionCount, screenshotCount, archiveCount, trainingCount,] = await Promise.all([
            prisma.unifiedSession.count(),
            prisma.interaction.count(),
            prisma.screenshot.count(),
            prisma.sessionArchive.count(),
            prisma.trainingData.count(),
        ]);
        const recentSessions = await prisma.unifiedSession.findMany({
            take: 5,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                type: true,
                status: true,
                qualityScore: true,
                createdAt: true,
            },
        });
        res.json({
            success: true,
            data: {
                counts: {
                    sessions: sessionCount,
                    interactions: interactionCount,
                    screenshots: screenshotCount,
                    archives: archiveCount,
                    trainingData: trainingCount,
                },
                recentSessions,
                processing: {
                    queueSize: dataProcessingPipeline.getQueueSize(),
                    activeJobs: dataProcessingPipeline.getActiveJobs(),
                    completedToday: await dataProcessingPipeline.getCompletedToday(),
                },
            },
        });
    }
    catch (error) {
        logger.error("Status check failed", error);
        res.status(500).json({
            success: false,
            error: "Failed to get system status",
            details: error instanceof Error ? error.message : "Unknown error",
        });
    }
});
// API Routes with middleware
app.use("/api/sessions", auth_1.authRateLimit, auth_1.authBruteForceProtection, auth_1.authMiddleware, validation_1.validationMiddleware, sessions_1.sessionRoutes);
app.use("/api/interactions", auth_1.authRateLimit, auth_1.authBruteForceProtection, auth_1.authMiddleware, validation_1.validationMiddleware, interactions_1.interactionRoutes);
app.use("/api/training", auth_1.authRateLimit, auth_1.authBruteForceProtection, auth_1.authMiddleware, validation_1.validationMiddleware, training_1.trainingRoutes);
app.use("/api/archives", auth_1.authRateLimit, auth_1.authBruteForceProtection, auth_1.authMiddleware, validation_1.validationMiddleware, archives_1.archiveRoutes);
app.use("/api/admin", auth_1.authRateLimit, auth_1.authBruteForceProtection, auth_1.authMiddleware, admin_1.adminRoutes);
app.use("/api/analytics", auth_1.authRateLimit, auth_1.authBruteForceProtection, auth_1.authMiddleware, analytics_1.analyticsRoutes);
// Legacy compatibility endpoints (for gradual migration)
app.use("/api/workers", auth_1.authMiddleware, (req, res) => {
    res.status(301).json({
        message: "This endpoint has been moved to /api/sessions",
        newEndpoint: "/api/sessions",
        migration: "Please update your client to use the new unified API",
    });
});
app.use("/api/extension", auth_1.authMiddleware, (req, res) => {
    res.status(301).json({
        message: "Extension endpoints have been moved to /api/sessions",
        newEndpoint: "/api/sessions",
        migration: "Please update your extension to use the new unified API",
    });
});
// Error handlers
app.use("*", error_handler_1.notFoundHandler);
app.use(error_handler_1.errorHandler);
// Graceful shutdown
const gracefulShutdown = async (signal) => {
    logger.info(`${signal} received: starting graceful shutdown`);
    try {
        // Close WebSocket connections
        if (websocketServer) {
            await websocketServer.close();
        }
        // Stop processing pipeline
        await dataProcessingPipeline.stop();
        // Close database connections
        await prisma.$disconnect();
        logger.info("Graceful shutdown completed");
        process.exit(0);
    }
    catch (error) {
        logger.error("Error during shutdown", error);
        process.exit(1);
    }
};
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
// Create HTTP server
const server = (0, http_1.createServer)(app);
// Initialize WebSocket server
let websocketServer;
// Start server
server.listen(PORT, () => {
    logger.info("🚀 Unified CodeSight Server started", {
        port: PORT,
        environment: process.env.NODE_ENV || "development",
        healthEndpoint: `http://localhost:${PORT}/health`,
        apiEndpoint: `http://localhost:${PORT}/api`,
        websocketEndpoint: `ws://localhost:${PORT}/ws`,
        version: "2.0.0",
    });
    // Initialize WebSocket server after HTTP server is listening
    try {
        websocketServer = new websocket_server_1.UnifiedWebSocketServer(server, dataProcessingPipeline);
        logger.info("✅ WebSocket server initialized");
    }
    catch (error) {
        logger.error("❌ Failed to initialize WebSocket server", error);
        process.exit(1);
    }
});
// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
    logger.error("Uncaught Exception", error);
    process.exit(1);
});
process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at Promise", { reason, promise });
    process.exit(1);
});
exports.default = app;
