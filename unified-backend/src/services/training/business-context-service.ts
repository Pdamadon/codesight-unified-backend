/**
 * Business Context Service
 * 
 * Extracted from training-data-transformer.ts to provide focused business context functionality
 * for training data generation.
 * 
 * Handles e-commerce context, conversion funnels, business analysis, and user behavior patterns
 * for enhanced AI training with business intelligence.
 */

export interface BusinessContextService {
  analyzeBusinessContext(hostname: string, pageType: string, userJourney: string): any;
  extractBusinessContext(business: any, hostname: string, interaction?: any, allInteractions?: any[], interactionIndex?: number): any;
  formatBusinessContextForTraining(businessContext: any): string;
  extractBehaviorPatternsContext(user: any): any;
}

export class BusinessContextServiceImpl implements BusinessContextService {

  // Dependencies (would be injected in real implementation)
  private productContextBuilder: any;
  private productStateAccumulator: any;

  constructor(productContextBuilder?: any, productStateAccumulator?: any) {
    this.productContextBuilder = productContextBuilder;
    this.productStateAccumulator = productStateAccumulator;
  }

  /**
   * EXTRACTED: Analyze business context from hostname and page characteristics
   */
  analyzeBusinessContext(hostname: string, pageType: string, userJourney: string): any {
    const context: any = {};
    
    // Business sector detection
    if (hostname.includes('nordstrom') || hostname.includes('shop') || hostname.includes('store')) {
      context.sector = 'e-commerce';
      context.userIntent = pageType === 'product' ? 'product-research' : 'shopping';
      context.conversionStage = userJourney === 'checkout' ? 'conversion' : 'discovery';
    } else if (hostname.includes('bank') || hostname.includes('finance')) {
      context.sector = 'financial-services';
      context.userIntent = 'financial-management';
      context.conversionStage = 'service-usage';
    } else if (hostname.includes('health') || hostname.includes('medical')) {
      context.sector = 'healthcare';
      context.userIntent = 'health-management';
      context.conversionStage = 'appointment-booking';
    } else {
      context.sector = 'general';
      context.userIntent = 'information-seeking';
      context.conversionStage = 'engagement';
    }
    
    // Enhanced conversion funnel analysis
    context.funnelStage = this.determineFunnelStage(pageType, userJourney, hostname);
    context.businessModel = this.inferBusinessModel(hostname, pageType);
    context.userSegment = this.inferUserSegment(userJourney, pageType);
    
    return context;
  }

