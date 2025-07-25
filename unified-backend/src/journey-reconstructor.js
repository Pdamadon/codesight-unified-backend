/**
 * JourneyReconstructor - Groups interactions into meaningful journey steps
 * Phase 2: Journey Reconstruction and Flow Analysis
 */

class JourneyReconstructor {
  constructor(sessionAnalyzer) {
    this.sessionAnalyzer = sessionAnalyzer;
    this.stepThresholds = {
      timeGap: 30000, // 30 seconds max between steps in same journey
      pageChange: true, // Page changes often indicate new steps
      interactionType: ['CLICK', 'INPUT', 'FORM_SUBMIT'], // Meaningful interaction types
      minStepDuration: 1000 // Minimum 1 second per step
    };
  }

  /**
   * Reconstruct complete journeys from interaction sequences
   */
  async reconstructJourneys(sessionData, sessionAnalysis) {
    const journeys = [];
    const interactions = sessionData.interactions || [];
    
    if (interactions.length === 0) {
      return { journeys: [], quality: { completeness: 0, coherence: 0 } };
    }

    // Group interactions into journey segments
    const journeySegments = this.groupInteractionsIntoSteps(interactions, sessionAnalysis);
    
    // Build complete journeys from segments
    for (const segment of journeySegments) {
      const journey = await this.buildJourneyFromSegment(segment, sessionAnalysis);
      if (journey && this.validateJourneyCompleteness(journey)) {
        journeys.push(journey);
      }
    }

    // Extract user intent patterns
    const userIntentAnalysis = this.extractUserIntent(journeys, sessionAnalysis);
    
    // Calculate journey quality metrics
    const qualityMetrics = this.calculateJourneyQuality(journeys, interactions);

    return {
      journeys,
      userIntentAnalysis,
      qualityMetrics,
      totalInteractions: interactions.length,
      journeyCount: journeys.length,
      reconstructedAt: new Date().toISOString()
    };
  }

  /**
   * Group individual interactions into meaningful journey steps
   */
  groupInteractionsIntoSteps(interactions, sessionAnalysis) {
    const segments = [];
    let currentSegment = [];
    let lastTimestamp = null;
    let lastUrl = null;

    for (const interaction of interactions) {
      const timestamp = parseInt(interaction.timestamp) || Date.now();
      const url = interaction.context?.url;
      const interactionType = interaction.type;

      // Check if this interaction starts a new segment
      const shouldStartNewSegment = this.shouldStartNewSegment(
        interaction,
        lastTimestamp,
        lastUrl,
        currentSegment
      );

      if (shouldStartNewSegment && currentSegment.length > 0) {
        segments.push(currentSegment);
        currentSegment = [];
      }

      // Add interaction to current segment
      currentSegment.push({
        ...interaction,
        stepIndex: currentSegment.length,
        timestamp,
        url,
        interactionType
      });

      lastTimestamp = timestamp;
      lastUrl = url;
    }

    // Add final segment
    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return segments;
  }

  /**
   * Determine if an interaction should start a new journey segment
   */
  shouldStartNewSegment(interaction, lastTimestamp, lastUrl, currentSegment) {
    const timestamp = parseInt(interaction.timestamp) || Date.now();
    const url = interaction.context?.url;

    // First interaction always starts a segment
    if (!lastTimestamp) return false;

    // Time gap threshold
    const timeGap = timestamp - lastTimestamp;
    if (timeGap > this.stepThresholds.timeGap) {
      return true;
    }

    // Significant page change (different domain or major path change)
    if (url && lastUrl && this.isSignificantPageChange(url, lastUrl)) {
      return true;
    }

    // Journey completion indicators (checkout, purchase, etc.)
    if (this.isJourneyCompletionIndicator(interaction)) {
      return true;
    }

    // Maximum segment size
    if (currentSegment.length >= 20) {
      return true;
    }

    return false;
  }

