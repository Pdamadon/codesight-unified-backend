/**
 * Agent2ClickExecution - Operational click execution and element interaction agent
 * This agent finds elements on pages, executes clicks, and learns from interactions
 */

const { PrismaClient } = require('@prisma/client');

class Agent2ClickExecution {
  constructor() {
    this.prisma = new PrismaClient();
    this.config = {
      executionVersion: '1.0',
      reliabilityThreshold: 0.6,
      maxRetries: 3,
      timeoutMs: 10000,
      fallbackStrategies: ['xpath', 'css', 'text', 'coordinates']
    };
  }

  /**
   * Main entry point: execute click on element based on purpose
   */
  async executeClick(pageData, elementPurpose, options = {}) {
    try {
      const startTime = Date.now();
      const domain = this.extractDomain(pageData.url);
      const pageType = this.inferPageType(pageData);

      // Find best element map for this purpose
      const elementMap = await this.findBestElementMap(domain, pageType, elementPurpose);
      
      if (!elementMap) {
        // Create new element map if none exists
        return await this.handleNewElement(domain, pageType, elementPurpose, pageData, options);
      }

      // Execute click using existing element map
      const result = await this.executeClickWithMap(elementMap, pageData, options);
      
      // Log interaction result
      await this.logInteraction(elementMap.id, result, pageData, options.sessionId);
      
      // Update element map reliability
      await this.updateElementReliability(elementMap.id, result.success);

      const duration = Date.now() - startTime;
      await this.logPerformance('element-click', result.success, duration, {
        domain,
        elementPurpose,
        selectorUsed: result.selectorUsed,
        confidence: result.confidence
      });

      return result;
      
    } catch (error) {
      await this.logPerformance('element-click', false, null, { 
        error: error.message,
        elementPurpose 
      });
      throw error;
    }
  }

  /**
   * Find element using multiple strategies and learn from success/failure
   */
  async findElement(pageData, elementCriteria) {
    try {
      const startTime = Date.now();
      const strategies = this.buildFindingStrategies(elementCriteria);
      
      for (const strategy of strategies) {
        const element = await this.attemptFindWithStrategy(pageData, strategy);
        if (element) {
          const duration = Date.now() - startTime;
          await this.logPerformance('element-find', true, duration, {
            strategy: strategy.type,
            confidence: element.confidence
          });
          return element;
        }
      }

      // No element found with any strategy
      await this.logPerformance('element-find', false, Date.now() - startTime, {
        strategiesAttempted: strategies.length
      });
      
      return null;
      
    } catch (error) {
      await this.logPerformance('element-find', false, null, { error: error.message });
      throw error;
    }
  }

  /**
   * Learn from interaction and update element maps
   */
  async learnFromInteraction(elementMapId, interactionResult, pageContext) {
    try {
      const elementMap = await this.prisma.agent2ElementMap.findUnique({
        where: { id: elementMapId }
      });

      if (!elementMap) return;

      // Update reliability metrics
      const newReliability = this.calculateNewReliability(
        elementMap.reliability,
        elementMap.usageCount,
        interactionResult.success
      );

      // Update spatial context if interaction was successful
      let spatialContext = elementMap.spatialContext;
      if (interactionResult.success && interactionResult.nearbyElements) {
        spatialContext = this.updateSpatialContext(spatialContext, interactionResult.nearbyElements);
      }

      // Update element map
      await this.prisma.agent2ElementMap.update({
        where: { id: elementMapId },
        data: {
          reliability: newReliability,
          usageCount: { increment: 1 },
          successCount: interactionResult.success ? { increment: 1 } : undefined,
          failureCount: !interactionResult.success ? { increment: 1 } : undefined,
          spatialContext,
          avgResponseTime: this.updateAverageResponseTime(
            elementMap.avgResponseTime,
            elementMap.usageCount,
            interactionResult.responseTime
          ),
          lastUsed: new Date()
        }
      });

      // If reliability drops below threshold, create backup selectors
      if (newReliability < this.config.reliabilityThreshold) {
        await this.createBackupSelectors(elementMapId, pageContext);
      }

    } catch (error) {
      console.error('Error learning from interaction:', error);
    }
  }

