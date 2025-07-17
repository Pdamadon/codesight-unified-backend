import { Request, Response, NextFunction } from 'express';

// Helper function to get error message from unknown error type
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return String(error);
};

// Helper function to get error details from unknown error type
export const getErrorDetails = (error: unknown): { message: string; stack?: string; name?: string } => {
  if (error instanceof Error) {
    return {
      message: error.message,
      stack: error.stack,
      name: error.name
    };
  }
  if (typeof error === 'string') {
    return { message: error };
  }
  return { message: String(error) };
};

// Type for Express route handlers with proper typing
export type RouteHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

// Type for authenticated request
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    type: 'admin' | 'worker' | 'system';
    permissions: string[];
  };
}

// Type for route handler with authentication
export type AuthenticatedRouteHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => void | Promise<void>;

// Helper function to safely handle async route handlers
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Helper function to safely handle async authenticated route handlers
export const asyncAuthHandler = (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};