/**
 * SessionAnalyzer - Core component for analyzing unified session data
 * Phase 1: Foundation - Page type classification and DOM pattern recognition
 */

const fs = require('fs');
const path = require('path');

class SessionAnalyzer {
  constructor() {
    this.pageTypePatterns = this.initializePageTypePatterns();
    this.semanticZones = this.initializeSemanticZones();
    this.analysisCache = new Map();
  }

  /**
   * Initialize page type classification patterns
   */
  initializePageTypePatterns() {
    return {
      homepage: {
        urlPatterns: [
          /^https?:\/\/[^\/]+\/?$/,
          /^https?:\/\/[^\/]+\/home/i,
          /^https?:\/\/[^\/]+\/index/i
        ],
        domPatterns: [
          '.hero', '.banner', '.featured', '.carousel',
          '[data-testid*="hero"]', '[data-testid*="banner"]',
          '.main-navigation', '.top-nav', '.primary-nav'
        ],
        textPatterns: [
          /welcome/i, /featured/i, /new arrivals/i, /trending/i
        ],
        confidence: 0.9
      },
      
      categoryPage: {
        urlPatterns: [
          /\/category/i, /\/browse/i, /\/shop/i, /\/products/i,
          /\/men/i, /\/women/i, /\/kids/i, /\/sale/i
        ],
        domPatterns: [
          '.product-grid', '.product-list', '.products',
          '.filter', '.filters', '.sort', '.sorting',
          '[data-testid*="product-grid"]', '[data-testid*="filter"]',
          '.pagination', '.load-more', '.show-more'
        ],
        textPatterns: [
          /filter/i, /sort/i, /results/i, /showing/i, /products/i
        ],
        confidence: 0.85
      },

      productDetailPage: {
        urlPatterns: [
          /\/product/i, /\/item/i, /\/p\//i, /\/dp\//i,
          /\/[^\/]+\/[^\/]+\/(.*\d+.*)/i // product URLs often have IDs
        ],
        domPatterns: [
          '.product-image', '.product-gallery', '.product-photos',
          '.add-to-cart', '.add-to-bag', '.buy-now', '.purchase',
          '.size-selector', '.color-picker', '.variant-selector',
          '.product-details', '.product-description', '.specifications',
          '[data-testid*="add-to-cart"]', '[data-testid*="size"]'
        ],
        textPatterns: [
          /add to cart/i, /add to bag/i, /buy now/i, /size/i,
          /color/i, /price/i, /\$\d+/i, /in stock/i, /out of stock/i
        ],
        confidence: 0.95
      },

      cartPage: {
        urlPatterns: [
          /\/cart/i, /\/bag/i, /\/basket/i, /\/checkout/i
        ],
        domPatterns: [
          '.cart-item', '.bag-item', '.cart-summary',
          '.checkout', '.proceed-to-checkout', '.checkout-button',
          '.quantity-selector', '.remove-item', '.cart-total',
          '[data-testid*="cart"]', '[data-testid*="checkout"]'
        ],
        textPatterns: [
          /shopping cart/i, /your bag/i, /checkout/i, /total/i,
          /subtotal/i, /shipping/i, /tax/i, /quantity/i
        ],
        confidence: 0.9
      },

      searchResults: {
        urlPatterns: [
          /\/search/i, /[?&]q=/i, /[?&]query=/i, /[?&]search=/i
        ],
        domPatterns: [
          '.search-results', '.search-grid', '.results',
          '.search-filters', '.search-sort', '.search-pagination',
          '[data-testid*="search"]', '.no-results'
        ],
        textPatterns: [
          /search results/i, /results for/i, /found/i, /matches/i,
          /no results/i, /did you mean/i
        ],
        confidence: 0.8
      },

      checkoutPage: {
        urlPatterns: [
          /\/checkout/i, /\/payment/i, /\/billing/i, /\/shipping/i
        ],
        domPatterns: [
          '.checkout-form', '.payment-form', '.billing-form',
          '.shipping-form', '.order-summary', '.payment-method',
          '.credit-card', '.address-form', '.place-order',
          '[data-testid*="checkout"]', '[data-testid*="payment"]'
        ],
        textPatterns: [
          /checkout/i, /payment/i, /billing/i, /shipping/i,
          /order summary/i, /place order/i, /complete order/i
        ],
        confidence: 0.85
      }
    };
  }

