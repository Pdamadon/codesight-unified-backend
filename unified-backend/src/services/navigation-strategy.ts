import { PrismaClient, Prisma } from "@prisma/client";
import { Logger } from "../utils/logger";
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
  efficiency: number; // 0-100 score
  complexity: number; // 0-100 score
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

export class NavigationStrategyService {
  private prisma: PrismaClient;
  private logger: Logger;
  private openaiService: OpenAIIntegrationService;

  // Navigation strategy templates
  private strategyTemplates: Map<string, NavigationStrategy> = new Map();
  private sitePatterns: Map<string, any> = new Map();
  private personalityNavigationMap: Map<string, string[]> = new Map();

  constructor(prisma: PrismaClient, openaiService: OpenAIIntegrationService) {
    this.prisma = prisma;
    this.logger = new Logger("NavigationStrategy");
    this.openaiService = openaiService;

    this.initializeNavigationStrategies();
    this.initializeSitePatterns();
    this.initializePersonalityMappings();
  }

  private initializeNavigationStrategies() {
    // Search-First Strategy
    this.strategyTemplates.set('search_first', {
      strategyName: 'Search-First Navigator',
      description: 'Users who immediately use search functionality to find specific items',
      personalityAlignment: ['practical', 'analytical'],
      emotionalStateAlignment: ['confident', 'neutral'],
      typicalFlow: [
        {
          stepNumber: 1,
          action: 'navigate',
          element: 'homepage',
          selectors: ['body'],
          pageUrl: 'homepage',
          pageType: 'homepage',
          timestamp: 0,
          duration: 5000,
          success: true,
          userIntent: 'orient',
          reasoning: 'Quick homepage scan to locate search',
          alternatives: []
        },
        {
          stepNumber: 2,
          action: 'click',
          element: 'search_box',
          selectors: ['#search', '[data-testid="search"]', 'input[type="search"]'],
          pageUrl: 'homepage',
          pageType: 'homepage',
          timestamp: 5000,
          duration: 2000,
          success: true,
          userIntent: 'search',
          reasoning: 'Direct to search functionality',
          alternatives: ['browse_categories', 'view_recommendations']
        }
      ],
      keyCharacteristics: [
        'Minimal homepage interaction',
        'Direct search usage',
        'Specific query formulation',
        'Results-focused browsing'
      ],
      successFactors: [
        'Prominent search functionality',
        'Auto-complete suggestions',
        'Relevant search results',
        'Clear filtering options'
      ],
      commonObstacles: [
        'Hidden or unclear search',
        'Poor search results',
        'Lack of filters',
        'Overwhelming results'
      ],
      optimizationRecommendations: [
        'Make search prominent and accessible',
        'Implement intelligent auto-complete',
        'Provide advanced filtering options',
        'Show search result previews'
      ],
      conversionProbability: 75
    });

    // Category Browser Strategy
    this.strategyTemplates.set('category_browser', {
      strategyName: 'Category Browser',
      description: 'Users who prefer to browse through categories and subcategories',
      personalityAlignment: ['social', 'cautious'],
      emotionalStateAlignment: ['uncertain', 'neutral', 'excited'],
      typicalFlow: [
        {
          stepNumber: 1,
          action: 'navigate',
          element: 'homepage',
          selectors: ['body'],
          pageUrl: 'homepage',
          pageType: 'homepage',
          timestamp: 0,
          duration: 10000,
          success: true,
          userIntent: 'explore',
          reasoning: 'Scan homepage for category options',
          alternatives: []
        }
      ],
      keyCharacteristics: [
        'Extended homepage exploration',
        'Hierarchical navigation',
        'Visual browsing preference',
        'Gradual narrowing of options'
      ],
      successFactors: [
        'Clear category hierarchy',
        'Visual category representations',
        'Intuitive navigation structure',
        'Breadcrumb navigation'
      ],
      commonObstacles: [
        'Confusing category structure',
        'Too many subcategories',
        'Unclear category names',
        'Missing breadcrumbs'
      ],
      optimizationRecommendations: [
        'Simplify category hierarchy',
        'Use visual category indicators',
        'Implement mega-menus',
        'Add category descriptions'
      ],
      conversionProbability: 65
    });

    // Add more strategies...
    this.initializeAdditionalStrategies();
  }