  /**
   * Check if URL change represents a significant page transition
   */
  isSignificantPageChange(currentUrl, lastUrl) {
    try {
      const current = new URL(currentUrl);
      const last = new URL(lastUrl);

      // Different domains
      if (current.hostname !== last.hostname) {
        return true;
      }

      // Major path changes (different main sections)
      const currentParts = current.pathname.split('/').filter(Boolean);
      const lastParts = last.pathname.split('/').filter(Boolean);

      if (currentParts.length === 0 || lastParts.length === 0) {
        return currentParts.length !== lastParts.length;
      }

      // Check if main section changed
      return currentParts[0] !== lastParts[0];

    } catch (e) {
      return false;
    }
  }

  /**
   * Identify journey completion indicators
   */
  isJourneyCompletionIndicator(interaction) {
    const completionPatterns = [
      /checkout/i, /purchase/i, /order.*complete/i, /thank.*you/i,
      /confirmation/i, /receipt/i, /success/i, /placed.*order/i
    ];

    const url = interaction.context?.url || '';
    const pageTitle = interaction.context?.pageTitle || '';
    const elementText = interaction.element?.text || '';

    const textToCheck = `${url} ${pageTitle} ${elementText}`.toLowerCase();

    return completionPatterns.some(pattern => pattern.test(textToCheck));
  }

  /**
   * Build a complete journey object from a segment
   */
  async buildJourneyFromSegment(segment, sessionAnalysis) {
    if (!segment || segment.length === 0) return null;

    const startTime = segment[0].timestamp;
    const endTime = segment[segment.length - 1].timestamp;
    const duration = endTime - startTime;

    // Get page types for this journey
    const pageTypes = segment.map(interaction => {
      const pageAnalysis = this.findPageAnalysis(interaction, sessionAnalysis);
      return pageAnalysis ? pageAnalysis.pageType : 'unknown';
    });

    // Identify journey type and goal
    const journeyType = this.identifyJourneyType(segment, pageTypes);
    const journeyGoal = this.identifyJourneyGoal(segment, journeyType);
    const userIntent = this.extractUserIntentFromSegment(segment);

    // Build navigation flow
    const navigationFlow = this.buildNavigationFlow(segment, sessionAnalysis);

    // Identify conversion points
    const conversionPoints = this.identifyConversionPoints(segment);

    return {
      id: `journey_${startTime}_${segment.length}`,
      startTime,
      endTime,
      duration,
      stepCount: segment.length,
      journeyType,
      journeyGoal,
      userIntent,
      navigationFlow,
      conversionPoints,
      interactions: segment,
      pageTypeSequence: pageTypes,
      quality: this.calculateJourneyQualityMetrics(segment, navigationFlow)
    };
  }

  /**
   * Find page analysis for a specific interaction
   */
  findPageAnalysis(interaction, sessionAnalysis) {
    if (!sessionAnalysis?.pageTypes) return null;

    // Look for page analysis with matching timestamp
    for (const [key, pageAnalysis] of sessionAnalysis.pageTypes) {
      if (key.includes(interaction.timestamp)) {
        return pageAnalysis;
      }
    }

    return null;
  }

  /**
   * Identify the type of journey based on interactions and page types
   */
  identifyJourneyType(segment, pageTypes) {
    const urls = segment.map(i => i.url).filter(Boolean);
    const pageTypeSet = new Set(pageTypes);
    const elementTexts = segment.map(i => i.element?.text || '').join(' ').toLowerCase();

    // E-commerce purchase journey
    if (pageTypeSet.has('cartPage') || pageTypeSet.has('checkoutPage') || 
        /add.*to.*cart|checkout|purchase|buy|order/i.test(elementTexts)) {
      return 'ecommerce-purchase';
    }

    // Lead generation journey
    if (/contact|email|subscribe|newsletter|demo|trial/i.test(elementTexts)) {
      return 'leadgen-contact-inquiry';
    }

    // Search and browse journey
    if (pageTypeSet.has('searchResults') || 
        /search|filter|sort|browse|category/i.test(elementTexts)) {
      return 'search-browse';
    }

    // Product research journey
    if (pageTypeSet.has('productDetailPage') && pageTypeSet.has('categoryPage')) {
      return 'product-research';
    }

    // Complex multi-step task
    if (segment.length > 10 || pageTypeSet.size > 4) {
      return 'complex-task';
    }

    return 'general-task';
  }

