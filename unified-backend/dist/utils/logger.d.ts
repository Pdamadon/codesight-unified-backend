export declare class Logger {
    private context;
    private logger;
    constructor(context?: string);
    private formatMessage;
    error(message: string, error?: Error | any, meta?: any): void;
    warn(message: string, meta?: any): void;
    info(message: string, meta?: any): void;
    http(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
    logRequest(req: any, res: any, responseTime?: number): void;
    logDatabaseQuery(query: string, duration?: number, error?: Error): void;
    logWebSocketEvent(event: string, clientId?: string, sessionId?: string, meta?: any): void;
    logProcessingStep(step: string, sessionId: string, duration?: number, success?: boolean): void;
    logTrainingEvent(event: string, modelId?: string, jobId?: string, meta?: any): void;
    logQualityCheck(sessionId: string, score: number, issues?: string[]): void;
    logStorageOperation(operation: string, key?: string, size?: number, success?: boolean): void;
    logPerformanceMetric(metric: string, value: number, unit?: string): void;
    child(additionalContext: string): Logger;
}
declare const _default: Logger;
export default _default;
export declare const createLogger: (context: string) => Logger;
