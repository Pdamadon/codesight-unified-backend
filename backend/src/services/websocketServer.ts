import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import pool from '../database';
import logger from '../utils/logger';

interface ExtensionSession {
  sessionId: string;
  websocket: WebSocket;
  events: any[];
  startTime: number;
  lastActivity: number;
}

export class ExtensionWebSocketServer {
  private wss: WebSocketServer;
  private sessions: Map<string, ExtensionSession> = new Map();
  private heartbeatInterval: NodeJS.Timeout | undefined;

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/extension-ws'
    });

    this.setupWebSocketHandlers();
    this.startHeartbeat();
    
    logger.info('Extension WebSocket server initialized on /extension-ws');
  }

  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const clientIp = request.socket.remoteAddress;
      logger.info('Extension WebSocket client connected', { clientIp });

      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          logger.error('Failed to parse WebSocket message', { error });
          ws.send(JSON.stringify({ 
            type: 'error', 
            message: 'Invalid message format' 
          }));
        }
      });

      ws.on('close', () => {
        this.handleDisconnection(ws);
        logger.info('Extension WebSocket client disconnected', { clientIp });
      });

      ws.on('error', (error) => {
        logger.error('Extension WebSocket error', { error, clientIp });
      });

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        message: 'Connected to CodeSight Extension WebSocket'
      }));
    });
  }

  private async handleMessage(ws: WebSocket, message: any): Promise<void> {
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
          logger.warn('Unknown message type received', { type: message.type });
      }
    } catch (error) {
      logger.error('Error handling WebSocket message', { error, messageType: message.type });
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message'
      }));
    }
  }

  private async handleSessionStart(ws: WebSocket, message: any): Promise<void> {
    const { sessionId } = message;
    
    if (!sessionId) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Session ID is required'
      }));
      return;
    }

    // Check if session already exists
    if (this.sessions.has(sessionId)) {
      // Close existing session
      const existingSession = this.sessions.get(sessionId);
      if (existingSession && existingSession.websocket !== ws) {
        existingSession.websocket.close();
      }
    }

    // Create new session
    const session: ExtensionSession = {
      sessionId,
      websocket: ws,
      events: [],
      startTime: Date.now(),
      lastActivity: Date.now()
    };

    this.sessions.set(sessionId, session);

    // Store session start in database
    try {
      await pool.query(
        `INSERT INTO extension_sessions (session_id, status, start_time, user_agent, extension_data)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (session_id) DO UPDATE SET
         status = $2, start_time = $3, user_agent = $4, extension_data = $5`,
        [
          sessionId,
          'active',
          new Date(),
          message.userAgent || '',
          JSON.stringify(message.extension || {})
        ]
      );
    } catch (error) {
      logger.error('Failed to store session start', { error, sessionId });
    }

    ws.send(JSON.stringify({
      type: 'session_started',
      sessionId: sessionId,
      message: 'Session tracking started successfully'
    }));

    logger.info('Extension session started', { sessionId });
  }

  private async handleSessionStop(ws: WebSocket, message: any): Promise<void> {
    const { sessionId } = message;
    const session = this.sessions.get(sessionId);

    if (!session) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Session not found'
      }));
      return;
    }

    // Update database
    try {
      await pool.query(
        `UPDATE extension_sessions 
         SET status = $1, end_time = $2, total_events = $3
         WHERE session_id = $4`,
        ['completed', new Date(), session.events.length, sessionId]
      );
    } catch (error) {
      logger.error('Failed to update session end', { error, sessionId });
    }

    // Remove from active sessions
    this.sessions.delete(sessionId);

    ws.send(JSON.stringify({
      type: 'session_stopped',
      sessionId: sessionId,
      message: 'Session tracking stopped'
    }));

    logger.info('Extension session stopped', { 
      sessionId, 
      eventCount: session.events.length,
      duration: Date.now() - session.startTime
    });
  }

  private async handleInteractionEvent(ws: WebSocket, message: any): Promise<void> {
    const { sessionId, event } = message;
    const session = this.sessions.get(sessionId);

    if (!session) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Session not found. Please start a session first.'
      }));
      return;
    }

    // Add event to session
    session.events.push({
      ...event,
      receivedAt: Date.now()
    });
    session.lastActivity = Date.now();

    // Store event in database
    try {
      await pool.query(
        `INSERT INTO extension_events (session_id, event_type, event_data, timestamp)
         VALUES ($1, $2, $3, $4)`,
        [
          sessionId,
          event.type,
          JSON.stringify(event.data),
          new Date(event.data.timestamp || Date.now())
        ]
      );
    } catch (error) {
      logger.error('Failed to store interaction event', { error, sessionId });
    }

    // Send acknowledgment (optional - can be removed for performance)
    if (session.events.length % 10 === 0) {
      ws.send(JSON.stringify({
        type: 'event_received',
        eventCount: session.events.length
      }));
    }
  }

  private async handleSessionComplete(ws: WebSocket, message: any): Promise<void> {
    const { sessionId, events, summary } = message;
    
    try {
      // Update session with final summary
      await pool.query(
        `UPDATE extension_sessions 
         SET status = $1, end_time = $2, total_events = $3, session_summary = $4
         WHERE session_id = $5`,
        [
          'completed',
          new Date(),
          events.length,
          JSON.stringify(summary),
          sessionId
        ]
      );

      // Remove from active sessions
      this.sessions.delete(sessionId);

      ws.send(JSON.stringify({
        type: 'session_complete_acknowledged',
        sessionId: sessionId,
        eventCount: events.length
      }));

      logger.info('Extension session completed', { 
        sessionId, 
        eventCount: events.length,
        summary
      });

    } catch (error) {
      logger.error('Failed to process session completion', { error, sessionId });
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process session completion'
      }));
    }
  }

  private handlePong(ws: WebSocket): void {
    // Find session for this websocket and update last activity
    for (const session of this.sessions.values()) {
      if (session.websocket === ws) {
        session.lastActivity = Date.now();
        break;
      }
    }
  }

  private handleDisconnection(ws: WebSocket): void {
    // Find and clean up any sessions associated with this websocket
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.websocket === ws) {
        logger.info('Cleaning up disconnected session', { sessionId });
        
        // Mark session as disconnected in database
        pool.query(
          `UPDATE extension_sessions 
           SET status = $1, end_time = $2 
           WHERE session_id = $3 AND status = 'active'`,
          ['disconnected', new Date(), sessionId]
        ).catch(error => {
          logger.error('Failed to mark session as disconnected', { error, sessionId });
        });

        this.sessions.delete(sessionId);
        break;
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      // Send ping to all active connections and clean up stale sessions
      for (const [sessionId, session] of this.sessions.entries()) {
        if (now - session.lastActivity > 300000) { // 5 minutes
          logger.info('Cleaning up stale session', { sessionId });
          session.websocket.close();
          this.sessions.delete(sessionId);
        } else {
          try {
            session.websocket.send(JSON.stringify({ type: 'ping' }));
          } catch (error) {
            logger.error('Failed to send ping', { error, sessionId });
            this.sessions.delete(sessionId);
          }
        }
      }
    }, 30000); // Every 30 seconds
  }

  public getActiveSessionCount(): number {
    return this.sessions.size;
  }

  public getSessionInfo(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    return {
      sessionId: session.sessionId,
      eventCount: session.events.length,
      startTime: session.startTime,
      lastActivity: session.lastActivity,
      duration: Date.now() - session.startTime
    };
  }

  public close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.wss.close();
    logger.info('Extension WebSocket server closed');
  }
}