  /**
   * Identify the goal of the journey
   */
  identifyJourneyGoal(segment, journeyType) {
    const goalMap = {
      'ecommerce-purchase': 'complete-purchase',
      'leadgen-contact-inquiry': 'generate-lead',
      'search-browse': 'find-information',
      'product-research': 'research-product',
      'complex-task': 'complete-user-intent',
      'general-task': 'complete-user-intent'
    };

    return goalMap[journeyType] || 'unknown-goal';
  }

  /**
   * Extract user intent from journey segment
   */
  extractUserIntentFromSegment(segment) {
    const elementTexts = segment.map(i => i.element?.text || '').filter(Boolean);
    const urls = segment.map(i => i.url).filter(Boolean);
    
    // Extract key terms that indicate intent
    const intentKeywords = [];
    
    // From element interactions
    elementTexts.forEach(text => {
      if (text && text.length > 2 && text.length < 50) {
        intentKeywords.push(text.toLowerCase());
      }
    });

    // From URLs
    urls.forEach(url => {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        intentKeywords.push(...pathParts.slice(0, 3)); // First few path segments
      } catch (e) {}
    });

    // Build intent description
    const uniqueKeywords = [...new Set(intentKeywords)]
      .filter(kw => kw.length > 2)
      .slice(0, 5);

    if (uniqueKeywords.length === 0) {
      return 'User navigation and interaction';
    }