  private initializeAdditionalStrategies() {
    // Comparison Shopper Strategy
    this.strategyTemplates.set('comparison_shopper', {
      strategyName: 'Comparison Shopper',
      description: 'Users who extensively compare multiple products before deciding',
      personalityAlignment: ['analytical', 'cautious'],
      emotionalStateAlignment: ['uncertain', 'neutral'],
      typicalFlow: [],
      keyCharacteristics: [
        'Multiple product views',
        'Frequent back-and-forth navigation',
        'Extended time on product pages',
        'Feature and price comparison'
      ],
      successFactors: [
        'Easy product comparison tools',
        'Clear product specifications',
        'Side-by-side comparison views',
        'Saved items functionality'
      ],
      commonObstacles: [
        'Difficult product comparison',
        'Information overload',
        'Lack of comparison tools',
        'Complex navigation back to listings'
      ],
      optimizationRecommendations: [
        'Implement comparison tools',
        'Add "Compare" buttons',
        'Create comparison tables',
        'Enable wishlist/save functionality'
      ],
      conversionProbability: 80
    });

    // Impulse Buyer Strategy
    this.strategyTemplates.set('impulse_buyer', {
      strategyName: 'Impulse Buyer',
      description: 'Users who make quick decisions with minimal research',
      personalityAlignment: ['impulsive', 'social'],
      emotionalStateAlignment: ['excited', 'confident'],
      typicalFlow: [],
      keyCharacteristics: [
        'Rapid decision making',
        'Visual-driven choices',
        'Minimal product research',
        'Responsive to deals and promotions'
      ],
      successFactors: [
        'Prominent deals and offers',
        'High-quality product images',
        'Clear pricing and availability',
        'Streamlined checkout process'
      ],
      commonObstacles: [
        'Complex product pages',
        'Hidden pricing',
        'Complicated checkout',
        'Too many options'
      ],
      optimizationRecommendations: [
        'Highlight deals prominently',
        'Use high-impact visuals',
        'Simplify product pages',
        'Enable one-click purchasing'
      ],
      conversionProbability: 85
    });
  }

  private initializeSitePatterns() {
    // E-commerce site patterns
    this.sitePatterns.set('amazon', {
      commonStrategies: ['search_first', 'comparison_shopper'],
      navigationElements: {
        search: '#twotabsearchtextbox',
        categories: '.nav-left',
        products: '[data-component-type="s-search-result"]',
        cart: '#add-to-cart-button'
      },
      optimizations: ['prominent_search', 'comparison_tools', 'one_click_buy']
    });

    this.sitePatterns.set('target', {
      commonStrategies: ['category_browser', 'impulse_buyer'],
      navigationElements: {
        search: '[data-test="@web/Search/SearchInput"]',
        categories: '[data-test="@web/GlobalHeader/CategoryMenu"]',
        products: '[data-test="product-title"]',
        cart: '[data-test="chooseOptionsButton"]'
      },
      optimizations: ['visual_categories', 'deal_highlights', 'mobile_first']
    });
  }

  private initializePersonalityMappings() {
    this.personalityNavigationMap.set('analytical', [
      'search_first', 'comparison_shopper'
    ]);
    
    this.personalityNavigationMap.set('impulsive', [
      'impulse_buyer', 'category_browser'
    ]);
    
    this.personalityNavigationMap.set('cautious', [
      'comparison_shopper', 'category_browser'
    ]);
    
    this.personalityNavigationMap.set('social', [
      'category_browser', 'impulse_buyer'
    ]);
    
    this.personalityNavigationMap.set('practical', [
      'search_first', 'comparison_shopper'
    ]);
  }

