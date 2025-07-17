import * as winston from 'winston';
import * as path from 'path';

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
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

const fileLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

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
export class Logger {
  private context: string;
  private logger: winston.Logger;

  constructor(context: string = 'App') {
    this.context = context;
    this.logger = baseLogger;
  }

  private formatMessage(message: string, meta?: any): string {
    const contextStr = `[${this.context}]`;
    if (meta && typeof meta === 'object') {
      return `${contextStr} ${message} ${JSON.stringify(meta)}`;
    }
    return `${contextStr} ${message}`;
  }

  error(message: string, error?: Error | any, meta?: any): void {
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
    } else if (error && typeof error === 'object') {
      this.logger.error(this.formatMessage(message), {
        error,
        meta,
        context: this.context,
      });
    } else {
      this.logger.error(this.formatMessage(message, meta), {
        context: this.context,
      });
    }
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(this.formatMessage(message, meta), {
      context: this.context,
    });
  }

  info(message: string, meta?: any): void {
    this.logger.info(this.formatMessage(message, meta), {
      context: this.context,
    });
  }

  http(message: string, meta?: any): void {
    this.logger.http(this.formatMessage(message, meta), {
      context: this.context,
    });
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(this.formatMessage(message, meta), {
      context: this.context,
    });
  }

  // Specialized logging methods for common use cases
  logRequest(req: any, res: any, responseTime?: number): void {
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
    } else {
      this.http('HTTP Request', meta);
    }
  }

  logDatabaseQuery(query: string, duration?: number, error?: Error): void {
    const meta = {
      query: query.substring(0, 200), // Truncate long queries
      duration: duration ? `${duration}ms` : undefined,
    };

    if (error) {
      this.error('Database Query Failed', error, meta);
    } else {
      this.debug('Database Query', meta);
    }
  }

  logWebSocketEvent(event: string, clientId?: string, sessionId?: string, meta?: any): void {
    const logMeta = {
      event,
      clientId,
      sessionId,
      ...meta,
    };

    this.debug('WebSocket Event', logMeta);
  }

  logProcessingStep(step: string, sessionId: string, duration?: number, success: boolean = true): void {
    const meta = {
      step,
      sessionId,
      duration: duration ? `${duration}ms` : undefined,
      success,
    };

    if (success) {
      this.info('Processing Step Completed', meta);
    } else {
      this.warn('Processing Step Failed', meta);
    }
  }

  logTrainingEvent(event: string, modelId?: string, jobId?: string, meta?: any): void {
    const logMeta = {
      event,
      modelId,
      jobId,
      ...meta,
    };

    this.info('Training Event', logMeta);
  }

  logQualityCheck(sessionId: string, score: number, issues?: string[]): void {
    const meta = {
      sessionId,
      qualityScore: score,
      issues: issues?.length || 0,
      issueDetails: issues,
    };

    if (score < 50) {
      this.warn('Low Quality Session', meta);
    } else {
      this.info('Quality Check Completed', meta);
    }
  }

  logStorageOperation(operation: string, key?: string, size?: number, success: boolean = true): void {
    const meta = {
      operation,
      key,
      size: size ? `${Math.round(size / 1024)}KB` : undefined,
      success,
    };

    if (success) {
      this.debug('Storage Operation', meta);
    } else {
      this.error('Storage Operation Failed', undefined, meta);
    }
  }

  logPerformanceMetric(metric: string, value: number, unit: string = 'ms'): void {
    const meta = {
      metric,
      value,
      unit,
    };

    this.info('Performance Metric', meta);
  }

  // Method to create child logger with additional context
  child(additionalContext: string): Logger {
    return new Logger(`${this.context}:${additionalContext}`);
  }
}

// Export default logger instance
export default new Logger('UnifiedCodeSight');

// Export logger creation function
export const createLogger = (context: string): Logger => {
  return new Logger(context);
};

// Ensure logs directory exists
import * as fs from 'fs';
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}