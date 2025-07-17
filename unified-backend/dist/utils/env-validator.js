"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEnvironment = validateEnvironment;
exports.getConfig = getConfig;
const logger_1 = require("./logger");
const logger = new logger_1.Logger('EnvValidator');
const envConfig = {
    required: [
        'DATABASE_URL',
        'JWT_SECRET',
        'OPENAI_API_KEY',
        'AWS_ACCESS_KEY_ID',
        'AWS_SECRET_ACCESS_KEY',
        'AWS_REGION',
        'S3_BUCKET_NAME'
    ],
    optional: [
        'PORT',
        'NODE_ENV',
        'FRONTEND_URL',
        'REDIS_URL',
        'LOG_LEVEL',
        'RATE_LIMIT_WINDOW_MS',
        'RATE_LIMIT_MAX_REQUESTS',
        'SESSION_TIMEOUT_MINUTES',
        'MAX_SESSIONS_PER_USER',
        'MAX_CONCURRENT_JOBS',
        'JOB_TIMEOUT_MS',
        'MAX_RETRIES',
        'MAX_SCREENSHOT_SIZE_MB',
        'SCREENSHOT_COMPRESSION_QUALITY',
        'DATA_RETENTION_DAYS',
        'ARCHIVE_CLEANUP_INTERVAL_HOURS'
    ]
};
function validateEnvironment() {
    logger.info('Validating environment variables...');
    const missing = [];
    const warnings = [];
    // Check required variables
    for (const varName of envConfig.required) {
        if (!process.env[varName]) {
            missing.push(varName);
        }
    }
    // Check optional variables
    for (const varName of envConfig.optional) {
        if (!process.env[varName]) {
            warnings.push(varName);
        }
    }
    // Report warnings
    if (warnings.length > 0) {
        logger.warn('Optional environment variables not set', {
            variables: warnings,
            message: 'Using default values for these variables'
        });
    }
    // Fail if required variables are missing
    if (missing.length > 0) {
        logger.error('Required environment variables missing', {
            missing,
            message: 'Please set these variables in your .env file'
        });
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    // Validate specific formats
    validateDatabaseUrl();
    validateJwtSecret();
    validateAwsConfig();
    logger.info('Environment validation completed successfully');
}
function validateDatabaseUrl() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl)
        return;
    try {
        const url = new URL(dbUrl);
        if (!['postgresql:', 'postgres:'].includes(url.protocol)) {
            throw new Error('DATABASE_URL must be a PostgreSQL connection string');
        }
    }
    catch (error) {
        logger.error('Invalid DATABASE_URL format', error);
        throw new Error('DATABASE_URL must be a valid PostgreSQL connection string');
    }
}
function validateJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret)
        return;
    if (secret.length < 32) {
        logger.warn('JWT_SECRET is too short', {
            currentLength: secret.length,
            recommendedLength: 32,
            message: 'Consider using a longer secret for better security'
        });
    }
    if (secret === 'your-secret-key' || secret.includes('change-this')) {
        throw new Error('JWT_SECRET appears to be a placeholder. Please generate a secure secret.');
    }
}
function validateAwsConfig() {
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION;
    if (!accessKey || !secretKey)
        return;
    // Basic format validation
    if (accessKey.length < 16 || !accessKey.match(/^[A-Z0-9]+$/)) {
        logger.warn('AWS_ACCESS_KEY_ID format may be incorrect');
    }
    if (!region || !region.match(/^[a-z]{2}-[a-z]+-\d+$/)) {
        logger.warn('AWS_REGION format may be incorrect', {
            current: region,
            example: 'us-east-1'
        });
    }
}
function getConfig() {
    return {
        // Server
        port: parseInt(process.env.PORT || '3001'),
        nodeEnv: process.env.NODE_ENV || 'development',
        // Database
        databaseUrl: process.env.DATABASE_URL,
        // JWT
        jwtSecret: process.env.JWT_SECRET,
        // OpenAI
        openaiApiKey: process.env.OPENAI_API_KEY,
        // AWS
        aws: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION,
            s3BucketName: process.env.S3_BUCKET_NAME
        },
        // Optional configs with defaults
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
        redisUrl: process.env.REDIS_URL,
        logLevel: process.env.LOG_LEVEL || 'info',
        // Rate limiting
        rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
        rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
        // Session
        sessionTimeoutMinutes: parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30'),
        maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER || '5'),
        // Processing
        maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '5'),
        jobTimeoutMs: parseInt(process.env.JOB_TIMEOUT_MS || '300000'),
        maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
        // Screenshots
        maxScreenshotSizeMb: parseFloat(process.env.MAX_SCREENSHOT_SIZE_MB || '5'),
        screenshotCompressionQuality: parseFloat(process.env.SCREENSHOT_COMPRESSION_QUALITY || '0.8'),
        // Data retention
        dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '90'),
        archiveCleanupIntervalHours: parseInt(process.env.ARCHIVE_CLEANUP_INTERVAL_HOURS || '24')
    };
}
