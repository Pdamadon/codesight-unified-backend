export declare class MinimalQualityReportingService {
    constructor();
    generateReport(): Promise<{
        id: string;
        title: string;
        data: {
            summary: {
                totalSessions: number;
            };
        };
    }>;
}
