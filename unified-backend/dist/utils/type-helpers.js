"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncAuthHandler = exports.asyncHandler = exports.getErrorDetails = exports.getErrorMessage = void 0;
// Helper function to get error message from unknown error type
const getErrorMessage = (error) => {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return String(error);
};
exports.getErrorMessage = getErrorMessage;
// Helper function to get error details from unknown error type
const getErrorDetails = (error) => {
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
exports.getErrorDetails = getErrorDetails;
// Helper function to safely handle async route handlers
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
// Helper function to safely handle async authenticated route handlers
const asyncAuthHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncAuthHandler = asyncAuthHandler;
