/**
 * Sequence-Aware Training Examples - Complete Shopping Flow Training
 * 
 * Creates training examples that teach AI agents complete shopping journeys:
 * - Browse → Discover → Select → Configure → Add to Cart
 * - Context-aware decision making at each step
 * - Product state accumulation across interactions
 * - Real user intent progression tracking
 */

import { HybridJourneyTracker } from '../journey/hybrid-journey-tracker';
import { ProductStateAccumulator, ProductConfigurationState } from './product-state-accumulator';
import { DynamicPatternMatcher } from './dynamic-pattern-matcher';
import { UniversalSequenceDetector, UniversalSequence, PageClassification } from './universal-sequence-detector';
import { 
  EnhancedInteractionData, 
  TrainingExample
} from '../../types/training-types';

export interface ShoppingSequence {
  interactions: EnhancedInteractionData[];
  sequenceType: 'browse_to_cart' | 'search_to_cart' | 'navigation_flow' | 'product_configuration' | 'hover_navigation';
  startUrl: string;
  endUrl: string;
  productContext?: ProductConfigurationState;
  completionGoal: string;
  userIntent: string;
  sequenceQuality: number;
  conversionComplete: boolean;
  hasHoverSequences?: boolean; // Simple flag indicating hover→click sequences present
}

export interface SequenceStage {
  stageName: string;
  interactions: EnhancedInteractionData[];
  stageGoal: string;
  progressIndicators: string[];
  stageOutcome: 'completed' | 'partial' | 'abandoned';
}

export class SequenceAwareTrainer {
  private journeyTracker: HybridJourneyTracker;
  private productStateAccumulator: ProductStateAccumulator;
  private patternMatcher: DynamicPatternMatcher;
  private universalSequenceDetector: UniversalSequenceDetector;

  constructor() {
    this.journeyTracker = new HybridJourneyTracker();
    this.productStateAccumulator = new ProductStateAccumulator();
    this.patternMatcher = new DynamicPatternMatcher();
    this.universalSequenceDetector = new UniversalSequenceDetector();
  }

  /**
   * Generate sequence-aware training examples from session interactions
   */
  generateSequenceTrainingExamples(interactions: EnhancedInteractionData[]): TrainingExample[] {
    console.log('🔗 [SEQUENCE AWARE TRAINER] Starting sequence training generation', {
      totalInteractions: interactions.length,
      componentActive: true,
      journeyTrackerLoaded: !!this.journeyTracker,
      productStateAccumulatorLoaded: !!this.productStateAccumulator,
      dynamicPatternMatcherLoaded: !!this.patternMatcher
    });
    
    const examples: TrainingExample[] = [];
    
    // 1. Identify shopping sequences in the interactions
    const shoppingSequences = this.identifyShoppingSequences(interactions);
    console.log('🔗 [SEQUENCE AWARE TRAINER] Shopping sequences identified', {
      sequenceCount: shoppingSequences.length,
      sequenceTypes: shoppingSequences.map(s => s.sequenceType)
    });
    
    // 2. Generate different types of sequence examples
    for (const sequence of shoppingSequences) {
      // Complete flow examples
      const completeFlowExample = this.createCompleteFlowExample(sequence);
      if (completeFlowExample) examples.push(completeFlowExample);
      
      // Stage-by-stage examples
      const stageExamples = this.createStageProgressionExamples(sequence);
      examples.push(...stageExamples);
      
      // Decision point examples
      const decisionExamples = this.createDecisionPointExamples(sequence);
      examples.push(...decisionExamples);
      
      // Product configuration examples
      if (sequence.productContext) {
        const configExamples = this.createProductConfigurationExamples(sequence);
        examples.push(...configExamples);
      }
    }
    
    console.log('🔗 [SEQUENCE AWARE TRAINER] Training generation completed', {
      sequencesProcessed: shoppingSequences.length,
      totalExamplesGenerated: examples.length,
      examplesByType: {
        // Note: Counting by context.pageType since metadata property doesn't exist on TrainingExample
        completeFlow: examples.filter(e => e.context?.pageType === 'complete_flow').length,
        stageProgression: examples.filter(e => e.context?.pageType === 'stage_progression').length,
        decisionPoint: examples.filter(e => e.context?.pageType === 'decision_point').length,
        productConfiguration: examples.filter(e => e.context?.pageType === 'product_configuration').length
      },
      hoverSequencesDetected: shoppingSequences.filter(s => s.hasHoverSequences).length
    });
    
    return examples;
  }

  /**
   * 🚀 ENHANCED SEQUENCE IDENTIFICATION with UniversalSequenceDetector
   * Uses advanced semantic analysis to identify complete shopping sequences
   */
  private identifyShoppingSequences(interactions: EnhancedInteractionData[]): ShoppingSequence[] {
    console.log('🌟 [UNIVERSAL SEQUENCE] Using UniversalSequenceDetector for advanced sequence analysis');
    
    // Use UniversalSequenceDetector for sophisticated sequence analysis
    const universalSequence = this.universalSequenceDetector.detectSequence(interactions);
    
    if (!universalSequence) {
      console.log('❌ [UNIVERSAL SEQUENCE] No valid sequence detected');
      return [];
    }
    
    console.log('✅ [UNIVERSAL SEQUENCE] Advanced sequence detected', {
      overallType: universalSequence.overallType,
      qualityScore: universalSequence.qualityScore,
      conversionComplete: universalSequence.conversionComplete,
      segments: universalSequence.segments.length
    });
    
    // Convert UniversalSequence to our ShoppingSequence format
    const sequences: ShoppingSequence[] = [];
    
    // Create a comprehensive sequence from the universal analysis
    if (universalSequence.segments.length > 0) {
      const sequence = this.buildShoppingSequenceFromUniversal(universalSequence, interactions);
      if (sequence) {
        sequences.push(sequence);
      }
    }
    
    // Also create individual sequences for each behavioral segment
    for (const segment of universalSequence.segments) {
      if (segment.interactions.length >= 2) {
        const segmentSequence = this.buildSegmentSequence(segment, universalSequence);
        if (segmentSequence) {
          sequences.push(segmentSequence);
        }
      }
    }
    
    console.log(`🌟 [UNIVERSAL SEQUENCE] Generated ${sequences.length} enhanced sequences`);
    return sequences;
  }

