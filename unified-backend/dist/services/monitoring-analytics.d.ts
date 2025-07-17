interface PerformanceMetrics {
    endpoint: string;
    method: string;
    responseTime: number;
    statusCode: number;
    timestamp: Date;
    userId?: string;
    sessionId?: string;
}
interface BusinessMetrics {
    totalSessions: number;
    activeSessions: number;
    completedSessions: number;
    averageQualityScore: number;
    totalInteractions: number;
    totalScreenshots: number;
    storageUsed: number;
    trainingDataGenerated: number;
}
interface AlertConfig {
    id: string;
    name: string;
    type: 'threshold' | 'anomaly' | 'pattern';
    metric: string;
    condition: string;
    threshold: number;
    enabled: boolean;
    channels: string[];
}
export declare class MonitoringAnalyticsService {
    private prisma;
    private logger;
    private metricsBuffer;
    private alertConfigs;
    private activeAlerts;
    private metricsInterval;
    constructor();
    private initializeDefaultAlerts;
    private startMetricsCollection;
    private collectSystemMetrics;
    private getCpuUsage;
    private getMemoryMetrics;
    private getDiskMetrics;
    private storeSystemMetrics;
    recordPerformanceMetric(metric: PerformanceMetrics): void;
    private flushPerformanceMetrics;
    getBusinessMetrics(): Promise<BusinessMetrics>;
    private getStorageUsage;
    getPerformanceAnalytics(timeRange?: string): Promise<any>;
    getSystemAnalytics(timeRange?: string): Promise<any>;
    createAlert(config: Omit<AlertConfig, 'id'>): Promise<string>;
    updateAlert(alertId: string, updates: Partial<AlertConfig>): Promise<void>;
    deleteAlert(alertId: string): Promise<void>;
    private checkAlerts;
    private evaluateAlert;
    private getMetricValue;
    private triggerAlert;
    private resolveAlert;
    private determineSeverity;
    private sendAlertNotifications;
    private getTimeRangeStart;
    private calculateAverage;
    private calculatePercentile;
    private calculateErrorRate;
    private analyzeEndpoints;
    private generateTimeSeries;
    private getBucketSize;
    private getCurrentSystemMetrics;
    private evaluateSystemAlerts;
    private calculateSystemHealth;
    private calculateTrends;
    healthCheck(): Promise<string>;
    cleanup(): Promise<void>;
}
export {};
