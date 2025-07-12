import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
export declare const validate: (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => void;
export declare const workerRegistrationSchema: Joi.ObjectSchema<any>;
export declare const sessionStartSchema: Joi.ObjectSchema<any>;
export declare const uploadUrlSchema: Joi.ObjectSchema<any>;
export declare const transcriptionSchema: Joi.ObjectSchema<any>;
export declare const rateLimitByField: (field: string, maxAttempts?: number) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validation.d.ts.map