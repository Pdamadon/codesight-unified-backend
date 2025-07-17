import { Request, Response, NextFunction } from 'express';
export declare const getErrorMessage: (error: unknown) => string;
export declare const getErrorDetails: (error: unknown) => {
    message: string;
    stack?: string;
    name?: string;
};
export type RouteHandler = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        type: 'admin' | 'worker' | 'system';
        permissions: string[];
    };
}
export type AuthenticatedRouteHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => void | Promise<void>;
export declare const asyncHandler: (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) => (req: Request, res: Response, next: NextFunction) => void;
export declare const asyncAuthHandler: (fn: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
