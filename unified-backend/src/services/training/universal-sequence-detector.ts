/**
 * Universal Sequence Detector - Cross-Site Shopping Flow Detection
 * 
 * Uses semantic analysis instead of hardcoded patterns to detect shopping sequences
 * across all e-commerce sites. Analyzes DOM structure, content semantics, and 
 * behavioral patterns to identify:
 * - Browse phases (category exploration)
 * - Product focus phases (variant selection)
 * - Conversion phases (cart actions)
 */

import { EnhancedInteractionData } from '../../types/training-types';

export interface PageClassification {
  pageType: 'homepage' | 'category' | 'product' | 'cart' | 'checkout' | 'search' | 'unknown';
  confidence: number;
  indicators: string[];
  semanticFeatures: {
    hasProductGrid: boolean;
    hasProductDetails: boolean;
    hasNavigation: boolean;
    hasCartIndicators: boolean;
    hasSearchFunctionality: boolean;
    hasVariantSelectors: boolean;
  };
}

export interface SequenceSegment {
  type: 'browse' | 'focus' | 'configure' | 'convert';
  interactions: EnhancedInteractionData[];
  startIndex: number;
  endIndex: number;
  confidence: number;
  intent: string;
}

export interface UniversalSequence {
  segments: SequenceSegment[];
  overallType: 'browse_to_cart' | 'search_to_cart' | 'product_configuration' | 'navigation_flow';
  qualityScore: number;
  conversionComplete: boolean;
  userIntent: string;
}

export class UniversalSequenceDetector {
  
  /**
   * Analyze a sequence of interactions to detect shopping behavior patterns
   */
  detectSequence(interactions: EnhancedInteractionData[]): UniversalSequence | null {
    if (interactions.length < 2) return null;
    
    // 1. Classify each page semantically
    const pageClassifications = interactions.map(interaction => 
      this.classifyPage(interaction)
    );
    
    // 2. Segment interactions into behavioral phases
    const segments = this.segmentByBehavior(interactions, pageClassifications);
    
    // 3. Determine overall sequence type
    const overallType = this.determineSequenceType(segments, pageClassifications);
    
    // 4. Calculate quality and completion
    const qualityScore = this.calculateSequenceQuality(segments);
    const conversionComplete = this.isConversionComplete(segments);
    const userIntent = this.extractUserIntent(interactions, segments);
    
    return {
      segments,
      overallType,
      qualityScore,
      conversionComplete,
      userIntent
    };
  }
  
