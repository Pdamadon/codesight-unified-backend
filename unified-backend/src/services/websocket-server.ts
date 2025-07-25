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
  private heartbeatInterval?: ReturnType<typeof setInterval>;
  private cleanupInterval?: ReturnType<typeof setInterval>;
  private maxConnections: number = 100;
  private connectionTimeout: number = 300000; // 5 minutes

  // Message processing queue to prevent database overload
  private messageQueue: Array<{
    clientId: string;
    message: WebSocketMessage;
    timestamp: number;
    retryCount: number;
  }> = [];
  private isProcessingQueue = false;
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly QUEUE_PROCESS_INTERVAL = 100; // Process every 100ms
  private readonly MAX_RETRIES = 3;
  private queueProcessingInterval?: ReturnType<typeof setInterval>;

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
    this.startMessageQueueProcessing();
    
    this.logger.info('WebSocket server initialized', {
      path: '/ws',
      compression: true,
      maxConnections: this.maxConnections,
      connectionTimeout: this.connectionTimeout,
      messageQueueEnabled: true,
      maxQueueSize: this.MAX_QUEUE_SIZE
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
    console.log('🚨🚨🚨 WEBSOCKET DEBUG: RAW MESSAGE RECEIVED 🚨🚨🚨');
    console.log('📍 Location: WebSocketServer.handleMessage()');
    console.log('🎯 clientId:', clientId);
    console.log('📦 raw data (first 500 chars):', data.toString().substring(0, 500));
    
    const client = this.clients.get(clientId);
    if (!client) {
      console.log('❌ CLIENT NOT FOUND FOR MESSAGE');
      return;
    }

    client.lastActivity = new Date();

    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      
      console.log('✅ PARSED MESSAGE SUCCESSFULLY:', {
        type: message.type,
        sessionId: message.sessionId,
        hasData: !!message.data,
        dataSize: message.data ? JSON.stringify(message.data).length : 0
      });
      
      this.logger.info('Received WebSocket message', {
        clientId,
        type: message.type,
        sessionId: message.sessionId,
        queueSize: this.messageQueue.length
      });

      // Handle immediate response messages (ping, authenticate, session_start) without queuing
      if (message.type === 'ping') {
        this.sendToClient(clientId, {
          type: 'pong',
          timestamp: Date.now()
        });
        return;
      }

      if (message.type === 'authenticate') {
        await this.handleAuthentication(clientId, message);
        return;
      }

      if (message.type === 'session_start') {
        await this.handleSessionStart(clientId, message);
        return;
      }

      // Queue database-intensive messages to prevent overload
      if (this.shouldQueueMessage(message.type)) {
        this.queueMessage(clientId, message);
      } else {
        // Handle non-queued messages immediately
        await this.processMessage(clientId, message);
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

  // Determine if a message type should be queued
  private shouldQueueMessage(messageType: string): boolean {
    const queuedTypes = [
      'session_stop', 
      'interaction_event',
      'screenshot_data',
      'session_complete'
    ];
    return queuedTypes.includes(messageType);
  }

  // Queue a message for processing
  private queueMessage(clientId: string, message: WebSocketMessage): void {
    if (this.messageQueue.length >= this.MAX_QUEUE_SIZE) {
      this.logger.warn('Message queue full, dropping oldest message', {
        queueSize: this.messageQueue.length,
        maxSize: this.MAX_QUEUE_SIZE,
        droppedMessageType: this.messageQueue[0]?.message.type
      });
      this.messageQueue.shift(); // Remove oldest message
    }

    this.messageQueue.push({
      clientId,
      message,
      timestamp: Date.now(),
      retryCount: 0
    });

    this.logger.debug('Message queued', {
      clientId,
      messageType: message.type,
      queueSize: this.messageQueue.length
    });
  }

  // Start message queue processing
  private startMessageQueueProcessing(): void {
    this.queueProcessingInterval = setInterval(() => {
      this.processMessageQueue();
    }, this.QUEUE_PROCESS_INTERVAL);

    this.logger.info('Message queue processing started', {
      interval: this.QUEUE_PROCESS_INTERVAL,
      maxQueueSize: this.MAX_QUEUE_SIZE
    });
  }

  // Process messages from the queue
  private async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) return;

    this.isProcessingQueue = true;

    try {
      // Process up to 5 messages per cycle to avoid blocking
      const messagesToProcess = this.messageQueue.splice(0, 5);
      
      const processPromises = messagesToProcess.map(async (queueItem) => {
        try {
          await this.processMessage(queueItem.clientId, queueItem.message);
        } catch (error) {
          queueItem.retryCount++;
          
          if (queueItem.retryCount < this.MAX_RETRIES) {
            // Re-queue for retry
            this.messageQueue.push(queueItem);
            this.logger.warn('Message processing failed, retrying', {
              clientId: queueItem.clientId,
              messageType: queueItem.message.type,
              retryCount: queueItem.retryCount,
              error: error instanceof Error ? error.message : String(error)
            });
          } else {
            // Max retries reached, send error to client
            this.logger.error('Message processing failed after max retries', {
              clientId: queueItem.clientId,
              messageType: queueItem.message.type,
              retryCount: queueItem.retryCount,
              error: error instanceof Error ? error.message : String(error)
            });
            this.sendError(queueItem.clientId, 'Message processing failed after retries', queueItem.message.type);
          }
        }
      });

      await Promise.all(processPromises);

    } finally {
      this.isProcessingQueue = false;
    }
  }

  // Process individual message
  private async processMessage(clientId: string, message: WebSocketMessage): Promise<void> {
    console.log('🚨🚨🚨 WEBSOCKET DEBUG: processMessage() ROUTING 🚨🚨🚨');
    console.log('📍 Location: WebSocketServer.processMessage()');
    console.log('🎯 clientId:', clientId);
    console.log('🏷️ message.type:', message.type);
    console.log('📦 message.sessionId:', message.sessionId);
    
    switch (message.type) {
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

    // Fix payload schema - sessionId should be at top level
    const sessionId = message.sessionId || message.data?.sessionId;
    const config = message.data || {};
    
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
        ipAddress: client.metadata.ipAddress,
        generatedTask: config?.generatedTask || null
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
    console.log('🚨🚨🚨 WEBSOCKET DEBUG: handleSessionStop() ENTRY POINT 🚨🚨🚨');
    console.log('📍 Location: WebSocketServer.handleSessionStop()');
    console.log('🎯 clientId:', clientId);
    console.log('📦 message.sessionId:', message.sessionId);
    
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      console.log('❌ CLIENT AUTH CHECK FAILED for session stop');
      this.sendError(clientId, 'Not authenticated');
      return;
    }

    const sessionId = message.sessionId || client.sessionId;
    if (!sessionId) {
      console.log('❌ NO SESSION ID for session stop');
      this.sendError(clientId, 'No active session');
      return;
    }

    try {
      console.log('🔄 CALLING DATA PROCESSING PIPELINE - stopSession()');
      console.log('📊 sessionId being stopped:', sessionId);
      
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
      
      console.log('🔄 AUTO-TRIGGERING SESSION COMPLETION PROCESSING');
      console.log('📊 About to call completeSession() for sessionId:', sessionId);

      // 🎯 THE FIX: Automatically trigger session completion processing
      try {
        const completionResult = await this.dataProcessingPipeline.completeSession(sessionId, {
          summary: 'Session completed via stop command',
          finalQualityCheck: true,
          autoCompleted: true
        });
        console.log('✅ AUTO-COMPLETION TRIGGERED SUCCESSFULLY:', JSON.stringify(completionResult, null, 2));
      } catch (completionError) {
        console.error('❌ AUTO-COMPLETION FAILED:', completionError);
        // Don't fail the session stop, just log the completion error
      }

      this.sendToClient(clientId, {
        type: 'session_stopped',
        sessionId,
        data: {
          status: 'completed'
        },
        timestamp: Date.now()
      });

      this.logger.info('Session stopped and completion processing triggered', {
        sessionId,
        clientId
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ SESSION STOP FAILED:', errorMessage);
      this.logger.error('Failed to stop session', {
        sessionId,
        clientId,
        error: errorMessage
      });
      this.sendError(clientId, 'Failed to stop session', errorMessage);
    }
  }

  private async handleInteractionEvent(clientId: string, message: WebSocketMessage): Promise<void> {
    console.log(`\n📡 [WEBSOCKET] Received interaction_event from client ${clientId}`);
    console.log(`🎯 [WEBSOCKET] Message data keys: ${Object.keys(message.data || {}).join(', ')}`);
    console.log(`📊 [WEBSOCKET] Data size: ${JSON.stringify(message.data).length} characters`);
    
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated || !client.sessionId) {
      console.log(`❌ [WEBSOCKET] Client authentication failed`);
      this.sendError(clientId, 'No active session');
      return;
    }
    
    console.log(`✅ [WEBSOCKET] Client authenticated for session ${client.sessionId}`);

    try {
      const interactionData = {
        sessionId: client.sessionId,
        ...message.data,
        timestamp: message.timestamp || Date.now(),
        clientId
      };
      
      console.log(`🔄 [WEBSOCKET] Forwarding to data processing pipeline...`);
      console.log(`📊 [WEBSOCKET] Interaction type: ${interactionData.type}, Session: ${client.sessionId}`); 

      // Process interaction through pipeline
      const result = await this.dataProcessingPipeline.processInteraction(interactionData);
      
      console.log(`✅ [WEBSOCKET] Pipeline processing completed with status: ${result.status}`);

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
    console.log('🚨🚨🚨 WEBSOCKET DEBUG: handleSessionComplete() ENTRY POINT 🚨🚨🚨');
    console.log('📍 Location: WebSocketServer.handleSessionComplete()');
    console.log('🎯 clientId:', clientId);
    console.log('📦 message.data:', JSON.stringify(message.data, null, 2));
    
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated || !client.sessionId) {
      console.log('❌ CLIENT AUTH CHECK FAILED for session complete:', {
        clientExists: !!client,
        authenticated: client?.authenticated,
        sessionId: client?.sessionId
      });
      this.sendError(clientId, 'No active session');
      return;
    }

    try {
      console.log('🔄 CALLING DATA PROCESSING PIPELINE - completeSession()');
      console.log('📊 sessionId:', client.sessionId);
      console.log('📊 completionData:', JSON.stringify(message.data, null, 2));
      
      // Trigger complete session processing
      const result = await this.dataProcessingPipeline.completeSession(
        client.sessionId,
        message.data
      );
      
      console.log('✅ SESSION COMPLETION PIPELINE RETURNED:', JSON.stringify(result, null, 2));

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
            // Use application-level ping for browser clients instead of TCP ping
            this.sendToClient(clientId, {
              type: 'ping',
              timestamp: Date.now()
            });
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
      }, {} as Record<string, number>),
      messageQueue: {
        size: this.messageQueue.length,
        maxSize: this.MAX_QUEUE_SIZE,
        isProcessing: this.isProcessingQueue,
        processInterval: this.QUEUE_PROCESS_INTERVAL
      }
    };
  }

  public async close(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
    }

    // Process any remaining messages in queue before shutdown
    if (this.messageQueue.length > 0) {
      this.logger.info('Processing remaining messages before shutdown', {
        remainingMessages: this.messageQueue.length
      });
      while (this.messageQueue.length > 0 && !this.isProcessingQueue) {
        await this.processMessageQueue();
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
      }
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
    this.messageQueue.length = 0; // Clear message queue

    // Close WebSocket server
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.logger.info('WebSocket server closed');
        resolve();
      });
    });
  }
}