  /**
   * EXTRACTED: Extract comprehensive business context from interaction data
   */
  extractBusinessContext(business: any, hostname: string, interaction?: any, allInteractions?: any[], interactionIndex?: number): any {
    const context: any = {};
    
    // Enhanced: Use ProductContextBuilder for rich e-commerce context
    if (interaction && allInteractions && interactionIndex !== undefined && this.productContextBuilder) {
      console.log('🛒 [BUSINESS CONTEXT SERVICE] Calling ProductContextBuilder for business context', {
        totalInteractions: allInteractions.length,
        currentInteractionIndex: interactionIndex
      });
      
      const cartInteractions = this.productContextBuilder.analyzeCartInteractions(allInteractions);
      
      console.log('🛒 [BUSINESS CONTEXT SERVICE] ProductContextBuilder analysis complete', {
        cartInteractionsFound: cartInteractions.length,
        productContextBuilderActive: true
      });
      
      // Find if this interaction or recent interactions have product context
      const currentCartInteraction = cartInteractions.find((ci: any) => ci.interaction.timestamp === interaction.timestamp);
      const recentCartInteraction = cartInteractions
        .filter((ci: any) => Math.abs(ci.interaction.timestamp - interaction.timestamp) < 10000) // Within 10 seconds
        .sort((a: any, b: any) => Math.abs(b.interaction.timestamp - interaction.timestamp))[0];
      
      const productContext = currentCartInteraction || recentCartInteraction;
      
      // Get accumulated state from state accumulator
      const productId = this.extractProductIdFromInteraction(interaction);
      const accumulatedState = productId && this.productStateAccumulator ? 
        this.productStateAccumulator.getAllStates().get(productId) : null;
      
      if (productContext || accumulatedState) {
        // Prefer accumulated state data over product context builder (more comprehensive)
        if (accumulatedState) {
          // Use accumulated state for comprehensive product configuration
          context.ecommerce = {
            productId: accumulatedState.productId,
            productName: accumulatedState.productName,
            productCategory: accumulatedState.category,
            productPrice: accumulatedState.basePrice || 'Unknown',
            
            // Show accumulated selections with completion status
            selectedSize: accumulatedState.selectedSize,
            selectedColor: accumulatedState.selectedColor,
            selectedStyle: accumulatedState.selectedStyle,
            
            // State validation info
            cartReady: accumulatedState.readyForCart,
            selectionProgress: `${accumulatedState.completedSelections.length}/${accumulatedState.requiredSelections.length}`,
            missingSelections: accumulatedState.requiredSelections.filter((req: string) => 
              !accumulatedState.completedSelections.includes(req)
            ),
            
            // Enhanced confidence with state history
            confidence: accumulatedState.confidence,
            stage: accumulatedState.readyForCart ? 'ready-for-cart' : 'product-selection',
            
            // Selection history for training context
            selectionHistory: accumulatedState.selectionHistory.map((step: any) => 
              `Step ${step.stepNumber}: ${step.actionDescription}`
            ).join(', ')
          };
        } else if (productContext) {
          // Fallback to product context builder data
          const { productInfo, confidence } = productContext;
          const variant = productInfo.selectedVariant;
        
          // Rich e-commerce context with actual product details
          context.ecommerce = {
            productName: productInfo.name,
            productId: productInfo.id,
            productCategory: productInfo.category,
            productPrice: productInfo.basePrice || 'Unknown',
            selectedVariant: {
              size: variant.size || null,
              color: variant.color || null,
              style: variant.style || null
            },
            confidence: confidence,
            url: productInfo.url
          };
        }
        
        // Enhanced conversion context for cart interactions
        if (this.isCartButton(interaction.element, interaction.element?.text)) {
          context.conversion = {
            funnelStage: 'product-selection',
            action: 'add-to-cart',
            productResolved: true,
            variantTracking: Boolean(context.ecommerce?.selectedVariant?.size || context.ecommerce?.selectedVariant?.color)
          };
        }
      }
    }
    
    // Legacy business context (fallback)
    if (business?.ecommerce && !context.ecommerce) {
      context.ecommerce = `${business.ecommerce.productName || 'product'} $${business.ecommerce.productPrice || 0} ${business.ecommerce.productCategory || 'category'}`;
    }
    
    if (business?.conversion && !context.conversion) {
      context.conversion = `${business.conversion.funnelStage || 'unknown'} step-${business.conversion.funnelPosition || 0} ${business.conversion.abTestVariant || 'control'}`;
    }
    
    if (business?.user) {
      context.user = `segment:${business.user.customerSegment || 'unknown'} session:${business.user.timeOnSite || 0}s interactions:${business.user.previousInteractions || 0}`;
    }
    
    // Fallback business context detection from hostname
    if (!context.ecommerce && !business && hostname) {
      if (hostname.includes('nordstrom') || hostname.includes('shop') || hostname.includes('gap')) {
        context.ecommerce = 'e-commerce site';
        context.conversion = 'retail funnel';
      }
    }
    
    return context;
  }

