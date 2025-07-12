import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export interface CustomError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

// Global error handler middleware
export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Default error response
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';

  // Handle specific error types
  if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service temporarily unavailable';
  } else if (err.code === '23505') {
    // PostgreSQL unique constraint violation
    statusCode = 409;
    message = 'Resource already exists';
  } else if (err.code === '23503') {
    // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Invalid reference';
  } else if (err.message.includes('invalid input syntax')) {
    statusCode = 400;
    message = 'Invalid input format';
  }

  // Don't expose internal error details in production
  const errorResponse: any = {
    error: message,
    success: false,
  };

  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details;
  }

  res.status(statusCode).json(errorResponse);
};

// 404 handler
export const notFoundHandler = (
  req: Request,
  res: Response
): void => {
  logger.warn('Route not found:', {
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  res.status(404).json({
    error: 'Route not found',
    success: false,
    path: req.path,
  });
};

// Async error wrapper
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};