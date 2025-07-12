"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../database"));
const router = express_1.default.Router();
router.post('/', async (req, res) => {
    try {
        const { workerId, scenario, duration, interactionEvents, extensionData, videoFileKey, audioFileKey, sessionId } = req.body;
        if (!workerId) {
            return res.status(400).json({
                error: 'Worker ID is required'
            });
        }
        const workerCheck = await database_1.default.query('SELECT worker_id FROM workers WHERE worker_id = $1', [workerId]);
        if (workerCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Worker not found'
            });
        }
        const combinedSessionData = {
            scenario,
            duration,
            interactionEvents: interactionEvents || [],
            extensionData: extensionData || null,
            hasVideo: !!videoFileKey,
            hasAudio: !!audioFileKey,
            extensionSessionId: sessionId
        };
        const videoUrl = videoFileKey ?
            `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${videoFileKey}` :
            null;
        const audioUrl = audioFileKey ?
            `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${audioFileKey}` :
            null;
        const result = await database_1.default.query(`INSERT INTO sessions (worker_id, session_data, video_url, audio_url, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, worker_id, status, created_at`, [workerId, JSON.stringify(combinedSessionData), videoUrl, audioUrl, 'completed']);
        if (sessionId && extensionData) {
            try {
                await database_1.default.query('UPDATE extension_sessions SET worker_id = $1 WHERE session_id = $2', [workerId, sessionId]);
            }
            catch (error) {
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
    }
    catch (error) {
        console.error('Create session error:', error);
        res.status(500).json({
            error: 'Failed to create session'
        });
        return;
    }
});
router.post('/start', async (req, res) => {
    try {
        const { workerId, sessionData } = req.body;
        if (!workerId) {
            return res.status(400).json({
                error: 'Worker ID is required'
            });
        }
        const workerCheck = await database_1.default.query('SELECT worker_id FROM workers WHERE worker_id = $1', [workerId]);
        if (workerCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Worker not found'
            });
        }
        const result = await database_1.default.query(`INSERT INTO sessions (worker_id, session_data, status)
       VALUES ($1, $2, $3)
       RETURNING id, worker_id, status, created_at`, [workerId, sessionData || {}, 'recording']);
        res.status(201).json({
            success: true,
            session: result.rows[0]
        });
        return;
    }
    catch (error) {
        console.error('Start session error:', error);
        res.status(500).json({
            error: 'Failed to start session'
        });
        return;
    }
});
router.put('/:sessionId/upload', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { videoUrl, audioUrl } = req.body;
        if (!videoUrl && !audioUrl) {
            return res.status(400).json({
                error: 'At least one media URL is required'
            });
        }
        const result = await database_1.default.query(`UPDATE sessions 
       SET video_url = $1, audio_url = $2, status = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`, [videoUrl, audioUrl, 'uploaded', sessionId]);
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
    }
    catch (error) {
        console.error('Upload session error:', error);
        res.status(500).json({
            error: 'Failed to upload session data'
        });
        return;
    }
});
router.get('/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await database_1.default.query('SELECT * FROM sessions WHERE id = $1', [sessionId]);
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
    }
    catch (error) {
        console.error('Get session error:', error);
        res.status(500).json({
            error: 'Failed to get session info'
        });
        return;
    }
});
router.get('/worker/:workerId', async (req, res) => {
    try {
        const { workerId } = req.params;
        const result = await database_1.default.query('SELECT * FROM sessions WHERE worker_id = $1 ORDER BY created_at DESC', [workerId]);
        res.json({
            success: true,
            sessions: result.rows
        });
        return;
    }
    catch (error) {
        console.error('Get worker sessions error:', error);
        res.status(500).json({
            error: 'Failed to get worker sessions'
        });
        return;
    }
});
exports.default = router;
//# sourceMappingURL=sessions.js.map