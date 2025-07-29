/**
 * Product Context Builder - Tracks Product Selections Across Interactions
 * 
 * Problem: When users click "Add to Cart", we don't know what specific product 
 * variant they're adding (size, color, price, etc.)
 * 
 * Solution: Build product state by analyzing interaction sequences leading to cart actions
 * 
 * 🔄 ENHANCED: Now uses DynamicPatternMatcher for flexible pattern recognition
 * instead of hardcoded domain values
 */

import { DynamicPatternMatcher, PatternMatchResult } from './dynamic-pattern-matcher';

export interface ProductVariant {
  size?: string;
  color?: string;
  style?: string;
  quantity?: number;
  price?: string;
  sku?: string;
}

export interface ProductInfo {
  id: string;                    // Product ID from URL
  name: string;                  // Product name from page title
  category: string;              // Category from URL/navigation
  brand?: string;                // Brand from page context
  basePrice?: string;            // Base price before variant selection
  selectedVariant: ProductVariant; // User's selections
  url: string;                   // Product page URL
  timestamp: number;             // When product context was established
}

export interface CartInteraction {
  interaction: any;              // The actual "Add to Cart" interaction
  productInfo: ProductInfo;      // Resolved product with selected variants
  confidence: number;            // Confidence in product resolution (0-1)
  resolutionMethod: string;      // How we determined the product details
}

export class ProductContextBuilder {
  private productSelections: Map<string, ProductVariant> = new Map();
  private currentProduct: ProductInfo | null = null;
  private patternMatcher: DynamicPatternMatcher;

  constructor() {
    this.patternMatcher = new DynamicPatternMatcher();
  }

  /**
   * Analyze a sequence of interactions to identify cart actions with product context
   */
  public analyzeCartInteractions(interactions: any[]): CartInteraction[] {
    console.log('🛒 [PRODUCT CONTEXT BUILDER] Starting cart interaction analysis', {
      totalInteractions: interactions.length,
      componentActive: true,
      dynamicPatternMatcherLoaded: !!this.patternMatcher
    });
    
    const cartInteractions: CartInteraction[] = [];
    let productStateUpdates = 0;
    let cartActionsFound = 0;
    
    for (let i = 0; i < interactions.length; i++) {
      const interaction = interactions[i];
      
      // Update product state tracking
      this.updateProductState(interaction, interactions, i);
      productStateUpdates++;
      
      // Check if this is a cart interaction
      if (this.isCartInteraction(interaction)) {
        cartActionsFound++;
        console.log('🛒 [PRODUCT CONTEXT BUILDER] Cart interaction detected', {
          interactionIndex: i,
          elementText: interaction.element?.text,
          elementTag: interaction.element?.tag
        });
        
        const productInfo = this.resolveProductForCartAction(interaction, interactions, i);
        
        if (productInfo) {
          cartInteractions.push({
            interaction,
            productInfo,
            confidence: this.calculateConfidence(productInfo, interaction),
            resolutionMethod: this.getResolutionMethod(productInfo)
          });
          
          console.log('🛒 [PRODUCT CONTEXT BUILDER] Product context resolved', {
            productId: productInfo.id,
            productName: productInfo.name,
            selectedVariant: productInfo.selectedVariant,
            confidence: this.calculateConfidence(productInfo, interaction)
          });
        }
      }
    }
    
    console.log('🛒 [PRODUCT CONTEXT BUILDER] Analysis completed', {
      productStateUpdates,
      cartActionsFound,
      resolvedCartInteractions: cartInteractions.length,
      dynamicPatternsUsed: this.patternMatcher ? true : false
    });
    
    return cartInteractions;
  }

  /**
   * Extract price from page context or nearby elements
   */
  private extractPrice(interaction: any, allInteractions: any[], currentIndex: number): string | null {
    // Look for price in current interaction's nearby elements
    const nearbyElements = interaction.element?.nearbyElements || [];
    for (const nearby of nearbyElements) {
      const priceMatch = this.findPriceInText(nearby.text || '');
      if (priceMatch) return priceMatch;
    }
    
    // Look in recent interactions for price information
    const recentRange = Math.max(0, currentIndex - 5);
    const recentInteractions = allInteractions.slice(recentRange, currentIndex + 5);
    
    for (const recentInteraction of recentInteractions) {
      const element = recentInteraction.element || {};
      const text = element.text || '';
      const priceMatch = this.findPriceInText(text);
      if (priceMatch) return priceMatch;
    }
    
    return null;
  }

