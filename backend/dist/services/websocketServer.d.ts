/// <reference types="node" />
import { Server } from 'http';
export declare class ExtensionWebSocketServer {
    private wss;
    private sessions;
    private heartbeatInterval;
    constructor(server: Server);
    private setupWebSocketHandlers;
    private handleMessage;
    private handleSessionStart;
    private handleSessionStop;
    private handleInteractionEvent;
    private handleSessionComplete;
    private handlePong;
    private handleDisconnection;
    private startHeartbeat;
    getActiveSessionCount(): number;
    getSessionInfo(sessionId: string): {
        sessionId: string;
        eventCount: number;
        startTime: number;
        lastActivity: number;
        duration: number;
    } | null;
    close(): void;
}
//# sourceMappingURL=websocketServer.d.ts.map