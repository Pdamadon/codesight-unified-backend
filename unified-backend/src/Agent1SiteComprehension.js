/**
 * Agent1SiteComprehension - Operational site understanding and navigation planning agent
 * This agent analyzes sites, understands architecture, and plans navigation strategies
 */

const { PrismaClient } = require('@prisma/client');

class Agent1SiteComprehension {
  constructor() {
    this.prisma = new PrismaClient();
    this.config = {
      analysisVersion: '1.0',
      confidenceThreshold: 0.6,
      maxRetries: 3,
      cacheExpiry: 24 * 60 * 60 * 1000 // 24 hours
    };
  }

  /**
   * Main entry point: analyze a site and understand its architecture
   */
  async analyzeSite(sessionData, worldModelData = null) {
    try {
      const domain = this.extractDomain(sessionData);
      const siteModel = await this.getOrCreateSiteModel(domain);
      
      // Analyze current session data
      const analysis = await this.performSiteAnalysis(sessionData, siteModel);
      
      // Update site model with new insights
      await this.updateSiteModel(siteModel, analysis);
      
      // Return comprehensive site understanding
      return {
        siteModel: siteModel,
        analysis: analysis,
        recommendations: this.generateRecommendations(analysis),
        confidence: analysis.overallConfidence,
        executedAt: new Date().toISOString()
      };
      
    } catch (error) {
      await this.logPerformance('site-analysis', false, null, { error: error.message });
      throw error;
    }
  }

  /**
   * Plan navigation strategy for a specific user intent
   */
  async planNavigation(userIntent, domain, goalType = 'UNKNOWN') {
    try {
      const startTime = Date.now();
      
      // Get site model and existing journey plans
      const siteModel = await this.getSiteModel(domain);
      if (!siteModel) {
        throw new Error(`No site model found for domain: ${domain}`);
      }

      // Check for existing journey plans
      const existingPlan = await this.findExistingJourneyPlan(siteModel.id, userIntent, goalType);
      if (existingPlan && existingPlan.planConfidence > this.config.confidenceThreshold) {
        await this.incrementPlanUsage(existingPlan.id);
        return this.formatJourneyPlan(existingPlan);
      }

      // Create new navigation plan
      const navigationPlan = await this.createNavigationPlan(siteModel, userIntent, goalType);
      
      // Store the plan for future use
      const storedPlan = await this.storeJourneyPlan(siteModel.id, navigationPlan);
      
      const duration = Date.now() - startTime;
      await this.logPerformance('navigation-planning', true, duration, {
        userIntent,
        goalType,
        stepCount: navigationPlan.steps.length
      });

      return this.formatJourneyPlan(storedPlan);
      
    } catch (error) {
      await this.logPerformance('navigation-planning', false, null, { error: error.message });
      throw error;
    }
  }

  /**
   * Classify page type and understand its role in site architecture
   */
  async classifyPage(pageData, siteModel) {
    try {
      const startTime = Date.now();
      
      // Extract page features for classification
      const features = this.extractPageFeatures(pageData);
      
      // Apply classification rules
      const classification = await this.classifyPageType(features, siteModel);
      
      // Analyze page within site context
      const contextAnalysis = await this.analyzePageContext(pageData, classification, siteModel);
      
      // Store page analysis
      const pageAnalysis = await this.storePageAnalysis(siteModel.id, {
        url: pageData.url,
        pageType: classification.pageType,
        pageTitle: pageData.title,
        semanticZones: contextAnalysis.zones,
        keyElements: contextAnalysis.keyElements,
        contentStructure: contextAnalysis.contentStructure,
        entryPoints: contextAnalysis.entryPoints,
        exitPoints: contextAnalysis.exitPoints,
        conversionOps: contextAnalysis.conversionOps,
        analysisScore: classification.confidence,
        completeness: contextAnalysis.completeness,
        reliability: contextAnalysis.reliability
      });

      const duration = Date.now() - startTime;
      await this.logPerformance('page-classification', true, duration, {
        pageType: classification.pageType,
        confidence: classification.confidence
      });

      return pageAnalysis;
      
    } catch (error) {
      await this.logPerformance('page-classification', false, null, { error: error.message });
      throw error;
    }
  }