  /**
   * EXTRACTED: Format business context for training examples
   */
  formatBusinessContextForTraining(businessContext: any): string {
    const contextParts: string[] = [];
    
    // Enhanced e-commerce context with product details
    if (businessContext.ecommerce && typeof businessContext.ecommerce === 'object') {
      const product = businessContext.ecommerce;
      contextParts.push(`Product: ${product.productName} (ID: ${product.productId})`);
      contextParts.push(`Category: ${product.productCategory}`);
      if (product.productPrice) {
        contextParts.push(`Price: ${product.productPrice}`);
      }
      
      // Enhanced: Show accumulated selections and state
      if (product.selectedSize || product.selectedColor || product.selectedStyle) {
        const selections = [];
        if (product.selectedSize) selections.push(`Size: ${product.selectedSize}`);
        if (product.selectedColor) selections.push(`Color: ${product.selectedColor}`);
        if (product.selectedStyle) selections.push(`Style: ${product.selectedStyle}`);
        contextParts.push(`Selected: ${selections.join(', ')}`);
      }
      
      // Show completion status for training context
      if (product.selectionProgress) {
        contextParts.push(`Progress: ${product.selectionProgress} selections`);
      }
      
      if (product.cartReady !== undefined) {
        contextParts.push(`Cart Ready: ${product.cartReady ? 'Yes' : 'No'}`);
      }
      
      // Selected variants (legacy support)
      const variant = product.selectedVariant;
      if (variant && !product.selectedSize) { // Only show if not already shown above
        const variantParts = [];
        if (variant.size) variantParts.push(`Size: ${variant.size}`);
        if (variant.color) variantParts.push(`Color: ${variant.color}`);
        if (variant.style) variantParts.push(`Style: ${variant.style}`);
        
        if (variantParts.length > 0) {
          contextParts.push(`Selected: ${variantParts.join(', ')}`);
        }
      }
      
      if (product.confidence) {
        contextParts.push(`Confidence: ${(product.confidence * 100).toFixed(1)}%`);
      }
    } else if (businessContext.ecommerce && typeof businessContext.ecommerce === 'string') {
      // Legacy format
      contextParts.push(`E-commerce: ${businessContext.ecommerce}`);
    }
    
    // Conversion context
    if (businessContext.conversion) {
      if (typeof businessContext.conversion === 'object') {
        contextParts.push(`Stage: ${businessContext.conversion.funnelStage || 'unknown'}`);
        if (businessContext.conversion.action) {
          contextParts.push(`Action: ${businessContext.conversion.action}`);
        }
      } else {
        contextParts.push(`Conversion: ${businessContext.conversion}`);
      }
    }
    
    // User context
    if (businessContext.user) {
      contextParts.push(`User: ${businessContext.user}`);
    }
    
    return contextParts.length > 0 ? contextParts.join(', ') : 'Standard business context';
  }

  /**
   * EXTRACTED: Extract user behavior patterns for training context
   */
  extractBehaviorPatternsContext(user: any): any {
    const context: any = {
      patterns: '',
      devicePreference: '',
      interactionPatterns: '',
      navigationStyle: '',
      preferences: '',
      purchaseHistory: '',
      personalization: ''
    };
    
    if (!user || !user.behaviorPatterns) {
      return { 
        patterns: 'standard-user', 
        devicePreference: 'desktop', 
        interactionPatterns: 'standard',
        navigationStyle: 'standard',
        preferences: 'default',
        purchaseHistory: 'none',
        personalization: 'basic'
      };
    }
    
    // Simplified behavior patterns for web automation
    const bp = user.behaviorPatterns;
    const patterns = [];
    
    // Device preferences - important for responsive automation
    if (bp.devicePreferences?.length) {
      context.devicePreference = bp.devicePreferences[0]; // primary device
      patterns.push(`${bp.devicePreferences[0]}-user`);
    } else {
      context.devicePreference = 'desktop';
    }
    
    // Common interaction patterns - important for automation strategy
    if (bp.commonInteractionPatterns?.length) {
      context.interactionPatterns = bp.commonInteractionPatterns.slice(0, 2).join('+');
      patterns.push(context.interactionPatterns);
    } else {
      context.interactionPatterns = 'click-direct';
    }
    
    // Navigation preferences - important for site traversal
    if (bp.navigationPreferences?.length) {
      context.navigationStyle = bp.navigationPreferences[0];
      patterns.push(context.navigationStyle);
    } else {
      context.navigationStyle = 'browse-categories';
    }
    
    // Enhanced: User preferences
    if (bp.preferences) {
      const prefs = [];
      if (bp.preferences.preferredCategories) prefs.push(`cats:${bp.preferences.preferredCategories.slice(0, 2).join(',')}`);
      if (bp.preferences.priceRange) prefs.push(`price:${bp.preferences.priceRange}`);
      if (bp.preferences.brands) prefs.push(`brands:${bp.preferences.brands.slice(0, 2).join(',')}`);
      context.preferences = prefs.join(' ') || 'standard-prefs';
    } else {
      context.preferences = 'standard-prefs';
    }
    
    // Enhanced: Purchase history patterns
    if (bp.purchaseHistory) {
      const historyParts = [];
      if (bp.purchaseHistory.frequentCategories) historyParts.push(`freq:${bp.purchaseHistory.frequentCategories.slice(0, 2).join(',')}`);
      if (bp.purchaseHistory.averageOrderValue) historyParts.push(`aov:${bp.purchaseHistory.averageOrderValue}`);
      if (bp.purchaseHistory.purchasePattern) historyParts.push(`pattern:${bp.purchaseHistory.purchasePattern}`);
      context.purchaseHistory = historyParts.join(' ') || 'no-history';
    } else {
      context.purchaseHistory = 'no-history';
    }
    
    // Enhanced: Personalization context
    if (bp.personalization) {
      const personalParts = [];
      if (bp.personalization.recommendationPreference) personalParts.push(`recs:${bp.personalization.recommendationPreference}`);
      if (bp.personalization.contentPreference) personalParts.push(`content:${bp.personalization.contentPreference}`);
      context.personalization = personalParts.join(' ') || 'basic-personal';
    } else {
      context.personalization = 'basic-personal';
    }
    
    context.patterns = patterns.join(' ') || 'standard-behavior';
    
    return context;
  }

