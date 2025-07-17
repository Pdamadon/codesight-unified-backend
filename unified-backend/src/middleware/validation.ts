import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, FieldValidationError } from 'express-validator';
import { Logger } from '../utils/logger';

const logger = new Logger('ValidationMiddleware');

export const validationMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: errors.array(),
      body: req.body
    });

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(error => {
        const fieldError = error as FieldValidationError;
        return {
          field: fieldError.path,
          message: fieldError.msg,
          value: fieldError.value
        };
      })
    });
  }

  next();
};

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Validation failed', {
        path: req.path,
        method: req.method,
        errors: errors.array()
      });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array().map(error => {
          const fieldError = error as FieldValidationError;
          return {
            field: fieldError.path,
            message: fieldError.msg,
            value: fieldError.value,
            location: fieldError.location
          };
        })
      });
    }

    next();
  };
};

// Custom validation functions
export const validateSessionId = (value: string): boolean => {
  // Session ID should be UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

export const validateTimestamp = (value: any): boolean => {
  // Timestamp should be a valid Unix timestamp (in milliseconds)
  const timestamp = parseInt(value);
  return !isNaN(timestamp) && timestamp > 0 && timestamp <= Date.now() + 86400000; // Allow up to 1 day in future
};

export const validateSelector = (value: string): boolean => {
  // Basic CSS selector validation
  if (!value || typeof value !== 'string') return false;
  
  // Check for common selector patterns
  const selectorPatterns = [
    /^#[\w-]+$/, // ID selector
    /^\.[\w-]+$/, // Class selector
    /^\w+$/, // Tag selector
    /^\[[\w-]+(="[^"]*")?\]$/, // Attribute selector
    /^[\w-]+(\[[\w-]+(="[^"]*")?\])*$/ // Tag with attributes
  ];
  
  return selectorPatterns.some(pattern => pattern.test(value)) || value.length < 200;
};

export const validateInteractionType = (value: string): boolean => {
  const validTypes = [
    'CLICK', 'INPUT', 'SCROLL', 'NAVIGATION', 'HOVER', 
    'FOCUS', 'BLUR', 'FORM_SUBMIT', 'KEY_PRESS', 'DRAG', 'DROP', 'TOUCH'
  ];
  return validTypes.includes(value);
};

export const validateQualityScore = (value: any): boolean => {
  const score = parseFloat(value);
  return !isNaN(score) && score >= 0 && score <= 100;
};

export const validateCoordinates = (value: any): boolean => {
  if (typeof value !== 'object' || value === null) return false;
  
  const { x, y } = value;
  return typeof x === 'number' && typeof y === 'number' && 
         x >= 0 && y >= 0 && x <= 10000 && y <= 10000; // Reasonable screen size limits
};

export const validateViewport = (value: any): boolean => {
  if (typeof value !== 'object' || value === null) return false;
  
  const { width, height } = value;
  return typeof width === 'number' && typeof height === 'number' && 
         width > 0 && height > 0 && width <= 5000 && height <= 5000;
};

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Sanitize common fields to prevent XSS and injection attacks
  const sanitizeString = (str: string): string => {
    if (typeof str !== 'string') return str;
    
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/data:text\/html/gi, '') // Remove data URLs
      .replace(/vbscript:/gi, '') // Remove vbscript: protocol
      .replace(/expression\(/gi, '') // Remove CSS expression
      .trim();
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

export const validateRequestSize = (maxSize: number = 50 * 1024 * 1024) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('content-length');
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      logger.warn('Request size limit exceeded', {
        contentLength: parseInt(contentLength),
        maxSize,
        path: req.path,
        method: req.method
      });
      
      return res.status(413).json({
        success: false,
        error: 'Request entity too large',
        message: `Request size must be less than ${maxSize / 1024 / 1024}MB`,
        limit: maxSize
      });
    }
    
    next();
  };
};

export const validateContentType = (allowedTypes: string[] = ['application/json', 'application/x-www-form-urlencoded', 'multipart/form-data']) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('content-type');
    
    if (req.method === 'GET' || req.method === 'DELETE') {
      return next();
    }
    
    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      logger.warn('Invalid content type', {
        contentType,
        allowedTypes,
        path: req.path,
        method: req.method
      });
      
      return res.status(415).json({
        success: false,
        error: 'Unsupported media type',
        message: 'Content-Type must be one of: ' + allowedTypes.join(', '),
        received: contentType
      });
    }
    
    next();
  };
};

export const rateLimitByUser = (maxRequests: number, windowMs: number) => {
  const requests = new Map<string, { count: number; resetTime: number }>();

  return (req: any, res: Response, next: NextFunction) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    
    // Clean up expired entries
    const entries = Array.from(requests.entries());
    for (const [key, value] of entries) {
      if (now > value.resetTime) {
        requests.delete(key);
      }
    }
    
    // Check current user's requests
    const userRequests = requests.get(userId);
    
    if (!userRequests) {
      requests.set(userId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (now > userRequests.resetTime) {
      requests.set(userId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (userRequests.count >= maxRequests) {
      logger.warn('Rate limit exceeded', {
        userId,
        path: req.path,
        count: userRequests.count,
        limit: maxRequests
      });

      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        message: `Too many requests. Limit: ${maxRequests} per ${windowMs / 1000} seconds`,
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
      });
    }
    
    userRequests.count++;
    next();
  };
};

export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file && !req.files) {
    return next();
  }

  let file: Express.Multer.File | undefined;
  
  if (req.file) {
    file = req.file;
  } else if (req.files) {
    if (Array.isArray(req.files)) {
      file = req.files[0];
    } else {
      // req.files is an object with field names as keys
      const firstField = Object.keys(req.files)[0];
      if (firstField) {
        file = req.files[firstField][0];
      }
    }
  }
  
  if (!file) {
    return res.status(400).json({
      success: false,
      error: 'No file provided'
    });
  }

  // Check file size (50MB limit)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return res.status(400).json({
      success: false,
      error: 'File too large',
      message: `File size must be less than ${maxSize / 1024 / 1024}MB`
    });
  }

  // Check file type
  const allowedTypes = [
    'image/png', 'image/jpeg', 'image/webp',
    'audio/webm', 'audio/wav', 'audio/mp3',
    'application/json', 'text/plain',
    'application/zip'
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file type',
      message: 'Only images, audio, JSON, text, and ZIP files are allowed'
    });
  }

  next();
};