  // Main method to identify navigation strategies
  async identifyNavigationStrategy(sessionId: string): Promise<SiteNavigationAnalysis> {
    try {
      this.logger.info("Starting navigation strategy identification", { sessionId });

      // Get session data with interactions and psychology profile
      const session = await this.prisma.unifiedSession.findUnique({
        where: { id: sessionId },
        include: {
          interactions: {
            orderBy: { timestamp: 'asc' }
          },
          screenshots: true
        }
      });

      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Get psychology profile if available
      const psychologyProfile = await this.prisma.psychologyProfile.findUnique({
        where: { sessionId }
      });

      // Analyze navigation pattern from interactions
      const navigationPattern = this.analyzeNavigationPattern(session.interactions);

      // Identify user preferences
      const userPreferences = this.identifyUserPreferences(session.interactions, psychologyProfile);

      // Determine site context
      const siteContext = this.analyzeSiteContext(session.interactions);

      // Identify primary navigation strategy
      const identifiedStrategy = await this.identifyPrimaryStrategy(
        navigationPattern,
        userPreferences,
        psychologyProfile,
        siteContext
      );

      // Find alternative strategies
      const alternativeStrategies = this.identifyAlternativeStrategies(
        identifiedStrategy,
        psychologyProfile,
        navigationPattern
      );

      // Generate site-specific insights
      const siteSpecificInsights = this.generateSiteSpecificInsights(
        siteContext,
        navigationPattern,
        identifiedStrategy
      );

      // Generate improvement suggestions
      const improvementSuggestions = this.generateImprovementSuggestions(
        identifiedStrategy,
        navigationPattern,
        siteContext
      );

      // Calculate confidence
      const confidence = this.calculateAnalysisConfidence(
        navigationPattern,
        psychologyProfile,
        session.interactions.length
      );

      const analysis: SiteNavigationAnalysis = {
        sessionId,
        siteType: siteContext.siteType,
        siteDomain: siteContext.domain,
        navigationPattern,
        userPreferences,
        identifiedStrategy,
        alternativeStrategies,
        siteSpecificInsights,
        improvementSuggestions,
        confidence,
        processingTimestamp: new Date()
      };

      // Save analysis to database
      await this.saveNavigationAnalysis(analysis);

      this.logger.info("Navigation strategy identification completed", {
        sessionId,
        strategy: identifiedStrategy.strategyName,
        confidence
      });

      return analysis;

    } catch (error) {
      this.logger.error("Navigation strategy identification failed", error, { sessionId });
      throw error;
    }
  }
  
  // Analyze navigation pattern from interactions
  private analyzeNavigationPattern(interactions: any[]): NavigationPattern {
    if (interactions.length === 0) {
      return {
        patternType: 'abandoned',
        efficiency: 0,
        complexity: 0,
        backtrackingCount: 0,
        uniquePagesVisited: 0,
        averageTimePerPage: 0,
        exitPattern: 'abandonment',
        confidence: 0
      };
    }

    const urls = interactions.map(i => i.url).filter(Boolean);
    const uniqueUrls = [...new Set(urls)];
    const urlSequence = urls.filter((url, index) => index === 0 || url !== urls[index - 1]);

    // Calculate backtracking
    let backtrackingCount = 0;
    const visitedUrls = new Set<string>();
    
    for (const url of urlSequence) {
      if (visitedUrls.has(url)) {
        backtrackingCount++;
      }
      visitedUrls.add(url);
    }

    // Calculate timing metrics
    const timestamps = interactions.map(i => Number(i.timestamp));
    const totalTime = timestamps.length > 1 ? 
      timestamps[timestamps.length - 1] - timestamps[0] : 0;
    const averageTimePerPage = totalTime / Math.max(uniqueUrls.length, 1);

    // Determine pattern type
    let patternType: NavigationPattern['patternType'] = 'linear';
    
    if (backtrackingCount > uniqueUrls.length * 0.4) {
      patternType = 'exploratory';
    } else if (uniqueUrls.length > 8 && backtrackingCount > 2) {
      patternType = 'comparison';
    } else if (uniqueUrls.length < 3 && totalTime < 60000) {
      patternType = 'focused';
    } else if (totalTime < 30000) {
      patternType = 'abandoned';
    }

    // Calculate efficiency (inverse of complexity and backtracking)
    const pathComplexity = urlSequence.length / Math.max(uniqueUrls.length, 1);
    const efficiency = Math.max(0, 100 - (pathComplexity * 15) - (backtrackingCount * 10));
    const complexity = Math.min(100, pathComplexity * 20 + backtrackingCount * 5);

    // Determine exit pattern
    const lastInteraction = interactions[interactions.length - 1];
    let exitPattern: NavigationPattern['exitPattern'] = 'abandonment';
    
    if (lastInteraction?.elementText?.toLowerCase().includes('cart') ||
        lastInteraction?.elementText?.toLowerCase().includes('checkout') ||
        lastInteraction?.elementText?.toLowerCase().includes('buy')) {
      exitPattern = 'conversion';
    } else if (lastInteraction?.elementText?.toLowerCase().includes('add') ||
               lastInteraction?.url?.includes('product')) {
      exitPattern = 'completion';
    } else if (totalTime < 30000) {
      exitPattern = 'distraction';
    }

    // Calculate confidence based on data quality
    let confidence = 50;
    if (interactions.length > 5) confidence += 20;
    if (uniqueUrls.length > 2) confidence += 15;
    if (totalTime > 30000) confidence += 15;

    return {
      patternType,
      efficiency: Math.round(efficiency),
      complexity: Math.round(complexity),
      backtrackingCount,
      uniquePagesVisited: uniqueUrls.length,
      averageTimePerPage: Math.round(averageTimePerPage),
      exitPattern,
      confidence: Math.min(confidence, 100)
    };
  }

