"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionWebSocketServer = void 0;
const ws_1 = require("ws");
const database_1 = __importDefault(require("../database"));
const logger_1 = __importDefault(require("../utils/logger"));
class ExtensionWebSocketServer {
    wss;
    sessions = new Map();
    heartbeatInterval;
    constructor(server) {
        this.wss = new ws_1.WebSocketServer({
            server,
            path: '/extension-ws'
        });
        this.setupWebSocketHandlers();
        this.startHeartbeat();
        logger_1.default.info('Extension WebSocket server initialized on /extension-ws');
    }
    setupWebSocketHandlers() {
        this.wss.on('connection', (ws, request) => {
            const clientIp = request.socket.remoteAddress;
            logger_1.default.info('Extension WebSocket client connected', { clientIp });
            ws.on('message', async (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    await this.handleMessage(ws, message);
                }
                catch (error) {
                    logger_1.default.error('Failed to parse WebSocket message', { error });
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Invalid message format'
                    }));
                }
            });
            ws.on('close', () => {
                this.handleDisconnection(ws);
                logger_1.default.info('Extension WebSocket client disconnected', { clientIp });
            });
            ws.on('error', (error) => {
                logger_1.default.error('Extension WebSocket error', { error, clientIp });
            });
            ws.send(JSON.stringify({
                type: 'connected',
                message: 'Connected to CodeSight Extension WebSocket'
            }));
        });
    }
    async handleMessage(ws, message) {
        try {
            switch (message.type) {
                case 'session_start':
                    await this.handleSessionStart(ws, message);
                    break;
                case 'session_stop':
                    await this.handleSessionStop(ws, message);
                    break;
                case 'interaction_event':
                    await this.handleInteractionEvent(ws, message);
                    break;
                case 'session_complete':
                    await this.handleSessionComplete(ws, message);
                    break;
                case 'pong':
                    this.handlePong(ws);
                    break;
                default:
                    logger_1.default.warn('Unknown message type received', { type: message.type });
            }
        }
        catch (error) {
            logger_1.default.error('Error handling WebSocket message', { error, messageType: message.type });
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to process message'
            }));
        }
    }
    async handleSessionStart(ws, message) {
        const { sessionId } = message;
        if (!sessionId || typeof sessionId !== 'string') {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Valid session ID is required'
            }));
            return;
        }
        if (!/^[a-zA-Z0-9_-]+$/.test(sessionId) || sessionId.length > 50) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid session ID format'
            }));
            return;
        }
        if (this.sessions.has(sessionId)) {
            const existingSession = this.sessions.get(sessionId);
            if (existingSession && existingSession.websocket !== ws) {
                existingSession.websocket.close();
            }
        }
        const session = {
            sessionId,
            websocket: ws,
            events: [],
            startTime: Date.now(),
            lastActivity: Date.now()
        };
        this.sessions.set(sessionId, session);
        try {
            await database_1.default.query(`INSERT INTO extension_sessions (session_id, status, start_time, user_agent, extension_data)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (session_id) DO UPDATE SET
         status = $2, start_time = $3, user_agent = $4, extension_data = $5`, [
                sessionId,
                'active',
                new Date(),
                message.userAgent || '',
                JSON.stringify(message.extension || {})
            ]);
        }
        catch (error) {
            logger_1.default.error('Failed to store session start', { error, sessionId });
        }
        ws.send(JSON.stringify({
            type: 'session_started',
            sessionId: sessionId,
            message: 'Session tracking started successfully'
        }));
        logger_1.default.info('Extension session started', { sessionId });
    }
    async handleSessionStop(ws, message) {
        const { sessionId } = message;
        const session = this.sessions.get(sessionId);
        if (!session) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Session not found'
            }));
            return;
        }
        try {
            await database_1.default.query(`UPDATE extension_sessions 
         SET status = $1, end_time = $2, total_events = $3
         WHERE session_id = $4`, ['completed', new Date(), session.events.length, sessionId]);
        }
        catch (error) {
            logger_1.default.error('Failed to update session end', { error, sessionId });
        }
        this.sessions.delete(sessionId);
        ws.send(JSON.stringify({
            type: 'session_stopped',
            sessionId: sessionId,
            message: 'Session tracking stopped'
        }));
        logger_1.default.info('Extension session stopped', {
            sessionId,
            eventCount: session.events.length,
            duration: Date.now() - session.startTime
        });
    }
    async handleInteractionEvent(ws, message) {
        const { sessionId, event } = message;
        if (!sessionId || typeof sessionId !== 'string' || !event || typeof event !== 'object') {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Valid sessionId and event data required'
            }));
            return;
        }
        if (!event.type || typeof event.type !== 'string' || !event.data) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid event structure'
            }));
            return;
        }
        const allowedEventTypes = ['click', 'input', 'scroll', 'navigation', 'hover'];
        if (!allowedEventTypes.includes(event.type)) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid event type'
            }));
            return;
        }
        const session = this.sessions.get(sessionId);
        if (!session) {
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Session not found. Please start a session first.'
            }));
            return;
        }
        session.events.push({
            ...event,
            receivedAt: Date.now()
        });
        session.lastActivity = Date.now();
        try {
            await database_1.default.query(`INSERT INTO extension_events (session_id, event_type, event_data, timestamp)
         VALUES ($1, $2, $3, $4)`, [
                sessionId,
                event.type,
                JSON.stringify(event.data),
                new Date(event.data.timestamp || Date.now())
            ]);
        }
        catch (error) {
            logger_1.default.error('Failed to store interaction event', { error, sessionId });
        }
        if (session.events.length % 10 === 0) {
            ws.send(JSON.stringify({
                type: 'event_received',
                eventCount: session.events.length
            }));
        }
    }
    async handleSessionComplete(ws, message) {
        const { sessionId, events, summary } = message;
        try {
            await database_1.default.query(`UPDATE extension_sessions 
         SET status = $1, end_time = $2, total_events = $3, session_summary = $4
         WHERE session_id = $5`, [
                'completed',
                new Date(),
                events.length,
                JSON.stringify(summary),
                sessionId
            ]);
            this.sessions.delete(sessionId);
            ws.send(JSON.stringify({
                type: 'session_complete_acknowledged',
                sessionId: sessionId,
                eventCount: events.length
            }));
            logger_1.default.info('Extension session completed', {
                sessionId,
                eventCount: events.length,
                summary
            });
        }
        catch (error) {
            logger_1.default.error('Failed to process session completion', { error, sessionId });
            ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to process session completion'
            }));
        }
    }
    handlePong(ws) {
        for (const session of this.sessions.values()) {
            if (session.websocket === ws) {
                session.lastActivity = Date.now();
                break;
            }
        }
    }
    handleDisconnection(ws) {
        for (const [sessionId, session] of this.sessions.entries()) {
            if (session.websocket === ws) {
                logger_1.default.info('Cleaning up disconnected session', { sessionId });
                database_1.default.query(`UPDATE extension_sessions 
           SET status = $1, end_time = $2 
           WHERE session_id = $3 AND status = 'active'`, ['disconnected', new Date(), sessionId]).catch(error => {
                    logger_1.default.error('Failed to mark session as disconnected', { error, sessionId });
                });
                this.sessions.delete(sessionId);
                break;
            }
        }
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            const now = Date.now();
            for (const [sessionId, session] of this.sessions.entries()) {
                if (now - session.lastActivity > 300000) {
                    logger_1.default.info('Cleaning up stale session', { sessionId });
                    session.websocket.close();
                    this.sessions.delete(sessionId);
                }
                else {
                    try {
                        session.websocket.send(JSON.stringify({ type: 'ping' }));
                    }
                    catch (error) {
                        logger_1.default.error('Failed to send ping', { error, sessionId });
                        this.sessions.delete(sessionId);
                    }
                }
            }
        }, 30000);
    }
    getActiveSessionCount() {
        return this.sessions.size;
    }
    getSessionInfo(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return null;
        return {
            sessionId: session.sessionId,
            eventCount: session.events.length,
            startTime: session.startTime,
            lastActivity: session.lastActivity,
            duration: Date.now() - session.startTime
        };
    }
    close() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.wss.close();
        logger_1.default.info('Extension WebSocket server closed');
    }
}
exports.ExtensionWebSocketServer = ExtensionWebSocketServer;
//# sourceMappingURL=websocketServer.js.map