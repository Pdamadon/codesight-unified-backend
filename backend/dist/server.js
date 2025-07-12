"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = require("dotenv");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = __importDefault(require("./utils/logger"));
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false
}));
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === 'production'
        ? process.env.FRONTEND_URL
        : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true
}));
app.use(express_1.default.json({ limit: '100mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '100mb' }));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)('combined'));
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});
console.log('🔍 Starting route imports...');
let workersRouter;
try {
    const workersModule = require('./routes/workers');
    workersRouter = workersModule.default || workersModule;
    console.log('✅ Workers router imported:', !!workersRouter);
}
catch (error) {
    console.error('❌ Workers router failed:', error instanceof Error ? error.message : String(error));
}
let sessionsRouter;
try {
    const sessionsModule = require('./routes/sessions');
    sessionsRouter = sessionsModule.default || sessionsModule;
    console.log('✅ Sessions router imported:', !!sessionsRouter);
}
catch (error) {
    console.error('❌ Sessions router failed:', error instanceof Error ? error.message : String(error));
}
let uploadRouter;
try {
    const uploadModule = require('./routes/upload');
    uploadRouter = uploadModule.default || uploadModule;
    console.log('✅ Upload router imported:', !!uploadRouter);
}
catch (error) {
    console.error('❌ Upload router failed:', error instanceof Error ? error.message : String(error));
}
let transcriptionRouter;
try {
    const transcriptionModule = require('./routes/transcription');
    transcriptionRouter = transcriptionModule.default || transcriptionModule;
    console.log('✅ Transcription router imported:', !!transcriptionRouter);
}
catch (error) {
    console.error('❌ Transcription router failed:', error instanceof Error ? error.message : String(error));
}
console.log('📦 Route import phase completed');
app.get('/api/health', (_req, res) => {
    res.json({ status: 'API healthy - v2.0' });
});
app.post('/api/migrate', async (_req, res) => {
    try {
        const { runMigrations } = await Promise.resolve().then(() => __importStar(require('./database/migrate')));
        const result = await runMigrations();
        res.json(result);
    }
    catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({ error: 'Migration failed', details: error });
    }
});
console.log('🔍 Starting route registration...');
if (workersRouter) {
    app.use('/api/workers', workersRouter);
    console.log('✅ Workers routes registered');
}
else {
    console.log('❌ Workers routes skipped - router not loaded');
}
if (sessionsRouter) {
    app.use('/api/sessions', sessionsRouter);
    console.log('✅ Sessions routes registered');
}
else {
    console.log('❌ Sessions routes skipped - router not loaded');
}
if (uploadRouter) {
    app.use('/api/upload', uploadRouter);
    console.log('✅ Upload routes registered');
}
else {
    console.log('❌ Upload routes skipped - router not loaded');
}
if (transcriptionRouter) {
    app.use('/api/transcription', transcriptionRouter);
    console.log('✅ Transcription routes registered');
}
else {
    console.log('❌ Transcription routes skipped - router not loaded');
}
console.log('🚀 Route registration phase completed');
app.use('*', errorHandler_1.notFoundHandler);
app.use(errorHandler_1.errorHandler);
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    process.exit(0);
});
app.listen(PORT, () => {
    logger_1.default.info('Server started successfully', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        healthEndpoint: `http://localhost:${PORT}/health`,
    });
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
exports.default = app;
//# sourceMappingURL=server.js.map