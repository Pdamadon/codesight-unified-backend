import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import { DataProcessingPipeline } from './data-processing-pipeline';

interface WebSocketClient {
  id: string;
  socket: WebSocket;
  sessionId?: string;
  type: 'extension' | 'frontend' | 'admin';
  authenticated: boolean;
  lastActivity: Date;
  metadata: {
    userAgent?: string;
    ipAddress?: string;
    extensionVersion?: string;
  };
}

interface WebSocketMessage {
  type: string;
  sessionId?: string;
  data?: any;
  timestamp: number;
  clientId?: string;
}

export class UnifiedWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();
  private sessionClients: Map<string, Set<string>> = new Map();
  private logger: Logger;
  private dataProcessingPipeline: DataProcessingPipeline;
  private heartbeatInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private maxConnections: number = 100;
  private connectionTimeout: number = 300000; // 5 minutes

  constructor(server: HttpServer, dataProcessingPipeline: DataProcessingPipeline) {
    this.logger = new Logger('WebSocketServer');
    this.dataProcessingPipeline = dataProcessingPipeline;

    // Create WebSocket server
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws',
      perMessageDeflate: {
        zlibDeflateOptions: {
          level: 3,
          chunkSize: 1024,
        },
        threshold: 1024,
        concurrencyLimit: 10,
      }
    });

    this.setupWebSocketServer();
    this.startHeartbeat();
    this.startCleanupInterval();
    
    this.logger.info('WebSocket server initialized', {
      path: '/ws',
      compression: true,
      maxConnections: this.maxConnections,
      connectionTimeout: this.connectionTimeout
    });
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (socket: WebSocket, request) => {
      this.handleConnection(socket, request);
    });

    this.wss.on('error', (error) => {
      this.logger.error('WebSocket server error', error);
    });
  }

  private handleConnection(socket: WebSocket, request: any): void {
    // Check connection limits
    if (this.clients.size >= this.maxConnections) {
      this.logger.warn('Connection rejected: maximum connections reached', {
        currentConnections: this.clients.size,
        maxConnections: this.maxConnections
      });
      socket.close(1013, 'Server overloaded');
      return;
    }

    const clientId = uuidv4();
    const ipAddress = request.socket.remoteAddress;
    const userAgent = request.headers['user-agent'];

    const client: WebSocketClient = {
      id: clientId,
      socket,
      type: 'extension', // Default, will be updated on authentication
      authenticated: false,
      lastActivity: new Date(),
      metadata: {
        userAgent,
        ipAddress
      }
    };

    this.clients.set(clientId, client);

    // Set connection timeout
    const connectionTimeout = setTimeout(() => {
      if (!client.authenticated) {
        this.logger.warn('Connection timeout: authentication required', { clientId });
        socket.close(1008, 'Authentication timeout');
      }
    }, this.connectionTimeout);
    
    this.logger.info('New WebSocket connection', {
      clientId,
      ipAddress,
      userAgent,
      totalClients: this.clients.size
    });

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'welcome',
      data: {
        clientId,
        serverVersion: '2.0.0',
        supportedFeatures: [
          'real-time-processing',
          'quality-scoring',
          'vision-analysis',
          'psychology-insights',
          'training-pipeline'
        ]
      },
      timestamp: Date.now()
    });

    // Set up socket event handlers
    socket.on('message', (data) => {
      this.handleMessage(clientId, data);
    });

    socket.on('close', (code, reason) => {
      clearTimeout(connectionTimeout);
      this.handleDisconnection(clientId, code, reason);
    });

    socket.on('error', (error) => {
      clearTimeout(connectionTimeout);
      this.logger.error('WebSocket client error', { clientId, error });
      this.handleDisconnection(clientId, 1011, 'Internal error');
    });

    socket.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.lastActivity = new Date();
      }
    });

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'welcome',
      data: {
        clientId,
        serverVersion: '2.0.0',
        supportedFeatures: [
          'real-time-processing',
          'quality-scoring',
          'vision-analysis',
          'psychology-insights',
          'training-pipeline'
        ]
      },
      timestamp: Date.now()
    });
  }

  private async handleMessage(clientId: string, data: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      
      this.logger.info('Received WebSocket message', {
        clientId,
        type: message.type,
        sessionId: message.sessionId
      });

      switch (message.type) {
        case 'authenticate':
          await this.handleAuthentication(clientId, message);
          break;

        case 'session_start':
          await this.handleSessionStart(clientId, message);
          break;

        case 'session_stop':
          await this.handleSessionStop(clientId, message);
          break;

        case 'interaction_event':
          await this.handleInteractionEvent(clientId, message);
          break;

        case 'screenshot_data':
          await this.handleScreenshotData(clientId, message);
          break;

        case 'session_complete':
          await this.handleSessionComplete(clientId, message);
          break;

        case 'ping':
          this.sendToClient(clientId, {
            type: 'pong',
            timestamp: Date.now()
          });
          break;

        case 'subscribe_updates':
          await this.handleSubscribeUpdates(clientId, message);
          break;

        default:
          this.logger.warn('Unknown message type', {
            clientId,
            type: message.type
          });
          this.sendError(clientId, 'Unknown message type', message.type);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Error handling WebSocket message', {
        clientId,
        error: errorMessage,
        rawData: data.toString().substring(0, 200) // First 200 chars for debugging
      });
      this.sendError(clientId, 'Invalid message format', errorMessage);
    }
  }

  private async handleAuthentication(clientId: string, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    const { apiKey, clientType, extensionVersion } = message.data || {};

    // Validate API key (implement your authentication logic)
    const isValid = await this.validateApiKey(apiKey);
    
    if (isValid) {
      client.authenticated = true;
      client.type = clientType || 'extension';
      if (extensionVersion) {
        client.metadata.extensionVersion = extensionVersion;
      }

      this.sendToClient(clientId, {
        type: 'authentication_success',
        data: {
          clientType: client.type,
          features: this.getClientFeatures(client.type)
        },
        timestamp: Date.now()
      });

      this.logger.info('Client authenticated', {
        clientId,
        type: client.type,
        extensionVersion
      });
    } else {
      this.sendError(clientId, 'Authentication failed', 'Invalid API key');
      client.socket.close(1008, 'Authentication failed');
    }
  }

  private async handleSessionStart(clientId: string, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      this.sendError(clientId, 'Not authenticated');
      return;
    }

    const { sessionId, config } = message.data || {};
    
    if (!sessionId) {
      this.sendError(clientId, 'Session ID required');
      return;
    }

    try {
      const sessionData = {
        id: sessionId,
        type: (config?.type as 'HUMAN' | 'AUTOMATED' | 'HYBRID') || 'HUMAN',
        config: config || {},
        workerId: config?.workerId,
        userAgent: client.metadata.userAgent,
        ipAddress: client.metadata.ipAddress
      };
      
      this.logger.info('Creating session in database', { sessionData });
      
      // Create or update session in database
      await this.dataProcessingPipeline.createSession(sessionData);

      // Associate client with session
      client.sessionId = sessionId;
      
      if (!this.sessionClients.has(sessionId)) {
        this.sessionClients.set(sessionId, new Set());
      }
      this.sessionClients.get(sessionId)!.add(clientId);

      this.sendToClient(clientId, {
        type: 'session_started',
        sessionId,
        data: {
          status: 'active',
          processingEnabled: true
        },
        timestamp: Date.now()
      });

      // Notify other clients subscribed to this session
      this.broadcastToSession(sessionId, {
        type: 'session_status_update',
        sessionId,
        data: {
          status: 'active',
          clientCount: this.sessionClients.get(sessionId)!.size
        },
        timestamp: Date.now()
      }, clientId);

      this.logger.info('Session started', {
        sessionId,
        clientId,
        clientType: client.type
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to start session', {
        sessionId,
        clientId,
        error: errorMessage
      });
      this.sendError(clientId, 'Failed to start session', errorMessage);
    }
  }

  private async handleSessionStop(clientId: string, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      this.sendError(clientId, 'Not authenticated');
      return;
    }

    const sessionId = message.sessionId || client.sessionId;
    if (!sessionId) {
      this.sendError(clientId, 'No active session');
      return;
    }

    try {
      // Update session status
      await this.dataProcessingPipeline.stopSession(sessionId);

      // Remove client from session
      const sessionClients = this.sessionClients.get(sessionId);
      if (sessionClients) {
        sessionClients.delete(clientId);
        if (sessionClients.size === 0) {
          this.sessionClients.delete(sessionId);
        }
      }

      client.sessionId = undefined;

      this.sendToClient(clientId, {
        type: 'session_stopped',
        sessionId,
        data: {
          status: 'completed'
        },
        timestamp: Date.now()
      });

      this.logger.info('Session stopped', {
        sessionId,
        clientId
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to stop session', {
        sessionId,
        clientId,
        error: errorMessage
      });
      this.sendError(clientId, 'Failed to stop session', errorMessage);
    }
  }

  private async handleInteractionEvent(clientId: string, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated || !client.sessionId) {
      this.sendError(clientId, 'No active session');
      return;
    }

    try {
      const interactionData = {
        sessionId: client.sessionId,
        ...message.data,
        timestamp: message.timestamp || Date.now(),
        clientId
      };

      // Process interaction through pipeline
      const result = await this.dataProcessingPipeline.processInteraction(interactionData);

      // Send processing result back to client
      this.sendToClient(clientId, {
        type: 'interaction_processed',
        sessionId: client.sessionId,
        data: {
          interactionId: result.id,
          qualityScore: result.qualityScore,
          processingStatus: result.status
        },
        timestamp: Date.now()
      });

      // Broadcast to session subscribers
      this.broadcastToSession(client.sessionId, {
        type: 'interaction_update',
        sessionId: client.sessionId,
        data: {
          type: message.data?.type,
          qualityScore: result.qualityScore,
          timestamp: message.timestamp
        },
        timestamp: Date.now()
      }, clientId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to process interaction', {
        sessionId: client.sessionId,
        clientId,
        error: errorMessage
      });
      this.sendError(clientId, 'Failed to process interaction', errorMessage);
    }
  }

  private async handleScreenshotData(clientId: string, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated || !client.sessionId) {
      this.sendError(clientId, 'No active session');
      return;
    }

    try {
      const screenshotData = {
        sessionId: client.sessionId,
        ...message.data,
        timestamp: message.timestamp || Date.now()
      };

      // Process screenshot through pipeline
      const result = await this.dataProcessingPipeline.processScreenshot(screenshotData);

      this.sendToClient(clientId, {
        type: 'screenshot_processed',
        sessionId: client.sessionId,
        data: {
          screenshotId: result.id,
          status: result.status,
          processingTime: result.processingTime,
          ...result.data
        },
        timestamp: Date.now()
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to process screenshot', {
        sessionId: client.sessionId,
        clientId,
        error: errorMessage
      });
      this.sendError(clientId, 'Failed to process screenshot', errorMessage);
    }
  }

  private async handleSessionComplete(clientId: string, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated || !client.sessionId) {
      this.sendError(clientId, 'No active session');
      return;
    }

    try {
      // Trigger complete session processing
      const result = await this.dataProcessingPipeline.completeSession(
        client.sessionId,
        message.data
      );

      this.sendToClient(clientId, {
        type: 'session_processing_started',
        sessionId: client.sessionId,
        data: {
          processingId: result.processingId,
          estimatedDuration: result.estimatedDuration,
          steps: result.steps
        },
        timestamp: Date.now()
      });

      // Set up processing status updates
      this.subscribeToProcessingUpdates(clientId, client.sessionId, result.processingId);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to complete session', {
        sessionId: client.sessionId,
        clientId,
        error: errorMessage
      });
      this.sendError(clientId, 'Failed to complete session', errorMessage);
    }
  }

  private async handleSubscribeUpdates(clientId: string, message: WebSocketMessage): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      this.sendError(clientId, 'Not authenticated');
      return;
    }

    const { sessionId, updateTypes } = message.data || {};
    
    // Subscribe client to specific update types for a session
    // Implementation depends on your specific requirements
    
    this.sendToClient(clientId, {
      type: 'subscription_confirmed',
      data: {
        sessionId,
        updateTypes
      },
      timestamp: Date.now()
    });
  }

  private handleDisconnection(clientId: string, code: number, reason: Buffer | string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from session clients
    if (client.sessionId) {
      const sessionClients = this.sessionClients.get(client.sessionId);
      if (sessionClients) {
        sessionClients.delete(clientId);
        if (sessionClients.size === 0) {
          this.sessionClients.delete(client.sessionId);
        }
      }
    }

    // Remove client
    this.clients.delete(clientId);

    this.logger.info('WebSocket client disconnected', {
      clientId,
      sessionId: client.sessionId,
      code,
      reason: reason.toString(),
      totalClients: this.clients.size
    });
  }

  private sendToClient(clientId: string, message: WebSocketMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== WebSocket.OPEN) return;

    try {
      client.socket.send(JSON.stringify(message));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to send message to client', {
        clientId,
        error: errorMessage
      });
    }
  }

  private sendError(clientId: string, message: string, details?: string): void {
    this.sendToClient(clientId, {
      type: 'error',
      data: {
        message,
        details
      },
      timestamp: Date.now()
    });
  }

  private broadcastToSession(sessionId: string, message: WebSocketMessage, excludeClientId?: string): void {
    const sessionClients = this.sessionClients.get(sessionId);
    if (!sessionClients) return;

    sessionClients.forEach(clientId => {
      if (clientId !== excludeClientId) {
        this.sendToClient(clientId, message);
      }
    });
  }

  private async validateApiKey(apiKey: string): Promise<boolean> {
    // Implement your API key validation logic
    // For now, accept any non-empty key
    return !!apiKey && apiKey.length > 0;
  }

  private getClientFeatures(clientType: string): string[] {
    const baseFeatures = ['real-time-processing', 'quality-scoring'];
    
    switch (clientType) {
      case 'extension':
        return [...baseFeatures, 'screenshot-processing', 'interaction-tracking'];
      case 'frontend':
        return [...baseFeatures, 'session-monitoring', 'analytics'];
      case 'admin':
        return [...baseFeatures, 'system-monitoring', 'training-pipeline'];
      default:
        return baseFeatures;
    }
  }

  private subscribeToProcessingUpdates(clientId: string, sessionId: string, processingId: string): void {
    // Set up listener for processing updates
    this.dataProcessingPipeline.onProcessingUpdate(processingId, (update) => {
      this.sendToClient(clientId, {
        type: 'processing_update',
        sessionId,
        data: update,
        timestamp: Date.now()
      });
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const staleThreshold = 60000; // 1 minute

      this.clients.forEach((client, clientId) => {
        const timeSinceActivity = now.getTime() - client.lastActivity.getTime();
        
        if (timeSinceActivity > staleThreshold) {
          if (client.socket.readyState === WebSocket.OPEN) {
            client.socket.ping();
          } else {
            this.handleDisconnection(clientId, 1001, Buffer.from('Stale connection'));
          }
        }
      });
    }, 30000); // Check every 30 seconds
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      const inactiveThreshold = 900000; // 15 minutes
      let cleanedCount = 0;

      // Clean up inactive clients
      this.clients.forEach((client, clientId) => {
        const timeSinceActivity = now.getTime() - client.lastActivity.getTime();
        
        if (timeSinceActivity > inactiveThreshold) {
          if (client.socket.readyState === WebSocket.OPEN) {
            client.socket.close(1001, 'Inactive connection cleanup');
          } else {
            this.handleDisconnection(clientId, 1001, Buffer.from('Inactive cleanup'));
          }
          cleanedCount++;
        }
      });

      // Clean up empty session mappings
      this.sessionClients.forEach((clients, sessionId) => {
        if (clients.size === 0) {
          this.sessionClients.delete(sessionId);
        }
      });

      if (cleanedCount > 0) {
        this.logger.info('Cleaned up inactive connections', {
          cleanedCount,
          remainingClients: this.clients.size,
          activeSessions: this.sessionClients.size
        });
      }
    }, 300000); // Clean every 5 minutes
  }

  public getStats(): any {
    return {
      totalClients: this.clients.size,
      authenticatedClients: Array.from(this.clients.values()).filter(c => c.authenticated).length,
      activeSessions: this.sessionClients.size,
      clientTypes: Array.from(this.clients.values()).reduce((acc, client) => {
        acc[client.type] = (acc[client.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  public async close(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all client connections
    this.clients.forEach((client) => {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.close(1001, 'Server shutting down');
      }
    });

    // Clear all collections
    this.clients.clear();
    this.sessionClients.clear();

    // Close WebSocket server
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.logger.info('WebSocket server closed');
        resolve();
      });
    });
  }
}