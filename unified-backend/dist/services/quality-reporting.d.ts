export declare class QualityReportingService {
    private prisma;
    private logger;
    constructor();
    generateReport(sessionId: string): Promise<any>;
    healthCheck(): Promise<string>;
}
