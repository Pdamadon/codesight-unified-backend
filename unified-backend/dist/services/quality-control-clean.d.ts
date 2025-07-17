interface QualityThresholds {
    minimum: number;
    good: number;
    excellent: number;
}
interface ValidationResult {
    isValid: boolean;
    score: number;
    issues: QualityIssue[];
    recommendations: string[];
}
interface QualityIssue {
    type: 'error' | 'warning' | 'info';
    category: string;
    message: string;
    severity: number;
    field?: string;
    value?: any;
}
interface QualityReport {
    sessionId: string;
    overallScore: number;
    completenessScore: number;
    reliabilityScore: number;
    accuracyScore: number;
    validationResults: any;
    issues: QualityIssue[];
    recommendations: string[];
    generatedAt: Date;
}
export declare class QualityControlService {
    private prisma;
    private logger;
    private thresholds;
    constructor();
    validateSessionQuality(sessionId: string): Promise<ValidationResult>;
    private getSessionWithData;
    private calculateQualityMetrics;
    private calculateCompleteness;
    private calculateReliability;
    private calculateAccuracy;
    private calculateConsistency;
    private checkUrlConsistency;
    private identifyQualityIssues;
    private generateRecommendations;
    private saveQualityReport;
    validateMultipleSessions(sessionIds: string[]): Promise<ValidationResult[]>;
    updateQualityThresholds(thresholds: Partial<QualityThresholds>): Promise<void>;
    getQualityThresholds(): Promise<QualityThresholds>;
    getQualityReport(sessionId: string): Promise<QualityReport | null>;
    getQualityStats(): Promise<any>;
    monitorQualityTrends(): Promise<any>;
    healthCheck(): Promise<string>;
    scoreInteraction(interaction: any): Promise<number>;
    assessSession(sessionId: string): Promise<any>;
}
export {};
