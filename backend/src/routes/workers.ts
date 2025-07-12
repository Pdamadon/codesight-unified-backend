import express from 'express';
import pool from '../database';
import { v4 as uuidv4 } from 'uuid';
import { validate, workerRegistrationSchema, rateLimitByField } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// POST /api/workers/register - Register new worker
router.post('/register', 
  rateLimitByField('email', 3),
  validate(workerRegistrationSchema),
  asyncHandler(async (req, res) => {
    const { firstName, lastName, email, age, country, experience, paypalEmail, timezone, availability } = req.body;

    const workerId = uuidv4();
    
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
      const result = await pool.query(
        `INSERT INTO workers (worker_id, email, paypal_email, worker_data, status, consent_given)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING worker_id, email, status, created_at`,
        [workerId, email, paypalEmail, JSON.stringify(workerData), 'active', true]
      );

      return res.status(201).json({
        success: true,
        data: {
          workerId: result.rows[0].worker_id
        }
      });
    } catch (error: any) {
      // Handle duplicate email
      if (error.code === '23505' && error.constraint?.includes('email')) {
        // Check if user exists and return their workerId
        const existingUser = await pool.query(
          'SELECT worker_id FROM workers WHERE email = $1',
          [email]
        );
        
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
      throw error; // Re-throw if not a duplicate email error
    }
  }));

// GET /api/workers/:workerId - Get worker info
router.get('/:workerId', asyncHandler(async (req, res) => {
    const { workerId } = req.params;
    
    const result = await pool.query(
      'SELECT worker_id, email, paypal_email, worker_data, status, created_at FROM workers WHERE worker_id = $1',
      [workerId]
    );

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

// PUT /api/workers/:workerId/status - Update worker status
router.put('/:workerId/status', asyncHandler(async (req, res) => {
    const { workerId } = req.params;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        error: 'Status is required' 
      });
    }

    const result = await pool.query(
      'UPDATE workers SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE worker_id = $2 RETURNING *',
      [status, workerId]
    );

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

export default router;