  /**
   * Execute strategy-based interaction (for complex multi-step interactions)
   */
  async executeStrategy(strategyId, pageData, context = {}) {
    try {
      const startTime = Date.now();
      
      const strategy = await this.prisma.agent2Strategy.findUnique({
        where: { id: strategyId }
      });

      if (!strategy) {
        throw new Error(`Strategy not found: ${strategyId}`);
      }

      // Check if conditions are met
      const conditionsMet = await this.checkStrategyConditions(strategy.conditions, pageData, context);
      if (!conditionsMet) {
        throw new Error('Strategy conditions not met');
      }

      // Execute strategy actions
      const results = await this.executeStrategyActions(strategy.actions, pageData, context);
      
      // Update strategy performance
      await this.updateStrategyPerformance(strategyId, results.success, Date.now() - startTime);
      
      const duration = Date.now() - startTime;
      await this.logPerformance('strategy-execution', results.success, duration, {
        strategyId,
        strategyType: strategy.strategyType,
        actionCount: strategy.actions.length
      });

      return results;
      
    } catch (error) {
      await this.logPerformance('strategy-execution', false, null, { 
        error: error.message,
        strategyId 
      });
      throw error;
    }
  }

  /**
   * Find best element map for domain, page type, and purpose
   */
  async findBestElementMap(domain, pageType, elementPurpose) {
    const elementMaps = await this.prisma.agent2ElementMap.findMany({
      where: {
        domain,
        pageType,
        elementPurpose,
        reliability: { gte: this.config.reliabilityThreshold }
      },
      orderBy: [
        { reliability: 'desc' },
        { usageCount: 'desc' }
      ],
      take: 1
    });

    return elementMaps.length > 0 ? elementMaps[0] : null;
  }

  /**
   * Execute click using existing element map
   */
  async executeClickWithMap(elementMap, pageData, options) {
    const startTime = Date.now();
    
    // Try primary selector first
    let result = await this.attemptClickWithSelector(
      elementMap.primarySelector,
      elementMap.selectorType,
      pageData,
      options
    );

    if (result.success) {
      result.responseTime = Date.now() - startTime;
      result.confidence = elementMap.reliability;
      return result;
    }

    // Try backup selectors
    const backupSelectors = elementMap.backupSelectors || [];
    for (const backupSelector of backupSelectors) {
      result = await this.attemptClickWithSelector(
        backupSelector.selector,
        backupSelector.type,
        pageData,
        options
      );

      if (result.success) {
        result.responseTime = Date.now() - startTime;
        result.confidence = backupSelector.reliability || 0.5;
        return result;
      }
    }

    // All selectors failed
    result.responseTime = Date.now() - startTime;
    result.confidence = 0;
    return result;
  }

  /**
   * Handle new element that doesn't have an existing map
   */
  async handleNewElement(domain, pageType, elementPurpose, pageData, options) {
    // Try to find element using heuristics
    const element = await this.findElementByHeuristics(elementPurpose, pageData);
    
    if (!element) {
      throw new Error(`Could not find element for purpose: ${elementPurpose}`);
    }

    // Create new element map
    const elementMap = await this.createElementMap({
      domain,
      pageType,
      elementPurpose,
      primarySelector: element.selector,
      selectorType: element.selectorType,
      elementType: element.elementType,
      expectedText: element.text,
      visualProps: element.visualProps || {},
      spatialContext: element.spatialContext || {}
    });

    // Execute click
    const result = await this.attemptClickWithSelector(
      element.selector,
      element.selectorType,
      pageData,
      options
    );

    // Log interaction
    await this.logInteraction(elementMap.id, result, pageData, options.sessionId);
    
    return result;
  }

