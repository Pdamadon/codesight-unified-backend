/**
 * DirectSessionParser - Refactored Version
 * 
 * Orchestrates specialized services to extract 4-phase world model data:
 * 1. Domain Information
 * 2. Navigation Architecture  
 * 3. Shopping Flow Analysis
 * 4. Product Information Architecture
 * 
 * This refactored version delegates to specialized services for maintainability.
 */

import { 
  NavigationAnalysisService,
  ProductExtractionService,
  ShoppingFlowAnalysisService,
  PricingAndAvailabilityService,
  UIComponentAnalysisService,
  ProductVariantService,
  InteractionPatternService,
  DomainInformationService
} from './services';

export interface CleanSessionData {
  sessionId: string;
  domain: string;
  domainInformation: any;
  navigationArchitecture: any;
  shoppingFlowAnalysis: any;
  productInformationArchitecture: any;
  uiComponentLibrary: any;
  qualityScore: number;
  navigationEvents: any[];
  productInteractions: any[];
  visitedProducts: any[];
  productVariants: any[];
  extractedAt: Date;
  debugInfo: any;
}

interface ParsedInteraction {
  type: string;
  element: any;
  context: any;
  state?: {
    before?: {
      title?: string;
    };
  };
  timestamp: number;
  selectors: any;
}

export class DirectSessionParser {
  private navigationService: NavigationAnalysisService;
  private productService: ProductExtractionService;
  private shoppingFlowService: ShoppingFlowAnalysisService;
  private pricingService: PricingAndAvailabilityService;
  private uiComponentService: UIComponentAnalysisService;
  private variantService: ProductVariantService;
  private interactionService: InteractionPatternService;
  private domainService: DomainInformationService;

  constructor() {
    // Initialize all specialized services
    this.navigationService = new NavigationAnalysisService();
    this.productService = new ProductExtractionService();
    this.shoppingFlowService = new ShoppingFlowAnalysisService();
    this.pricingService = new PricingAndAvailabilityService();
    this.uiComponentService = new UIComponentAnalysisService();
    this.variantService = new ProductVariantService();
    this.interactionService = new InteractionPatternService();
    this.domainService = new DomainInformationService();
  }

  /**
   * Main entry point: Parse session using specialized services
   */
  parseSession(session: any): CleanSessionData | null {
    console.log(`🔧 DIRECT_PARSER_REFACTORED: Processing session ${session.id}`);
    
    const interactions = this.parseInteractions(session.enhancedInteractions);
    if (!interactions || interactions.length === 0) {
      console.log(`❌ DIRECT_PARSER: No valid interactions found`);
      return null;
    }
    
    console.log(`📊 DIRECT_PARSER: Analyzing ${interactions.length} interactions with specialized services`);
    
    // Extract domain from interactions
    const domain = this.extractDomain(interactions);
    if (!domain) {
      console.log(`❌ DIRECT_PARSER: No domain found in interactions`);
      return null;
    }

    try {
      // 1. Domain Information Analysis
      console.log(`🏢 Extracting domain information...`);
      const domainInformation = this.domainService.extractDomainInformation(interactions, domain);
      
      // 2. Navigation Architecture Analysis
      console.log(`🧭 Extracting navigation architecture...`);
      const navigationArchitecture = this.navigationService.extractNavigationArchitecture(interactions, domain);
      
      // 3. Shopping Flow Analysis
      console.log(`🛒 Extracting shopping flow analysis...`);
      const shoppingFlowAnalysis = this.shoppingFlowService.extractShoppingFlowAnalysis(interactions, domain);
      
      // 4. Product Information Extraction
      console.log(`📦 Extracting product information...`);
      const visitedProducts = this.productService.extractVisitedProducts(interactions);
      const productInteractions = this.productService.extractProductInteractions(interactions);
      const productVariants = this.variantService.extractProductVariants(interactions);
      
      // 5. UI Component Analysis (simplified for now)
      console.log(`🎨 Extracting UI components...`);
      const uiComponentLibrary = this.createEmptyUIComponentLibrary();
      
      // 6. Extract navigation events (keep original functionality)
      const navigationEvents = this.extractNavigationEvents(interactions);
      
      console.log(`✅ DIRECT_PARSER: Successfully extracted data using specialized services`);
      console.log(`   Navigation Events: ${navigationEvents.length}`);
      console.log(`   Product Interactions: ${productInteractions.length}`);
      console.log(`   Visited Products: ${visitedProducts.length}`);
      console.log(`   Product Variants: ${productVariants.length}`);
      
      return {
        sessionId: session.id,
        domain,
        domainInformation,
        navigationArchitecture,
        shoppingFlowAnalysis,
        productInformationArchitecture: this.createEmptyProductInformationArchitecture(),
        uiComponentLibrary,
        qualityScore: session.qualityScore || 0,
        navigationEvents,
        productInteractions,
        visitedProducts,
        productVariants,
        extractedAt: new Date(),
        debugInfo: {
          totalInteractions: interactions.length,
          servicesUsed: [
            'NavigationAnalysisService',
            'ProductExtractionService', 
            'ShoppingFlowAnalysisService',
            'PricingAndAvailabilityService'
          ]
        }
      };
      
    } catch (error) {
      console.error(`❌ DIRECT_PARSER: Error in service orchestration:`, error);
      return null;
    }
  }

