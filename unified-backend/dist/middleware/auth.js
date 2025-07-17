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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.generateToken = exports.requireAdmin = exports.requirePermission = exports.authMiddleware = exports.authBruteForceProtection = exports.authRateLimit = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const logger_1 = require("../utils/logger");
const security_privacy_1 = require("../services/security-privacy");
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const logger = new logger_1.Logger('AuthMiddleware');
const securityService = new security_privacy_1.SecurityPrivacyService();
// Strict rate limiting for authentication endpoints
exports.authRateLimit = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Limit each IP to 10 auth requests per windowMs
    message: {
        success: false,
        error: 'Too many authentication attempts',
        message: 'Please try again later',
        retryAfter: 15 * 60 // 15 minutes in seconds
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limit by IP and user agent combination for better security
        return `${req.ip}-${req.get('user-agent') || 'unknown'}`;
    },
    handler: (req, res) => {
        logger.warn('Authentication rate limit exceeded', {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            path: req.path
        });
        res.status(429).json({
            success: false,
            error: 'Too many authentication attempts',
            message: 'Please try again later',
            retryAfter: 15 * 60
        });
    }
});
// Failed authentication tracking
const failedAttempts = new Map();
const trackFailedAuth = (identifier) => {
    const now = Date.now();
    const attempt = failedAttempts.get(identifier) || { count: 0, lastAttempt: 0 };
    // Reset count if last attempt was more than 1 hour ago
    if (now - attempt.lastAttempt > 60 * 60 * 1000) {
        attempt.count = 0;
    }
    attempt.count++;
    attempt.lastAttempt = now;
    // Block for increasingly longer periods
    if (attempt.count >= 5) {
        const blockDuration = Math.min(attempt.count * 5 * 60 * 1000, 60 * 60 * 1000); // Max 1 hour
        attempt.blockedUntil = now + blockDuration;
    }
    failedAttempts.set(identifier, attempt);
};
const isBlocked = (identifier) => {
    const attempt = failedAttempts.get(identifier);
    if (!attempt || !attempt.blockedUntil)
        return false;
    if (Date.now() > attempt.blockedUntil) {
        // Block expired, reset
        attempt.blockedUntil = undefined;
        attempt.count = 0;
        failedAttempts.set(identifier, attempt);
        return false;
    }
    return true;
};
const authBruteForceProtection = (req, res, next) => {
    const identifier = `${req.ip}-${req.get('user-agent') || 'unknown'}`;
    if (isBlocked(identifier)) {
        const attempt = failedAttempts.get(identifier);
        const remainingTime = Math.ceil((attempt.blockedUntil - Date.now()) / 1000);
        logger.warn('Blocked authentication attempt', {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            remainingTime
        });
        return res.status(429).json({
            success: false,
            error: 'Too many failed authentication attempts',
            message: 'Account temporarily blocked due to multiple failed login attempts',
            retryAfter: remainingTime
        });
    }
    // Store identifier for potential failure tracking
    req.authIdentifier = identifier;
    next();
};
exports.authBruteForceProtection = authBruteForceProtection;
const authMiddleware = async (req, res, next) => {
    try {
        // Extract token from header
        const authHeader = req.headers.authorization;
        const apiKey = req.headers['x-api-key'];
        let token = null;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        }
        else if (apiKey) {
            // Handle API key authentication
            const isValid = await validateApiKey(apiKey);
            if (isValid) {
                req.user = {
                    id: 'api-user',
                    type: 'system',
                    permissions: ['read', 'write']
                };
                return next();
            }
        }
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'Please provide a valid token or API key'
            });
        }
        // Verify JWT token
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            logger.error('JWT_SECRET environment variable is not set');
            return res.status(500).json({
                success: false,
                error: 'Server configuration error',
                message: 'Authentication service is not properly configured'
            });
        }
        const decoded = jwt.verify(token, jwtSecret);
        req.user = {
            id: decoded.id || decoded.sub,
            type: decoded.type || 'worker',
            permissions: decoded.permissions || ['read']
        };
        logger.debug('User authenticated', {
            userId: req.user.id,
            type: req.user.type,
            path: req.path
        });
        next();
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorName = error instanceof Error ? error.name : 'UnknownError';
        logger.warn('Authentication failed', {
            error: errorMessage,
            path: req.path,
            ip: req.ip
        });
        if (errorName === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Invalid token',
                message: 'The provided token is invalid'
            });
        }
        if (errorName === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expired',
                message: 'The provided token has expired'
            });
        }
        // Track failed authentication attempt
        const identifier = req.authIdentifier;
        if (identifier) {
            trackFailedAuth(identifier);
        }
        res.status(401).json({
            success: false,
            error: 'Authentication failed',
            message: 'Unable to authenticate request'
        });
    }
};
exports.authMiddleware = authMiddleware;
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        if (!req.user.permissions.includes(permission) && !req.user.permissions.includes('admin')) {
            logger.warn('Permission denied', {
                userId: req.user.id,
                requiredPermission: permission,
                userPermissions: req.user.permissions,
                path: req.path
            });
            return res.status(403).json({
                success: false,
                error: 'Permission denied',
                message: `This action requires '${permission}' permission`
            });
        }
        next();
    };
};
exports.requirePermission = requirePermission;
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    if (req.user.type !== 'admin') {
        logger.warn('Admin access denied', {
            userId: req.user.id,
            userType: req.user.type,
            path: req.path
        });
        return res.status(403).json({
            success: false,
            error: 'Admin access required',
            message: 'This endpoint requires administrator privileges'
        });
    }
    next();
};
exports.requireAdmin = requireAdmin;
async function validateApiKey(apiKey) {
    try {
        const result = await securityService.validateApiKey(apiKey);
        return result.isValid;
    }
    catch (error) {
        logger.error('API key validation failed', error);
        return false;
    }
}
const generateToken = (payload, expiresIn = '24h') => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new Error('JWT_SECRET environment variable is not set');
    }
    return jwt.sign(payload, jwtSecret, { expiresIn });
};
exports.generateToken = generateToken;
const optionalAuth = async (req, res, next) => {
    try {
        // Try to authenticate, but don't fail if no auth provided
        const authHeader = req.headers.authorization;
        const apiKey = req.headers['x-api-key'];
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const jwtSecret = process.env.JWT_SECRET || 'your-secret-key';
            const decoded = jwt.verify(token, jwtSecret);
            req.user = {
                id: decoded.id || decoded.sub,
                type: decoded.type || 'worker',
                permissions: decoded.permissions || ['read']
            };
        }
        else if (apiKey) {
            const isValid = await validateApiKey(apiKey);
            if (isValid) {
                req.user = {
                    id: 'api-user',
                    type: 'system',
                    permissions: ['read', 'write']
                };
            }
        }
        next();
    }
    catch (error) {
        // Continue without authentication
        next();
    }
};
exports.optionalAuth = optionalAuth;
