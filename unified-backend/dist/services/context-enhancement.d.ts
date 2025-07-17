import { PrismaClient } from "@prisma/client";
import { OpenAIIntegrationService } from "./openai-integration-clean";
interface PageStructureAnalysis {
    pageType: "homepage" | "category" | "product" | "search" | "cart" | "checkout" | "other";
    framework: string[];
    hasNavigation: boolean;
    hasSearch: boolean;
    hasFilters: boolean;
    hasProductGrid: boolean;
    hasShoppingCart: boolean;
    hasPagination: boolean;
    elementCounts: {
        total: number;
        interactive: number;
        images: number;
        forms: number;
        buttons: number;
        links: number;
    };
    confidence: number;
}
interface UserIntentAnalysis {
    primaryIntent: "browse" | "search" | "compare" | "purchase" | "research" | "navigate";
    confidence: number;
    indicators: string[];
    shoppingStage: "awareness" | "consideration" | "decision" | "purchase" | "post_purchase";
    urgency: "low" | "medium" | "high";
    priceConsciousness: "low" | "medium" | "high";
    reasoning: string;
}
interface NavigationPattern {
    type: "linear" | "exploratory" | "focused" | "comparison" | "abandoned";
    pathComplexity: number;
    backtrackingCount: number;
    uniquePagesVisited: number;
    averageTimePerPage: number;
    exitPattern: "completion" | "abandonment" | "distraction";
    efficiency: number;
}
interface ShoppingBehaviorClassification {
    behaviorType: "impulse" | "research_heavy" | "price_conscious" | "brand_loyal" | "convenience_focused";
    confidence: number;
    characteristics: string[];
    decisionFactors: {
        price: number;
        brand: number;
        reviews: number;
        convenience: number;
        features: number;
    };
    purchaseReadiness: number;
}
interface EnhancedContext {
    sessionId: string;
    pageStructure: PageStructureAnalysis;
    userIntent: UserIntentAnalysis;
    navigationPattern: NavigationPattern;
    shoppingBehavior: ShoppingBehaviorClassification;
    contextualInsights: string[];
    trainingValue: number;
    processingTimestamp: Date;
}
export declare class ContextEnhancementService {
    private prisma;
    private logger;
    private openaiService;
    private pageTypePatterns;
    private intentIndicators;
    private behaviorPatterns;
    constructor(prisma: PrismaClient, openaiService: OpenAIIntegrationService);
    private initializePatternRecognition;
    enhanceSessionContext(sessionId: string): Promise<EnhancedContext>;
    private analyzePageStructure;
    private analyzeUserIntent;
    private analyzeNavigationPattern;
    private classifyShoppingBehavior;
    private determineUrgency;
    private determinePriceConsciousness;
    private generateIntentReasoning;
    private calculatePurchaseReadiness;
    private generateContextualInsights;
    private calculateTrainingValue;
    private saveEnhancedContext;
    private updateSessionWithContext;
    batchEnhanceContext(sessionIds: string[]): Promise<Map<string, EnhancedContext>>;
    getContextStats(): Promise<any>;
}
export {};