  /**
   * Initialize semantic zone patterns
   */
  initializeSemanticZones() {
    return {
      navigation: {
        selectors: [
          'nav', '.nav', '.navigation', '.menu', '.navbar',
          '.header', '.top-nav', '.main-nav', '.primary-nav',
          '[role="navigation"]', '[data-testid*="nav"]'
        ],
        textPatterns: [/home/i, /shop/i, /about/i, /contact/i, /menu/i]
      },

      productGrid: {
        selectors: [
          '.product-grid', '.products', '.product-list',
          '.grid', '.catalog', '.items', '.tiles',
          '[data-testid*="product-grid"]', '[data-testid*="products"]'
        ],
        childPatterns: ['.product-card', '.product-item', '.tile']
      },

      filterSidebar: {
        selectors: [
          '.filters', '.filter-panel', '.sidebar', '.facets',
          '.refinements', '.filter-options', '.sort-options',
          '[data-testid*="filter"]', '[data-testid*="sidebar"]'
        ],
        textPatterns: [/filter/i, /sort/i, /refine/i, /narrow/i]
      },

      productDetails: {
        selectors: [
          '.product-details', '.product-info', '.item-details',
          '.specifications', '.description', '.features',
          '[data-testid*="product-detail"]', '[data-testid*="description"]'
        ],
        textPatterns: [/description/i, /details/i, /specifications/i, /features/i]
      },

      actionButtons: {
        selectors: [
          '.add-to-cart', '.add-to-bag', '.buy-now', '.purchase',
          '.checkout', '.proceed', '.continue', '.next',
          '[data-testid*="add-to-cart"]', '[data-testid*="buy"]'
        ],
        textPatterns: [/add to cart/i, /buy now/i, /checkout/i, /purchase/i]
      },

      footer: {
        selectors: [
          'footer', '.footer', '.site-footer', '.page-footer',
          '.bottom', '[role="contentinfo"]'
        ],
        textPatterns: [/copyright/i, /privacy/i, /terms/i, /help/i]
      }
    };
  }

  /**
   * Analyze a complete session and extract patterns
   */
  async analyzeSession(sessionData) {
    const analysis = {
      sessionId: sessionData.id,
      pageTypes: new Map(),
      navigationFlow: [],
      semanticZones: new Map(),
      patterns: {
        commonSelectors: new Map(),
        interactionSequences: [],
        userJourneyType: null
      },
      quality: {
        completeness: 0,
        reliability: 0,
        analysisConfidence: 0
      }
    };

    // Analyze interactions and screenshots
    const interactions = sessionData.interactions || [];
    const screenshots = sessionData.screenshots || [];

    // Process each interaction for page analysis
    for (const interaction of interactions) {
      const pageAnalysis = await this.analyzePage(
        interaction.context?.domSnapshot,
        interaction.context?.url,
        {
          pageTitle: interaction.context?.pageTitle,
          timestamp: interaction.timestamp,
          interactionType: interaction.type
        }
      );

      if (pageAnalysis.pageType) {
        const pageKey = `${pageAnalysis.pageType}_${interaction.timestamp}`;
        analysis.pageTypes.set(pageKey, pageAnalysis);
        
        analysis.navigationFlow.push({
          timestamp: interaction.timestamp,
          url: interaction.context?.url,
          pageType: pageAnalysis.pageType,
          confidence: pageAnalysis.confidence,
          interactionType: interaction.type
        });
      }

      // Extract semantic zones
      const zones = this.extractSemanticZones(interaction.context?.domSnapshot);
      if (zones.length > 0) {
        analysis.semanticZones.set(interaction.timestamp, zones);
      }

      // Track selector patterns
      if (interaction.selectors?.xpath) {
        const selector = interaction.selectors.xpath;
        const count = analysis.patterns.commonSelectors.get(selector) || 0;
        analysis.patterns.commonSelectors.set(selector, count + 1);
      }
    }

    // Determine overall journey type
    analysis.patterns.userJourneyType = this.identifyJourneyType(analysis.navigationFlow);

    // Calculate quality metrics
    analysis.quality = this.calculateAnalysisQuality(analysis, sessionData);

    return analysis;
  }