  /**
   * Find element using heuristics based on purpose
   */
  async findElementByHeuristics(elementPurpose, pageData) {
    const heuristics = this.getHeuristicsForPurpose(elementPurpose);
    
    for (const heuristic of heuristics) {
      const element = await this.applyHeuristic(heuristic, pageData);
      if (element) {
        return element;
      }
    }
    
    return null;
  }

  /**
   * Get heuristics for finding elements by purpose
   */
  getHeuristicsForPurpose(elementPurpose) {
    const heuristicMap = {
      'add-to-cart': [
        { type: 'text', patterns: ['add to cart', 'add to bag', 'buy now'] },
        { type: 'class', patterns: ['add-to-cart', 'addtocart', 'buy-now'] },
        { type: 'id', patterns: ['add-to-cart', 'addtocart', 'buy-now'] }
      ],
      'navigation': [
        { type: 'tag', patterns: ['nav', 'header'] },
        { type: 'class', patterns: ['nav', 'navigation', 'menu'] }
      ],
      'search': [
        { type: 'input', patterns: ['search', 'query'] },
        { type: 'button', patterns: ['search', 'find'] }
      ],
      'filter': [
        { type: 'class', patterns: ['filter', 'facet', 'refine'] },
        { type: 'text', patterns: ['filter', 'refine', 'narrow'] }
      ],
      'checkout': [
        { type: 'text', patterns: ['checkout', 'proceed', 'continue'] },
        { type: 'class', patterns: ['checkout', 'proceed', 'continue'] }
      ]
    };

    return heuristicMap[elementPurpose] || [];
  }

  /**
   * Create new element map in database
   */
  async createElementMap(data) {
    return await this.prisma.agent2ElementMap.create({
      data: {
        ...data,
        reliability: 0.5, // Start with neutral reliability
        usageCount: 0,
        successCount: 0,
        failureCount: 0
      }
    });
  }

  /**
   * Log interaction result
   */
  async logInteraction(elementMapId, result, pageData, sessionId = null) {
    return await this.prisma.agent2Interaction.create({
      data: {
        elementMapId,
        sessionId,
        actionType: 'CLICK',
        selectorUsed: result.selectorUsed,
        coordinatesUsed: result.coordinates,
        pageUrl: pageData.url,
        pageState: pageData.state || {},
        nearbyElements: result.nearbyElements || [],
        success: result.success,
        errorMessage: result.errorMessage,
        responseTime: result.responseTime,
        stateChangeResult: result.stateChange || null,
        confidence: result.confidence
      }
    });
  }

  /**
   * Update element reliability based on success/failure
   */
  async updateElementReliability(elementMapId, success) {
    const elementMap = await this.prisma.agent2ElementMap.findUnique({
      where: { id: elementMapId }
    });

    if (!elementMap) return;

    const newReliability = this.calculateNewReliability(
      elementMap.reliability,
      elementMap.usageCount,
      success
    );

    await this.prisma.agent2ElementMap.update({
      where: { id: elementMapId },
      data: {
        reliability: newReliability,
        usageCount: { increment: 1 },
        successCount: success ? { increment: 1 } : undefined,
        failureCount: !success ? { increment: 1 } : undefined,
        lastUsed: new Date()
      }
    });
  }

  /**
   * Calculate new reliability score using exponential moving average
   */
  calculateNewReliability(currentReliability, usageCount, success) {
    if (usageCount === 0) {
      return success ? 0.8 : 0.2;
    }

    // Use exponential moving average with higher weight for recent interactions
    const alpha = Math.min(0.3, 1 / (usageCount + 1));
    const newValue = success ? 1 : 0;
    
    return currentReliability * (1 - alpha) + newValue * alpha;
  }

