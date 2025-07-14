import winston from 'winston';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export class Logger {
  private logger: winston.Logger;

  constructor(module: string) {
    const logsDir = './logs';
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.printf(info => {
          return `${info.timestamp} [${module}] ${info.level.toUpperCase()}: ${info.message}${info.stack ? '\n' + info.stack : ''}`;
        })
      ),
      transports: [
        new winston.transports.File({
          filename: join(logsDir, 'error.log'),
          level: 'error'
        }),
        new winston.transports.File({
          filename: join(logsDir, 'combined.log')
        }),
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(info => {
              return `${info.timestamp} [${module}] ${info.level}: ${info.message}`;
            })
          )
        })
      ]
    });
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  verbose(message: string, meta?: any): void {
    this.logger.verbose(message, meta);
  }

  logCollectionStart(site: string, type: 'navigation' | 'extraction'): void {
    this.info(`Starting ${type} collection for ${site}`, {
      site,
      type,
      timestamp: new Date().toISOString()
    });
  }

  logCollectionComplete(site: string, type: 'navigation' | 'extraction', count: number): void {
    this.info(`Completed ${type} collection for ${site}: ${count} examples`, {
      site,
      type,
      count,
      timestamp: new Date().toISOString()
    });
  }

  logTrainingStart(site: string, exampleCount: number): void {
    this.info(`Starting model training for ${site} with ${exampleCount} examples`, {
      site,
      exampleCount,
      timestamp: new Date().toISOString()
    });
  }

  logTrainingComplete(site: string, modelId: string): void {
    this.info(`Model training completed for ${site}: ${modelId}`, {
      site,
      modelId,
      timestamp: new Date().toISOString()
    });
  }

  logError(operation: string, error: Error, context?: any): void {
    this.error(`${operation} failed: ${error.message}`, {
      operation,
      error: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }

  logRetry(operation: string, attempt: number, maxAttempts: number): void {
    this.warn(`Retrying ${operation} (${attempt}/${maxAttempts})`, {
      operation,
      attempt,
      maxAttempts,
      timestamp: new Date().toISOString()
    });
  }

  logRateLimit(site: string, delay: number): void {
    this.debug(`Rate limiting for ${site}: waiting ${delay}ms`, {
      site,
      delay,
      timestamp: new Date().toISOString()
    });
  }
}