/**
 * Product State Accumulator - Tracks Product Selection State Across Interactions
 * 
 * Critical for Fine-Tuning: Transforms isolated click training into coherent shopping flows
 * 
 * Problem: Current training shows disconnected actions:
 * - "Click Size M" → Generic "Interact" completion
 * - "Click Color Blue" → Generic "Interact" completion  
 * - "Click Add to Cart" → Generic "Interact" completion
 * 
 * Solution: Each training example includes accumulated product configuration context:
 * - "Click Add to Cart" with context: "Size M + Color Blue already selected"
 * - Model learns sequential decision making and state validation
 * 
 * 🔄 ENHANCED: Now uses DynamicPatternMatcher for flexible size/color detection
 */

import { DynamicPatternMatcher, PatternMatchResult } from './dynamic-pattern-matcher';

export interface ProductConfigurationState {
  productId: string;
  productName: string;
  basePrice?: string;
  
  // Selection state
  selectedSize?: string;
  selectedColor?: string;
  selectedStyle?: string;
  selectedQuantity?: number;
  
  // Selection history with step tracking
  selectionHistory: SelectionStep[];
  
  // Validation state
  requiredSelections: string[];
  completedSelections: string[];
  readyForCart: boolean;
  
  // Timestamps
  firstInteraction: number;
  lastUpdate: number;
  
  // Business context
  category: string;
  url: string;
  confidence: number;
}

export interface SelectionStep {
  stepNumber: number;
  interactionIndex: number;
  timestamp: number;
  selectionType: 'size' | 'color' | 'style' | 'quantity' | 'product';
  selectedValue: string;
  actionDescription: string;
  elementSelector: string;
}

export interface StateValidation {
  isComplete: boolean;
  missingSelections: string[];
  nextRequiredAction?: string;
  readinessScore: number;  // 0-1 scale
  validationMessage: string;
}

export class ProductStateAccumulator {
  private sessionStates: Map<string, ProductConfigurationState> = new Map();
  private interactionCounter = 0;
  private patternMatcher: DynamicPatternMatcher;

  constructor() {
    this.patternMatcher = new DynamicPatternMatcher();
  }

  /**
   * Process an interaction and update product state if relevant
   */
  public processInteraction(
    interaction: any, 
    allInteractions: any[], 
    currentIndex: number
  ): ProductConfigurationState | null {
    this.interactionCounter = currentIndex;
    
    const productId = this.extractProductId(interaction);
    if (!productId) return null;

    // Get or create state for this product
    let state = this.sessionStates.get(productId);
    if (!state) {
      state = this.initializeProductState(interaction, productId);
      this.sessionStates.set(productId, state);
    }

    // Detect and apply state changes
    const stateChanged = this.updateStateFromInteraction(state, interaction, currentIndex);
    
    if (stateChanged) {
      state.lastUpdate = interaction.timestamp;
      this.validateState(state);
      this.sessionStates.set(productId, state);
    }

    return state;
  }

  /**
   * Generate training context showing accumulated product state
   */
  public generateStateContext(productId: string, currentStep: number): string {
    const state = this.sessionStates.get(productId);
    if (!state) return '';

    const context: string[] = [];

    // Previous actions summary
    if (state.selectionHistory.length > 0) {
      context.push('Previous Actions:');
      state.selectionHistory.forEach(step => {
        context.push(`- Step ${step.stepNumber}: ${step.actionDescription}`);
      });
    }

    // Current configuration
    context.push('\nCurrent Configuration:');
    context.push(`- Product: ${state.productName} (ID: ${state.productId})`);
    if (state.selectedSize) context.push(`- Size: ${state.selectedSize} ✅`);
    if (state.selectedColor) context.push(`- Color: ${state.selectedColor} ✅`);
    if (state.selectedStyle) context.push(`- Style: ${state.selectedStyle} ✅`);
    if (state.basePrice) context.push(`- Price: ${state.basePrice}`);

    // State validation
    const validation = this.validateState(state);
    context.push(`\nReadiness Status: ${validation.validationMessage}`);
    if (!validation.isComplete && validation.nextRequiredAction) {
      context.push(`Next Required: ${validation.nextRequiredAction}`);
    }

    return context.join('\n');
  }

