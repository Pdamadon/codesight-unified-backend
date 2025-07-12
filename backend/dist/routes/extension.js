"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = __importDefault(require("../database"));
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.get('/sessions/:sessionId/data', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sessionId } = req.params;
    try {
        const sessionResult = await database_1.default.query('SELECT * FROM extension_sessions WHERE session_id = $1', [sessionId]);
        if (sessionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Extension session not found'
            });
        }
        const eventsResult = await database_1.default.query('SELECT * FROM extension_events WHERE session_id = $1 ORDER BY timestamp ASC', [sessionId]);
        const session = sessionResult.rows[0];
        const events = eventsResult.rows;
        const organizedData = {
            sessionInfo: {
                sessionId: session.session_id,
                status: session.status,
                startTime: session.start_time,
                endTime: session.end_time,
                totalEvents: session.total_events,
                userAgent: session.user_agent,
                summary: session.session_summary
            },
            clickEvents: events.filter(e => e.event_type === 'click').map(e => ({
                timestamp: e.timestamp,
                selector: e.event_data.selector,
                element: e.event_data.element,
                text: e.event_data.text,
                coordinates: e.event_data.coordinates,
                attributes: e.event_data.attributes,
                url: e.event_data.url,
                sessionTime: e.event_data.sessionTime
            })),
            inputEvents: events.filter(e => e.event_type === 'input').map(e => ({
                timestamp: e.timestamp,
                selector: e.event_data.selector,
                inputType: e.event_data.inputType,
                value: e.event_data.value,
                label: e.event_data.label,
                url: e.event_data.url,
                sessionTime: e.event_data.sessionTime
            })),
            scrollEvents: events.filter(e => e.event_type === 'scroll').map(e => ({
                timestamp: e.timestamp,
                scrollX: e.event_data.scrollX,
                scrollY: e.event_data.scrollY,
                url: e.event_data.url,
                sessionTime: e.event_data.sessionTime
            })),
            navigationEvents: events.filter(e => e.event_type === 'navigation').map(e => ({
                timestamp: e.timestamp,
                url: e.event_data.url,
                title: e.event_data.title,
                sessionTime: e.event_data.sessionTime
            })),
            statistics: {
                totalClicks: events.filter((e) => e.event_type === 'click').length,
                totalInputs: events.filter((e) => e.event_type === 'input').length,
                totalScrolls: events.filter((e) => e.event_type === 'scroll').length,
                totalNavigations: events.filter((e) => e.event_type === 'navigation').length,
                pagesVisited: [...new Set(events.map((e) => e.event_data.url).filter(Boolean))],
                sessionDuration: session.end_time ?
                    new Date(session.end_time).getTime() - new Date(session.start_time).getTime() :
                    null
            }
        };
        res.json({
            success: true,
            data: organizedData
        });
        return;
    }
    catch (error) {
        console.error('Error fetching extension data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch extension data'
        });
        return;
    }
}));
router.get('/sessions/:sessionId/training-data', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sessionId } = req.params;
    try {
        const mainSessionResult = await database_1.default.query('SELECT * FROM sessions WHERE worker_id IN (SELECT worker_id FROM extension_sessions WHERE session_id = $1)', [sessionId]);
        const extensionResult = await database_1.default.query(`
      SELECT es.*, array_agg(
        json_build_object(
          'type', ee.event_type,
          'timestamp', ee.timestamp,
          'data', ee.event_data
        ) ORDER BY ee.timestamp
      ) as events
      FROM extension_sessions es
      LEFT JOIN extension_events ee ON es.session_id = ee.session_id
      WHERE es.session_id = $1
      GROUP BY es.id
    `, [sessionId]);
        if (extensionResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Training data not found'
            });
        }
        const trainingData = {
            sessionId: sessionId,
            mediaFiles: {
                videoUrl: mainSessionResult.rows[0]?.video_url || null,
                audioUrl: mainSessionResult.rows[0]?.audio_url || null
            },
            interactions: extensionResult.rows[0].events || [],
            metadata: {
                startTime: extensionResult.rows[0].start_time,
                endTime: extensionResult.rows[0].end_time,
                totalEvents: extensionResult.rows[0].total_events,
                userAgent: extensionResult.rows[0].user_agent,
                status: extensionResult.rows[0].status
            },
            trainingFormat: {
                video_path: mainSessionResult.rows[0]?.video_url,
                audio_path: mainSessionResult.rows[0]?.audio_url,
                annotations: extensionResult.rows[0].events?.map((event) => ({
                    timestamp: event.timestamp,
                    action_type: event.type,
                    target_selector: event.data.selector,
                    coordinates: event.data.coordinates,
                    element_text: event.data.text,
                    page_url: event.data.url
                })) || []
            }
        };
        res.json({
            success: true,
            data: trainingData
        });
        return;
    }
    catch (error) {
        console.error('Error fetching training data:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch training data'
        });
        return;
    }
}));
router.post('/session-start', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sessionId, status, userAgent, extensionData } = req.body;
    try {
        await database_1.default.query(`INSERT INTO extension_sessions (session_id, status, start_time, user_agent, extension_data)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (session_id) DO UPDATE SET
       status = $2, start_time = $3, user_agent = $4, extension_data = $5`, [sessionId, status, new Date(), userAgent, JSON.stringify(extensionData)]);
        res.json({
            success: true,
            message: 'Session started successfully',
            sessionId: sessionId
        });
    }
    catch (error) {
        console.error('Failed to start session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start session'
        });
    }
}));
router.post('/session-stop', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sessionId, status, endTime } = req.body;
    try {
        await database_1.default.query(`UPDATE extension_sessions 
       SET status = $1, end_time = $2 
       WHERE session_id = $3`, [status, new Date(endTime), sessionId]);
        res.json({
            success: true,
            message: 'Session stopped successfully',
            sessionId: sessionId
        });
    }
    catch (error) {
        console.error('Failed to stop session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to stop session'
        });
    }
}));
router.post('/event', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sessionId, eventType, eventData, timestamp } = req.body;
    try {
        await database_1.default.query(`INSERT INTO extension_events (session_id, event_type, event_data, timestamp)
       VALUES ($1, $2, $3, $4)`, [sessionId, eventType, JSON.stringify(eventData), new Date(timestamp)]);
        res.json({
            success: true,
            message: 'Event stored successfully'
        });
    }
    catch (error) {
        console.error('Failed to store event:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to store event'
        });
    }
}));
router.post('/session-complete', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { sessionId, events, summary, completedAt } = req.body;
    try {
        await database_1.default.query(`UPDATE extension_sessions 
       SET status = $1, end_time = $2, total_events = $3, session_summary = $4
       WHERE session_id = $5`, ['completed', new Date(completedAt), events.length, JSON.stringify(summary), sessionId]);
        res.json({
            success: true,
            message: 'Session completed successfully',
            sessionId: sessionId,
            eventCount: events.length
        });
    }
    catch (error) {
        console.error('Failed to complete session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to complete session'
        });
    }
}));
router.get('/sessions', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { status, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM extension_sessions';
    const params = [];
    if (status) {
        query += ' WHERE status = $1';
        params.push(status);
    }
    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);
    try {
        const result = await database_1.default.query(query, params);
        res.json({
            success: true,
            data: result.rows,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset),
                total: result.rowCount
            }
        });
    }
    catch (error) {
        console.error('Error listing extension sessions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list sessions'
        });
    }
}));
exports.default = router;
//# sourceMappingURL=extension.js.map