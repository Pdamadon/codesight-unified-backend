"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitByField = exports.transcriptionSchema = exports.uploadUrlSchema = exports.sessionStartSchema = exports.workerRegistrationSchema = exports.validate = void 0;
const joi_1 = __importDefault(require("joi"));
const validate = (schema) => {
    return (req, res, next) => {
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
exports.validate = validate;
exports.workerRegistrationSchema = joi_1.default.object({
    firstName: joi_1.default.string().min(1).max(50).required(),
    lastName: joi_1.default.string().min(1).max(50).required(),
    email: joi_1.default.string().email().required(),
    age: joi_1.default.number().min(18).max(100).required(),
    country: joi_1.default.string().min(2).max(100).required(),
    experience: joi_1.default.string().valid('beginner', 'intermediate', 'expert').required(),
    paypalEmail: joi_1.default.string().email().required(),
    timezone: joi_1.default.string().required(),
    availability: joi_1.default.array().items(joi_1.default.string()).default([]),
});
exports.sessionStartSchema = joi_1.default.object({
    workerId: joi_1.default.string().uuid().required(),
    sessionData: joi_1.default.object({
        scenario: joi_1.default.string(),
        startTime: joi_1.default.date(),
        expectedDuration: joi_1.default.number().min(1).max(3600),
    }),
});
exports.uploadUrlSchema = joi_1.default.object({
    fileName: joi_1.default.string().min(1).max(255).required(),
    fileType: joi_1.default.string().valid('video/mp4', 'video/webm', 'video/quicktime', 'audio/mp3', 'audio/wav', 'audio/webm').required(),
    workerId: joi_1.default.string().uuid().required(),
});
exports.transcriptionSchema = joi_1.default.object({
    sessionId: joi_1.default.number().integer().positive().required(),
    audioUrl: joi_1.default.string().uri().required(),
});
const rateLimitByField = (field, maxAttempts = 5) => {
    const attempts = new Map();
    return (req, res, next) => {
        const identifier = req.body[field] || req.ip;
        const now = Date.now();
        const windowMs = 15 * 60 * 1000;
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
        }
        else {
            attempts.set(identifier, {
                count: 1,
                resetTime: now + windowMs,
            });
        }
        next();
    };
};
exports.rateLimitByField = rateLimitByField;
//# sourceMappingURL=validation.js.map