  // Helper methods
  private determineFunnelStage(pageType: string, userJourney: string, hostname: string): string {
    if (userJourney === 'checkout' || pageType === 'checkout') return 'conversion';
    if (pageType === 'cart') return 'consideration';
    if (pageType === 'product') return 'evaluation';
    if (pageType === 'category' || pageType === 'search') return 'discovery';
    if (pageType === 'homepage') return 'awareness';
    
    return 'engagement';
  }

  private inferBusinessModel(hostname: string, pageType: string): string {
    if (hostname.includes('shop') || hostname.includes('store')) return 'e-commerce';
    if (hostname.includes('saas') || hostname.includes('app')) return 'subscription';
    if (hostname.includes('service')) return 'service-based';
    if (hostname.includes('media') || hostname.includes('news')) return 'content';
    
    return 'general';
  }

  private inferUserSegment(userJourney: string, pageType: string): string {
    if (userJourney === 'checkout') return 'ready-to-buy';
    if (pageType === 'cart') return 'considering';
    if (pageType === 'product') return 'researching';
    if (pageType === 'category') return 'browsing';
    
    return 'exploring';
  }

  private extractProductIdFromInteraction(interaction: any): string | null {
    // Try to extract product ID from URL, element attributes, or context
    const url = interaction.context?.pageUrl || '';
    const attributes = interaction.element?.attributes || {};
    
    // From URL path
    const urlMatch = url.match(/\/product\/([^\/\?]+)/);
    if (urlMatch) return urlMatch[1];
    
    // From data attributes
    if (attributes['data-product-id']) return attributes['data-product-id'];
    if (attributes['data-product']) return attributes['data-product'];
    
    // From context
    if (interaction.context?.productId) return interaction.context.productId;
    
    return null;
  }

  private isCartButton(element: any, elementText: string): boolean {
    if (!element && !elementText) return false;
    
    const text = (elementText || '').toLowerCase();
    const className = (element?.attributes?.class || '').toLowerCase();
    const id = (element?.attributes?.id || '').toLowerCase();
    
    const cartKeywords = ['add to cart', 'add to bag', 'buy now', 'purchase', 'add item'];
    const cartClasses = ['add-to-cart', 'add-cart', 'buy-btn', 'purchase-btn'];
    const cartIds = ['add-to-cart', 'buy-now', 'purchase'];
    
    return cartKeywords.some(keyword => text.includes(keyword)) ||
           cartClasses.some(cls => className.includes(cls)) ||
           cartIds.some(id_part => id.includes(id_part));
  }
}