  /**
   * Extract domain from session data
   */
  extractDomain(sessionData) {
    // Handle different session data formats
    if (sessionData.interactions && sessionData.interactions.length > 0) {
      const firstInteraction = sessionData.interactions[0];
      const url = firstInteraction.context?.url || firstInteraction.interaction?.url;
      if (url) {
        return new URL(url).hostname;
      }
    }
    
    if (sessionData.url) {
      return new URL(sessionData.url).hostname;
    }
    
    throw new Error('Cannot extract domain from session data');
  }

  /**
   * Get or create site model for domain
   */
  async getOrCreateSiteModel(domain) {
    const subdomain = this.extractSubdomain(domain);
    const baseDomain = this.extractBaseDomain(domain);
    
    let siteModel = await this.prisma.agent1SiteModel.findUnique({
      where: { domain_subdomain: { domain: baseDomain, subdomain } }
    });

    if (!siteModel) {
      siteModel = await this.prisma.agent1SiteModel.create({
        data: {
          domain: baseDomain,
          subdomain: subdomain,
          siteType: 'UNKNOWN',
          urlPatterns: [],
          pageTypes: [],
          navigationFlows: [],
          pageTypeRules: {},
          layoutPatterns: {},
          semanticZones: {},
          conversionFlows: [],
          businessGoals: [],
          userIntentTypes: []
        }
      });
    }

    return siteModel;
  }

  /**
   * Perform comprehensive site analysis
   */
  async performSiteAnalysis(sessionData, siteModel) {
    const analysis = {
      siteArchitecture: await this.analyzeSiteArchitecture(sessionData),
      pageTypes: await this.analyzePageTypes(sessionData),
      navigationPatterns: await this.analyzeNavigationPatterns(sessionData),
      businessFlow: await this.analyzeBusinessFlow(sessionData),
      userJourneys: await this.analyzeUserJourneys(sessionData),
      overallConfidence: 0
    };

    // Calculate overall confidence
    analysis.overallConfidence = this.calculateOverallConfidence(analysis);

    return analysis;
  }

  /**
   * Analyze site architecture from session data
   */
  async analyzeSiteArchitecture(sessionData) {
    const urls = this.extractUrls(sessionData);
    const urlPatterns = this.identifyUrlPatterns(urls);
    const siteType = this.inferSiteType(sessionData, urlPatterns);
    
    return {
      siteType,
      urlPatterns,
      averageDepth: this.calculateAverageUrlDepth(urls),
      commonDirectories: this.identifyCommonDirectories(urls),
      hierarchyStructure: this.buildHierarchyStructure(urls)
    };
  }

  /**
   * Analyze page types from session data
   */
  async analyzePageTypes(sessionData) {
    const pages = this.extractPages(sessionData);
    const pageTypeAnalysis = {};
    
    for (const page of pages) {
      const pageType = await this.inferPageType(page);
      if (!pageTypeAnalysis[pageType.type]) {
        pageTypeAnalysis[pageType.type] = {
          count: 0,
          confidence: [],
          examples: []
        };
      }
      
      pageTypeAnalysis[pageType.type].count++;
      pageTypeAnalysis[pageType.type].confidence.push(pageType.confidence);
      pageTypeAnalysis[pageType.type].examples.push({
        url: page.url,
        title: page.title,
        features: pageType.features
      });
    }

    return pageTypeAnalysis;
  }