  /**
   * Generate enhanced business context with state awareness
   */
  public generateEnhancedBusinessContext(
    productId: string, 
    interaction: any,
    isCartInteraction: boolean = false
  ): string {
    const state = this.sessionStates.get(productId);
    if (!state) return '';

    const context: string[] = [];
    
    context.push(`Product: ${state.productName} (ID: ${state.productId})`);
    context.push(`Category: ${state.category}`);
    if (state.basePrice) context.push(`Price: ${state.basePrice}`);
    
    // Show accumulated selections
    const selections: string[] = [];
    if (state.selectedSize) selections.push(`Size: ${state.selectedSize}`);
    if (state.selectedColor) selections.push(`Color: ${state.selectedColor}`);
    if (state.selectedStyle) selections.push(`Style: ${state.selectedStyle}`);
    
    if (selections.length > 0) {
      context.push(`Selected: ${selections.join(', ')}`);
    }

    context.push(`Confidence: ${(state.confidence * 100).toFixed(1)}%`);

    // Add cart readiness for cart interactions
    if (isCartInteraction) {
      const validation = this.validateState(state);
      context.push(`Cart Ready: ${validation.isComplete ? 'Yes' : 'No'}`);
      if (!validation.isComplete) {
        context.push(`Missing: ${validation.missingSelections.join(', ')}`);
      }
    }

    return context.join('\n');
  }

  /**
   * Initialize product state when first encountered
   */
  private initializeProductState(interaction: any, productId: string): ProductConfigurationState {
    const context = interaction.context || {};
    const url = context.url || context.pageUrl || '';
    
    return {
      productId,
      productName: this.extractProductName(context.pageTitle || ''),
      category: this.extractCategory(url),
      url,
      
      selectionHistory: [],
      requiredSelections: this.determineRequiredSelections(interaction),
      completedSelections: [],
      readyForCart: false,
      
      firstInteraction: interaction.timestamp,
      lastUpdate: interaction.timestamp,
      confidence: 0.5
    };
  }

  /**
   * Update state based on current interaction
   */
  private updateStateFromInteraction(
    state: ProductConfigurationState, 
    interaction: any, 
    stepNumber: number
  ): boolean {
    const element = interaction.element || {};
    let stateChanged = false;

    // Detect size selection
    if (this.isSizeSelection(element)) {
      const size = this.extractSize(element);
      if (size && size !== state.selectedSize) {
        state.selectedSize = size;
        state.selectionHistory.push({
          stepNumber,
          interactionIndex: this.interactionCounter,
          timestamp: interaction.timestamp,
          selectionType: 'size',
          selectedValue: size,
          actionDescription: `Selected Size "${size}"`,
          elementSelector: this.extractSelector(element)
        });
        this.updateCompletedSelections(state, 'size');
        stateChanged = true;
      }
    }

    // Detect color selection
    if (this.isColorSelection(element)) {
      const color = this.extractColor(element);
      if (color && color !== state.selectedColor) {
        state.selectedColor = color;
        state.selectionHistory.push({
          stepNumber,
          interactionIndex: this.interactionCounter,
          timestamp: interaction.timestamp,
          selectionType: 'color',
          selectedValue: color,
          actionDescription: `Selected Color "${color}"`,
          elementSelector: this.extractSelector(element)
        });
        this.updateCompletedSelections(state, 'color');
        stateChanged = true;
      }
    }

    // Update confidence based on selections
    if (stateChanged) {
      state.confidence = this.calculateStateConfidence(state);
    }

    return stateChanged;
  }

  /**
   * Validate current state and determine cart readiness
   */
  private validateState(state: ProductConfigurationState): StateValidation {
    const missingSelections = state.requiredSelections.filter(
      req => !state.completedSelections.includes(req)
    );

    const isComplete = missingSelections.length === 0;
    const readinessScore = state.completedSelections.length / state.requiredSelections.length;

    let validationMessage: string;
    let nextRequiredAction: string | undefined;

    if (isComplete) {
      validationMessage = `Ready for cart (${state.completedSelections.length}/${state.requiredSelections.length} selections complete)`;
    } else {
      validationMessage = `Incomplete (${state.completedSelections.length}/${state.requiredSelections.length} selections)`;
      nextRequiredAction = `Select ${missingSelections[0]}`;
    }

    state.readyForCart = isComplete;

    return {
      isComplete,
      missingSelections,
      nextRequiredAction,
      readinessScore,
      validationMessage
    };
  }