  // Identify user navigation preferences
  private identifyUserPreferences(
    interactions: any[], 
    psychologyProfile: any
  ): UserNavigationPreferences {
    const elementTexts = interactions.map(i => i.elementText?.toLowerCase() || '').join(' ');
    const urls = interactions.map(i => i.url || '');
    
    // Determine preferred starting point
    let preferredStartingPoint: UserNavigationPreferences['preferredStartingPoint'] = 'homepage';
    const firstInteraction = interactions[0];
    
    if (firstInteraction?.type === 'INPUT' || elementTexts.includes('search')) {
      preferredStartingPoint = 'search';
    } else if (elementTexts.includes('category') || elementTexts.includes('browse')) {
      preferredStartingPoint = 'category';
    } else if (urls.some(url => url.includes('product') || url.includes('item'))) {
      preferredStartingPoint = 'direct_product';
    }

    // Determine information gathering style
    let informationGatheringStyle: UserNavigationPreferences['informationGatheringStyle'] = 'moderate';
    const avgTimePerInteraction = interactions.length > 1 ? 
      (Number(interactions[interactions.length - 1].timestamp) - Number(interactions[0].timestamp)) / interactions.length : 0;
    
    if (avgTimePerInteraction < 3000) {
      informationGatheringStyle = 'minimal';
    } else if (avgTimePerInteraction > 10000) {
      informationGatheringStyle = 'extensive';
    }

    // Determine comparison behavior
    let comparisonBehavior: UserNavigationPreferences['comparisonBehavior'] = 'limited_comparison';
    const productViews = interactions.filter(i => 
      i.url?.includes('product') || i.url?.includes('item')
    ).length;
    
    if (productViews <= 1) {
      comparisonBehavior = 'single_focus';
    } else if (productViews > 4) {
      comparisonBehavior = 'extensive_comparison';
    }

    // Use psychology profile if available
    let decisionMakingSpeed: UserNavigationPreferences['decisionMakingSpeed'] = 'deliberate';
    let trustBuildingNeeds: UserNavigationPreferences['trustBuildingNeeds'] = 'medium';
    let socialProofDependency: UserNavigationPreferences['socialProofDependency'] = 'moderate';

    if (psychologyProfile) {
      // Map psychology insights to navigation preferences
      switch (psychologyProfile.decisionMakingStyle) {
        case 'QUICK':
          decisionMakingSpeed = 'immediate';
          break;
        case 'DELIBERATE':
          decisionMakingSpeed = 'deliberate';
          break;
        case 'RESEARCH_DRIVEN':
          decisionMakingSpeed = 'extended';
          break;
        default:
          decisionMakingSpeed = 'quick';
      }

      trustBuildingNeeds = psychologyProfile.trustLevel < 50 ? 'high' : 
                          psychologyProfile.trustLevel > 75 ? 'low' : 'medium';

      socialProofDependency = psychologyProfile.socialInfluence < 40 ? 'independent' :
                             psychologyProfile.socialInfluence > 70 ? 'dependent' : 'moderate';
    }

    return {
      preferredStartingPoint,
      informationGatheringStyle,
      comparisonBehavior,
      decisionMakingSpeed,
      trustBuildingNeeds,
      socialProofDependency
    };
  }