    return `User intent involving: ${uniqueKeywords.join(', ')}`;
  }

  /**
   * Build detailed navigation flow
   */
  buildNavigationFlow(segment, sessionAnalysis) {
    return segment.map((interaction, index) => {
      const pageAnalysis = this.findPageAnalysis(interaction, sessionAnalysis);
      
      return {
        stepIndex: index + 1,
        timestamp: interaction.timestamp,
        url: interaction.url,
        pageType: pageAnalysis?.pageType || 'unknown',
        pageTitle: interaction.context?.pageTitle,
        interactionType: interaction.type,
        element: {
          tag: interaction.element?.tag,
          text: interaction.element?.text,
          selector: interaction.selectors?.xpath || interaction.selectors?.primary
        },
        confidence: pageAnalysis?.confidence || 0
      };
    });
  }

  /**
   * Identify conversion points in the journey
   */
  identifyConversionPoints(segment) {
    const conversionPatterns = [
      { pattern: /add.*to.*cart|add.*to.*bag|purchase|buy/i, type: 'add-to-cart' },
      { pattern: /checkout|proceed|continue/i, type: 'checkout-initiation' },
      { pattern: /place.*order|complete.*order|pay.*now/i, type: 'order-completion' },
      { pattern: /contact|email|subscribe|sign.*up/i, type: 'lead-generation' },
      { pattern: /download|trial|demo/i, type: 'content-conversion' }
    ];

    const conversionPoints = [];

    segment.forEach((interaction, index) => {
      const elementText = interaction.element?.text || '';
      const url = interaction.context?.url || '';
      const testText = `${elementText} ${url}`.toLowerCase();

      conversionPatterns.forEach(({ pattern, type }) => {
        if (pattern.test(testText)) {
          conversionPoints.push({
            stepIndex: index + 1,
            type,
            timestamp: interaction.timestamp,
            confidence: 0.8,
            elementText,
            url
          });
        }
      });
    });

    return conversionPoints;
  }

  /**
   * Validate journey completeness and quality
   */
  validateJourneyCompleteness(journey) {
    if (!journey || journey.stepCount < 2) return false;
    
    // Must have meaningful duration
    if (journey.duration < this.stepThresholds.minStepDuration) return false;
    
    // Must have at least one meaningful interaction
    const meaningfulInteractions = journey.interactions.filter(i => 
      this.stepThresholds.interactionType.includes(i.type)
    );
    
    return meaningfulInteractions.length > 0;
  }

  /**
   * Calculate journey quality metrics
   */
  calculateJourneyQualityMetrics(segment, navigationFlow) {
    let coherenceScore = 0;
    let completenessScore = 0;
    let efficiencyScore = 0;

    // Coherence: logical flow between steps
    for (let i = 1; i < navigationFlow.length; i++) {
      const prev = navigationFlow[i - 1];
      const curr = navigationFlow[i];
      
      if (this.isLogicalTransition(prev, curr)) {
        coherenceScore += 1;
      }
    }
    coherenceScore = navigationFlow.length > 1 ? coherenceScore / (navigationFlow.length - 1) : 0;

    // Completeness: has start, middle, end
    const hasStart = navigationFlow.length > 0;
    const hasMiddle = navigationFlow.length > 2;
    const hasEnd = navigationFlow.some(step => /checkout|complete|success|cart/i.test(step.url || ''));
    
    completenessScore = (hasStart ? 0.4 : 0) + (hasMiddle ? 0.3 : 0) + (hasEnd ? 0.3 : 0);

    // Efficiency: reasonable step count for goal
    const idealStepCount = this.getIdealStepCount(segment);
    const actualStepCount = segment.length;
    efficiencyScore = Math.max(0, 1 - Math.abs(actualStepCount - idealStepCount) / idealStepCount);

    return {
      coherence: Math.round(coherenceScore * 100) / 100,
      completeness: Math.round(completenessScore * 100) / 100,
      efficiency: Math.round(efficiencyScore * 100) / 100,
      overall: Math.round(((coherenceScore + completenessScore + efficiencyScore) / 3) * 100) / 100
    };
  }

  /**
   * Check if transition between steps is logical
   */
  isLogicalTransition(prevStep, currStep) {
    // Same page type transitions are usually logical
    if (prevStep.pageType === currStep.pageType) return true;

    // Define logical page type transitions
    const logicalTransitions = {
      'homepage': ['categoryPage', 'searchResults', 'productDetailPage'],
      'categoryPage': ['productDetailPage', 'searchResults'],
      'productDetailPage': ['cartPage', 'categoryPage'],
      'cartPage': ['checkoutPage'],
      'searchResults': ['productDetailPage', 'categoryPage']
    };

    const allowedNext = logicalTransitions[prevStep.pageType] || [];
    return allowedNext.includes(currStep.pageType);
  }

  /**
   * Get ideal step count for journey type
   */
  getIdealStepCount(segment) {
    const journeyType = this.identifyJourneyType(segment, []);
    
    const idealCounts = {
      'ecommerce-purchase': 8,
      'leadgen-contact-inquiry': 5,
      'search-browse': 6,
      'product-research': 10,
      'complex-task': 15,
      'general-task': 6
    };

    return idealCounts[journeyType] || 6;
  }

  /**
   * Extract user intent patterns across all journeys
   */
  extractUserIntent(journeys, sessionAnalysis) {
    const intentPatterns = {
      commonGoals: new Map(),
      userBehaviorPatterns: [],
      conversionFunnels: [],
      dropoffPoints: []
    };

    // Analyze common goals
    journeys.forEach(journey => {
      const goal = journey.journeyGoal;
      const count = intentPatterns.commonGoals.get(goal) || 0;
      intentPatterns.commonGoals.set(goal, count + 1);
    });

    // Identify behavior patterns
    const behaviorPatterns = this.identifyBehaviorPatterns(journeys);
    intentPatterns.userBehaviorPatterns = behaviorPatterns;

    // Map conversion funnels
    const conversionFunnels = this.mapConversionFunnels(journeys);
    intentPatterns.conversionFunnels = conversionFunnels;

    // Find dropoff points
    const dropoffPoints = this.findDropoffPoints(journeys);
    intentPatterns.dropoffPoints = dropoffPoints;

    return intentPatterns;
  }

  /**
   * Identify user behavior patterns
   */
  identifyBehaviorPatterns(journeys) {
    const patterns = [];

    // Research-heavy behavior
    const researchJourneys = journeys.filter(j => j.journeyType === 'product-research');
    if (researchJourneys.length > 0) {
      patterns.push({
        type: 'research-oriented',
        confidence: 0.8,
        evidence: `${researchJourneys.length} research journeys detected`
      });
    }

    // Quick conversion behavior
    const quickJourneys = journeys.filter(j => j.stepCount <= 5 && j.conversionPoints.length > 0);
    if (quickJourneys.length > 0) {
      patterns.push({
        type: 'quick-converter',
        confidence: 0.7,
        evidence: `${quickJourneys.length} quick conversion journeys`
      });
    }

    return patterns;
  }

  /**
   * Map conversion funnels
   */
  mapConversionFunnels(journeys) {
    const funnels = [];

    const purchaseJourneys = journeys.filter(j => j.journeyType === 'ecommerce-purchase');
    
    if (purchaseJourneys.length > 0) {
      const avgSteps = purchaseJourneys.reduce((sum, j) => sum + j.stepCount, 0) / purchaseJourneys.length;
      const conversionRate = purchaseJourneys.filter(j => j.conversionPoints.length > 0).length / purchaseJourneys.length;
      
      funnels.push({
        type: 'ecommerce-funnel',
        journeyCount: purchaseJourneys.length,
        averageSteps: Math.round(avgSteps),
        conversionRate: Math.round(conversionRate * 100) / 100
      });
    }

    return funnels;
  }

  /**
   * Find common dropoff points
   */
  findDropoffPoints(journeys) {
    const dropoffPoints = [];
    
    // Find journeys that didn't complete
    const incompleteJourneys = journeys.filter(j => j.conversionPoints.length === 0);
    
    if (incompleteJourneys.length > 0) {
      // Find common last page types
      const lastPageTypes = incompleteJourneys.map(j => {
        const lastStep = j.navigationFlow[j.navigationFlow.length - 1];
        return lastStep?.pageType || 'unknown';
      });

      const pageTypeCounts = lastPageTypes.reduce((acc, pageType) => {
        acc[pageType] = (acc[pageType] || 0) + 1;
        return acc;
      }, {});

      Object.entries(pageTypeCounts).forEach(([pageType, count]) => {
        if (count > 1) {
          dropoffPoints.push({
            pageType,
            dropoffCount: count,
            percentage: Math.round((count / incompleteJourneys.length) * 100)
          });
        }
      });
    }

    return dropoffPoints;
  }

  /**
   * Calculate overall journey quality
   */
  calculateJourneyQuality(journeys, totalInteractions) {
    if (journeys.length === 0) {
      return { completeness: 0, coherence: 0, coverage: 0, overall: 0 };
    }

    // Completeness: how many interactions were successfully grouped
    const groupedInteractions = journeys.reduce((sum, j) => sum + j.stepCount, 0);
    const completeness = totalInteractions > 0 ? groupedInteractions / totalInteractions : 0;

    // Coherence: average journey coherence
    const coherenceScores = journeys.map(j => j.quality.coherence);
    const coherence = coherenceScores.reduce((sum, score) => sum + score, 0) / coherenceScores.length;

    // Coverage: diversity of journey types
    const uniqueJourneyTypes = new Set(journeys.map(j => j.journeyType)).size;
    const maxJourneyTypes = 6; // Based on our journey type definitions
    const coverage = uniqueJourneyTypes / maxJourneyTypes;

    const overall = (completeness + coherence + coverage) / 3;

    return {
      completeness: Math.round(completeness * 100) / 100,
      coherence: Math.round(coherence * 100) / 100,
      coverage: Math.round(coverage * 100) / 100,
      overall: Math.round(overall * 100) / 100
    };
  }
}

module.exports = JourneyReconstructor;