  /**
   * Log agent performance
   */
  async logPerformance(taskType, success, duration = null, additionalData = {}) {
    return await this.prisma.agentPerformanceLog.create({
      data: {
        agentType: 'CLICK_EXECUTION',
        agentVersion: this.config.executionVersion,
        domain: additionalData.domain || 'unknown',
        taskType,
        success,
        duration,
        confidence: additionalData.confidence,
        inputData: additionalData.inputData || {},
        outputData: additionalData.outputData || {},
        errorData: additionalData.error ? { message: additionalData.error } : null
      }
    });
  }

  // Utility methods
  extractDomain(url) {
    return new URL(url).hostname;
  }

  inferPageType(pageData) {
    const url = pageData.url.toLowerCase();
    
    if (url.includes('/cart') || url.includes('/checkout')) return 'cartPage';
    if (url.includes('/product/') || url.includes('/item/')) return 'productDetailPage';
    if (url.includes('/category/') || url.includes('/collection/')) return 'categoryPage';
    if (url.includes('/search')) return 'searchResults';
    if (url === '/' || url.endsWith('/')) return 'homepage';
    
    return 'unknown';
  }

  updateAverageResponseTime(currentAvg, usageCount, newTime) {
    if (!currentAvg || usageCount === 0) return newTime;
    return (currentAvg * usageCount + newTime) / (usageCount + 1);
  }

  // Placeholder methods - would be implemented with actual browser/DOM interaction logic
  async attemptClickWithSelector(selector, selectorType, pageData, options) {
    // This would use browser automation (Puppeteer, Playwright, etc.)
    return {
      success: Math.random() > 0.3, // Simulate 70% success rate
      selectorUsed: selector,
      errorMessage: null,
      coordinates: null,
      nearbyElements: [],
      stateChange: null
    };
  }

  async attemptFindWithStrategy(pageData, strategy) {
    // This would implement actual element finding logic
    return Math.random() > 0.5 ? {
      selector: strategy.selector,
      confidence: Math.random(),
      selectorType: strategy.type
    } : null;
  }

  buildFindingStrategies(elementCriteria) {
    // Build finding strategies based on criteria
    return [
      { type: 'xpath', selector: elementCriteria.xpath },
      { type: 'css', selector: elementCriteria.css },
      { type: 'text', selector: elementCriteria.text }
    ].filter(s => s.selector);
  }

  async applyHeuristic(heuristic, pageData) {
    // Apply heuristic to find element
    return Math.random() > 0.6 ? {
      selector: `button:contains("${heuristic.patterns[0]}")`,
      selectorType: 'CSS',
      elementType: 'button',
      text: heuristic.patterns[0]
    } : null;
  }

  async checkStrategyConditions(conditions, pageData, context) {
    // Check if strategy conditions are met
    return true; // Simplified
  }

  async executeStrategyActions(actions, pageData, context) {
    // Execute strategy actions
    return { success: true, results: [] };
  }

  async updateStrategyPerformance(strategyId, success, duration) {
    // Update strategy performance metrics
    const strategy = await this.prisma.agent2Strategy.findUnique({
      where: { id: strategyId }
    });

    if (strategy) {
      const newSuccessRate = this.calculateNewSuccessRate(
        strategy.successRate,
        strategy.usageCount,
        success
      );

      await this.prisma.agent2Strategy.update({
        where: { id: strategyId },
        data: {
          usageCount: { increment: 1 },
          successRate: newSuccessRate,
          avgDuration: this.updateAverageResponseTime(
            strategy.avgDuration,
            strategy.usageCount,
            duration
          ),
          lastUsed: new Date()
        }
      });
    }
  }

  calculateNewSuccessRate(currentRate, usageCount, success) {
    if (usageCount === 0) return success ? 1 : 0;
    return (currentRate * usageCount + (success ? 1 : 0)) / (usageCount + 1);
  }

  updateSpatialContext(currentContext, nearbyElements) {
    // Update spatial context with nearby elements
    return { ...currentContext, nearbyElements };
  }

  async createBackupSelectors(elementMapId, pageContext) {
    // Create backup selectors when primary reliability drops
    // This would analyze the page to find alternative selectors
  }
}

module.exports = Agent2ClickExecution;