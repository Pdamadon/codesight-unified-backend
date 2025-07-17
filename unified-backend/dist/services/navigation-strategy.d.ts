import { PrismaClient } from "@prisma/client";
import { OpenAIIntegrationService } from "./openai-integration-clean";
interface NavigationStep {
    stepNumber: number;
    action: string;
    element: string;
    selectors: string[];
    pageUrl: string;
    pageType: string;
    timestamp: number;
    duration: number;
    success: boolean;
    userIntent: string;
    reasoning: string;
    alternatives: string[];
}
interface NavigationPattern {
    patternType: 'linear' | 'exploratory' | 'focused' | 'comparison' | 'abandoned' | 'hybrid';
    efficiency: number;
    complexity: number;
    backtrackingCount: number;
    uniquePagesVisited: number;
    averageTimePerPage: number;
    exitPattern: 'completion' | 'abandonment' | 'distraction' | 'conversion';
    confidence: number;
}
interface UserNavigationPreferences {
    preferredStartingPoint: 'search' | 'category' | 'homepage' | 'direct_product';
    informationGatheringStyle: 'minimal' | 'moderate' | 'extensive';
    comparisonBehavior: 'single_focus' | 'limited_comparison' | 'extensive_comparison';
    decisionMakingSpeed: 'immediate' | 'quick' | 'deliberate' | 'extended';
    trustBuildingNeeds: 'low' | 'medium' | 'high';
    socialProofDependency: 'independent' | 'moderate' | 'dependent';
}
interface NavigationStrategy {
    strategyName: string;
    description: string;
    personalityAlignment: string[];
    emotionalStateAlignment: string[];
    typicalFlow: NavigationStep[];
    keyCharacteristics: string[];
    successFactors: string[];
    commonObstacles: string[];
    optimizationRecommendations: string[];
    conversionProbability: number;
}
interface SiteNavigationAnalysis {
    sessionId: string;
    siteType: string;
    siteDomain: string;
    navigationPattern: NavigationPattern;
    userPreferences: UserNavigationPreferences;
    identifiedStrategy: NavigationStrategy;
    alternativeStrategies: NavigationStrategy[];
    siteSpecificInsights: string[];
    improvementSuggestions: string[];
    confidence: number;
    processingTimestamp: Date;
}
export declare class NavigationStrategyService {
    private prisma;
    private logger;
    private openaiService;
    private strategyTemplates;
    private sitePatterns;
    private personalityNavigationMap;
    constructor(prisma: PrismaClient, openaiService: OpenAIIntegrationService);
    private initializeNavigationStrategies;
    private initializeAdditionalStrategies;
    private initializeSitePatterns;
    private initializePersonalityMappings;
    identifyNavigationStrategy(sessionId: string): Promise<SiteNavigationAnalysis>;
    private analyzeNavigationPattern;
    private identifyUserPreferences;
    private analyzeSiteContext;
    private identifyPrimaryStrategy;
    private customizeStrategy;
    private identifyAlternativeStrategies;
    private generateSiteSpecificInsights;
    private generateImprovementSuggestions;
    private calculateAnalysisConfidence;
    private saveNavigationAnalysis;
    batchIdentifyNavigationStrategies(sessionIds: string[]): Promise<Map<string, SiteNavigationAnalysis>>;
    getNavigationStats(): Promise<any>;
    generateNavigationTrainingData(sessionId: string): Promise<any>;
    private generateNavigationTrainingExamples;
    private calculateExpectedImpact;
    private prioritizeRecommendations;
    private calculateNavigationTrainingValue;
}
export {};
