import express from 'express';
import pool from '../database';

const router = express.Router();

// POST /api/sessions - Create new session with combined data
router.post('/', async (req, res) => {
  try {
    const { 
      workerId, 
      scenario, 
      duration, 
      interactionEvents, 
      extensionData,
      videoFileKey,
      audioFileKey,
      sessionId 
    } = req.body;
    
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

    // Combine all session data
    const combinedSessionData = {
      scenario,
      duration,
      interactionEvents: interactionEvents || [],
      extensionData: extensionData || null,
      hasVideo: !!videoFileKey,
      hasAudio: !!audioFileKey,
      extensionSessionId: sessionId
    };

    // Create video URLs if file keys provided
    const videoUrl = videoFileKey ? 
      `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${videoFileKey}` : 
      null;
    const audioUrl = audioFileKey ? 
      `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${audioFileKey}` : 
      null;

    const result = await pool.query(
      `INSERT INTO sessions (worker_id, session_data, video_url, audio_url, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, worker_id, status, created_at`,
      [workerId, JSON.stringify(combinedSessionData), videoUrl, audioUrl, 'completed']
    );

    // Link extension session if provided
    if (sessionId && extensionData) {
      try {
        await pool.query(
          'UPDATE extension_sessions SET worker_id = $1 WHERE session_id = $2',
          [workerId, sessionId]
        );
      } catch (error) {
        console.warn('Failed to link extension session:', error);
      }
    }

    res.status(201).json({
      success: true,
      data: {
        sessionId: result.rows[0].id,
        combinedData: {
          hasVideo: !!videoUrl,
          hasAudio: !!audioUrl,
          hasExtensionData: !!extensionData,
          clickCount: extensionData?.clickEvents?.length || 0,
          totalInteractions: (extensionData?.clickEvents?.length || 0) + 
                            (extensionData?.inputEvents?.length || 0) + 
                            (extensionData?.scrollEvents?.length || 0)
        }
      }
    });
    return;
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ 
      error: 'Failed to create session' 
    });
    return;
  }
});

// POST /api/sessions/start - Start new recording session (legacy support)
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