  /**
   * Extract product ID from interaction context
   */
  private extractProductId(interaction: any): string | null {
    const context = interaction.context || {};
    const url = context.url || context.pageUrl || '';
    
    // Use existing product ID patterns from ProductContextBuilder
    const patterns = [
      /pid=([^&]+)/i,
      /\/product\/([^/?]+)/i,
      /\/p\/([^/?]+)/i,
      /product_id=([^&]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  }

  /**
   * Helper methods (reuse logic from ProductContextBuilder)
   */
  private extractProductName(pageTitle: string): string {
    return pageTitle.replace(/\s*\|\s*\w+\s*$/, '').trim();
  }

  private extractCategory(url: string): string {
    if (url.includes('men')) return 'Men';
    if (url.includes('women')) return 'Women';
    return 'General';
  }

  private determineRequiredSelections(interaction: any): string[] {
    // For Gap.com shirts, typically need size and color
    const selections = ['size'];
    
    // Check if color options are present
    const context = interaction.context || {};
    const url = context.url || '';
    if (url.includes('shirt') || url.includes('clothing')) {
      selections.push('color');
    }
    
    return selections;
  }

  private updateCompletedSelections(state: ProductConfigurationState, selectionType: string): void {
    if (!state.completedSelections.includes(selectionType)) {
      state.completedSelections.push(selectionType);
    }
  }

  private calculateStateConfidence(state: ProductConfigurationState): number {
    let confidence = 0.3; // Base confidence
    
    // Add confidence for each completed selection
    const completionRatio = state.completedSelections.length / state.requiredSelections.length;
    confidence += completionRatio * 0.5;
    
    // Add confidence for selection history
    if (state.selectionHistory.length > 0) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  // 🔄 ENHANCED: Element detection using dynamic pattern matching
  private isSizeSelection(element: any): boolean {
    const attributes = element.attributes || {};
    const text = (element.text || '').trim();
    
    // Semantic attribute detection (high confidence)
    const hasSemanticPattern = attributes.name?.includes('Size') ||
                              attributes['aria-label']?.toLowerCase().includes('size');
    
    // Dynamic size detection (flexible patterns)
    const sizeResult = this.patternMatcher.detectSize(text, { attributes });
    const hasSizePattern = sizeResult && sizeResult.confidence >= 0.7;
    
    return hasSemanticPattern || hasSizePattern;
  }

  private isColorSelection(element: any): boolean {
    const attributes = element.attributes || {};
    const text = (element.text || '').trim();
    
    // Semantic attribute detection (high confidence)
    const hasSemanticPattern = attributes.name?.includes('color') ||
                              attributes['aria-label']?.toLowerCase().includes('color');
    
    // Dynamic color detection (flexible patterns)
    const colorResult = this.patternMatcher.detectColor(text, { attributes });
    const hasColorPattern = colorResult && colorResult.confidence >= 0.6;
    
    return hasSemanticPattern || hasColorPattern;
  }

  private extractSize(element: any): string | null {
    const text = (element.text || '').trim();
    const value = element.attributes?.value || '';
    const attributes = element.attributes || {};
    
    // Build context for pattern matching
    const context = { attributes };
    
    // Try text first, then value
    const candidates = [text, value].filter(Boolean);
    
    for (const candidate of candidates) {
      const result = this.patternMatcher.detectSize(candidate, context);
      if (result && result.confidence >= 0.7) {
        return result.value;
      }
    }
    
    return null;
  }

  private extractColor(element: any): string | null {
    const text = (element.text || '').trim();
    const ariaLabel = element.attributes?.['aria-label'] || '';
    const attributes = element.attributes || {};
    
    // Build context for pattern matching
    const context = { attributes };
    
    // Try aria-label first (more semantic), then text
    const candidates = [
      { text: ariaLabel, priority: 2 },
      { text, priority: 1 }
    ].filter(c => c.text);
    
    let bestResult: PatternMatchResult | null = null;
    
    for (const candidate of candidates) {
      const result = this.patternMatcher.detectColor(candidate.text, context);
      if (result) {
        const adjustedConfidence = result.confidence + (candidate.priority * 0.05);
        if (!bestResult || adjustedConfidence > bestResult.confidence) {
          bestResult = result;
          bestResult.confidence = Math.min(adjustedConfidence, 1.0);
        }
      }
    }
    
    return bestResult && bestResult.confidence >= 0.6 ? bestResult.value : null;
  }

  private extractSelector(element: any): string {
    return element.selector || element.attributes?.id || element.tagName || 'unknown';
  }

  // 🔄 LEGACY COMPATIBILITY: Keep these methods for backward compatibility
  private isStandardSize(text: string): boolean {
    const result = this.patternMatcher.detectSize(text);
    return result !== null && result.confidence >= 0.7;
  }

  private looksLikeColor(str: string): boolean {
    const result = this.patternMatcher.detectColor(str);
    return result !== null && result.confidence >= 0.6;
  }

  /**
   * Get all accumulated states (useful for debugging)
   */
  public getAllStates(): Map<string, ProductConfigurationState> {
    return new Map(this.sessionStates);
  }

  /**
   * Clear all accumulated state (for new sessions)
   */
  public clearStates(): void {
    this.sessionStates.clear();
    this.interactionCounter = 0;
  }

  /**
   * 🔄 NEW: Learn site-specific patterns from session data
   */
  public learnSitePatterns(domain: string, interactions: any[]): void {
    this.patternMatcher.learnSitePatterns(domain, interactions);
  }

  /**
   * 🔄 NEW: Get pattern matching statistics
   */
  public getPatternStats(): any {
    return this.patternMatcher.getPatternStats();
  }
}