  /**
   * 🌟 NEW: Build shopping sequence from UniversalSequence analysis
   */
  private buildShoppingSequenceFromUniversal(universalSequence: UniversalSequence, interactions: EnhancedInteractionData[]): ShoppingSequence | null {
    if (interactions.length < 2) return null;
    
    const startUrl = interactions[0].context?.pageUrl || (interactions[0].context as any)?.url || '';
    const endUrl = interactions[interactions.length - 1].context?.pageUrl || (interactions[interactions.length - 1].context as any)?.url || '';
    
    // Map UniversalSequence type to our ShoppingSequence type
    const sequenceTypeMapping = {
      'browse_to_cart': 'browse_to_cart' as const,
      'search_to_cart': 'search_to_cart' as const,
      'product_configuration': 'product_configuration' as const,
      'navigation_flow': 'navigation_flow' as const
    };
    
    const sequenceType = sequenceTypeMapping[universalSequence.overallType] || 'navigation_flow';
    
    // Build product context if applicable
    let productContext: ProductConfigurationState | undefined;
    for (let i = 0; i < interactions.length; i++) {
      const state = this.productStateAccumulator.processInteraction(
        interactions[i], 
        interactions, 
        i
      );
      if (state) productContext = state;
    }
    
    // Enhanced user intent from UniversalSequenceDetector
    const userIntent = universalSequence.userIntent;
    const completionGoal = this.extractCompletionGoalFromUniversal(universalSequence);
    
    // Check for hover sequences (enhanced detection)
    const hasHoverSequences = this.hasSimpleHoverClickSequences(interactions);
    
    return {
      interactions,
      sequenceType,
      startUrl,
      endUrl,
      productContext,
      completionGoal,
      userIntent,
      sequenceQuality: universalSequence.qualityScore,
      conversionComplete: universalSequence.conversionComplete,
      hasHoverSequences
    };
  }
  
  /**
   * 🌟 NEW: Build segment-specific sequence for detailed training
   */
  private buildSegmentSequence(segment: { type: 'browse' | 'focus' | 'configure' | 'convert'; interactions: EnhancedInteractionData[]; confidence: number; intent: string }, universalSequence: UniversalSequence): ShoppingSequence | null {
    if (segment.interactions.length < 2) return null;
    
    const startUrl = segment.interactions[0].context?.pageUrl || '';
    const endUrl = segment.interactions[segment.interactions.length - 1].context?.pageUrl || '';
    
    // Map segment type to sequence type
    const segmentTypeMapping = {
      'browse': 'navigation_flow' as const,
      'focus': 'product_configuration' as const,
      'configure': 'product_configuration' as const,
      'convert': 'browse_to_cart' as const
    };
    
    const sequenceType = segmentTypeMapping[segment.type] || 'navigation_flow';
    
    return {
      interactions: segment.interactions,
      sequenceType,
      startUrl,
      endUrl,
      productContext: undefined, // Will be built during processing
      completionGoal: segment.intent,
      userIntent: universalSequence.userIntent,
      sequenceQuality: segment.confidence,
      conversionComplete: segment.type === 'convert',
      hasHoverSequences: false
    };
  }
  
  /**
   * 🌟 NEW: Extract completion goal from UniversalSequence
   */
  private extractCompletionGoalFromUniversal(universalSequence: UniversalSequence): string {
    if (universalSequence.conversionComplete) {
      return 'Complete purchase and add items to cart';
    }
    
    const hasConfigureSegment = universalSequence.segments.some(s => s.type === 'configure');
    if (hasConfigureSegment) {
      return 'Configure product options and variants';
    }
    
    const hasFocusSegment = universalSequence.segments.some(s => s.type === 'focus');
    if (hasFocusSegment) {
      return 'Examine product details and options';
    }
    
    return 'Navigate and explore product options';
  }

