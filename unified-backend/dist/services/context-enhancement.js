"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContextEnhancementService = void 0;
const logger_1 = require("../utils/logger");
class ContextEnhancementService {
    prisma;
    logger;
    openaiService;
    // Pattern recognition databases
    pageTypePatterns = new Map();
    intentIndicators = new Map();
    behaviorPatterns = new Map();
    constructor(prisma, openaiService) {
        this.prisma = prisma;
        this.logger = new logger_1.Logger("ContextEnhancement");
        this.openaiService = openaiService;
        this.initializePatternRecognition();
    }
    initializePatternRecognition() {
        // Page type patterns
        this.pageTypePatterns.set("product", [
            /\/product[s]?\/|\/item[s]?\/|\/p\/|\/dp\//i,
            /product-detail|item-detail|product-page/i,
            /buy-now|add-to-cart|purchase/i,
        ]);
        this.pageTypePatterns.set("category", [
            /\/category\/|\/categories\/|\/browse\/|\/shop\//i,
            /\/men[s]?\/|\/women[s]?\/|\/kids\/|\/home\//i,
            /category-page|browse-page|listing-page/i,
        ]);
        this.pageTypePatterns.set("search", [
            /\/search|\/results|\/find/i,
            /[?&]q=|[?&]query=|[?&]search=/i,
            /search-results|search-page/i,
        ]);
        this.pageTypePatterns.set("cart", [
            /\/cart|\/basket|\/bag/i,
            /shopping-cart|cart-page|basket-page/i,
        ]);
        this.pageTypePatterns.set("checkout", [
            /\/checkout|\/payment|\/billing|\/shipping/i,
            /checkout-page|payment-page|order-review/i,
        ]);
        // Intent indicators
        this.intentIndicators.set("search", [
            "search",
            "find",
            "looking for",
            "need",
            "want",
        ]);
        this.intentIndicators.set("compare", [
            "compare",
            "vs",
            "versus",
            "difference",
            "better",
            "best",
        ]);
        this.intentIndicators.set("purchase", [
            "buy",
            "purchase",
            "order",
            "checkout",
            "cart",
            "add to cart",
        ]);
        this.intentIndicators.set("research", [
            "review",
            "rating",
            "specification",
            "feature",
            "detail",
        ]);
        // Behavior patterns
        this.behaviorPatterns.set("impulse", {
            indicators: ["quick_decision", "minimal_research", "single_product_view"],
            timeThreshold: 120000, // 2 minutes
            pageViewThreshold: 3,
        });
        this.behaviorPatterns.set("research_heavy", {
            indicators: ["multiple_products", "review_reading", "comparison"],
            timeThreshold: 600000, // 10 minutes
            pageViewThreshold: 8,
        });
        this.behaviorPatterns.set("price_conscious", {
            indicators: ["price_filter", "sale_items", "coupon_search"],
            priceInteractionThreshold: 3,
        });
    }
    // Main context enhancement method
    async enhanceSessionContext(sessionId) {
        try {
            this.logger.info("Starting context enhancement", { sessionId });
            // Get session data
            const session = await this.prisma.unifiedSession.findUnique({
                where: { id: sessionId },
                include: {
                    interactions: {
                        orderBy: { timestamp: "asc" },
                    },
                    screenshots: true,
                },
            });
            if (!session) {
                throw new Error(`Session ${sessionId} not found`);
            }
            // Perform analysis
            const pageStructure = await this.analyzePageStructure(session);
            const userIntent = await this.analyzeUserIntent(session);
            const navigationPattern = this.analyzeNavigationPattern(session);
            const shoppingBehavior = await this.classifyShoppingBehavior(session);
            // Generate contextual insights
            const contextualInsights = this.generateContextualInsights(pageStructure, userIntent, navigationPattern, shoppingBehavior);
            // Calculate training value
            const trainingValue = this.calculateTrainingValue(pageStructure, userIntent, navigationPattern, shoppingBehavior);
            const enhancedContext = {
                sessionId,
                pageStructure,
                userIntent,
                navigationPattern,
                shoppingBehavior,
                contextualInsights,
                trainingValue,
                processingTimestamp: new Date(),
            };
            // Save enhanced context
            await this.saveEnhancedContext(enhancedContext);
            // Update session with enhanced data
            await this.updateSessionWithContext(sessionId, enhancedContext);
            this.logger.info("Context enhancement completed", {
                sessionId,
                trainingValue,
                primaryIntent: userIntent.primaryIntent,
                behaviorType: shoppingBehavior.behaviorType,
            });
            return enhancedContext;
        }
        catch (error) {
            this.logger.error("Context enhancement failed", error, { sessionId });
            throw error;
        }
    }
    // Analyze page structure from interactions
    async analyzePageStructure(session) {
        const interactions = session.interactions || [];
        const urls = interactions.map((i) => i.url).filter(Boolean);
        const uniqueUrls = [...new Set(urls)];
        // Determine primary page type
        const pageTypeCounts = new Map();
        for (const url of uniqueUrls) {
            for (const [pageType, patterns] of this.pageTypePatterns) {
                if (patterns.some((pattern) => pattern.test(url))) {
                    pageTypeCounts.set(pageType, (pageTypeCounts.get(pageType) || 0) + 1);
                }
            }
        }
        const primaryPageType = Array.from(pageTypeCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "other";
        // Analyze page features from interactions
        const elementTexts = interactions
            .map((i) => i.elementText?.toLowerCase() || "")
            .join(" ");
        const selectors = interactions
            .map((i) => i.primarySelector || "")
            .join(" ");
        const hasNavigation = /nav|menu|header/i.test(selectors) ||
            /navigation|menu/i.test(elementTexts);
        const hasSearch = /search|find/i.test(elementTexts) || /search/i.test(selectors);
        const hasFilters = /filter|sort|category/i.test(elementTexts) || /filter/i.test(selectors);
        const hasProductGrid = /product|item|grid/i.test(selectors) ||
            /product|item/i.test(elementTexts);
        const hasShoppingCart = /cart|basket|bag/i.test(elementTexts) || /cart/i.test(selectors);
        const hasPagination = /page|next|previous|more/i.test(elementTexts) ||
            /pagination/i.test(selectors);
        // Detect framework
        const frameworks = [];
        if (selectors.includes("data-react") || selectors.includes("[data-react"))
            frameworks.push("React");
        if (selectors.includes("ng-") || selectors.includes("[ng-"))
            frameworks.push("Angular");
        if (selectors.includes("v-") || selectors.includes("[v-"))
            frameworks.push("Vue");
        if (selectors.includes("data-test") || selectors.includes("data-cy"))
            frameworks.push("Testing Framework");
        // Count element types
        const elementCounts = {
            total: interactions.length,
            interactive: interactions.filter((i) => ["CLICK", "INPUT", "FOCUS"].includes(i.type)).length,
            images: interactions.filter((i) => i.elementTag === "img").length,
            forms: interactions.filter((i) => i.type === "FORM_SUBMIT").length,
            buttons: interactions.filter((i) => i.elementTag === "button" ||
                i.elementText?.toLowerCase().includes("button")).length,
            links: interactions.filter((i) => i.elementTag === "a" || i.primarySelector?.includes("a")).length,
        };
        // Calculate confidence based on data quality
        let confidence = 50;
        if (uniqueUrls.length > 0)
            confidence += 20;
        if (interactions.length > 5)
            confidence += 15;
        if (pageTypeCounts.size > 0)
            confidence += 15;
        return {
            pageType: primaryPageType,
            framework: frameworks,
            hasNavigation,
            hasSearch,
            hasFilters,
            hasProductGrid,
            hasShoppingCart,
            hasPagination,
            elementCounts,
            confidence: Math.min(confidence, 100),
        };
    }
    // Analyze user intent from behavior patterns
    async analyzeUserIntent(session) {
        const interactions = session.interactions || [];
        const urls = interactions.map((i) => i.url).filter(Boolean);
        const elementTexts = interactions
            .map((i) => i.elementText?.toLowerCase() || "")
            .join(" ");
        // Analyze interaction patterns
        const intentScores = new Map();
        const indicators = [];
        // Search intent
        const searchInteractions = interactions.filter((i) => i.type === "INPUT" ||
            i.url?.includes("search") ||
            i.elementText?.toLowerCase().includes("search"));
        if (searchInteractions.length > 0) {
            intentScores.set("search", searchInteractions.length * 20);
            indicators.push("search_behavior");
        }
        // Browse intent
        const categoryPages = urls.filter((url) => this.pageTypePatterns
            .get("category")
            ?.some((pattern) => pattern.test(url)));
        if (categoryPages.length > 0) {
            intentScores.set("browse", categoryPages.length * 15);
            indicators.push("category_browsing");
        }
        // Compare intent
        const productPages = urls.filter((url) => this.pageTypePatterns.get("product")?.some((pattern) => pattern.test(url)));
        if (productPages.length > 2) {
            intentScores.set("compare", productPages.length * 10);
            indicators.push("multiple_products_viewed");
        }
        // Purchase intent
        const purchaseInteractions = interactions.filter((i) => i.elementText?.toLowerCase().includes("cart") ||
            i.elementText?.toLowerCase().includes("buy") ||
            i.elementText?.toLowerCase().includes("checkout"));
        if (purchaseInteractions.length > 0) {
            intentScores.set("purchase", purchaseInteractions.length * 25);
            indicators.push("purchase_actions");
        }
        // Research intent
        const researchIndicators = [
            "review",
            "rating",
            "spec",
            "detail",
            "feature",
        ];
        const researchCount = researchIndicators.filter((indicator) => elementTexts.includes(indicator)).length;
        if (researchCount > 0) {
            intentScores.set("research", researchCount * 15);
            indicators.push("research_behavior");
        }
        // Determine primary intent
        const primaryIntent = Array.from(intentScores.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ||
            "browse";
        const confidence = Math.min(((intentScores.get(primaryIntent) || 0) / 100) * 100, 100);
        // Determine shopping stage
        let shoppingStage = "awareness";
        if (primaryIntent === "search" || primaryIntent === "browse")
            shoppingStage = "awareness";
        else if (primaryIntent === "research" || primaryIntent === "compare")
            shoppingStage = "consideration";
        else if (primaryIntent === "purchase")
            shoppingStage = "decision";
        // Determine urgency and price consciousness
        const urgency = this.determineUrgency(interactions, elementTexts);
        const priceConsciousness = this.determinePriceConsciousness(interactions, elementTexts);
        // Generate reasoning
        const reasoning = this.generateIntentReasoning(primaryIntent, indicators, shoppingStage);
        return {
            primaryIntent: primaryIntent,
            confidence,
            indicators,
            shoppingStage,
            urgency,
            priceConsciousness,
            reasoning,
        };
    }
    // Analyze navigation patterns
    analyzeNavigationPattern(session) {
        const interactions = session.interactions || [];
        const navigationEvents = interactions.filter((i) => i.type === "NAVIGATION" || i.type === "CLICK");
        if (navigationEvents.length < 2) {
            return {
                type: "linear",
                pathComplexity: 0,
                backtrackingCount: 0,
                uniquePagesVisited: 1,
                averageTimePerPage: 0,
                exitPattern: "abandonment",
                efficiency: 50,
            };
        }
        const urls = navigationEvents.map((i) => i.url).filter(Boolean);
        const uniqueUrls = [...new Set(urls)];
        const urlSequence = urls.filter((url, index) => index === 0 || url !== urls[index - 1]);
        // Calculate backtracking
        let backtrackingCount = 0;
        const visitedUrls = new Set();
        for (const url of urlSequence) {
            if (visitedUrls.has(url)) {
                backtrackingCount++;
            }
            visitedUrls.add(url);
        }
        // Calculate path complexity
        const pathComplexity = urlSequence.length / uniqueUrls.length;
        // Calculate average time per page
        const timestamps = navigationEvents.map((i) => Number(i.timestamp));
        const totalTime = timestamps.length > 1
            ? timestamps[timestamps.length - 1] - timestamps[0]
            : 0;
        const averageTimePerPage = totalTime / uniqueUrls.length;
        // Determine navigation type
        let navigationType = "linear";
        if (backtrackingCount > uniqueUrls.length * 0.3) {
            navigationType = "exploratory";
        }
        else if (uniqueUrls.length > 5 && pathComplexity < 1.5) {
            navigationType = "focused";
        }
        else if (urls.filter((url) => url.includes("product")).length > 3) {
            navigationType = "comparison";
        }
        // Determine exit pattern
        const lastInteraction = interactions[interactions.length - 1];
        let exitPattern = "abandonment";
        if (lastInteraction?.elementText?.toLowerCase().includes("cart") ||
            lastInteraction?.elementText?.toLowerCase().includes("checkout")) {
            exitPattern = "completion";
        }
        else if (totalTime < 30000) {
            // Less than 30 seconds
            exitPattern = "distraction";
        }
        // Calculate efficiency (inverse of complexity, adjusted for backtracking)
        const efficiency = Math.max(0, 100 - pathComplexity * 20 - backtrackingCount * 10);
        return {
            type: navigationType,
            pathComplexity: Math.round(pathComplexity * 100) / 100,
            backtrackingCount,
            uniquePagesVisited: uniqueUrls.length,
            averageTimePerPage: Math.round(averageTimePerPage),
            exitPattern,
            efficiency: Math.round(efficiency),
        };
    }
    // Classify shopping behavior
    async classifyShoppingBehavior(session) {
        const interactions = session.interactions || [];
        const duration = session.endTime && session.startTime
            ? new Date(session.endTime).getTime() -
                new Date(session.startTime).getTime()
            : 0;
        const elementTexts = interactions
            .map((i) => i.elementText?.toLowerCase() || "")
            .join(" ");
        const urls = interactions.map((i) => i.url).filter(Boolean);
        const uniqueUrls = [...new Set(urls)];
        // Analyze behavior indicators
        const behaviorScores = new Map();
        const characteristics = [];
        // Impulse behavior
        if (duration < 120000 && uniqueUrls.length <= 3) {
            behaviorScores.set("impulse", 80);
            characteristics.push("quick_decision_making");
        }
        // Research-heavy behavior
        const researchIndicators = [
            "review",
            "rating",
            "spec",
            "compare",
            "detail",
        ];
        const researchCount = researchIndicators.filter((indicator) => elementTexts.includes(indicator)).length;
        if (researchCount >= 2 && duration > 300000) {
            behaviorScores.set("research_heavy", 70 + researchCount * 10);
            characteristics.push("thorough_research");
        }
        // Price-conscious behavior
        const priceIndicators = [
            "price",
            "sale",
            "discount",
            "coupon",
            "deal",
            "cheap",
        ];
        const priceCount = priceIndicators.filter((indicator) => elementTexts.includes(indicator)).length;
        if (priceCount >= 2) {
            behaviorScores.set("price_conscious", 60 + priceCount * 15);
            characteristics.push("price_focused");
        }
        // Brand loyal behavior
        const brandUrls = urls.filter((url) => {
            const domain = new URL(url).hostname;
            return (uniqueUrls.filter((u) => new URL(u).hostname === domain).length ===
                uniqueUrls.length);
        });
        if (brandUrls.length === urls.length && uniqueUrls.length > 1) {
            behaviorScores.set("brand_loyal", 75);
            characteristics.push("single_brand_focus");
        }
        // Convenience-focused behavior
        const convenienceIndicators = [
            "filter",
            "sort",
            "quick",
            "fast",
            "express",
        ];
        const convenienceCount = convenienceIndicators.filter((indicator) => elementTexts.includes(indicator)).length;
        if (convenienceCount >= 1 && duration < 300000) {
            behaviorScores.set("convenience_focused", 65 + convenienceCount * 10);
            characteristics.push("efficiency_focused");
        }
        // Determine primary behavior type
        const behaviorType = Array.from(behaviorScores.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "convenience_focused";
        const confidence = Math.min(behaviorScores.get(behaviorType) || 50, 100);
        // Calculate decision factors
        const decisionFactors = {
            price: Math.min(priceCount * 25, 100),
            brand: brandUrls.length === urls.length ? 80 : 20,
            reviews: researchCount * 20,
            convenience: convenienceCount * 30,
            features: Math.min(elementTexts.split("feature").length * 15, 100),
        };
        // Calculate purchase readiness
        const purchaseReadiness = this.calculatePurchaseReadiness(interactions, behaviorType, decisionFactors);
        return {
            behaviorType: behaviorType,
            confidence,
            characteristics,
            decisionFactors,
            purchaseReadiness,
        };
    }
    // Helper methods
    determineUrgency(interactions, elementTexts) {
        const urgencyIndicators = [
            "urgent",
            "now",
            "today",
            "asap",
            "immediate",
            "quick",
        ];
        const urgencyCount = urgencyIndicators.filter((indicator) => elementTexts.includes(indicator)).length;
        if (urgencyCount >= 2)
            return "high";
        if (urgencyCount >= 1)
            return "medium";
        return "low";
    }
    determinePriceConsciousness(interactions, elementTexts) {
        const priceIndicators = [
            "price",
            "cost",
            "cheap",
            "expensive",
            "budget",
            "sale",
            "discount",
        ];
        const priceCount = priceIndicators.filter((indicator) => elementTexts.includes(indicator)).length;
        if (priceCount >= 3)
            return "high";
        if (priceCount >= 1)
            return "medium";
        return "low";
    }
    generateIntentReasoning(intent, indicators, stage) {
        const reasoningMap = {
            search: `User demonstrated search behavior through ${indicators.join(", ")}. Currently in ${stage} stage.`,
            browse: `User showed browsing patterns with ${indicators.join(", ")}. Exploring options in ${stage} stage.`,
            compare: `User compared multiple options indicated by ${indicators.join(", ")}. In ${stage} stage of decision making.`,
            purchase: `User showed purchase intent through ${indicators.join(", ")}. Advanced to ${stage} stage.`,
            research: `User conducted research activities: ${indicators.join(", ")}. Deep in ${stage} stage.`,
            navigate: `User focused on navigation with ${indicators.join(", ")}. General ${stage} behavior.`,
        };
        return (reasoningMap[intent] ||
            `User behavior indicates ${intent} intent in ${stage} stage.`);
    }
    calculatePurchaseReadiness(interactions, behaviorType, decisionFactors) {
        let readiness = 30; // Base readiness
        // Behavior type adjustments
        const behaviorAdjustments = {
            impulse: 40,
            research_heavy: -10,
            price_conscious: 10,
            brand_loyal: 20,
            convenience_focused: 15,
        };
        readiness += behaviorAdjustments[behaviorType] || 0;
        // Cart interactions boost readiness significantly
        const cartInteractions = interactions.filter((i) => i.elementText?.toLowerCase().includes("cart") ||
            i.elementText?.toLowerCase().includes("add to cart")).length;
        readiness += cartInteractions * 25;
        // Decision factor influence
        if (decisionFactors.price > 50)
            readiness += 10;
        if (decisionFactors.reviews > 50)
            readiness += 15;
        if (decisionFactors.brand > 50)
            readiness += 10;
        return Math.min(Math.max(readiness, 0), 100);
    }
    generateContextualInsights(pageStructure, userIntent, navigationPattern, shoppingBehavior) {
        const insights = [];
        // Page structure insights
        if (pageStructure.confidence > 80) {
            insights.push(`High confidence ${pageStructure.pageType} page structure detected`);
        }
        if (pageStructure.framework.length > 0) {
            insights.push(`Modern web framework detected: ${pageStructure.framework.join(", ")}`);
        }
        // User intent insights
        if (userIntent.confidence > 70) {
            insights.push(`Clear ${userIntent.primaryIntent} intent with ${userIntent.shoppingStage} stage behavior`);
        }
        if (userIntent.urgency === "high") {
            insights.push("High urgency shopping behavior detected");
        }
        // Navigation insights
        if (navigationPattern.efficiency > 80) {
            insights.push("Highly efficient navigation pattern");
        }
        else if (navigationPattern.efficiency < 40) {
            insights.push("Exploratory navigation with significant backtracking");
        }
        if (navigationPattern.type === "comparison") {
            insights.push("Comparison shopping behavior identified");
        }
        // Shopping behavior insights
        if (shoppingBehavior.confidence > 75) {
            insights.push(`Strong ${shoppingBehavior.behaviorType} shopping pattern`);
        }
        if (shoppingBehavior.purchaseReadiness > 80) {
            insights.push("High purchase readiness detected");
        }
        // Decision factor insights
        const topFactor = Object.entries(shoppingBehavior.decisionFactors).sort((a, b) => b[1] - a[1])[0];
        if (topFactor && topFactor[1] > 60) {
            insights.push(`${topFactor[0]} is the primary decision factor`);
        }
        return insights;
    }
    calculateTrainingValue(pageStructure, userIntent, navigationPattern, shoppingBehavior) {
        let value = 0;
        // Page structure value
        value += pageStructure.confidence * 0.2;
        if (pageStructure.pageType !== "other")
            value += 15;
        // User intent value
        value += userIntent.confidence * 0.3;
        if (userIntent.shoppingStage === "consideration" ||
            userIntent.shoppingStage === "decision")
            value += 10;
        // Navigation pattern value
        if (navigationPattern.uniquePagesVisited >= 3)
            value += 15;
        if (navigationPattern.type === "comparison")
            value += 10;
        // Shopping behavior value
        value += shoppingBehavior.confidence * 0.25;
        if (shoppingBehavior.purchaseReadiness > 60)
            value += 15;
        // Bonus for high-quality data
        if (pageStructure.confidence > 80 && userIntent.confidence > 80)
            value += 10;
        return Math.min(Math.round(value), 100);
    }
    // Save enhanced context to database
    async saveEnhancedContext(context) {
        try {
            await this.prisma.contextEnhancement.create({
                data: {
                    sessionId: context.sessionId,
                    pageStructure: JSON.stringify(context.pageStructure),
                    userIntent: JSON.stringify(context.userIntent),
                    navigationPattern: JSON.stringify(context.navigationPattern),
                    shoppingBehavior: JSON.stringify(context.shoppingBehavior),
                    contextualInsights: JSON.stringify(context.contextualInsights),
                    trainingValue: context.trainingValue,
                    processingTimestamp: context.processingTimestamp,
                },
            });
        }
        catch (error) {
            this.logger.error("Failed to save enhanced context", error, {
                sessionId: context.sessionId,
            });
            throw error;
        }
    }
    // Update session with enhanced context
    async updateSessionWithContext(sessionId, context) {
        try {
            await this.prisma.unifiedSession.update({
                where: { id: sessionId },
                data: {
                    pageType: context.pageStructure.pageType,
                    userIntent: context.userIntent.primaryIntent,
                    shoppingStage: context.userIntent.shoppingStage,
                    behaviorType: context.shoppingBehavior.behaviorType,
                    purchaseReadiness: context.shoppingBehavior.purchaseReadiness,
                    navigationEfficiency: context.navigationPattern.efficiency,
                    contextualInsights: JSON.stringify(context.contextualInsights),
                    trainingValue: context.trainingValue,
                },
            });
        }
        catch (error) {
            this.logger.error("Failed to update session with context", error, {
                sessionId,
            });
            throw error;
        }
    }
    // Batch context enhancement
    async batchEnhanceContext(sessionIds) {
        const results = new Map();
        this.logger.info("Starting batch context enhancement", {
            sessionCount: sessionIds.length,
        });
        for (const sessionId of sessionIds) {
            try {
                const context = await this.enhanceSessionContext(sessionId);
                results.set(sessionId, context);
            }
            catch (error) {
                this.logger.error("Failed to enhance context for session in batch", error, { sessionId });
            }
        }
        const avgTrainingValue = Array.from(results.values()).reduce((sum, context) => sum + context.trainingValue, 0) / results.size;
        this.logger.info("Batch context enhancement completed", {
            sessionCount: sessionIds.length,
            successfulEnhancements: results.size,
            averageTrainingValue: Math.round(avgTrainingValue),
        });
        return results;
    }
    // Get context enhancement statistics
    async getContextStats() {
        try {
            const stats = await this.prisma.contextEnhancement.aggregate({
                _avg: { trainingValue: true },
                _min: { trainingValue: true },
                _max: { trainingValue: true },
                _count: true,
            });
            const recentEnhancements = await this.prisma.contextEnhancement.findMany({
                take: 10,
                orderBy: { processingTimestamp: "desc" },
                select: {
                    sessionId: true,
                    trainingValue: true,
                    processingTimestamp: true,
                },
            });
            return {
                summary: {
                    totalEnhancements: stats._count,
                    averageTrainingValue: Math.round(stats._avg.trainingValue || 0),
                    minTrainingValue: stats._min.trainingValue || 0,
                    maxTrainingValue: stats._max.trainingValue || 0,
                },
                recentEnhancements,
            };
        }
        catch (error) {
            this.logger.error("Failed to get context enhancement statistics", error);
            throw error;
        }
    }
}
exports.ContextEnhancementService = ContextEnhancementService;
