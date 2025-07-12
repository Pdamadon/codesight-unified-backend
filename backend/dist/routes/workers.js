"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../database"));
const uuid_1 = require("uuid");
const validation_1 = require("../middleware/validation");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.post('/register', (0, validation_1.rateLimitByField)('email', 3), (0, validation_1.validate)(validation_1.workerRegistrationSchema), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { firstName, lastName, email, age, country, experience, paypalEmail, timezone, availability } = req.body;
    const workerId = (0, uuid_1.v4)();
    const workerData = {
        firstName,
        lastName,
        age,
        country,
        experience,
        timezone,
        availability
    };
    try {
        const result = await database_1.default.query(`INSERT INTO workers (worker_id, email, paypal_email, worker_data, status, consent_given)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING worker_id, email, status, created_at`, [workerId, email, paypalEmail, JSON.stringify(workerData), 'active', true]);
        return res.status(201).json({
            success: true,
            data: {
                workerId: result.rows[0].worker_id
            }
        });
    }
    catch (error) {
        if (error.code === '23505' && error.constraint?.includes('email')) {
            const existingUser = await database_1.default.query('SELECT worker_id FROM workers WHERE email = $1', [email]);
            if (existingUser.rows.length > 0) {
                return res.status(200).json({
                    success: true,
                    data: {
                        workerId: existingUser.rows[0].worker_id
                    },
                    message: 'Welcome back! Continuing with your existing account.'
                });
            }
        }
        throw error;
    }
}));
router.get('/:workerId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { workerId } = req.params;
    const result = await database_1.default.query('SELECT worker_id, email, paypal_email, worker_data, status, created_at FROM workers WHERE worker_id = $1', [workerId]);
    if (result.rows.length === 0) {
        return res.status(404).json({
            error: 'Worker not found'
        });
    }
    res.json({
        success: true,
        worker: result.rows[0]
    });
    return;
}));
router.put('/:workerId/status', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { workerId } = req.params;
    const { status } = req.body;
    if (!status) {
        return res.status(400).json({
            error: 'Status is required'
        });
    }
    const result = await database_1.default.query('UPDATE workers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE worker_id = $2 RETURNING *', [status, workerId]);
    if (result.rows.length === 0) {
        return res.status(404).json({
            error: 'Worker not found'
        });
    }
    res.json({
        success: true,
        worker: result.rows[0]
    });
    return;
}));
exports.default = router;
//# sourceMappingURL=workers.js.map