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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = exports.Logger = void 0;
const winston = __importStar(require("winston"));
const path = __importStar(require("path"));
// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};
// Tell winston that you want to link the colors
winston.addColors(colors);
// Define which logs to print based on environment
const level = () => {
    const env = process.env.NODE_ENV || 'development';
    const isDevelopment = env === 'development';
    return isDevelopment ? 'debug' : 'warn';
};
// Define different log formats
const logFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston.format.colorize({ all: true }), winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`));
const fileLogFormat = winston.format.combine(winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston.format.errors({ stack: true }), winston.format.json());
// Define transports
const transports = [
    // Console transport
    new winston.transports.Console({
        format: logFormat,
    }),
    // File transport for errors
    new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'error.log'),
        level: 'error',
        format: fileLogFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }),
    // File transport for all logs
    new winston.transports.File({
        filename: path.join(process.cwd(), 'logs', 'combined.log'),
        format: fileLogFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
    }),
];
// Create the logger
const baseLogger = winston.createLogger({
    level: level(),
    levels,
    transports,
    exitOnError: false,
});
// Create logger class for better organization
class Logger {
    context;
    logger;
    constructor(context = 'App') {
        this.context = context;
        this.logger = baseLogger;
    }
    formatMessage(message, meta) {
        const contextStr = `[${this.context}]`;
        if (meta && typeof meta === 'object') {
            return `${contextStr} ${message} ${JSON.stringify(meta)}`;
        }
        return `${contextStr} ${message}`;
    }
    error(message, error, meta) {
        if (error instanceof Error) {
            this.logger.error(this.formatMessage(message), {
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                },
                meta,
                context: this.context,
            });
        }
        else if (error && typeof error === 'object') {
            this.logger.error(this.formatMessage(message), {
                error,
                meta,
                context: this.context,
            });
        }
        else {
            this.logger.error(this.formatMessage(message, meta), {
                context: this.context,
            });
        }
    }
    warn(message, meta) {
        this.logger.warn(this.formatMessage(message, meta), {
            context: this.context,
        });
    }
    info(message, meta) {
        this.logger.info(this.formatMessage(message, meta), {
            context: this.context,
        });
    }
    http(message, meta) {
        this.logger.http(this.formatMessage(message, meta), {
            context: this.context,
        });
    }
    debug(message, meta) {
        this.logger.debug(this.formatMessage(message, meta), {
            context: this.context,
        });
    }
    // Specialized logging methods for common use cases
    logRequest(req, res, responseTime) {
        const meta = {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            responseTime: responseTime ? `${responseTime}ms` : undefined,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
        };
        if (res.statusCode >= 400) {
            this.warn('HTTP Request', meta);
        }
        else {
            this.http('HTTP Request', meta);
        }
    }
    logDatabaseQuery(query, duration, error) {
        const meta = {
            query: query.substring(0, 200), // Truncate long queries
            duration: duration ? `${duration}ms` : undefined,
        };
        if (error) {
            this.error('Database Query Failed', error, meta);
        }
        else {
            this.debug('Database Query', meta);
        }
    }
    logWebSocketEvent(event, clientId, sessionId, meta) {
        const logMeta = {
            event,
            clientId,
            sessionId,
            ...meta,
        };
        this.debug('WebSocket Event', logMeta);
    }
    logProcessingStep(step, sessionId, duration, success = true) {
        const meta = {
            step,
            sessionId,
            duration: duration ? `${duration}ms` : undefined,
            success,
        };
        if (success) {
            this.info('Processing Step Completed', meta);
        }
        else {
            this.warn('Processing Step Failed', meta);
        }
    }
    logTrainingEvent(event, modelId, jobId, meta) {
        const logMeta = {
            event,
            modelId,
            jobId,
            ...meta,
        };
        this.info('Training Event', logMeta);
    }
    logQualityCheck(sessionId, score, issues) {
        const meta = {
            sessionId,
            qualityScore: score,
            issues: issues?.length || 0,
            issueDetails: issues,
        };
        if (score < 50) {
            this.warn('Low Quality Session', meta);
        }
        else {
            this.info('Quality Check Completed', meta);
        }
    }
    logStorageOperation(operation, key, size, success = true) {
        const meta = {
            operation,
            key,
            size: size ? `${Math.round(size / 1024)}KB` : undefined,
            success,
        };
        if (success) {
            this.debug('Storage Operation', meta);
        }
        else {
            this.error('Storage Operation Failed', undefined, meta);
        }
    }
    logPerformanceMetric(metric, value, unit = 'ms') {
        const meta = {
            metric,
            value,
            unit,
        };
        this.info('Performance Metric', meta);
    }
    // Method to create child logger with additional context
    child(additionalContext) {
        return new Logger(`${this.context}:${additionalContext}`);
    }
}
exports.Logger = Logger;
// Export default logger instance
exports.default = new Logger('UnifiedCodeSight');
// Export logger creation function
const createLogger = (context) => {
    return new Logger(context);
};
exports.createLogger = createLogger;
// Ensure logs directory exists
const fs = __importStar(require("fs"));
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}