  /**
   * Classify page type based on semantic content analysis
   */
  private classifyPage(interaction: EnhancedInteractionData): PageClassification {
    const url = interaction.context?.pageUrl || (interaction.context as any)?.url || '';
    const pageTitle = interaction.context?.pageTitle || '';
    const elementText = interaction.element?.text || '';
    const elementAttributes = interaction.element?.attributes || {};
    
    // Extract DOM structure clues from pageContext if available
    const domSnapshot = (interaction.context as any)?.pageContext?.domSnapshot;
    
    let indicators: string[] = [];
    let confidence = 0.5; // Base confidence
    
    // Semantic feature detection
    const semanticFeatures = {
      hasProductGrid: this.detectProductGrid(domSnapshot, elementText),
      hasProductDetails: this.detectProductDetails(domSnapshot, elementText, elementAttributes),
      hasNavigation: this.detectNavigation(domSnapshot, elementText),
      hasCartIndicators: this.detectCartIndicators(domSnapshot, elementText, url),
      hasSearchFunctionality: this.detectSearchFunctionality(domSnapshot, elementText, url),
      hasVariantSelectors: this.detectVariantSelectors(domSnapshot, elementText, elementAttributes)
    };
    
    // Page type classification logic
    let pageType: PageClassification['pageType'] = 'unknown';
    
    // Product page detection
    if (semanticFeatures.hasProductDetails && semanticFeatures.hasVariantSelectors) {
      pageType = 'product';
      confidence = 0.9;
      indicators.push('product details', 'variant selectors');
    }
    // Category/browse page detection  
    else if (semanticFeatures.hasProductGrid && semanticFeatures.hasNavigation) {
      pageType = 'category';
      confidence = 0.85;
      indicators.push('product grid', 'navigation');
    }
    // Cart page detection
    else if (semanticFeatures.hasCartIndicators) {
      pageType = 'cart';
      confidence = 0.8;
      indicators.push('cart indicators');
    }
    // Search results detection
    else if (semanticFeatures.hasSearchFunctionality && semanticFeatures.hasProductGrid) {
      pageType = 'search';
      confidence = 0.8;
      indicators.push('search functionality', 'results grid');
    }
    // Homepage detection (has navigation but no specific focus)
    else if (semanticFeatures.hasNavigation && !semanticFeatures.hasProductDetails) {
      pageType = 'homepage';
      confidence = 0.7;
      indicators.push('navigation', 'no product focus');
    }
    
    // URL pattern fallback (light semantic hints)
    if (pageType === 'unknown') {
      if (url.includes('product') || url.includes('/p/') || url.includes('/item/')) {
        pageType = 'product';
        confidence = 0.6;
        indicators.push('product URL pattern');
      } else if (url.includes('cart') || url.includes('bag')) {
        pageType = 'cart';
        confidence = 0.6;
        indicators.push('cart URL pattern');
      } else if (url.includes('search') || url.includes('?q=')) {
        pageType = 'search';
        confidence = 0.6;
        indicators.push('search URL pattern');
      }
    }
    
    return {
      pageType,
      confidence,
      indicators,
      semanticFeatures
    };
  }
  
  /**
   * Segment interactions into behavioral phases
   */
  private segmentByBehavior(
    interactions: EnhancedInteractionData[], 
    classifications: PageClassification[]
  ): SequenceSegment[] {
    const segments: SequenceSegment[] = [];
    let currentSegment: EnhancedInteractionData[] = [];
    let currentType: SequenceSegment['type'] | null = null;
    let segmentStartIndex = 0;
    
    for (let i = 0; i < interactions.length; i++) {
      const interaction = interactions[i];
      const classification = classifications[i];
      
      // Determine behavioral type for this interaction
      const behaviorType = this.classifyBehavior(interaction, classification, i, interactions);
      
      // Start new segment if behavior type changes
      if (behaviorType !== currentType) {
        // Save previous segment
        if (currentSegment.length > 0 && currentType) {
          segments.push({
            type: currentType,
            interactions: [...currentSegment],
            startIndex: segmentStartIndex,
            endIndex: i - 1,
            confidence: this.calculateSegmentConfidence(currentSegment, currentType),
            intent: this.inferSegmentIntent(currentSegment, currentType)
          });
        }
        
        // Start new segment
        currentSegment = [interaction];
        currentType = behaviorType;
        segmentStartIndex = i;
      } else {
        currentSegment.push(interaction);
      }
    }
    
    // Add final segment
    if (currentSegment.length > 0 && currentType) {
      segments.push({
        type: currentType,
        interactions: [...currentSegment],
        startIndex: segmentStartIndex,
        endIndex: interactions.length - 1,
        confidence: this.calculateSegmentConfidence(currentSegment, currentType),
        intent: this.inferSegmentIntent(currentSegment, currentType)
      });
    }
    
    return segments;
  }
  
  /**
   * Classify individual interaction behavior
   */
  private classifyBehavior(
    interaction: EnhancedInteractionData,
    classification: PageClassification,
    index: number,
    allInteractions: EnhancedInteractionData[]
  ): SequenceSegment['type'] {
    const elementText = interaction.element?.text || '';
    const elementAttributes = interaction.element?.attributes || {};
    
    // Conversion behavior: cart actions
    if (this.isConversionAction(elementText, elementAttributes, classification)) {
      return 'convert';
    }
    
    // Configuration behavior: size/color/variant selection
    if (this.isConfigurationAction(elementText, elementAttributes, classification)) {
      return 'configure';
    }
    
    // Product focus: detailed product interaction
    if (classification.pageType === 'product' && classification.semanticFeatures.hasProductDetails) {
      return 'focus';
    }
    
    // Browse behavior: category/search navigation
    if (classification.pageType === 'category' || classification.pageType === 'search' || classification.pageType === 'homepage') {
      return 'browse';
    }
    
    // Default: continue current behavior or browse
    return 'browse';
  }
  
