"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.notFoundHandler = exports.errorHandler = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
const errorHandler = (err, req, res, _next) => {
    logger_1.default.error('Error occurred:', {
        error: err.message,
        stack: err.stack,
        statusCode: err.statusCode,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
    });
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';
    if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        statusCode = 503;
        message = 'Service temporarily unavailable';
    }
    else if (err.code === '23505') {
        statusCode = 409;
        message = 'Resource already exists';
    }
    else if (err.code === '23503') {
        statusCode = 400;
        message = 'Invalid reference';
    }
    else if (err.message.includes('invalid input syntax')) {
        statusCode = 400;
        message = 'Invalid input format';
    }
    const errorResponse = {
        error: message,
        success: false,
    };
    if (process.env.NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
        errorResponse.details = err.details;
    }
    res.status(statusCode).json(errorResponse);
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    logger_1.default.warn('Route not found:', {
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
exports.notFoundHandler = notFoundHandler;
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=errorHandler.js.map