  /**
   * Build a shopping sequence from interactions (LEGACY - kept for compatibility)
   */
  private buildShoppingSequence(interactions: EnhancedInteractionData[], startIndex: number): ShoppingSequence | null {
    if (interactions.length < 2) return null;
    
    const startUrl = interactions[0].context?.pageUrl || (interactions[0].context as any)?.url || '';
    const endUrl = interactions[interactions.length - 1].context?.pageUrl || (interactions[interactions.length - 1].context as any)?.url || '';
    
    // Determine sequence type
    const sequenceType = this.determineSequenceType(interactions);
    
    // Build product context if applicable
    let productContext: ProductConfigurationState | undefined;
    for (let i = 0; i < interactions.length; i++) {
      const state = this.productStateAccumulator.processInteraction(
        interactions[i], 
        interactions, 
        startIndex + i
      );
      if (state) productContext = state;
    }
    
    // Extract user intent and completion goal
    const userIntent = this.extractUserIntent(interactions);
    const completionGoal = this.extractCompletionGoal(interactions);
    
    // 🎯 SIMPLIFIED: Check for hover sequences
    const hasHoverSequences = this.hasSimpleHoverClickSequences(interactions);
    
    // Calculate sequence quality
    const sequenceQuality = this.calculateSequenceQuality(interactions, productContext, hasHoverSequences);
    
    // Determine if conversion was completed
    const conversionComplete = interactions.some(i => this.isSequenceEnd(i));
    
    return {
      interactions,
      sequenceType,
      startUrl,
      endUrl,
      productContext,
      completionGoal,
      userIntent,
      sequenceQuality,
      conversionComplete,
      hasHoverSequences
    };
  }

  /**
   * Create complete flow training example
   */
  private createCompleteFlowExample(sequence: ShoppingSequence): TrainingExample | null {
    if (sequence.sequenceQuality < 0.7) return null;
    
    // Build comprehensive prompt with full context
    const sequenceSteps = sequence.interactions.map((interaction, i) => {
      const stepType = this.getStepType(interaction, i, sequence.interactions.length);
      const elementText = interaction.element?.text || '';
      const pageType = this.getPageType(interaction.context?.pageUrl || '');
      
      return `${stepType} on ${pageType}: "${elementText}"`;
    });
    
    // Build completion with detailed actions (enhanced for hover→click sequences)
    const actions = sequence.interactions.map((interaction, i) => {
      const actionType = interaction.interaction?.type || 'interact';
      const elementText = interaction.element?.text || '';
      const reasoning = this.getActionReasoning(interaction, sequence, i);
      
      // 🎯 HOVER→CLICK SEQUENCE ENHANCEMENT: Generate proper hover→click completions
      const hoverContext = this.getHoverClickSequenceContext(interaction, sequence.interactions, i);
      
      if (hoverContext.isHoverClickAction && actionType === 'CLICK') {
        // Generate complete hover→click sequence for clicks on revealed elements
        return `Step ${i}: hover('${hoverContext.hoverTarget}') // Reveal dropdown\n` +
               `Step ${i + 1}: wait(200) // Allow dropdown to appear\n` +
               `Step ${i + 1}: click('${elementText}') // ${reasoning}`;
      } else if (hoverContext.isHoverClickAction && actionType === 'HOVER') {
        // For hovers that will reveal content, just note it (the click will handle the full sequence)
        return `// Hover revealing dropdown for next interaction`;
      } else {
        return `Step ${i + 1}: ${actionType.toLowerCase()}('${elementText}') // ${reasoning}`;
      }
    }).filter(action => !action.startsWith('//')); // Remove hover-only comments
    
    // Include product configuration if available
    let productConfigContext = '';
    if (sequence.productContext) {
      productConfigContext = `\n\n[PRODUCT CONFIGURATION]\n${this.formatProductState(sequence.productContext)}`;
    }
    
    // Add semantic journey context
    const journeyContext = this.buildSemanticJourneyContext(sequence);
    
    // 🎯 SIMPLIFIED: Add hover context if present
    let hoverContext = '';
    if (sequence.hasHoverSequences) {
      hoverContext = '\n[HOVER NAVIGATION] Sequence includes hover→click dropdown navigation patterns';
    }
    
    return {
      prompt: `[SEMANTIC JOURNEY] ${journeyContext}\n[SHOPPING FLOW] User Intent: ${sequence.userIntent} | Goal: ${sequence.completionGoal}${hoverContext}\n[SEQUENCE] ${sequenceSteps.join(' → ')}${productConfigContext}`,
      completion: `// Complete ${sequence.sequenceType} flow${sequence.hasHoverSequences ? ' with hover navigation' : ''}\n${actions.join('\n')}`,
      context: {
        pageType: 'shopping-sequence',
        userJourney: sequence.sequenceType,
        userIntent: sequence.userIntent,
        businessContext: `Sequence length: ${sequence.interactions.length}, Product config: ${!!sequence.productContext}`
      },
      quality: {
        score: sequence.sequenceQuality,
        factors: {
          hasReliableSelector: true,
          hasSpatialContext: false,
          hasBusinessContext: true,
          hasVisualContext: false,
          hasAccessibilityContext: false,
          hasPerformanceContext: false,
          hasStateContext: false,
          hasFormContext: false,
          hasSEOContext: false,
          hasAnalyticsContext: false,
          hasTimingContext: false,
          hasNetworkContext: false,
          hasErrorContext: false,
          hasUserContext: true,
          hasCompleteNearbyElements: false,
          hasDesignSystemContext: false,
          hasBehaviorPatternsContext: false,
          multiStepJourney: true,
          funnelProgression: true,
          conversionComplete: sequence.completionGoal.includes('cart') || sequence.completionGoal.includes('Add item'),
          clearUserIntent: true,
          journeyPrioritized: true,
          
          // Note: Hover-specific quality factors are tracked in sequence metadata
          // They don't need to be part of the standard quality factors interface
        }
      }
    };
  }

  /**
   * Create stage progression examples
   */
  private createStageProgressionExamples(sequence: ShoppingSequence): TrainingExample[] {
    const examples: TrainingExample[] = [];
    const stages = this.identifySequenceStages(sequence);
    
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const nextStage = stages[i + 1];
      
      const example = this.createStageTransitionExample(stage, nextStage, sequence);
      if (example) examples.push(example);
    }
    
