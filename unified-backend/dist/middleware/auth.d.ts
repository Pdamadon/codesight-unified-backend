import { Request, Response, NextFunction } from 'express';
export declare const authRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const authBruteForceProtection: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
interface AuthRequest extends Request {
    user?: {
        id: string;
        type: 'admin' | 'worker' | 'system';
        permissions: string[];
    };
}
export declare const authMiddleware: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
export declare const requirePermission: (permission: string) => (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const requireAdmin: (req: AuthRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const generateToken: (payload: any, expiresIn?: string) => string;
export declare const optionalAuth: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export {};
