import { PrismaClient } from "@prisma/client";
interface ValidationRule {
    id: string;
    name: string;
    description: string;
    category: 'structural' | 'business' | 'quality' | 'completeness' | 'consistency';
    severity: 'critical' | 'major' | 'minor' | 'warning';
    enabled: boolean;
    validator: (data: any, context?: any) => ValidationResult;
    weight: number;
}
interface ValidationResult {
    isValid: boolean;
    score: number;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    metadata?: Record<string, any>;
}
interface ValidationError {
    ruleId: string;
    severity: 'critical' | 'major' | 'minor';
    message: string;
    field?: string;
    value?: any;
    suggestion?: string;
    category: string;
}
interface ValidationWarning {
    ruleId: string;
    message: string;
    field?: string;
    value?: any;
    suggestion?: string;
    category: string;
}
export interface SessionValidationResult {
    sessionId: string;
    isValid: boolean;
    overallScore: number;
    categoryScores: Record<string, number>;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    metrics: ValidationMetrics;
    recommendations: string[];
    trainingReadiness: boolean;
    processingTimestamp: Date;
}
interface ValidationMetrics {
    totalRulesExecuted: number;
    rulesPassedCount: number;
    rulesFailedCount: number;
    criticalErrorsCount: number;
    majorErrorsCount: number;
    minorErrorsCount: number;
    warningsCount: number;
    completenessScore: number;
    reliabilityScore: number;
    qualityScore: number;
    consistencyScore: number;
    validationDuration: number;
}
interface StreamValidationResult {
    sessionId: string;
    dataType: string;
    isValid: boolean;
    score: number;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    timestamp: Date;
}
export declare class DataValidationService {
    private prisma;
    private logger;
    private validationRules;
    private businessRules;
    private performanceMetrics;
    constructor(prisma: PrismaClient);
    private initializeValidationRules;
    private initializeBusinessRules;
    validateSession(sessionId: string): Promise<SessionValidationResult>;
    validateStreamData(data: any, dataType: 'interaction' | 'screenshot' | 'session_metadata'): Promise<StreamValidationResult>;
    private executeValidationRules;
    private executeBusinessRules;
    private calculateOverallScore;
    private calculateCategoryScores;
    private generateRecommendations;
    private determineTrainingReadiness;
    private calculateValidationMetrics;
    private getRelevantRulesForDataType;
    private addValidationRule;
    private addBusinessRule;
    private updatePerformanceMetrics;
    private isPrivateIP;
    getValidationRules(): Promise<ValidationRule[]>;
    getBusinessRules(): Promise<ValidationRule[]>;
    enableRule(ruleId: string): Promise<void>;
    disableRule(ruleId: string): Promise<void>;
    getPerformanceMetrics(): Promise<Record<string, number>>;
    getValidationStats(): Promise<any>;
    validateMultipleSessions(sessionIds: string[]): Promise<Map<string, SessionValidationResult>>;
    addCustomValidationRule(rule: ValidationRule): void;
    addCustomBusinessRule(rule: ValidationRule): void;
    removeRule(ruleId: string): boolean;
}
export {};