  // Analyze site context
  private analyzeSiteContext(interactions: any[]): any {
    const firstUrl = interactions[0]?.url || '';
    const domain = firstUrl ? new URL(firstUrl).hostname : 'unknown';
    
    // Determine site type
    let siteType = 'ecommerce';
    if (domain.includes('amazon')) siteType = 'marketplace';
    else if (domain.includes('target') || domain.includes('walmart')) siteType = 'retail';
    else if (domain.includes('etsy')) siteType = 'handmade';
    else if (domain.includes('ebay')) siteType = 'auction';

    return {
      domain,
      siteType,
      patterns: this.sitePatterns.get(domain.replace('www.', '').split('.')[0]) || {}
    };
  }

  // Identify primary navigation strategy
  private async identifyPrimaryStrategy(
    navigationPattern: NavigationPattern,
    userPreferences: UserNavigationPreferences,
    psychologyProfile: any,
    siteContext: any
  ): Promise<NavigationStrategy> {
    
    // Score each strategy based on pattern matching
    const strategyScores = new Map<string, number>();

    for (const [strategyKey, strategy] of this.strategyTemplates) {
      let score = 0;

      // Pattern type alignment
      if (strategy.strategyName.toLowerCase().includes(navigationPattern.patternType)) {
        score += 30;
      }

      // Psychology alignment
      if (psychologyProfile) {
        if (strategy.personalityAlignment.includes(psychologyProfile.dominantPersonality?.toLowerCase())) {
          score += 25;
        }
        if (strategy.emotionalStateAlignment.includes(psychologyProfile.emotionalState?.toLowerCase())) {
          score += 20;
        }
      }

      // Preference alignment
      if (strategy.strategyName.toLowerCase().includes('search') && 
          userPreferences.preferredStartingPoint === 'search') {
        score += 20;
      }
      if (strategy.strategyName.toLowerCase().includes('category') && 
          userPreferences.preferredStartingPoint === 'category') {
        score += 20;
      }
      if (strategy.strategyName.toLowerCase().includes('comparison') && 
          userPreferences.comparisonBehavior === 'extensive_comparison') {
        score += 25;
      }

      // Efficiency alignment
      if (strategy.strategyName.toLowerCase().includes('impulse') && 
          navigationPattern.efficiency > 70) {
        score += 15;
      }

      strategyScores.set(strategyKey, score);
    }

    // Get the highest scoring strategy
    const topStrategy = Array.from(strategyScores.entries())
      .sort((a, b) => b[1] - a[1])[0];

    const selectedStrategy = this.strategyTemplates.get(topStrategy[0]) || 
                           this.strategyTemplates.get('category_browser')!;

    // Customize strategy based on actual navigation data
    return this.customizeStrategy(selectedStrategy, navigationPattern, userPreferences);
  }