  /**
   * Find price patterns in text
   */
  private findPriceInText(text: string): string | null {
    if (!text) return null;
    
    // Common price patterns: $12.99, $12, USD 12.99, 12.99, etc.
    const pricePatterns = [
      /\$(\d+(?:\.\d{2})?)/,           // $12.99, $12
      /(\d+(?:\.\d{2})?)\s*USD/i,      // 12.99 USD
      /(\d+(?:\.\d{2})?)\s*dollars?/i, // 12.99 dollars
      /price:?\s*\$?(\d+(?:\.\d{2})?)/i // Price: $12.99
    ];
    
    for (const pattern of pricePatterns) {
      const match = text.match(pattern);
      if (match) {
        const price = match[1];
        // Validate price is reasonable (not a year, phone number, etc.)
        const priceNum = parseFloat(price);
        if (priceNum > 0 && priceNum < 10000) {
          return `$${price}`;
        }
      }
    }
    
    return null;
  }

  /**
   * Update product state based on current interaction
   */
  private updateProductState(interaction: any, allInteractions: any[], index: number): void {
    const element = interaction.element || {};
    const context = interaction.context || {};
    const url = context.url || '';
    
    // Detect product page context
    if (this.isProductPage(url)) {
      const productId = this.extractProductId(url);
      if (productId) {
        const price = this.extractPrice(interaction, allInteractions, index);
        this.currentProduct = {
          id: productId,
          name: this.extractProductName(context.pageTitle || ''),
          category: this.extractCategory(url),
          basePrice: price || undefined,
          selectedVariant: this.productSelections.get(productId) || {},
          url: url,
          timestamp: interaction.timestamp
        };
      }
    }
    
    // Track size selections
    if (this.isSizeSelection(element)) {
      const size = this.extractSize(element);
      if (size && this.currentProduct) {
        const currentSelections = this.productSelections.get(this.currentProduct.id) || {};
        this.productSelections.set(this.currentProduct.id, {
          ...currentSelections,
          size
        });
        this.currentProduct.selectedVariant.size = size;
      }
    }
    
    // Track color selections
    if (this.isColorSelection(element)) {
      const color = this.extractColor(element);
      if (color && this.currentProduct) {
        const currentSelections = this.productSelections.get(this.currentProduct.id) || {};
        this.productSelections.set(this.currentProduct.id, {
          ...currentSelections,
          color
        });
        this.currentProduct.selectedVariant.color = color;
      }
    }
  }

  /**
   * Resolve complete product info for a cart interaction
   */
  private resolveProductForCartAction(
    cartInteraction: any, 
    allInteractions: any[], 
    cartIndex: number
  ): ProductInfo | null {
    const cartContext = cartInteraction.context || {};
    const cartUrl = cartContext.url || '';
    
    // Method 1: Use current product if we're on the same product page
    if (this.currentProduct && this.isProductPage(cartUrl)) {
      const cartProductId = this.extractProductId(cartUrl);
      if (cartProductId === this.currentProduct.id) {
        return { ...this.currentProduct };
      }
    }
    
    // Method 2: Look backwards for product context
    const recentProductContext = this.findRecentProductContext(allInteractions, cartIndex);
    if (recentProductContext) {
      return recentProductContext;
    }
    
    // Method 3: Extract basic product info from cart interaction context
    if (this.isProductPage(cartUrl)) {
      const basicProductInfo = this.extractBasicProductInfo(cartInteraction);
      if (basicProductInfo) {
        return basicProductInfo;
      }
    }
    
    return null;
  }

