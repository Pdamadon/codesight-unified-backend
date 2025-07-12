import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      
      res.status(400).json({
        error: 'Validation failed',
        success: false,
        details: errors,
      });
      return;
    }
    
    next();
  };
};

// Common validation schemas
export const workerRegistrationSchema = Joi.object({
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  email: Joi.string().email().required(),
  age: Joi.number().min(18).max(100).required(),
  country: Joi.string().min(2).max(100).required(),
  experience: Joi.string().valid('beginner', 'intermediate', 'expert').required(),
  paypalEmail: Joi.string().email().required(),
  timezone: Joi.string().required(),
  availability: Joi.array().items(Joi.string()).default([]),
});

export const sessionStartSchema = Joi.object({
  workerId: Joi.string().uuid().required(),
  sessionData: Joi.object({
    scenario: Joi.string(),
    startTime: Joi.date(),
    expectedDuration: Joi.number().min(1).max(3600), // 1 second to 1 hour
  }),
});

export const uploadUrlSchema = Joi.object({
  fileName: Joi.string().min(1).max(255).required(),
  fileType: Joi.string().valid(
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mp3', 'audio/wav', 'audio/webm'
  ).required(),
  workerId: Joi.string().uuid().required(),
});

export const transcriptionSchema = Joi.object({
  sessionId: Joi.number().integer().positive().required(),
  audioUrl: Joi.string().uri().required(),
});

// Rate limiting validation
export const rateLimitByField = (field: string, maxAttempts: number = 5) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();
  
  return (req: Request, res: Response, next: NextFunction): void => {
    const identifier = req.body[field] || req.ip;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // 15 minutes
    
    const record = attempts.get(identifier);
    
    if (record && now < record.resetTime) {
      if (record.count >= maxAttempts) {
        res.status(429).json({
          error: 'Too many attempts',
          success: false,
          retryAfter: Math.ceil((record.resetTime - now) / 1000),
        });
        return;
      }
      record.count++;
    } else {
      attempts.set(identifier, {
        count: 1,
        resetTime: now + windowMs,
      });
    }
    
    next();
  };
};