  /**
   * Create navigation plan based on site understanding
   */
  async createNavigationPlan(siteModel, userIntent, goalType) {
    // Analyze user intent to determine goal
    const intentAnalysis = this.analyzeUserIntent(userIntent, goalType);
    
    // Generate step-by-step navigation plan
    const steps = await this.generateNavigationSteps(siteModel, intentAnalysis);
    
    // Create alternative paths
    const alternatives = await this.generateAlternativePaths(siteModel, intentAnalysis);
    
    // Define success criteria
    const successCriteria = this.defineSuccessCriteria(intentAnalysis);
    
    return {
      userIntent,
      goalType: intentAnalysis.goalType,
      startingPage: intentAnalysis.startingPage,
      steps,
      alternatives,
      successCriteria,
      confidence: this.calculatePlanConfidence(steps, alternatives),
      estimatedDuration: this.estimatePlanDuration(steps)
    };
  }

  /**
   * Extract page features for classification
   */
  extractPageFeatures(pageData) {
    return {
      url: pageData.url,
      title: pageData.title || '',
      urlPath: new URL(pageData.url).pathname,
      urlParams: new URL(pageData.url).searchParams,
      hasCheckoutKeywords: this.hasCheckoutKeywords(pageData),
      hasProductKeywords: this.hasProductKeywords(pageData),
      hasCategoryKeywords: this.hasCategoryKeywords(pageData),
      hasSearchKeywords: this.hasSearchKeywords(pageData),
      domElements: pageData.elements || [],
      interactions: pageData.interactions || []
    };
  }