  /**
   * Look backwards from cart interaction to find recent product selections
   * Enhanced to handle product variants with different IDs
   */
  private findRecentProductContext(allInteractions: any[], cartIndex: number): ProductInfo | null {
    // Look at the 15 interactions before the cart click (extended range for variants)
    const lookbackRange = Math.max(0, cartIndex - 15);
    const recentInteractions = allInteractions.slice(lookbackRange, cartIndex);
    
    let productInfo: ProductInfo | null = null;
    let selectedVariant: ProductVariant = {};
    const productCandidates: ProductInfo[] = [];
    
    // Scan backwards for product pages and selections
    for (let i = recentInteractions.length - 1; i >= 0; i--) {
      const interaction = recentInteractions[i];
      const context = interaction.context || {};
      const element = interaction.element || {};
      const url = context.url || '';
      
      // Collect all product pages (variants of same product)
      if (this.isProductPage(url)) {
        const productId = this.extractProductId(url);
        if (productId) {
          const candidate = {
            id: productId,
            name: this.extractProductName(context.pageTitle || ''),
            category: this.extractCategory(url),
            selectedVariant: {},
            url: url,
            timestamp: interaction.timestamp
          };
          
          // Only add if we haven't seen this exact product ID
          if (!productCandidates.find(p => p.id === productId)) {
            productCandidates.push(candidate);
          }
        }
      }
      
      // Collect size selection from any recent interaction
      if (this.isSizeSelection(element) && !selectedVariant.size) {
        const size = this.extractSize(element);
        if (size) {
          selectedVariant.size = size;
        }
      }
      
      // Collect color selection from any recent interaction
      if (this.isColorSelection(element) && !selectedVariant.color) {
        const color = this.extractColor(element);
        if (color) {
          selectedVariant.color = color;
        }
      }
    }
    
    // Choose the best product candidate
    if (productCandidates.length > 0) {
      // Prefer the most recent product page, or one that matches the base product name
      productInfo = productCandidates[0]; // Most recent by our scan order
      
      // If we have multiple candidates, try to find the base product
      if (productCandidates.length > 1) {
        const baseProduct = this.findBaseProductFromVariants(productCandidates);
        if (baseProduct) {
          productInfo = baseProduct;
        }
      }
      
      // Apply collected variant selections
      productInfo.selectedVariant = selectedVariant;
      return productInfo;
    }
    
    return null;
  }

  /**
   * Find the base product from multiple variants based on name similarity
   */
  private findBaseProductFromVariants(candidates: ProductInfo[]): ProductInfo | null {
    if (candidates.length === 0) return null;
    
    // Group by similar names (same base product)
    const nameGroups = new Map<string, ProductInfo[]>();
    
    for (const candidate of candidates) {
      const baseName = this.extractBaseProductName(candidate.name);
      if (!nameGroups.has(baseName)) {
        nameGroups.set(baseName, []);
      }
      nameGroups.get(baseName)!.push(candidate);
    }
    
    // Return the most recent from the largest group
    let largestGroup: ProductInfo[] = [];
    for (const group of Array.from(nameGroups.values())) {
      if (group.length > largestGroup.length) {
        largestGroup = group;
      }
    }
    
    // Sort by timestamp and return most recent
    return largestGroup.sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  /**
   * Extract base product name (remove variant-specific details)
   */
  private extractBaseProductName(fullName: string): string {
    // Remove common variant indicators
    return fullName
      .replace(/\s*\([^)]*\)/, '') // Remove parenthetical info
      .replace(/\s*-\s*[A-Z]\w*$/, '') // Remove trailing variant names
      .toLowerCase()
      .trim();
  }

  /**
   * Check if interaction is a cart action - Generic cross-site detection
   */
  private isCartInteraction(interaction: any): boolean {
    const element = interaction.element || {};
    const text = (element.text || '').toLowerCase();
    const attributes = element.attributes || {};
    
    // Pattern 1: Text-based detection (most reliable)
    const cartTextPatterns = [
      'add to cart', 'add to bag', 'add to basket',
      'buy now', 'purchase', 'add item',
      'add product', 'shop now'
    ];
    const hasCartText = cartTextPatterns.some(pattern => text.includes(pattern));
    
    // Pattern 2: Semantic attribute detection
    const cartKeywords = ['cart', 'bag', 'basket', 'buy', 'purchase', 'shop'];
    const hasSemanticPattern = this.hasSemanticPattern(attributes, cartKeywords);
    
    // Pattern 3: Contextual detection (button on product page)
    const isButtonOnProductPage = (
      ['button', 'input', 'a'].includes(element.tag) &&
      this.isProductPage(interaction.context?.url || '')
    );
    
    return hasCartText || (hasSemanticPattern && isButtonOnProductPage);
  }