  /**
   * Semantic feature detection methods
   */
  private detectProductGrid(domSnapshot: any, elementText: string): boolean {
    if (!domSnapshot) return false;
    
    // Look for grid-like structures with product-related content
    const hasGridStructure = this.searchDOMForPattern(domSnapshot, ['grid', 'product-list', 'items-grid']);
    const hasMultipleProducts = elementText.toLowerCase().includes('product') && elementText.length > 50;
    
    return hasGridStructure || hasMultipleProducts;
  }
  
  private detectProductDetails(domSnapshot: any, elementText: string, attributes: any): boolean {
    const hasProductTitle = elementText.length > 20 && !elementText.toLowerCase().includes('category');
    const hasProductAttributes = attributes.class?.includes('product') || attributes.id?.includes('product');
    const hasDetailedInfo = elementText.includes('$') || elementText.includes('price') || elementText.includes('Size');
    
    return hasProductTitle || hasProductAttributes || hasDetailedInfo;
  }
  
  private detectNavigation(domSnapshot: any, elementText: string): boolean {
    if (!domSnapshot) return elementText.toLowerCase().includes('menu') || elementText.toLowerCase().includes('category');
    
    return this.searchDOMForPattern(domSnapshot, ['nav', 'menu', 'navigation', 'breadcrumb']);
  }
  
  private detectCartIndicators(domSnapshot: any, elementText: string, url: string): boolean {
    const textIndicators = elementText.toLowerCase().includes('cart') || 
                          elementText.toLowerCase().includes('bag') ||
                          elementText.toLowerCase().includes('checkout');
    const urlIndicators = url.includes('cart') || url.includes('bag') || url.includes('checkout');
    
    return textIndicators || urlIndicators;
  }
  
  private detectSearchFunctionality(domSnapshot: any, elementText: string, url: string): boolean {
    const textIndicators = elementText.toLowerCase().includes('search') || elementText.toLowerCase().includes('results');
    const urlIndicators = url.includes('search') || url.includes('?q=') || url.includes('query');
    
    return textIndicators || urlIndicators;
  }
  
  private detectVariantSelectors(domSnapshot: any, elementText: string, attributes: any): boolean {
    // Common variant selector patterns
    const sizePatterns = /\b(XS|S|M|L|XL|XXL|\d+(\.\d+)?)\b/i;
    const colorPatterns = /\b(black|white|red|blue|green|yellow|purple|pink|brown|gray|grey)\b/i;
    
    const hasVariantText = sizePatterns.test(elementText) || colorPatterns.test(elementText);
    const hasVariantAttributes = attributes.name?.includes('size') || 
                                 attributes.name?.includes('color') ||
                                 attributes.class?.includes('variant');
    
    return hasVariantText || hasVariantAttributes;
  }
  
  /**
   * Helper method to search DOM structure for patterns
   */
  private searchDOMForPattern(domSnapshot: any, patterns: string[]): boolean {
    if (!domSnapshot) return false;
    
    const searchNode = (node: any): boolean => {
      if (!node) return false;
      
      // Check current node
      const nodeStr = JSON.stringify(node).toLowerCase();
      for (const pattern of patterns) {
        if (nodeStr.includes(pattern)) return true;
      }
      
      // Recursively check children
      if (node.children) {
        for (const child of node.children) {
          if (this.searchDOMForPattern(child, patterns)) return true;
        }
      }
      
      return false;
    };
    
    return searchNode(domSnapshot);
  }
  