  // Customize strategy based on actual data
  private customizeStrategy(
    baseStrategy: NavigationStrategy,
    navigationPattern: NavigationPattern,
    userPreferences: UserNavigationPreferences
  ): NavigationStrategy {
    
    const customizedStrategy = { ...baseStrategy };

    // Adjust conversion probability based on actual pattern
    if (navigationPattern.exitPattern === 'conversion') {
      customizedStrategy.conversionProbability = Math.min(95, baseStrategy.conversionProbability + 15);
    } else if (navigationPattern.exitPattern === 'abandonment') {
      customizedStrategy.conversionProbability = Math.max(10, baseStrategy.conversionProbability - 20);
    }

    // Add pattern-specific characteristics
    if (navigationPattern.backtrackingCount > 3) {
      customizedStrategy.keyCharacteristics.push('High backtracking behavior');
      customizedStrategy.commonObstacles.push('Navigation confusion');
    }

    if (navigationPattern.efficiency > 80) {
      customizedStrategy.keyCharacteristics.push('Highly efficient navigation');
      customizedStrategy.successFactors.push('Clear navigation paths');
    }

    // Add preference-specific recommendations
    if (userPreferences.trustBuildingNeeds === 'high') {
      customizedStrategy.optimizationRecommendations.push('Increase trust signals and security badges');
    }

    if (userPreferences.socialProofDependency === 'dependent') {
      customizedStrategy.optimizationRecommendations.push('Prominently display reviews and social proof');
    }

    return customizedStrategy;
  }

  // Identify alternative strategies
  private identifyAlternativeStrategies(
    primaryStrategy: NavigationStrategy,
    psychologyProfile: any,
    navigationPattern: NavigationPattern
  ): NavigationStrategy[] {
    const alternatives: NavigationStrategy[] = [];

    // Get personality-aligned strategies
    if (psychologyProfile?.dominantPersonality) {
      const personalityStrategies = this.personalityNavigationMap.get(
        psychologyProfile.dominantPersonality.toLowerCase()
      ) || [];

      for (const strategyKey of personalityStrategies) {
        const strategy = this.strategyTemplates.get(strategyKey);
        if (strategy && strategy.strategyName !== primaryStrategy.strategyName) {
          alternatives.push(strategy);
        }
      }
    }

    // Add pattern-based alternatives
    if (navigationPattern.patternType === 'exploratory') {
      const categoryStrategy = this.strategyTemplates.get('category_browser');
      if (categoryStrategy && !alternatives.some(s => s.strategyName === categoryStrategy.strategyName)) {
        alternatives.push(categoryStrategy);
      }
    }

    return alternatives.slice(0, 3); // Limit to top 3 alternatives
  }

  // Generate site-specific insights
  private generateSiteSpecificInsights(
    siteContext: any,
    navigationPattern: NavigationPattern,
    strategy: NavigationStrategy
  ): string[] {
    const insights: string[] = [];

    // Site-specific pattern insights
    if (siteContext.domain.includes('amazon')) {
      if (strategy.strategyName.includes('Search')) {
        insights.push('Amazon users typically start with search - strategy aligns well');
      }
      if (navigationPattern.backtrackingCount > 2) {
        insights.push('High backtracking on Amazon suggests need for better comparison tools');
      }
    }

    if (siteContext.domain.includes('target')) {
      if (strategy.strategyName.includes('Category')) {
        insights.push('Target\'s visual category design supports browsing behavior');
      }
      if (navigationPattern.efficiency < 50) {
        insights.push('Target\'s mobile-first design may be causing navigation issues on desktop');
      }
    }

    // General e-commerce insights
    if (navigationPattern.exitPattern === 'abandonment') {
      insights.push('Cart abandonment detected - consider exit-intent interventions');
    }

    if (navigationPattern.averageTimePerPage > 30000) {
      insights.push('Extended page viewing suggests high engagement but potential decision paralysis');
    }

    return insights;
  }

  // Generate improvement suggestions
  private generateImprovementSuggestions(
    strategy: NavigationStrategy,
    navigationPattern: NavigationPattern,
    siteContext: any
  ): string[] {
    const suggestions: string[] = [];

    // Add strategy-specific optimizations
    suggestions.push(...strategy.optimizationRecommendations);

    // Add pattern-specific suggestions
    if (navigationPattern.backtrackingCount > 3) {
      suggestions.push('Implement breadcrumb navigation to reduce backtracking');
      suggestions.push('Add "Recently Viewed" section for easy return to previous items');
    }

    if (navigationPattern.efficiency < 40) {
      suggestions.push('Simplify navigation structure to improve user flow');
      suggestions.push('Add guided shopping assistance for complex decisions');
    }

    if (navigationPattern.exitPattern === 'abandonment') {
      suggestions.push('Implement exit-intent popups with incentives');
      suggestions.push('Add live chat support for navigation assistance');
    }

    // Remove duplicates
    return [...new Set(suggestions)];
  }