  /**
   * Check if URL is a product page
   */
  private isProductPage(url: string): boolean {
    return url.includes('/product') || 
           url.includes('/p/') ||
           url.includes('pid=') ||
           url.includes('/item/');
  }

  /**
   * Extract product ID from URL - supports multiple e-commerce patterns
   */
  private extractProductId(url: string): string | null {
    // Common e-commerce product ID patterns
    const patterns = [
      /pid=([^&]+)/i,                    // Gap: pid=7281101121106
      /\/product\/([^/?]+)/i,            // /product/123
      /\/p\/([^/?]+)/i,                  // /p/123
      /\/item\/([^/?]+)/i,               // /item/123
      /\/dp\/([^/?]+)/i,                 // Amazon: /dp/B123
      /\/products\/([^/?]+)/i,           // Shopify: /products/product-name
      /product_id=([^&]+)/i,             // product_id=123
      /sku=([^&]+)/i,                    // sku=ABC123
      /id=([^&]+)/i                      // Generic id=123
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Extract product name from page title
   */
  private extractProductName(pageTitle: string): string {
    // Remove " | Brand" suffix
    return pageTitle.replace(/\s*\|\s*\w+\s*$/, '').trim();
  }

  /**
   * Extract category from URL or navigation context - intelligent extraction
   */
  private extractCategory(url: string): string {
    // Extract from URL path segments
    const pathSegments = url.split('/').filter(seg => seg && !seg.includes('?'));
    const categoryKeywords = ['shirts', 'hoodies', 'sweatshirts', 'underwear', 'jeans', 'pants', 'shorts', 'jackets'];
    
    // Look for category in path
    for (const segment of pathSegments) {
      const lowerSegment = segment.toLowerCase();
      for (const keyword of categoryKeywords) {
        if (lowerSegment.includes(keyword)) {
          return this.formatCategoryName(keyword);
        }
      }
    }
    
    // Extract from query parameters (nav breadcrumbs)
    const navMatch = url.match(/nav=meganav[^&]*Categories[^&]*([^%]+)/i);
    if (navMatch) {
      return decodeURIComponent(navMatch[1]).replace(/\+/g, ' ');
    }
    
    // Fallback to URL analysis
    if (url.includes('men')) return 'Men';
    if (url.includes('women')) return 'Women';
    
    return 'General';
  }

  /**
   * Format category name properly
   */
  private formatCategoryName(keyword: string): string {
    const categoryMap: { [key: string]: string } = {
      'shirts': 'Shirts',
      'hoodies': 'Hoodies & Sweatshirts',
      'sweatshirts': 'Hoodies & Sweatshirts',
      'underwear': 'Underwear',
      'jeans': 'Jeans',
      'pants': 'Pants',
      'shorts': 'Shorts',
      'jackets': 'Jackets'
    };
    
    return categoryMap[keyword] || keyword.charAt(0).toUpperCase() + keyword.slice(1);
  }

  /**
   * Check if element is a size selection - Generic cross-site detection
   */
  private isSizeSelection(element: any): boolean {
    const attributes = element.attributes || {};
    const text = (element.text || '').trim();
    
    // Pattern 1: Semantic attribute detection (works across sites)
    const hasSemanticPattern = this.hasSemanticPattern(attributes, ['size', 'dimension', 'fit']);
    
    // Pattern 2: Standard size text content
    const hasStandardSize = this.isStandardSize(text);
    
    // Pattern 3: Combined content + context (higher confidence)
    const hasContextualSize = hasStandardSize && this.hasContextClues(element, attributes, ['size', 'select', 'option']);
    
    // Return true if we have semantic pattern OR strong contextual evidence
    return hasSemanticPattern || hasContextualSize;
  }

  /**
   * Generic semantic pattern detection across multiple attribute fields
   */
  private hasSemanticPattern(attributes: any, keywords: string[]): boolean {
    // Check all common attribute fields used by different e-commerce sites
    const searchFields = [
      attributes.name,           // Gap: 'buy-box-Size', Shopify: 'Size'
      attributes['aria-label'],  // Accessible labels
      attributes.id,             // Element IDs
      attributes.class,          // CSS classes
      attributes['data-testid'], // Test automation attributes
      attributes['data-qa'],     // QA attributes (Nike, etc.)
      attributes['data-cy'],     // Cypress test attributes
      attributes.placeholder,    // Input placeholders
      attributes.title,          // Tooltip text
      attributes.alt             // Image alt text
    ];
    
    return searchFields.some(field => 
      field && keywords.some(keyword => 
        field.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  }

  /**
   * Check for contextual clues that support the semantic meaning
   */
  private hasContextClues(element: any, attributes: any, contextKeywords: string[]): boolean {
    // Look for supporting evidence in element structure
    const contextClues = [
      element.tag === 'select',           // Dropdown selects
      element.tag === 'input' && attributes.type === 'radio',  // Radio buttons
      element.tag === 'input' && attributes.type === 'button', // Button inputs
      element.tag === 'button',           // Regular buttons
      attributes.role === 'option',       // ARIA option role
      attributes.role === 'button',       // ARIA button role
      element.parentElements?.some((p: any) => 
        contextKeywords.some(keyword => 
          (p.className || '').toLowerCase().includes(keyword)
        )
      )  // Parent container has relevant class
    ];
    
    return contextClues.some(clue => clue);
  }

  /**
   * 🔄 ENHANCED: Dynamic size detection with confidence scoring
   * Replaces hardcoded size list with flexible pattern matching
   */
  private detectSize(text: string, context: any = {}): PatternMatchResult | null {
    return this.patternMatcher.detectSize(text, context);
  }

  /**
   * Check if text looks like a standard clothing size (legacy compatibility)
   */
  private isStandardSize(text: string): boolean {
    const result = this.detectSize(text);
    return result !== null && result.confidence >= 0.7;
  }

  /**
   * 🔄 ENHANCED: Smart size extraction with confidence-based selection
   * Uses dynamic pattern matching instead of hardcoded validation
   */
  private extractSize(element: any): string | null {
    const text = (element.text || '').trim();
    const value = element.attributes?.value || '';
    const ariaLabel = element.attributes?.['aria-label'] || '';
    const attributes = element.attributes || {};
    
    // Build context for better pattern matching
    const context = {
      attributes,
      surroundingText: [text, value, ariaLabel].filter(Boolean).join(' ')
    };
    
    // Try each candidate and pick the highest confidence result
    const candidates = [
      { text, source: 'text' },
      { text: value, source: 'value' },
      { text: ariaLabel, source: 'aria-label' }
    ].filter(c => c.text);
    
    let bestResult: PatternMatchResult | null = null;
    
    for (const candidate of candidates) {
      const result = this.detectSize(candidate.text, context);
      if (result && (!bestResult || result.confidence > bestResult.confidence)) {
        bestResult = result;
        bestResult.metadata = { ...bestResult.metadata, source: candidate.source };
      }
    }
    
    return bestResult && bestResult.confidence >= 0.6 ? bestResult.value : null;
  }

  /**
   * Check if element is a color selection - Generic cross-site detection
   */
  private isColorSelection(element: any): boolean {
    const attributes = element.attributes || {};
    const text = (element.text || '').trim();
    
    // Pattern 1: Semantic attribute detection
    const hasSemanticPattern = this.hasSemanticPattern(attributes, ['color', 'swatch', 'variant', 'option']);
    
    // Pattern 2: Color-like text content
    const hasColorText = this.looksLikeColor(text);
    
    // Pattern 3: Combined content + context
    const hasContextualColor = hasColorText && this.hasContextClues(element, attributes, ['color', 'variant', 'option']);
    
    return hasSemanticPattern || hasContextualColor;
  }

  /**
   * 🔄 ENHANCED: Smart color extraction with confidence-based selection
   * Uses dynamic pattern matching with site-specific learning
   */
  private extractColor(element: any): string | null {
    const text = (element.text || '').trim();
    const value = element.attributes?.value || '';
    const ariaLabel = element.attributes?.['aria-label'] || '';
    const attributes = element.attributes || {};
    
    // Build context with domain information if available
    const context = {
      attributes,
      domain: this.getCurrentDomain(), // Will implement this helper
      surroundingText: [text, value, ariaLabel].filter(Boolean).join(' ')
    };
    
    // Try each candidate and pick the highest confidence result
    const candidates = [
      { text: ariaLabel, source: 'aria-label', priority: 3 },
      { text, source: 'text', priority: 2 },
      { text: value, source: 'value', priority: 1 }
    ].filter(c => c.text);
    
    let bestResult: PatternMatchResult | null = null;
    
    for (const candidate of candidates) {
      const result = this.detectColor(candidate.text, context);
      if (result) {
        // Boost confidence based on semantic priority
        const adjustedConfidence = result.confidence + (candidate.priority * 0.05);
        
        if (!bestResult || adjustedConfidence > bestResult.confidence) {
          bestResult = result;
          bestResult.confidence = Math.min(adjustedConfidence, 1.0);
          bestResult.metadata = { ...bestResult.metadata, source: candidate.source };
        }
      }
    }
    
    return bestResult && bestResult.confidence >= 0.6 ? bestResult.value : null;
  }

  /**
   * Helper: Get current domain for site-specific pattern matching
   */
  private getCurrentDomain(): string {
    // This will be set by the calling context
    return this.currentProduct?.url ? 
      new URL(this.currentProduct.url).hostname : 
      'unknown';
  }

  /**
   * 🔄 ENHANCED: Dynamic color detection with brand-specific learning
   * Replaces hardcoded color list with flexible pattern matching
   */
  private detectColor(text: string, context: any = {}): PatternMatchResult | null {
    return this.patternMatcher.detectColor(text, context);
  }

  /**
   * Check if string looks like a color (legacy compatibility)
   */
  private looksLikeColor(str: string): boolean {
    const result = this.detectColor(str);
    return result !== null && result.confidence >= 0.6;
  }

  /**
   * Extract basic product info directly from cart interaction
   */
  private extractBasicProductInfo(cartInteraction: any): ProductInfo | null {
    const context = cartInteraction.context || {};
    const url = context.url || '';
    const pageTitle = context.pageTitle || '';
    
    if (!this.isProductPage(url)) return null;
    
    const productId = this.extractProductId(url);
    if (!productId) return null;
    
    return {
      id: productId,
      name: this.extractProductName(pageTitle),
      category: this.extractCategory(url),
      selectedVariant: {}, // No variant info available
      url: url,
      timestamp: cartInteraction.timestamp
    };
  }

  /**
   * Calculate confidence in product resolution
   */
  private calculateConfidence(productInfo: ProductInfo, cartInteraction: any): number {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence if we have variant selections
    if (productInfo.selectedVariant.size) confidence += 0.2;
    if (productInfo.selectedVariant.color) confidence += 0.2;
    
    // Higher confidence if product name is detailed
    if (productInfo.name.length > 10) confidence += 0.1;
    
    return Math.min(1.0, confidence);
  }

  /**
   * Get description of how product was resolved
   */
  private getResolutionMethod(productInfo: ProductInfo): string {
    if (productInfo.selectedVariant.size && productInfo.selectedVariant.color) {
      return 'Full variant tracking with size and color';
    } else if (productInfo.selectedVariant.size) {
      return 'Size selection tracked';
    } else if (productInfo.selectedVariant.color) {
      return 'Color selection tracked';
    } else {
      return 'Basic product info from page context';
    }
  }

  /**
   * 🔄 NEW: Learn site-specific patterns from interaction history
   * This enables dynamic vocabulary expansion per retailer
   */
  public learnSitePatterns(domain: string, interactions: any[]): void {
    this.patternMatcher.learnSitePatterns(domain, interactions);
  }

  /**
   * 🔄 NEW: Get pattern matching statistics for monitoring/debugging
   */
  public getPatternStats(): any {
    return this.patternMatcher.getPatternStats();
  }
}