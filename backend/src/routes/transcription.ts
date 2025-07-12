import express from 'express';
import OpenAI from 'openai';
import pool from '../database';

const router = express.Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// POST /api/transcription/audio - Transcribe audio file from S3 URL
router.post('/audio', async (req, res) => {
  try {
    const { sessionId, audioUrl } = req.body;
    
    if (!sessionId || !audioUrl) {
      return res.status(400).json({
        error: 'sessionId and audioUrl are required'
      });
    }

    // Verify session exists
    const sessionCheck = await pool.query(
      'SELECT id, worker_id FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    // Transcribe audio using OpenAI Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: audioUrl as any, // OpenAI accepts URLs
      model: 'whisper-1',
      language: 'en',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
    });

    // Update session with transcription
    const updateResult = await pool.query(
      `UPDATE sessions 
       SET transcription = $1, status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [JSON.stringify(transcription), 'transcribed', sessionId]
    );

    res.json({
      success: true,
      transcription: transcription,
      session: updateResult.rows[0],
    });
    return;
  } catch (error: any) {
    console.error('Transcription error:', error);
    
    // Update session status to failed
    try {
      await pool.query(
        'UPDATE sessions SET status = $1 WHERE id = $2',
        ['transcription_failed', req.body.sessionId]
      );
    } catch (dbError) {
      console.error('Failed to update session status:', dbError);
    }

    res.status(500).json({
      error: 'Failed to transcribe audio',
      details: error.message,
    });
    return;
  }
});

// POST /api/transcription/analyze - Analyze transcription for shopping behavior
router.post('/analyze', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        error: 'sessionId is required'
      });
    }

    // Get session with transcription
    const sessionResult = await pool.query(
      'SELECT * FROM sessions WHERE id = $1 AND transcription IS NOT NULL',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Session not found or no transcription available'
      });
    }

    const session = sessionResult.rows[0];
    const transcriptionData = JSON.parse(session.transcription);

    // Analyze shopping behavior using GPT-4
    const analysisPrompt = `
Analyze this transcription of someone's online shopping session. Extract:

1. Shopping Intent: What were they trying to buy?
2. Decision Factors: What influenced their choices?
3. Pain Points: What difficulties did they encounter?
4. Completion Status: Did they complete a purchase?
5. Shopping Patterns: Notable browsing/search behaviors

Transcription:
${transcriptionData.text}

Please provide a structured JSON analysis with the above categories.
`;

    const analysis = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert in analyzing consumer shopping behavior. Provide structured, actionable insights from shopping session transcriptions.',
        },
        {
          role: 'user',
          content: analysisPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const analysisResult = JSON.parse(analysis.choices[0].message.content || '{}');

    // Update session with analysis
    const updateResult = await pool.query(
      `UPDATE sessions 
       SET analysis = $1, status = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [JSON.stringify(analysisResult), 'analyzed', sessionId]
    );

    res.json({
      success: true,
      analysis: analysisResult,
      session: updateResult.rows[0],
    });
    return;
  } catch (error: any) {
    console.error('Analysis error:', error);
    
    // Update session status to failed
    try {
      await pool.query(
        'UPDATE sessions SET status = $1 WHERE id = $2',
        ['analysis_failed', req.body.sessionId]
      );
    } catch (dbError) {
      console.error('Failed to update session status:', dbError);
    }

    res.status(500).json({
      error: 'Failed to analyze transcription',
      details: error.message,
    });
    return;
  }
});

// GET /api/transcription/session/:sessionId - Get transcription and analysis
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    const result = await pool.query(
      'SELECT id, worker_id, transcription, analysis, status, created_at, updated_at FROM sessions WHERE id = $1',
      [sessionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }

    const session = result.rows[0];
    
    res.json({
      success: true,
      session: {
        ...session,
        transcription: session.transcription ? JSON.parse(session.transcription) : null,
        analysis: session.analysis ? JSON.parse(session.analysis) : null,
      },
    });
    return;
  } catch (error) {
    console.error('Get transcription error:', error);
    res.status(500).json({
      error: 'Failed to get transcription data'
    });
    return;
  }
});

export default router;