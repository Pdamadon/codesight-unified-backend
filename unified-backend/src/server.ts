import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { config } from "dotenv";
import { createServer } from "http";
import { prisma } from "./lib/database";

import { UnifiedWebSocketServer } from "./services/websocket-server";
import { DataProcessingPipeline } from "./services/data-processing-pipeline";
import { StorageManager } from "./services/storage-manager-clean";
import { OpenAIIntegrationService } from "./services/openai-integration-clean";
import { QualityControlService } from "./services/quality-control-clean";

import { sessionRoutes } from "./routes/sessions";
import { interactionRoutes } from "./routes/interactions";
import { trainingRoutes } from "./routes/training";
import { archiveRoutes } from "./routes/archives";
import { adminRoutes } from "./routes/admin";
import { analyticsRoutes } from "./routes/analytics";
import testRoutes from "./routes/test";
import taskRoutes from "./routes/tasks";

import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { authMiddleware, authRateLimit, authBruteForceProtection } from "./middleware/auth";
import { validationMiddleware, sanitizeInput, validateRequestSize, validateContentType } from "./middleware/validation";
import { Logger } from "./utils/logger";
import { validateEnvironment, getConfig } from "./utils/env-validator";

// Load environment variables
config();

// Validate environment variables
try {
  validateEnvironment();
} catch (error) {
  console.error('Environment validation failed:', error);
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;
const logger = new Logger("UnifiedServer");

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

// Initialize database
// Using shared prisma instance from lib/database

// Initialize services
const storageManager = new StorageManager(prisma);
const openaiService = new OpenAIIntegrationService();
const qualityControl = new QualityControlService();
const dataProcessingPipeline = new DataProcessingPipeline(
  prisma,
  storageManager,
  openaiService,
  qualityControl
);

// Make services available to routes via app.locals
app.locals.prisma = prisma;
app.locals.storageManager = storageManager;
app.locals.openaiService = openaiService;
app.locals.qualityControl = qualityControl;
app.locals.dataProcessingPipeline = dataProcessingPipeline;

// Security middleware
app.use(
  helmet({
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
  })
);

// CORS configuration
const allowedOrigins =
  process.env.NODE_ENV === "production"
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

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      // Allow browser extension origins
      if (origin && origin.startsWith('chrome-extension://')) {
        return callback(null, true);
      }
      
      // Allow moz-extension for Firefox
      if (origin && origin.startsWith('moz-extension://')) {
        return callback(null, true);
      }

      const isAllowed = allowedOrigins.some((allowed) => {
        if (!allowed || typeof allowed !== "string") return false;
        if (origin === allowed) return true;
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
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "x-api-key"],
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Basic middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(compression());
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Enhanced validation middleware  
app.use(validateRequestSize(50 * 1024 * 1024)); // 50MB limit

// Apply content type validation to all routes except WebSocket endpoint
app.use((req, res, next) => {
  if (req.path === '/ws') {
    return next(); // Skip validation for WebSocket endpoint
  }
  validateContentType()(req, res, next);
});

app.use(sanitizeInput);

// Health check endpoints
app.get("/health", async (_req, res) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

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
  } catch (error) {
    logger.error("Health check failed", error);
    res.status(503).json({
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Extension config endpoint (accessible without auth)
app.get("/config", (req, res) => {
  logger.info('Extension config endpoint accessed');
  logger.info('X_API_KEY value:', process.env.X_API_KEY ? 'exists' : 'undefined');
  res.json({
    success: true,
    config: {
      apiKey: process.env.X_API_KEY,
      apiBaseUrl: `https://${req.get('host')}`,
      websocketUrl: `wss://${req.get('host')}/ws`
    },
    debug: {
      hasApiKey: !!process.env.X_API_KEY,
      allKeys: Object.keys(process.env).filter(k => k.includes('API'))
    }
  });
});

// Privacy policy page
app.get("/privacy-policy", (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodeSight Shopping Assistant - Privacy Policy</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
        h1 { color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px; }
        h2 { color: #555; margin-top: 30px; }
        .last-updated { background: #f5f5f5; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
    </style>
</head>
<body>
    <h1>CodeSight Shopping Assistant - Privacy Policy</h1>
    
    <div class="last-updated">
        <strong>Last Updated:</strong> July 24, 2025
    </div>

    <h2>1. Overview</h2>
    <p>CodeSight Shopping Assistant is a browser extension designed to enhance your online shopping experience while contributing to AI research. We prioritize user privacy and never collect personal information.</p>

    <h2>2. Data We Collect</h2>
    <ul>
        <li>Anonymous website interaction patterns on supported e-commerce sites</li>
        <li>Non-personal browsing behavior and navigation flows</li>
        <li>Task completion metrics and usage statistics</li>
        <li>Anonymous screenshots with comprehensive PII filtering</li>
        <li>Performance and technical diagnostic data</li>
    </ul>

    <h2>3. Data We DO NOT Collect</h2>
    <ul>
        <li>Personal identifiable information (names, addresses, phone numbers)</li>
        <li>Payment or financial information (credit cards, banking details)</li>
        <li>Passwords or login credentials</li>
        <li>Email addresses or contact information</li>
        <li>Location data beyond website URLs</li>
        <li>Personal communications or messages</li>
    </ul>

    <h2>4. How We Protect Your Privacy</h2>
    <ul>
        <li>Comprehensive PII filtering technology that automatically removes sensitive information</li>
        <li>Secure API authentication with encrypted data transmission</li>
        <li>No local storage of sensitive information</li>
        <li>Access restricted to legitimate e-commerce websites only</li>
        <li>Regular security audits and updates</li>
    </ul>

    <h2>5. User Consent and Control</h2>
    <ul>
        <li>Explicit consent required before any data collection begins</li>
        <li>Users can revoke consent at any time through extension settings</li>
        <li>Clear disclosure of all data collection practices</li>
        <li>Users maintain full control over data collection preferences</li>
    </ul>

    <h2>6. How We Use Your Data</h2>
    <p>Data is used exclusively for:</p>
    <ul>
        <li>AI training and machine learning research</li>
        <li>Improving shopping recommendation systems</li>
        <li>Academic research on user behavior patterns</li>
        <li>Enhancing user experience through personalized shopping tasks</li>
        <li>Developing better privacy-preserving AI technologies</li>
    </ul>

    <h2>7. Data Sharing and Third Parties</h2>
    <p>We do NOT sell, rent, or share your data with third parties. All data is used solely for internal research purposes and academic collaboration.</p>

    <h2>8. Data Retention</h2>
    <p>Anonymous behavioral data is retained for research purposes. No personal information is retained as none is collected. Users can request data deletion by contacting us.</p>

    <h2>9. Supported Websites</h2>
    <p>Our extension only operates on pre-approved e-commerce and service provider websites including Amazon, Target, Nike, Best Buy, Nordstrom, and 80+ other legitimate shopping destinations.</p>

    <h2>10. Children's Privacy</h2>
    <p>Our extension is not intended for use by children under 13. We do not knowingly collect data from children under 13 years of age.</p>

    <h2>11. International Users</h2>
    <p>This extension complies with GDPR, CCPA, and other international privacy regulations. Users in all regions have the right to data access, correction, and deletion.</p>

    <h2>12. Changes to This Policy</h2>
    <p>We may update this privacy policy from time to time. Users will be notified of any material changes through the extension interface.</p>

    <h2>13. Contact Information</h2>
    <p>For privacy questions, concerns, or data deletion requests, please contact us at:</p>
    <p><strong>Email:</strong> [Your email address]<br>
    <strong>Website:</strong> https://gentle-vision-production.up.railway.app</p>

    <h2>14. Legal Compliance</h2>
    <p>This extension and its data practices comply with:</p>
    <ul>
        <li>Chrome Web Store Developer Program Policies</li>
        <li>General Data Protection Regulation (GDPR)</li>
        <li>California Consumer Privacy Act (CCPA)</li>
        <li>Children's Online Privacy Protection Act (COPPA)</li>
    </ul>
</body>
</html>
  `;
  res.send(html);
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
    const [
      sessionCount,
      interactionCount,
      screenshotCount,
      archiveCount,
      trainingCount,
    ] = await Promise.all([
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
  } catch (error) {
    logger.error("Status check failed", error);
    res.status(500).json({
      success: false,
      error: "Failed to get system status",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Test endpoint for development (bypasses auth)
app.use("/api/test", testRoutes);

// Extension config endpoint (public - no auth required) 
app.get("/api/config", (req, res) => {
  logger.info('Config endpoint accessed');
  res.json({
    success: true,
    config: {
      apiKey: process.env.X_API_KEY,
      apiBaseUrl: `https://${req.get('host')}`,
      websocketUrl: `wss://${req.get('host')}/ws`
    }
  });
});

// API Routes with middleware
app.use("/api/sessions", authRateLimit as any, authBruteForceProtection as any, authMiddleware as any, validationMiddleware as any, sessionRoutes);
app.use(
  "/api/interactions",
  authRateLimit as any,
  authBruteForceProtection as any,
  authMiddleware as any,
  validationMiddleware as any,
  interactionRoutes
);
app.use("/api/training", authRateLimit as any, authBruteForceProtection as any, authMiddleware as any, validationMiddleware as any, trainingRoutes);
app.use("/api/archives", authRateLimit as any, authBruteForceProtection as any, authMiddleware as any, validationMiddleware as any, archiveRoutes);
app.use("/api/admin", authRateLimit as any, authBruteForceProtection as any, authMiddleware as any, adminRoutes);
app.use("/api/analytics", authRateLimit as any, authBruteForceProtection as any, authMiddleware as any, analyticsRoutes);
app.use("/api/tasks", authRateLimit as any, authBruteForceProtection as any, authMiddleware as any, validationMiddleware as any, taskRoutes);

// Legacy compatibility endpoints (for gradual migration)
app.use("/api/workers", authMiddleware as any, (req, res) => {
  res.status(301).json({
    message: "This endpoint has been moved to /api/sessions",
    newEndpoint: "/api/sessions",
    migration: "Please update your client to use the new unified API",
  });
});

app.use("/api/extension", authMiddleware as any, (req, res) => {
  res.status(301).json({
    message: "Extension endpoints have been moved to /api/sessions",
    newEndpoint: "/api/sessions",
    migration: "Please update your extension to use the new unified API",
  });
});

// Error handlers
app.use("*", notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
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
  } catch (error) {
    logger.error("Error during shutdown", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
let websocketServer: UnifiedWebSocketServer;

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
    websocketServer = new UnifiedWebSocketServer(server, dataProcessingPipeline);
    logger.info("✅ WebSocket server initialized");
  } catch (error) {
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

export default app;