  // Calculate analysis confidence
  private calculateAnalysisConfidence(
    navigationPattern: NavigationPattern,
    psychologyProfile: any,
    interactionCount: number
  ): number {
    let confidence = 30; // Base confidence

    // Data quality factors
    if (interactionCount > 5) confidence += 20;
    if (interactionCount > 15) confidence += 15;

    // Pattern confidence
    confidence += navigationPattern.confidence * 0.3;

    // Psychology profile availability
    if (psychologyProfile) {
      confidence += psychologyProfile.confidence * 0.2;
    }

    // Navigation complexity (more complex = more data = higher confidence)
    if (navigationPattern.uniquePagesVisited > 3) confidence += 10;
    if (navigationPattern.averageTimePerPage > 10000) confidence += 5;

    return Math.min(confidence, 100);
  }

  // Save navigation analysis to database
  private async saveNavigationAnalysis(analysis: SiteNavigationAnalysis): Promise<void> {
    try {
      // Store navigation analysis in the session's contextual insights
      const existingInsights = await this.prisma.unifiedSession.findUnique({
        where: { id: analysis.sessionId },
        select: { contextualInsights: true }
      });

      let insights: any = {};
      if (existingInsights?.contextualInsights) {
        try {
          insights = JSON.parse(existingInsights.contextualInsights as string);
        } catch (e) {
          // Ignore parsing errors
        }
      }

      insights.navigationStrategy = {
        strategyName: analysis.identifiedStrategy.strategyName,
        patternType: analysis.navigationPattern.patternType,
        efficiency: analysis.navigationPattern.efficiency,
        siteSpecificInsights: analysis.siteSpecificInsights,
        improvementSuggestions: analysis.improvementSuggestions,
        confidence: analysis.confidence
      };

      await this.prisma.unifiedSession.update({
        where: { id: analysis.sessionId },
        data: {
          navigationEfficiency: analysis.navigationPattern.efficiency,
          contextualInsights: JSON.stringify(insights)
        }
      });

      this.logger.info("Navigation analysis saved", {
        sessionId: analysis.sessionId,
        strategy: analysis.identifiedStrategy.strategyName
      });

    } catch (error) {
      this.logger.error("Failed to save navigation analysis", error, {
        sessionId: analysis.sessionId
      });
      throw error;
    }
  }

  // Batch process multiple sessions
  async batchIdentifyNavigationStrategies(
    sessionIds: string[]
  ): Promise<Map<string, SiteNavigationAnalysis>> {
    const results = new Map<string, SiteNavigationAnalysis>();

    this.logger.info("Starting batch navigation strategy identification", {
      sessionCount: sessionIds.length
    });

    for (const sessionId of sessionIds) {
      try {
        const analysis = await this.identifyNavigationStrategy(sessionId);
        results.set(sessionId, analysis);
      } catch (error) {
        this.logger.error(
          "Failed to identify navigation strategy for session in batch",
          error,
          { sessionId }
        );
      }
    }

    const avgConfidence = Array.from(results.values())
      .reduce((sum, analysis) => sum + analysis.confidence, 0) / results.size;

    this.logger.info("Batch navigation strategy identification completed", {
      sessionCount: sessionIds.length,
      successfulAnalyses: results.size,
      averageConfidence: Math.round(avgConfidence)
    });

    return results;
  }