  /**
   * Action classification methods
   */
  private isConversionAction(elementText: string, attributes: any, classification: PageClassification): boolean {
    const conversionTexts = ['add to cart', 'add to bag', 'buy now', 'purchase', 'checkout', 'place order'];
    const text = elementText.toLowerCase();
    
    return conversionTexts.some(pattern => text.includes(pattern)) ||
           classification.semanticFeatures.hasCartIndicators;
  }
  
  private isConfigurationAction(elementText: string, attributes: any, classification: PageClassification): boolean {
    return classification.semanticFeatures.hasVariantSelectors &&
           (this.detectVariantSelectors(null, elementText, attributes));
  }
  
  /**
   * Sequence analysis methods
   */
  private determineSequenceType(segments: SequenceSegment[], classifications: PageClassification[]): UniversalSequence['overallType'] {
    const hasSearch = classifications.some(c => c.pageType === 'search');
    const hasBrowse = segments.some(s => s.type === 'browse');
    const hasProduct = classifications.some(c => c.pageType === 'product');
    const hasConversion = segments.some(s => s.type === 'convert');
    
    if (hasSearch && hasProduct && hasConversion) return 'search_to_cart';
    if (hasBrowse && hasProduct && hasConversion) return 'browse_to_cart';
    if (hasProduct && segments.some(s => s.type === 'configure')) return 'product_configuration';
    return 'navigation_flow';
  }
  
  private calculateSequenceQuality(segments: SequenceSegment[]): number {
    if (segments.length === 0) return 0;
    
    let quality = 0.5; // Base quality
    
    // Length bonus (diminishing returns)
    quality += Math.min(0.2, segments.length * 0.05);
    
    // Behavioral diversity bonus
    const behaviorTypes = new Set(segments.map(s => s.type));
    quality += behaviorTypes.size * 0.1;
    
    // Conversion bonus
    if (segments.some(s => s.type === 'convert')) {
      quality += 0.2;
    }
    
    // Configuration bonus  
    if (segments.some(s => s.type === 'configure')) {
      quality += 0.1;
    }
    
    // Average segment confidence
    const avgConfidence = segments.reduce((sum, s) => sum + s.confidence, 0) / segments.length;
    quality = (quality + avgConfidence) / 2;
    
    return Math.min(1.0, quality);
  }
  
  private isConversionComplete(segments: SequenceSegment[]): boolean {
    return segments.some(segment => segment.type === 'convert');
  }
  
  private extractUserIntent(interactions: EnhancedInteractionData[], segments: SequenceSegment[]): string {
    // Analyze first few interactions for intent clues
    const earlyInteractions = interactions.slice(0, 3);
    const earlyTexts = earlyInteractions.map(i => i.element?.text || '').join(' ').toLowerCase();
    
    if (earlyTexts.includes('men')) return 'Shopping for men\'s items';
    if (earlyTexts.includes('women')) return 'Shopping for women\'s items'; 
    if (earlyTexts.includes('sale') || earlyTexts.includes('discount')) return 'Looking for deals and discounts';
    if (segments.some(s => s.type === 'convert')) return 'Shopping with purchase intent';
    
    return 'General shopping and browsing';
  }
  
  /**
   * Segment analysis methods
   */
  private calculateSegmentConfidence(interactions: EnhancedInteractionData[], type: SequenceSegment['type']): number {
    // Base confidence by behavior type
    const baseConfidence = {
      'browse': 0.7,
      'focus': 0.8,
      'configure': 0.9,
      'convert': 0.95
    }[type] || 0.5;
    
    // Adjust based on interaction count
    const lengthBonus = Math.min(0.2, interactions.length * 0.03);
    
    return Math.min(1.0, baseConfidence + lengthBonus);
  }
  
  private inferSegmentIntent(interactions: EnhancedInteractionData[], type: SequenceSegment['type']): string {
    const intentMap = {
      'browse': 'Exploring product categories and options',
      'focus': 'Examining specific product details',
      'configure': 'Selecting product variants and options',
      'convert': 'Adding product to cart or purchasing'
    };
    
    return intentMap[type] || 'Navigating through the shopping experience';
  }
}