    return examples;
  }

  /**
   * Create decision point examples
   */
  private createDecisionPointExamples(sequence: ShoppingSequence): TrainingExample[] {
    const examples: TrainingExample[] = [];
    
    // Find key decision points in the sequence
    const decisionPoints = sequence.interactions.filter((interaction, i) => 
      this.isDecisionPoint(interaction, sequence.interactions, i)
    );
    
    for (const decisionInteraction of decisionPoints) {
      const example = this.createDecisionExample(decisionInteraction, sequence);
      if (example) examples.push(example);
    }
    
    return examples;
  }

  /**
   * Create product configuration examples
   */
  private createProductConfigurationExamples(sequence: ShoppingSequence): TrainingExample[] {
    const examples: TrainingExample[] = [];
    
    if (!sequence.productContext) return examples;
    
    // Find configuration interactions (size, color, quantity)
    const configInteractions = sequence.interactions.filter(interaction => 
      this.isConfigurationInteraction(interaction)
    );
    
    for (const configInteraction of configInteractions) {
      const example = this.createConfigurationExample(configInteraction, sequence);
      if (example) examples.push(example);
    }
    
    return examples;
  }

  /**
   * Helper methods for sequence analysis - Using semantic DOM analysis
   */
  private isSequenceStart(interaction: EnhancedInteractionData): boolean {
    const url = interaction.context?.pageUrl || (interaction.context as any)?.url || '';
    const elementText = interaction.element?.text || '';
    const domSnapshot = (interaction.context as any)?.pageContext?.domSnapshot;
    
    // Semantic analysis for sequence start detection
    const pageClassification = this.classifyPageSemantically(interaction);
    
    // Sequence starts are typically category/browse pages or homepage navigation
    if (pageClassification.pageType === 'category' || pageClassification.pageType === 'homepage') {
      return pageClassification.confidence > 0.6;
    }
    
    // Fallback to element text analysis for navigation elements
    const navigationTexts = ['shop', 'browse', 'category', 'sale', 'men', 'women', 'all items'];
    const text = elementText.toLowerCase();
    const hasNavigationText = navigationTexts.some(navText => text.includes(navText));
    
    // Light URL pattern hints (non-site-specific)
    const hasGenericBrowseUrl = url.includes('/search') || url.includes('/category') || 
                               url.includes('/browse') || url.includes('/sale');
    
    return hasNavigationText || hasGenericBrowseUrl;
  }

  private isSequenceContinuation(interaction: EnhancedInteractionData, currentSequence: EnhancedInteractionData[]): boolean {
    if (currentSequence.length === 0) return false;
    
    const url = interaction.context?.pageUrl || (interaction.context as any)?.url || '';
    const lastUrl = currentSequence[currentSequence.length - 1].context?.pageUrl || 
                    (currentSequence[currentSequence.length - 1].context as any)?.url || '';
    
    // Semantic analysis for sequence continuation
    const pageClassification = this.classifyPageSemantically(interaction);
    const lastPageClassification = this.classifyPageSemantically(currentSequence[currentSequence.length - 1]);
    
    // Check if we're progressing through a logical shopping flow
    const isLogicalProgression = this.isLogicalShoppingProgression(lastPageClassification, pageClassification);
    if (isLogicalProgression) return true;
    
    // Same domain check with better error handling
    if (url && lastUrl) {
      try {
        const currentHostname = new URL(url).hostname;
        const lastHostname = new URL(lastUrl).hostname;
        
        // Same domain + shopping-related page types
        const isShoppingRelated = pageClassification.pageType === 'product' || 
                                 pageClassification.pageType === 'category' ||
                                 pageClassification.pageType === 'search';
        
        return currentHostname === lastHostname && isShoppingRelated;
      } catch (error) {
        // Invalid URLs - fall back to semantic analysis only
        return isLogicalProgression;
      }
    }
    
    return isLogicalProgression;
  }

  private isSequenceEnd(interaction: EnhancedInteractionData): boolean {
    const elementText = interaction.element?.text || '';
    const url = interaction.context?.pageUrl || (interaction.context as any)?.url || '';
    const attributes = interaction.element?.attributes || {};
    
    // Semantic analysis for conversion actions
    const pageClassification = this.classifyPageSemantically(interaction);
    
    // Cart page detection
    if (pageClassification.pageType === 'cart' && pageClassification.confidence > 0.7) {
      return true;
    }
    
    // Conversion action detection (more comprehensive than hardcoded text)
    const conversionTexts = [
      'add to cart', 'add to bag', 'add to basket', 'buy now', 'purchase now',
      'checkout', 'place order', 'complete purchase', 'proceed to checkout'
    ];
    
    const text = elementText.toLowerCase();
    const hasConversionText = conversionTexts.some(convText => text.includes(convText));
    
    // Check attributes for cart-related actions
    const hasConversionAttributes = attributes.class?.includes('add-to-cart') ||
                                   attributes.class?.includes('buy-now') ||
                                   attributes.id?.includes('add-cart') ||
                                   attributes['data-action']?.includes('cart');
    
    // URL-based detection (generic patterns)
    const hasCartUrl = url.includes('/cart') || url.includes('/checkout') || url.includes('/bag');
    
    return hasConversionText || hasConversionAttributes || hasCartUrl;
  }

  private determineSequenceType(interactions: EnhancedInteractionData[]): ShoppingSequence['sequenceType'] {
    // Use semantic analysis for sequence type detection
    const pageClassifications = interactions.map(i => this.classifyPageSemantically(i));
    
    const hasSearch = pageClassifications.some(c => c.pageType === 'search');
    const hasBrowse = pageClassifications.some(c => c.pageType === 'category' || c.pageType === 'homepage');
    const hasProduct = pageClassifications.some(c => c.pageType === 'product');
    const hasCart = pageClassifications.some(c => c.pageType === 'cart');
    
    // Check for conversion actions semantically
    const hasAddToCart = interactions.some(i => this.isSequenceEnd(i));
    
    // 🎯 SIMPLIFIED: Check for hover→click patterns
    const hasHoverClickSequences = this.hasSimpleHoverClickSequences(interactions);
    
    // If sequence contains significant hover navigation, classify accordingly
    if (hasHoverClickSequences && (hasAddToCart || hasCart || hasProduct)) {
      return 'hover_navigation';
    }
    
    // Traditional sequence types
    if (hasSearch && hasProduct && (hasAddToCart || hasCart)) return 'search_to_cart';
    if (hasBrowse && hasProduct && (hasAddToCart || hasCart)) return 'browse_to_cart';
    if (hasProduct && (hasAddToCart || hasCart)) return 'product_configuration';
    return 'navigation_flow';
  }

  private extractUserIntent(interactions: EnhancedInteractionData[]): string {
    // Extract from session data or infer from interactions
    const firstInteraction = interactions[0];
    const url = firstInteraction.context?.pageUrl || '';
    
    if (url.includes('men')) return 'Shopping for men\'s items';
    if (url.includes('women')) return 'Shopping for women\'s items';
    if (url.includes('sale')) return 'Looking for deals and discounts';
    
    return 'General shopping and browsing';
  }

  private extractCompletionGoal(interactions: EnhancedInteractionData[]): string {
    const lastInteraction = interactions[interactions.length - 1];
    const elementText = lastInteraction.element?.text || '';
    
    if (elementText.toLowerCase().includes('add to cart') || elementText.toLowerCase().includes('add to bag')) return 'Add item to cart';
    if (elementText.toLowerCase().includes('buy now')) return 'Purchase item immediately';
    
    return 'Complete product selection';
  }

  private calculateSequenceQuality(interactions: EnhancedInteractionData[], productContext?: ProductConfigurationState, hasHoverSequences?: boolean): number {
    let quality = 0.5; // Base quality
    
    // Length bonus (but diminishing returns)
    const lengthScore = Math.min(0.3, interactions.length * 0.05);
    quality += lengthScore;
    
    // Product context bonus
    if (productContext) {
      quality += 0.2;
      if (productContext.readyForCart) quality += 0.1;
    }
    
    // Completion bonus
    const hasCompletion = interactions.some(i => 
      (i.element?.text || '').toLowerCase().includes('add to cart')
    );
    if (hasCompletion) quality += 0.2;
    
    // 🎯 SIMPLIFIED: Hover sequence bonus
    if (hasHoverSequences) {
      quality += 0.15;  // Bonus for hover→click navigation patterns
    }
    
    return Math.min(1.0, quality);
  }

  private identifySequenceStages(sequence: ShoppingSequence): SequenceStage[] {
    const stages: SequenceStage[] = [];
    let currentStage: EnhancedInteractionData[] = [];
    let currentStageName = '';
    
    for (const interaction of sequence.interactions) {
      const stageName = this.getStageNameForInteraction(interaction);
      
      if (stageName !== currentStageName) {
        if (currentStage.length > 0) {
          stages.push({
            stageName: currentStageName,
            interactions: currentStage,
            stageGoal: this.getStageGoal(currentStageName),
            progressIndicators: this.getProgressIndicators(currentStage),
            stageOutcome: 'completed'
          });
        }
        currentStage = [interaction];
        currentStageName = stageName;
      } else {
        currentStage.push(interaction);
      }
    }
    
    // Add final stage
    if (currentStage.length > 0) {
      stages.push({
        stageName: currentStageName,
        interactions: currentStage,
        stageGoal: this.getStageGoal(currentStageName),
        progressIndicators: this.getProgressIndicators(currentStage),
        stageOutcome: 'completed'
      });
    }
    
    return stages;
  }

  public getStageNameForInteraction(interaction: EnhancedInteractionData): string {
    const url = interaction.context?.pageUrl || '';
    
    if (url.includes('/search')) return 'Search';
    if (url.includes('/category') || url.includes('/browse')) return 'Browse';
    if (url.includes('/product')) return 'Product Selection';
    if (url.includes('/cart')) return 'Cart Management';
    
    return 'Navigation';
  }

  private getStageGoal(stageName: string): string {
    const goals: { [key: string]: string } = {
      'Search': 'Find relevant products',
      'Browse': 'Explore product categories',
      'Product Selection': 'Choose specific product variant',
      'Cart Management': 'Review and manage cart contents',
      'Navigation': 'Navigate between pages'
    };
    
    return goals[stageName] || 'Progress through shopping flow';
  }

  private getProgressIndicators(interactions: EnhancedInteractionData[]): string[] {
    return interactions.map(i => i.element?.text || '').filter(Boolean);
  }

  // Additional helper methods would go here...
  private isDecisionPoint(interaction: EnhancedInteractionData, allInteractions: EnhancedInteractionData[], index: number): boolean {
    const elementText = interaction.element?.text || '';
    const attributes = interaction.element?.attributes || {};
    
    // Size/color selections are decision points
    const isSizeSelection = this.patternMatcher.detectSize(elementText, { attributes });
    const isColorSelection = this.patternMatcher.detectColor(elementText, { attributes });
    
    return !!isSizeSelection || !!isColorSelection;
  }

  private isConfigurationInteraction(interaction: EnhancedInteractionData): boolean {
    const elementText = interaction.element?.text || '';
    const attributes = interaction.element?.attributes || {};
    
    return !!this.patternMatcher.detectSize(elementText, { attributes }) ||
           !!this.patternMatcher.detectColor(elementText, { attributes });
  }

  private getStepType(interaction: EnhancedInteractionData, index: number, totalSteps: number): string {
    if (index === 0) return 'Start';
    if (index === totalSteps - 1) return 'Complete';
    return `Step ${index + 1}`;
  }

  private getPageType(url: string): string {
    if (url.includes('/product')) return 'product page';
    if (url.includes('/category')) return 'category page';
    if (url.includes('/search')) return 'search results';
    if (url.includes('/cart')) return 'cart page';
    return 'page';
  }


  private formatProductState(productContext: ProductConfigurationState): string {
    const lines = [`Product: ${productContext.productName} (ID: ${productContext.productId})`];
    
    if (productContext.selectedSize) lines.push(`Size: ${productContext.selectedSize}`);
    if (productContext.selectedColor) lines.push(`Color: ${productContext.selectedColor}`);
    if (productContext.basePrice) lines.push(`Price: ${productContext.basePrice}`);
    
    lines.push(`Configuration Complete: ${productContext.readyForCart ? 'Yes' : 'No'}`);
    
    return lines.join('\n');
  }

  private createStageTransitionExample(stage: SequenceStage, nextStage: SequenceStage | undefined, sequence: ShoppingSequence): TrainingExample | null {
    // Implementation for stage transition examples
    return null; // Placeholder
  }

  private createDecisionExample(interaction: EnhancedInteractionData, sequence: ShoppingSequence): TrainingExample | null {
    // Implementation for decision point examples
    return null; // Placeholder
  }

  private createConfigurationExample(interaction: EnhancedInteractionData, sequence: ShoppingSequence): TrainingExample | null {
    // Implementation for product configuration examples
    return null; // Placeholder
  }

  /**
   * 🌟 ENHANCED: Semantic page classification using UniversalSequenceDetector
   */
  public classifyPageSemantically(interaction: EnhancedInteractionData): { pageType: string; confidence: number; indicators: string[] } {
    // First try UniversalSequenceDetector's advanced classification
    const advancedClassification = (this.universalSequenceDetector as any).classifyPage(interaction);
    
    if (advancedClassification && advancedClassification.confidence > 0.6) {
      console.log('🌟 [UNIVERSAL CLASSIFICATION] Using advanced page classification', {
        pageType: advancedClassification.pageType,
        confidence: advancedClassification.confidence,
        indicators: advancedClassification.indicators
      });
      
      return {
        pageType: advancedClassification.pageType,
        confidence: advancedClassification.confidence,
        indicators: advancedClassification.indicators
      };
    }
    
    // Fallback to original classification logic
    const url = interaction.context?.pageUrl || (interaction.context as any)?.url || '';
    const pageTitle = interaction.context?.pageTitle || '';
    const elementText = interaction.element?.text || '';
    const elementAttributes = interaction.element?.attributes || {};
    const domSnapshot = (interaction.context as any)?.pageContext?.domSnapshot;

    let pageType = 'unknown';
    let confidence = 0.5;
    const indicators: string[] = [];

    // Product page detection
    if (this.detectProductPage(url, pageTitle, elementText, elementAttributes, domSnapshot)) {
      pageType = 'product';
      confidence = 0.85;
      indicators.push('product details detected');
    }
    // Category page detection
    else if (this.detectCategoryPage(url, pageTitle, elementText, domSnapshot)) {
      pageType = 'category';
      confidence = 0.8;
      indicators.push('category structure detected');
    }
    // Cart page detection
    else if (this.detectCartPage(url, pageTitle, elementText, elementAttributes)) {
      pageType = 'cart';
      confidence = 0.9;
      indicators.push('cart functionality detected');
    }
    // Search page detection
    else if (this.detectSearchPage(url, pageTitle, elementText)) {
      pageType = 'search';
      confidence = 0.8;
      indicators.push('search results detected');
    }
    // Homepage detection
    else if (this.detectHomepage(url, pageTitle, elementText, domSnapshot)) {
      pageType = 'homepage';
      confidence = 0.7;
      indicators.push('homepage navigation detected');
    }

    return { pageType, confidence, indicators };
  }

  private detectProductPage(url: string, pageTitle: string, elementText: string, attributes: any, domSnapshot: any): boolean {
    // URL patterns (generic)
    const hasProductUrl = url.includes('/product') || url.includes('/p/') || url.includes('/item/') || 
                         url.includes('/productpage') || !!url.match(/\/[\w-]+\.\d+\.html$/);
    
    // Element-based detection
    const hasVariantSelectors = !!this.patternMatcher.detectSize(elementText, { attributes }) ||
                               !!this.patternMatcher.detectColor(elementText, { attributes });
    
    const hasProductTitle = elementText.length > 20 && elementText.includes('-') && 
                           (elementText.includes('$') || elementText.includes('Size') || elementText.includes('Color'));
    
    const hasAddToCart = elementText.toLowerCase().includes('add to cart') || 
                        elementText.toLowerCase().includes('add to bag');

    return hasProductUrl || hasVariantSelectors || hasProductTitle || hasAddToCart;
  }

  private detectCategoryPage(url: string, pageTitle: string, elementText: string, domSnapshot: any): boolean {
    // Category indicators
    const hasCategoryUrl = url.includes('/category') || url.includes('/c/') || url.includes('/browse') ||
                          url.includes('/sale') || url.includes('/men') || url.includes('/women');
    
    const hasCategoryTitle = pageTitle.toLowerCase().includes('category') || 
                            pageTitle.toLowerCase().includes('browse') ||
                            pageTitle.toLowerCase().includes('shop');
    
    // Multiple product elements suggest category page
    const hasMultipleProducts = elementText.includes('-') && elementText.length > 100;
    
    return hasCategoryUrl || hasCategoryTitle || hasMultipleProducts;
  }

  private detectCartPage(url: string, pageTitle: string, elementText: string, attributes: any): boolean {
    const hasCartUrl = url.includes('/cart') || url.includes('/bag') || url.includes('/checkout');
    const hasCartTitle = pageTitle.toLowerCase().includes('cart') || pageTitle.toLowerCase().includes('bag');
    const hasCartText = elementText.toLowerCase().includes('cart') || elementText.toLowerCase().includes('checkout');
    
    return hasCartUrl || hasCartTitle || hasCartText;
  }

  private detectSearchPage(url: string, pageTitle: string, elementText: string): boolean {
    const hasSearchUrl = url.includes('/search') || url.includes('?q=') || url.includes('query=');
    const hasSearchTitle = pageTitle.toLowerCase().includes('search') || pageTitle.toLowerCase().includes('results');
    const hasSearchText = elementText.toLowerCase().includes('search results') || 
                         elementText.toLowerCase().includes('showing results');
    
    return hasSearchUrl || hasSearchTitle || hasSearchText;
  }

  private detectHomepage(url: string, pageTitle: string, elementText: string, domSnapshot: any): boolean {
    const isRootUrl = url === '/' || url.includes('/index') || !!url.match(/^https?:\/\/[^\/]+\/?$/);
    const hasHomeTitle = pageTitle.toLowerCase().includes('home') || pageTitle.toLowerCase().includes('welcome');
    
    // Navigation-heavy content suggests homepage
    const hasNavigation = elementText.toLowerCase().includes('shop') || 
                         elementText.toLowerCase().includes('browse') ||
                         elementText.toLowerCase().includes('category');
    
    return isRootUrl || hasHomeTitle || (hasNavigation && !this.detectProductPage(url, pageTitle, elementText, {}, domSnapshot));
  }

  private isLogicalShoppingProgression(lastPageType: { pageType: string }, currentPageType: { pageType: string }): boolean {
    // Define logical shopping progressions
    const progressions = [
      ['homepage', 'category'],
      ['homepage', 'search'],
      ['category', 'product'],
      ['search', 'product'],
      ['product', 'product'], // same product, different variants
      ['product', 'cart']
    ];

    return progressions.some(([from, to]) => 
      lastPageType.pageType === from && currentPageType.pageType === to
    );
  }

  /**
   * Build semantic journey context for training prompts
   */
  public buildSemanticJourneyContext(sequence: ShoppingSequence): string {
    const pageClassifications = sequence.interactions.map(i => this.classifyPageSemantically(i));
    
    // Build journey narrative
    const journeySteps: string[] = [];
    let currentPageType = '';
    
    pageClassifications.forEach((classification, i) => {
      if (classification.pageType !== currentPageType) {
        currentPageType = classification.pageType;
        
        const behaviorDescription = this.getSemanticBehaviorDescription(classification.pageType, sequence.interactions[i]);
        journeySteps.push(`${classification.pageType}: ${behaviorDescription}`);
      }
    });
    
    // Add completion insight
    const completionInsight = sequence.conversionComplete ? 
      'Successfully completed purchase intent' : 
      'Explored product options without completion';
    
    return `${journeySteps.join(' → ')} | ${completionInsight}`;
  }

  /**
   * Get semantic behavior description for page types
   */
  public getSemanticBehaviorDescription(pageType: string, interaction: EnhancedInteractionData): string {
    const elementText = interaction.element?.text || '';
    
    switch (pageType) {
      case 'homepage':
        return 'User starting shopping journey, exploring main navigation';
      case 'category':
        return `User browsing product category (${elementText.length > 20 ? elementText.substring(0, 20) + '...' : elementText})`;
      case 'product':
        return this.patternMatcher.detectSize(elementText) || this.patternMatcher.detectColor(elementText) ?
          'User configuring product variants (size/color selection)' :
          'User examining product details and options';
      case 'cart':
        return 'User in cart/checkout flow, finalizing purchase';
      case 'search':
        return 'User searching for specific products';
      default:
        return 'User navigating through shopping interface';
    }
  }

  /**
   * Enhanced action reasoning with semantic + technical context + hover sequences
   */
  private getActionReasoning(interaction: EnhancedInteractionData, sequence: ShoppingSequence, index: number): string {
    const elementText = interaction.element?.text || '';
    const pageClassification = this.classifyPageSemantically(interaction);
    const attributes = interaction.element?.attributes || {};
    
    // 🎯 HOVER SEQUENCE DETECTION: Check if this action was part of hover→click sequence
    const hoverClickSequence = this.getHoverClickSequenceContext(interaction, sequence.interactions, index);
    
    // Semantic reasoning (enhanced with hover context)
    let semanticReason = '';
    if (hoverClickSequence.isHoverClickAction) {
      semanticReason = `${hoverClickSequence.sequenceDescription}`;
    } else if (elementText.toLowerCase().includes('add to cart') || elementText.toLowerCase().includes('add to bag')) {
      semanticReason = `Complete purchase decision for ${sequence.productContext?.productName || 'selected item'}`;
    } else if (this.patternMatcher.detectSize(elementText)) {
      semanticReason = `Configure product size (${elementText}) for purchase readiness`;
    } else if (this.patternMatcher.detectColor(elementText)) {
      semanticReason = `Select color preference (${elementText}) for product customization`;
    } else if (pageClassification.pageType === 'category') {
      semanticReason = `Navigate to product details from category browsing`;
    } else {
      semanticReason = `Progress toward ${sequence.completionGoal}`;
    }
    
    // Technical context
    const technicalContext = this.buildTechnicalActionContext(interaction);
    
    return `${semanticReason} | ${technicalContext}`;
  }

  /**
   * 🎯 Get hover→click sequence context for enhanced completions
   */
  private getHoverClickSequenceContext(interaction: EnhancedInteractionData, allInteractions: EnhancedInteractionData[], index: number): {
    isHoverClickAction: boolean;
    sequenceDescription: string;
    hoverTarget?: string;
    clickTarget?: string;
  } {
    const interactionType = interaction.interaction?.type;
    const elementText = interaction.element?.text || '';
    
    // Check if this is a click that follows a hover
    if (interactionType === 'CLICK' && index > 0) {
      const prevInteraction = allInteractions[index - 1];
      
      if (prevInteraction?.interaction?.type === 'HOVER') {
        const hoverData = (prevInteraction as any).hoverContext;
        const hoverTarget = hoverData?.dropdownTarget || prevInteraction.element?.text || 'navigation';
        
        // Check if clicked element was revealed by the hover
        if (hoverData?.revealedElements?.some((revealed: any) => 
            revealed.text && elementText && revealed.text.trim() === elementText.trim()
        )) {
          return {
            isHoverClickAction: true,
            sequenceDescription: `Hover over "${hoverTarget}" to reveal dropdown, then click "${elementText}"`,
            hoverTarget,
            clickTarget: elementText
          };
        }
      }
    }
    
    // Check if this is a hover that will reveal content for next click
    if (interactionType === 'HOVER' && index < allInteractions.length - 1) {
      const nextInteraction = allInteractions[index + 1];
      
      if (nextInteraction?.interaction?.type === 'CLICK') {
        const hoverData = (interaction as any).hoverContext;
        const hoverTarget = hoverData?.dropdownTarget || elementText || 'navigation';
        const nextElementText = nextInteraction.element?.text || '';
        
        // Check if next click will be on element revealed by this hover
        if (hoverData?.revealedElements?.some((revealed: any) => 
            revealed.text && nextElementText && revealed.text.trim() === nextElementText.trim()
        )) {
          return {
            isHoverClickAction: true,
            sequenceDescription: `Hover over "${hoverTarget}" to reveal dropdown for next click`,
            hoverTarget,
            clickTarget: nextElementText
          };
        }
      }
    }
    
    return {
      isHoverClickAction: false,
      sequenceDescription: ''
    };
  }

  /**
   * Build technical context for actions (selector, position, attributes)
   */
  private buildTechnicalActionContext(interaction: EnhancedInteractionData): string {
    const contextParts: string[] = [];
    
    // Selector information
    if (interaction.selectors?.primary) {
      contextParts.push(`Selector: ${interaction.selectors.primary}`);
    }
    
    // Visual position
    if (interaction.visual?.boundingBox) {
      const box = interaction.visual.boundingBox;
      contextParts.push(`Position: (${box.x},${box.y})`);
    }
    
    // Element attributes
    const attributes = interaction.element?.attributes || {};
    const keyAttributes = Object.entries(attributes)
      .filter(([key, value]) => key !== 'style' && value && value.length < 50)
      .slice(0, 2)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
    if (keyAttributes) {
      contextParts.push(`Attrs: ${keyAttributes}`);
    }
    
    return contextParts.length > 0 ? contextParts.join(' | ') : 'Standard interaction';
  }

  /**
   * 🎯 SIMPLIFIED HOVER DETECTION (PHASE 5)
   * Simple method to check if sequence contains hover→click patterns
   */
  private hasSimpleHoverClickSequences(interactions: EnhancedInteractionData[]): boolean {
    for (let i = 0; i < interactions.length - 1; i++) {
      const current = interactions[i];
      const next = interactions[i + 1];
      
      // Look for hover→click pairs where click was on revealed element
      if (current.interaction?.type === 'HOVER' && next.interaction?.type === 'CLICK') {
        const hoverData = (current as any).hoverContext;
        const clickedText = next.element?.text || '';
        
        // Check if click was on element revealed by hover
        if (hoverData?.revealedElements?.some((revealed: any) => 
            revealed.text && clickedText && revealed.text.trim() === clickedText.trim()
        )) {
          return true;
        }
      }
    }
    return false;
  }
}