  /**
   * Classify page type from DOM structure and URL
   */
  async analyzePage(domSnapshot, url, metadata = {}) {
    const cacheKey = `${url}_${JSON.stringify(metadata)}`;
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey);
    }

    const analysis = {
      url,
      pageType: 'unknown',
      confidence: 0,
      matchedPatterns: [],
      zones: [],
      metadata: metadata
    };

    let bestMatch = { type: 'unknown', confidence: 0, patterns: [] };

    // Test each page type
    for (const [pageType, patterns] of Object.entries(this.pageTypePatterns)) {
      const match = this.testPageTypeMatch(url, domSnapshot, patterns, metadata);
      
      if (match.confidence > bestMatch.confidence) {
        bestMatch = {
          type: pageType,
          confidence: match.confidence,
          patterns: match.matchedPatterns
        };
      }
    }

    analysis.pageType = bestMatch.type;
    analysis.confidence = bestMatch.confidence;
    analysis.matchedPatterns = bestMatch.patterns;
    analysis.zones = this.extractSemanticZones(domSnapshot);

    // Cache the result
    this.analysisCache.set(cacheKey, analysis);

    return analysis;
  }

  /**
   * Test if a page matches a specific page type pattern
   */
  testPageTypeMatch(url, domSnapshot, patterns, metadata) {
    let totalConfidence = 0;
    let matchCount = 0;
    const matchedPatterns = [];

    // Test URL patterns
    if (patterns.urlPatterns && url) {
      for (const pattern of patterns.urlPatterns) {
        if (pattern.test(url)) {
          totalConfidence += 0.4;
          matchCount++;
          matchedPatterns.push({ type: 'url', pattern: pattern.source });
          break; // Only count one URL match
        }
      }
    }

    // Test DOM patterns
    if (patterns.domPatterns && domSnapshot) {
      const domString = JSON.stringify(domSnapshot);
      let domMatches = 0;
      
      for (const pattern of patterns.domPatterns) {
        if (domString.includes(pattern) || 
            (domSnapshot.tag && domSnapshot.tag.includes(pattern.replace('.', '').replace('#', '')))) {
          domMatches++;
          matchedPatterns.push({ type: 'dom', pattern });
        }
      }
      
      if (domMatches > 0) {
        totalConfidence += Math.min(0.4, domMatches * 0.1);
        matchCount++;
      }
    }

    // Test text patterns
    if (patterns.textPatterns && (metadata.pageTitle || domSnapshot)) {
      const textContent = [
        metadata.pageTitle || '',
        JSON.stringify(domSnapshot || '')
      ].join(' ').toLowerCase();

      let textMatches = 0;
      for (const pattern of patterns.textPatterns) {
        if (pattern.test(textContent)) {
          textMatches++;
          matchedPatterns.push({ type: 'text', pattern: pattern.source });
        }
      }

      if (textMatches > 0) {
        totalConfidence += Math.min(0.2, textMatches * 0.05);
        matchCount++;
      }
    }

    // Apply base confidence from pattern definition
    const finalConfidence = matchCount > 0 ? 
      Math.min(1.0, totalConfidence * (patterns.confidence || 0.7)) : 0;

    return {
      confidence: finalConfidence,
      matchedPatterns,
      matchCount
    };
  }

  /**
   * Extract semantic zones from DOM snapshot
   */
  extractSemanticZones(domSnapshot) {
    if (!domSnapshot) return [];

    const zones = [];
    const domString = JSON.stringify(domSnapshot);

    for (const [zoneName, zonePatterns] of Object.entries(this.semanticZones)) {
      let confidence = 0;
      const matchedSelectors = [];

      // Test selectors
      if (zonePatterns.selectors) {
        for (const selector of zonePatterns.selectors) {
          if (domString.includes(selector.replace('.', '').replace('#', ''))) {
            confidence += 0.3;
            matchedSelectors.push(selector);
          }
        }
      }

      // Test text patterns
      if (zonePatterns.textPatterns) {
        for (const pattern of zonePatterns.textPatterns) {
          if (pattern.test(domString)) {
            confidence += 0.2;
          }
        }
      }

      // Test child patterns
      if (zonePatterns.childPatterns) {
        for (const childPattern of zonePatterns.childPatterns) {
          if (domString.includes(childPattern.replace('.', ''))) {
            confidence += 0.1;
          }
        }
      }

      if (confidence > 0.2) { // Minimum confidence threshold
        zones.push({
          name: zoneName,
          confidence: Math.min(1.0, confidence),
          matchedSelectors,
          patterns: zonePatterns
        });
      }
    }

    return zones.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Identify the overall journey type from navigation flow
   */
  identifyJourneyType(navigationFlow) {
    if (navigationFlow.length === 0) return 'unknown';

    const pageTypeSequence = navigationFlow.map(flow => flow.pageType);
    const uniquePages = new Set(pageTypeSequence);

    // Common journey patterns
    if (uniquePages.has('cartPage') || uniquePages.has('checkoutPage')) {
      return 'ecommerce-purchase';
    }

    if (pageTypeSequence.includes('searchResults')) {
      return 'search-browse';
    }

    if (pageTypeSequence.includes('productDetailPage') && 
        pageTypeSequence.includes('categoryPage')) {
      return 'product-research';
    }

    if (navigationFlow.length > 5) {
      return 'complex-task';
    }

    return 'general-task';
  }

  /**
   * Calculate overall analysis quality metrics
   */
  calculateAnalysisQuality(analysis, sessionData) {
    let completeness = 0;
    let reliability = 0;
    let analysisConfidence = 0;

    // Completeness: How much of the session was successfully analyzed
    const totalInteractions = (sessionData.interactions || []).length;
    const analyzedPages = analysis.pageTypes.size;
    
    if (totalInteractions > 0) {
      completeness = Math.min(1.0, analyzedPages / totalInteractions);
    }

    // Reliability: Average confidence of page type classifications
    const confidences = Array.from(analysis.pageTypes.values())
      .map(page => page.confidence);
    
    if (confidences.length > 0) {
      reliability = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    }

    // Analysis confidence: Overall quality of pattern matching
    const hasValidJourney = analysis.patterns.userJourneyType !== 'unknown';
    const hasSemanticZones = analysis.semanticZones.size > 0;
    const hasPatterns = analysis.patterns.commonSelectors.size > 0;

    analysisConfidence = (
      (hasValidJourney ? 0.4 : 0) +
      (hasSemanticZones ? 0.3 : 0) +
      (hasPatterns ? 0.3 : 0)
    );

    return {
      completeness: Math.round(completeness * 100) / 100,
      reliability: Math.round(reliability * 100) / 100,
      analysisConfidence: Math.round(analysisConfidence * 100) / 100
    };
  }

  /**
   * Export analysis results to file
   */
  async exportAnalysis(analysis, outputPath) {
    const exportData = {
      ...analysis,
      pageTypes: Object.fromEntries(analysis.pageTypes),
      semanticZones: Object.fromEntries(analysis.semanticZones),
      patterns: {
        ...analysis.patterns,
        commonSelectors: Object.fromEntries(analysis.patterns.commonSelectors)
      },
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };

    await fs.promises.writeFile(
      outputPath, 
      JSON.stringify(exportData, null, 2), 
      'utf8'
    );

    return outputPath;
  }
}

module.exports = SessionAnalyzer;