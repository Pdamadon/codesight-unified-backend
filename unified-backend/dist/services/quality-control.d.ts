interface QualityScore {
    overall: number;
    completeness: number;
    reliability: number;
    accuracy: number;
    trainingValue: number;
}
interface QualityIssue {
    type: 'missing_data' | 'low_quality' | 'inconsistent' | 'privacy_concern' | 'technical_error';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    field?: string;
    suggestion?: string;
}
interface QualityReport {
    sessionId: string;
    overallScore: number;
    completenessScore: number;
    reliabilityScore: number;
    accuracyScore: number;
    issues: QualityIssue[];
    recommendations: string[];
    trainingReadiness: boolean;
}
export declare class QualityControlService {
    private logger;
    private prisma;
    private readonly THRESHOLDS;
    constructor();
    scoreInteraction(interaction: any): Promise<number>;
    private evaluateSelectorQuality;
    private evaluateContextRichness;
    assessSession(sessionId: string): Promise<QualityReport>;
    private assessCompleteness;
    private assessReliability;
    private assessAccuracy;
    private generateRecommendations;
    private saveQualityReport;
    private isValidUrl;
    batchAssessQuality(sessionIds: string[]): Promise<QualityReport[]>;
    assessScreenshotQuality(screenshot: any): Promise<number>;
    testSelectorReliability(selector: string, sessionId: string): Promise<number>;
    private hasUnstableClasses;
    private hasDynamicContentIndicators;
    private getRecentScreenshots;
    calculateOverallSessionQuality(sessionId: string): Promise<QualityScore>;
    private calculateTrainingValue;
    batchCalculateQuality(sessionIds: string[]): Promise<Map<string, QualityScore>>;
    getQualityStatistics(): Promise<any>;
}
export {};
