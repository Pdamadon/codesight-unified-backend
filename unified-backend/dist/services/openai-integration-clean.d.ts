export interface VisionAnalysisResult {
    analysis: string;
    userPsychology: UserPsychology;
    qualityScore: number;
    confidence: number;
    processingTime: number;
}
export interface UserPsychology {
    dominantPersonality: string;
    emotionalState: string;
    decisionMakingStyle: string;
    trustLevel: number;
    urgencyLevel: number;
    priceSensitivity: number;
    socialInfluence: number;
    insights: string[];
    behaviorPredictions: string[];
}
export interface TrainingData {
    messages: any[];
    visionAnalysis?: VisionAnalysisResult;
    userPsychology?: UserPsychology;
    navigationStrategy?: any;
    selectorReliability?: any[];
    pageStructure?: any;
    trainingValue: number;
    complexity: number;
}
export interface TrainingConfig {
    model: string;
    hyperparameters: {
        n_epochs: number;
        batch_size: number;
        learning_rate_multiplier: number;
    };
    suffix?: string;
}
export declare class OpenAIIntegrationService {
    private openai;
    private logger;
    private prisma;
    constructor();
    analyzeScreenshots(screenshots: any[]): Promise<VisionAnalysisResult[]>;
    analyzeScreenshot(screenshot: any): Promise<VisionAnalysisResult>;
    private analyzeScreenshotWithVision;
    private extractPsychologyInsights;
    private detectPersonality;
    private detectEmotionalState;
    private detectDecisionStyle;
    private extractTrustLevel;
    private extractUrgencyLevel;
    private extractPriceSensitivity;
    private extractSocialInfluence;
    private extractInsights;
    private generateBehaviorPredictions;
    private calculateVisionQualityScore;
    private calculateConfidence;
    private getDefaultPsychology;
    generateTrainingData(sessionData: any): Promise<TrainingData>;
    private formatForOpenAI;
    private generateContextualResponse;
    private calculateTrainingValue;
    private calculateComplexity;
    uploadTrainingFile(data: any, metadata: any): Promise<string>;
    createFineTuningJob(fileId: string, config: TrainingConfig): Promise<string>;
    monitorTraining(jobId: string): Promise<any>;
    private getCachedAnalysis;
    private cacheAnalysis;
    analyzeScreenshotsAdvanced(screenshots: any[], options?: any): Promise<VisionAnalysisResult[]>;
    healthCheck(): Promise<string>;
}
