import { PrismaClient } from "@prisma/client";
import { DataValidationService } from "./data-validation";
interface QualityThreshold {
    id: string;
    name: string;
    description: string;
    category: 'overall' | 'completeness' | 'reliability' | 'consistency' | 'training_readiness';
    minScore: number;
    maxScore: number;
    action: 'reject' | 'flag' | 'warn' | 'accept';
    priority: number;
    enabled: boolean;
    conditions?: ThresholdCondition[];
}
interface ThresholdCondition {
    field: string;
    operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'contains' | 'not_contains';
    value: any;
    logicalOperator?: 'AND' | 'OR';
}
interface QualityAssessment {
    sessionId: string;
    overallScore: number;
    categoryScores: Record<string, number>;
    thresholdResults: ThresholdResult[];
    finalAction: 'accept' | 'reject' | 'flag' | 'warn';
    actionReason: string;
    recommendations: QualityRecommendation[];
    improvementSuggestions: string[];
    trainingEligible: boolean;
    assessmentTimestamp: Date;
}
interface ThresholdResult {
    thresholdId: string;
    thresholdName: string;
    passed: boolean;
    actualScore: number;
    requiredScore: number;
    action: string;
    priority: number;
    message: string;
}
interface QualityRecommendation {
    category: string;
    priority: 'high' | 'medium' | 'low';
    message: string;
    actionable: boolean;
    estimatedImpact: number;
}
interface QualityTrend {
    sessionId: string;
    timestamp: Date;
    overallScore: number;
    categoryScores: Record<string, number>;
    action: string;
}
interface QualityMetrics {
    totalSessions: number;
    acceptedSessions: number;
    rejectedSessions: number;
    flaggedSessions: number;
    averageScore: number;
    categoryAverages: Record<string, number>;
    trendData: QualityTrend[];
    thresholdPerformance: Record<string, {
        triggered: number;
        total: number;
    }>;
}
export declare class QualityThresholdService {
    private prisma;
    private logger;
    private validationService;
    private thresholds;
    private qualityTrends;
    constructor(prisma: PrismaClient, validationService: DataValidationService);
    private initializeDefaultThresholds;
    assessSessionQuality(sessionId: string): Promise<QualityAssessment>;
    private evaluateThresholds;
    private evaluateConditions;
    private evaluateCondition;
    private getFieldValue;
    private getRelevantScore;
    private determineFinalAction;
    private generateQualityRecommendations;
    private generateImprovementSuggestions;
    private determineTrainingEligibility;
    private recordQualityTrend;
    private updateSessionStatus;
    private mapActionToStatus;
    private generateThresholdMessage;
    addThreshold(threshold: QualityThreshold): void;
    removeThreshold(thresholdId: string): void;
    updateThreshold(thresholdId: string, updates: Partial<QualityThreshold>): void;
    getThreshold(thresholdId: string): QualityThreshold | undefined;
    getAllThresholds(): QualityThreshold[];
    getQualityMetrics(timeRange?: {
        start: Date;
        end: Date;
    }): Promise<QualityMetrics>;
    assessMultipleSessions(sessionIds: string[]): Promise<QualityAssessment[]>;
}
export {};