  /**
   * Parse raw interactions into structured format
   */
  private parseInteractions(enhancedInteractions: any): ParsedInteraction[] | null {
    if (!enhancedInteractions) {
      console.log(`❌ PARSER: No enhanced interactions provided`);
      return null;
    }

    let parsedInteractions: any[] = [];
    
    try {
      if (typeof enhancedInteractions === 'string') {
        parsedInteractions = JSON.parse(enhancedInteractions);
      } else if (Array.isArray(enhancedInteractions)) {
        parsedInteractions = enhancedInteractions;
      } else {
        console.log(`❌ PARSER: Invalid enhancedInteractions format`);
        return null;
      }
    } catch (parseError) {
      console.log(`❌ PARSER: JSON parse error:`, parseError);
      return null;
    }

    if (!Array.isArray(parsedInteractions)) {
      console.log(`❌ PARSER: Parsed interactions is not an array`);
      return null;
    }

    // Transform into consistent format
    const interactions: ParsedInteraction[] = parsedInteractions.map((interaction, index) => ({
      type: interaction.interaction?.type || interaction.type || 'UNKNOWN',
      element: interaction.element || {},
      context: interaction.context || {},
      state: interaction.state || undefined,
      timestamp: interaction.interaction?.timestamp || interaction.timestamp || Date.now(),
      selectors: interaction.selectors || {}
    }));

    console.log(`✅ PARSER: Successfully parsed ${interactions.length} interactions`);
    return interactions;
  }

  /**
   * Extract domain from interactions
   */
  private extractDomain(interactions: ParsedInteraction[]): string | null {
    for (const interaction of interactions) {
      const url = interaction.context?.url || interaction.context?.pageUrl;
      if (url && typeof url === 'string') {
        try {
          const urlObj = new URL(url);
          return urlObj.hostname;
        } catch (e) {
          // Try simple extraction
          const match = url.match(/https?:\/\/([^\/]+)/);
          if (match) return match[1];
        }
      }
    }
    return null;
  }

  /**
   * Extract navigation events (keep original functionality for now)
   */
  private extractNavigationEvents(interactions: ParsedInteraction[]): any[] {
    const navigationEvents: any[] = [];
    
    interactions.forEach((interaction, index) => {
      if (interaction.type === 'CLICK') {
        const element = interaction.element;
        const context = interaction.context;
        const clickText = element?.text || '';
        const resultUrl = context?.url || '';
        
        if (this.isNavigationEvent(clickText, resultUrl)) {
          navigationEvents.push({
            eventId: `nav_${index}_${Date.now()}`,
            eventType: 'navigation',
            timestamp: new Date(interaction.timestamp || Date.now()),
            navigationData: {
              clickText,
              resultUrl,
              navigationType: this.classifyNavigationType(resultUrl)
            },
            extractedData: this.extractNavigationData(clickText, resultUrl),
            pageContext: {
              sourceUrl: context?.previousUrl || '',
              targetUrl: resultUrl,
              navigationFlow: 'click_navigation'
            }
          });
        }
      }
    });
    
    return navigationEvents;
  }

  // Helper methods for navigation events
  private isNavigationEvent(clickText: string, resultUrl: string): boolean {
    if (!clickText || clickText.length < 2) return false;
    if (!resultUrl || !this.isSignificantUrlChange('', resultUrl)) return false;
    
    const lowerText = clickText.toLowerCase();
    const navigationKeywords = ['home', 'shop', 'category', 'browse', 'menu', 'nav'];
    
    return navigationKeywords.some(keyword => lowerText.includes(keyword)) ||
           resultUrl.includes('/browse/') ||
           resultUrl.includes('/category/');
  }

  private classifyNavigationType(url: string): 'category' | 'product' | 'other' {
    if (url.includes('/browse/') || url.includes('/category/')) return 'category';
    if (url.includes('/product/') || url.includes('/p/')) return 'product';
    return 'other';
  }

  private extractNavigationData(clickText: string, resultUrl: string): any {
    return {
      linkText: clickText,
      targetUrl: resultUrl,
      extractedCategory: this.extractCategoryFromUrl(resultUrl),
      confidence: 0.8
    };
  }

  private extractCategoryFromUrl(url: string): string | null {
    const patterns = [
      /\/browse\/(.+)/,
      /\/category\/(.+)/,
      /\/(men|women|kids)\/(.+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1] || match[2];
      }
    }
    
    return null;
  }

  private isSignificantUrlChange(url1: string, url2: string): boolean {
    if (!url1 || !url2) return true;
    
    try {
      const urlObj1 = new URL(url1);
      const urlObj2 = new URL(url2);
      return urlObj1.pathname !== urlObj2.pathname;
    } catch (e) {
      return url1 !== url2;
    }
  }

  // Temporary empty implementations for services not yet fully extracted
  private createEmptyUIComponentLibrary(): any {
    return {
      componentTaxonomy: { components: [], hierarchy: [], relationships: [] },
      interactionPatterns: { clickPatterns: [], hoverPatterns: [], formPatterns: [] },
      layoutPatterns: { gridSystems: [], responsiveBreakpoints: [] },
      accessibilityPatterns: { ariaUsage: [], keyboardNavigation: [], screenReaderCompatibility: [] },
      designSystemAnalysis: { colorPalette: [], typography: [], spacing: [], componentVariations: [], brandingElements: [] }
    };
  }

  private createEmptyProductInformationArchitecture(): any {
    return {
      productTaxonomy: { categories: [], attributes: [], relationships: [] },
      productAttributeMapping: { coreAttributes: [], variantAttributes: [], filterableAttributes: [] },
      productRelationshipAnalysis: { similarProducts: [], crossSellProducts: [], bundleProducts: [] },
      inventoryAndAvailability: { stockPatterns: [], pricingPatterns: [] },
      productDiscoveryWorkflows: [],
      discoveryMetadata: { totalProducts: 0, taxonomyDepth: 0, attributeVariety: 0, relationshipStrength: 0, extractedAt: new Date() }
    };
  }
}