  /**
   * Classify page type based on features
   */
  async classifyPageType(features, siteModel) {
    const rules = siteModel.pageTypeRules || {};
    const urlPath = features.urlPath.toLowerCase();
    
    // Apply URL-based rules first
    if (urlPath === '/' || urlPath === '') {
      return { pageType: 'homepage', confidence: 0.9, reasoning: 'Root URL indicates homepage' };
    }
    
    if (features.hasCheckoutKeywords || urlPath.includes('checkout') || urlPath.includes('cart')) {
      return { pageType: 'cartPage', confidence: 0.85, reasoning: 'Checkout/cart keywords detected' };
    }
    
    if (features.hasProductKeywords || urlPath.match(/\/product\/|\/item\/|\/p\//)) {
      return { pageType: 'productDetailPage', confidence: 0.8, reasoning: 'Product-specific patterns detected' };
    }
    
    if (features.hasCategoryKeywords || urlPath.match(/\/category\/|\/collection\/|\/shop\//)) {
      return { pageType: 'categoryPage', confidence: 0.75, reasoning: 'Category patterns detected' };
    }
    
    if (features.hasSearchKeywords || urlPath.includes('search') || features.urlParams.has('q')) {
      return { pageType: 'searchResults', confidence: 0.8, reasoning: 'Search patterns detected' };
    }
    
    // Default classification
    return { pageType: 'unknown', confidence: 0.3, reasoning: 'No clear patterns detected' };
  }

  /**
   * Helper methods for feature detection
   */
  hasCheckoutKeywords(pageData) {
    const checkoutKeywords = ['checkout', 'cart', 'basket', 'proceed', 'payment', 'billing'];
    const text = (pageData.title + ' ' + (pageData.content || '')).toLowerCase();
    return checkoutKeywords.some(keyword => text.includes(keyword));
  }

  hasProductKeywords(pageData) {
    const productKeywords = ['add to cart', 'buy now', 'price', 'size', 'color', 'quantity'];
    const text = (pageData.title + ' ' + (pageData.content || '')).toLowerCase();
    return productKeywords.some(keyword => text.includes(keyword));
  }

  hasCategoryKeywords(pageData) {
    const categoryKeywords = ['filter', 'sort', 'results', 'items', 'products', 'view all'];
    const text = (pageData.title + ' ' + (pageData.content || '')).toLowerCase();
    return categoryKeywords.some(keyword => text.includes(keyword));
  }

  hasSearchKeywords(pageData) {
    const searchKeywords = ['search results', 'found', 'matches', 'showing'];
    const text = (pageData.title + ' ' + (pageData.content || '')).toLowerCase();
    return searchKeywords.some(keyword => text.includes(keyword));
  }

  /**
   * Store page analysis in database
   */
  async storePageAnalysis(siteModelId, analysisData) {
    return await this.prisma.agent1PageAnalysis.create({
      data: {
        siteModelId,
        ...analysisData
      }
    });
  }

  /**
   * Store journey plan in database
   */
  async storeJourneyPlan(siteModelId, planData) {
    return await this.prisma.agent1JourneyPlan.create({
      data: {
        siteModelId,
        userIntent: planData.userIntent,
        goalType: planData.goalType,
        startingPage: planData.startingPage,
        plannedSteps: planData.steps,
        alternativePaths: planData.alternatives,
        successCriteria: planData.successCriteria,
        planConfidence: planData.confidence
      }
    });
  }

  /**
   * Log agent performance
   */
  async logPerformance(taskType, success, duration = null, additionalData = {}) {
    return await this.prisma.agentPerformanceLog.create({
      data: {
        agentType: 'SITE_COMPREHENSION',
        agentVersion: this.config.analysisVersion,
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
  extractSubdomain(domain) {
    const parts = domain.split('.');
    return parts.length > 2 ? parts[0] : null;
  }

  extractBaseDomain(domain) {
    const parts = domain.split('.');
    return parts.length > 2 ? parts.slice(-2).join('.') : domain;
  }

  extractUrls(sessionData) {
    const urls = [];
    if (sessionData.interactions) {
      sessionData.interactions.forEach(interaction => {
        const url = interaction.context?.url || interaction.interaction?.url;
        if (url) urls.push(url);
      });
    }
    return [...new Set(urls)]; // Remove duplicates
  }

  calculateOverallConfidence(analysis) {
    // Simple confidence calculation based on analysis quality
    let confidence = 0;
    let factors = 0;

    if (analysis.siteArchitecture) {
      confidence += 0.2;
      factors++;
    }
    if (analysis.pageTypes && Object.keys(analysis.pageTypes).length > 0) {
      confidence += 0.3;
      factors++;
    }
    if (analysis.navigationPatterns) {
      confidence += 0.2;
      factors++;
    }
    if (analysis.businessFlow) {
      confidence += 0.15;
      factors++;
    }
    if (analysis.userJourneys) {
      confidence += 0.15;
      factors++;
    }

    return factors > 0 ? confidence : 0;
  }

  // Placeholder methods - would be implemented with actual logic
  identifyUrlPatterns(urls) { return []; }
  inferSiteType(sessionData, urlPatterns) { return 'UNKNOWN'; }
  calculateAverageUrlDepth(urls) { return 2; }
  identifyCommonDirectories(urls) { return []; }
  buildHierarchyStructure(urls) { return {}; }
  extractPages(sessionData) { return []; }
  inferPageType(page) { return { type: 'unknown', confidence: 0.5, features: [] }; }
  analyzeNavigationPatterns(sessionData) { return {}; }
  analyzeBusinessFlow(sessionData) { return {}; }
  analyzeUserJourneys(sessionData) { return {}; }
  analyzeUserIntent(userIntent, goalType) { return { goalType, startingPage: null }; }
  generateNavigationSteps(siteModel, intentAnalysis) { return []; }
  generateAlternativePaths(siteModel, intentAnalysis) { return []; }
  defineSuccessCriteria(intentAnalysis) { return []; }
  calculatePlanConfidence(steps, alternatives) { return 0.7; }
  estimatePlanDuration(steps) { return steps.length * 5000; } // 5 seconds per step
  analyzePageContext(pageData, classification, siteModel) { 
    return {
      zones: [],
      keyElements: [],
      contentStructure: {},
      entryPoints: [],
      exitPoints: [],
      conversionOps: [],
      completeness: 0.7,
      reliability: 0.8
    };
  }
  getSiteModel(domain) { return this.getOrCreateSiteModel(domain); }
  findExistingJourneyPlan(siteModelId, userIntent, goalType) { return null; }
  incrementPlanUsage(planId) { return Promise.resolve(); }
  formatJourneyPlan(plan) { return plan; }
  updateSiteModel(siteModel, analysis) { return Promise.resolve(); }
  generateRecommendations(analysis) { return []; }
}

module.exports = Agent1SiteComprehension;