  // Get navigation strategy statistics
  async getNavigationStats(): Promise<any> {
    try {
      const sessions = await this.prisma.unifiedSession.findMany({
        where: {
          contextualInsights: { not: Prisma.AnyNull }
        },
        select: {
          navigationEfficiency: true,
          contextualInsights: true
        }
      });

      const strategies = sessions
        .map(s => {
          try {
            const insights = JSON.parse(s.contextualInsights as string);
            return insights.navigationStrategy?.strategyName;
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      const strategyDistribution = strategies.reduce((acc, strategy) => {
        acc[strategy] = (acc[strategy] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const avgEfficiency = sessions
        .filter(s => s.navigationEfficiency !== null)
        .reduce((sum, s) => sum + (s.navigationEfficiency || 0), 0) / sessions.length;

      return {
        totalAnalyses: sessions.length,
        averageNavigationEfficiency: Math.round(avgEfficiency || 0),
        strategyDistribution,
        topStrategies: Object.entries(strategyDistribution)
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .slice(0, 5)
      };

    } catch (error) {
      this.logger.error("Failed to get navigation stats", error);
      throw error;
    }
  }

  // Generate navigation-based training data
  async generateNavigationTrainingData(sessionId: string): Promise<any> {
    try {
      const analysis = await this.identifyNavigationStrategy(sessionId);
      
      const trainingData = {
        sessionId,
        navigationAnalysis: analysis,
        trainingExamples: this.generateNavigationTrainingExamples(analysis),
        metadata: {
          generatedAt: new Date(),
          analysisConfidence: analysis.confidence,
          trainingValue: this.calculateNavigationTrainingValue(analysis)
        }
      };

      return trainingData;
    } catch (error) {
      this.logger.error("Failed to generate navigation training data", error, { sessionId });
      throw error;
    }
  }

  // Generate training examples based on navigation analysis
  private generateNavigationTrainingExamples(analysis: SiteNavigationAnalysis): any[] {
    const examples = [];

    // Example 1: Strategy prediction
    examples.push({
      type: 'navigation_strategy_prediction',
      input: {
        siteType: analysis.siteType,
        userPreferences: analysis.userPreferences,
        initialBehavior: analysis.navigationPattern.patternType
      },
      output: {
        predictedStrategy: analysis.identifiedStrategy.strategyName,
        confidence: analysis.confidence,
        alternativeStrategies: analysis.alternativeStrategies.map(s => s.strategyName),
        reasoning: `Based on ${analysis.navigationPattern.patternType} pattern and user preferences`
      }
    });

    // Example 2: Optimization recommendation
    examples.push({
      type: 'navigation_optimization',
      input: {
        currentStrategy: analysis.identifiedStrategy.strategyName,
        navigationEfficiency: analysis.navigationPattern.efficiency,
        siteContext: analysis.siteDomain
      },
      output: {
        recommendations: analysis.improvementSuggestions,
        expectedImpact: this.calculateExpectedImpact(analysis),
        priorityOrder: this.prioritizeRecommendations(analysis.improvementSuggestions)
      }
    });

    return examples;
  }

  private calculateExpectedImpact(analysis: SiteNavigationAnalysis): string {
    if (analysis.navigationPattern.efficiency < 40) return 'high';
    if (analysis.navigationPattern.efficiency < 70) return 'medium';
    return 'low';
  }

  private prioritizeRecommendations(recommendations: string[]): string[] {
    // Simple prioritization based on keywords
    const highPriority = recommendations.filter(r => 
      r.includes('search') || r.includes('navigation') || r.includes('trust')
    );
    const mediumPriority = recommendations.filter(r => 
      r.includes('comparison') || r.includes('visual') || r.includes('mobile')
    );
    const lowPriority = recommendations.filter(r => 
      !highPriority.includes(r) && !mediumPriority.includes(r)
    );

    return [...highPriority, ...mediumPriority, ...lowPriority];
  }

  private calculateNavigationTrainingValue(analysis: SiteNavigationAnalysis): number {
    let value = analysis.confidence * 0.4; // Base value from confidence

    // Pattern complexity adds value
    if (analysis.navigationPattern.complexity > 50) value += 15;
    if (analysis.navigationPattern.uniquePagesVisited > 5) value += 10;

    // Strategy clarity adds value
    if (analysis.confidence > 80) value += 20;
    if (analysis.alternativeStrategies.length > 0) value += 10;

    // Site-specific insights add value
    value += analysis.siteSpecificInsights.length * 5;

    return Math.min(Math.round(value), 100);
  }
}