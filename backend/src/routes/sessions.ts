import express from 'express';
import pool from '../database';

const router = express.Router();

// POST /api/sessions/start - Start new recording session
router.post('/start', async (req, res) => {
  try {
    const { workerId, sessionData } = req.body;
    
    if (!workerId) {
      return res.status(400).json({ 
        error: 'Worker ID is required' 
      });
    }

    // Verify worker exists
    const workerCheck = await pool.query(
      'SELECT worker_id FROM workers WHERE worker_id = $1',
      [workerId]
    );

    if (workerCheck.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Worker not found' 
      });
    }

    const result = await pool.query(
      `INSERT INTO sessions (worker_id, session_data, status)
       VALUES ($1, $2, $3)
       RETURNING id, worker_id, status, created_at`,
      [workerId, sessionData || {}, 'recording']
    );

    res.status(201).json({
      success: true,
      session: result.rows[0]
    });
    return;
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ 
      error: 'Failed to start session' 
    });
    return;
  }
});

// PUT /api/sessions/:sessionId/upload - Upload video/audio URLs
router.put('/:sessionId/upload', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { videoUrl, audioUrl } = req.body;
    
    if (!videoUrl && !audioUrl) {
      return res.status(400).json({ 
        error: 'At least one media URL is required' 
      });
    }

    const result = await pool.query(
      `UPDATE sessions 
       SET video_url = $1, audio_url = $2, status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [videoUrl, audioUrl, 'uploaded', sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Session not found' 
      });
    }

    res.json({
      success: true,
      session: result.rows[0]
    });
    return;
  } catch (error) {
    console.error('Upload session error:', error);
    res.status(500).json({ 
      error: 'Failed to upload session data' 
    });
    return;
  }
});

// GET /api/sessions/:sessionId - Get session info
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Session not found' 
      });
    }

    res.json({
      success: true,
      session: result.rows[0]
    });
    return;
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ 
      error: 'Failed to get session info' 
    });
    return;
  }
});

// GET /api/sessions/worker/:workerId - Get sessions for worker
router.get('/worker/:workerId', async (req, res) => {
  try {
    const { workerId } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM sessions WHERE worker_id = $1 ORDER BY created_at DESC',
      [workerId]
    );

    res.json({
      success: true,
      sessions: result.rows
    });
    return;
  } catch (error) {
    console.error('Get worker sessions error:', error);
    res.status(500).json({ 
      error: 'Failed to get worker sessions' 
    });
    return;
  }
});

export default router;