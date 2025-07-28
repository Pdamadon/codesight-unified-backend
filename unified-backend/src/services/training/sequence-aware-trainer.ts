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
import { 
  EnhancedInteractionData, 
  TrainingExample
} from '../../types/training-types';

export interface ShoppingSequence {
  interactions: EnhancedInteractionData[];
  sequenceType: 'browse_to_cart' | 'search_to_cart' | 'navigation_flow' | 'product_configuration';
  startUrl: string;
  endUrl: string;
  productContext?: ProductConfigurationState;
  completionGoal: string;
  userIntent: string;
  sequenceQuality: number;
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

  constructor() {
    this.journeyTracker = new HybridJourneyTracker();
    this.productStateAccumulator = new ProductStateAccumulator();
    this.patternMatcher = new DynamicPatternMatcher();
  }

  /**
   * Generate sequence-aware training examples from session interactions
   */
  generateSequenceTrainingExamples(interactions: EnhancedInteractionData[]): TrainingExample[] {
    const examples: TrainingExample[] = [];
    
    // 1. Identify shopping sequences in the interactions
    const shoppingSequences = this.identifyShoppingSequences(interactions);
    
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
    
    return examples;
  }

  /**
   * Identify complete shopping sequences from interactions
   */
  private identifyShoppingSequences(interactions: EnhancedInteractionData[]): ShoppingSequence[] {
    const sequences: ShoppingSequence[] = [];
    let currentSequence: EnhancedInteractionData[] = [];
    let sequenceStart: number | null = null;
    
    for (let i = 0; i < interactions.length; i++) {
      const interaction = interactions[i];
      const url = interaction.context?.pageUrl || '';
      const elementText = interaction.element?.text || '';
      
      // Detect sequence start (homepage, search, category page)
      if (this.isSequenceStart(interaction)) {
        if (currentSequence.length > 0) {
          // Save previous sequence
          const sequence = this.buildShoppingSequence(currentSequence, sequenceStart!);
          if (sequence) sequences.push(sequence);
        }
        currentSequence = [interaction];
        sequenceStart = i;
      }
      // Detect sequence continuation
      else if (this.isSequenceContinuation(interaction, currentSequence)) {
        currentSequence.push(interaction);
      }
      // Detect sequence end (cart, checkout)
      else if (this.isSequenceEnd(interaction) && currentSequence.length > 0) {
        currentSequence.push(interaction);
        const sequence = this.buildShoppingSequence(currentSequence, sequenceStart!);
        if (sequence) sequences.push(sequence);
        currentSequence = [];
        sequenceStart = null;
      }
    }
    
    // Handle final sequence
    if (currentSequence.length > 1) {
      const sequence = this.buildShoppingSequence(currentSequence, sequenceStart!);
      if (sequence) sequences.push(sequence);
    }
    
    return sequences;
  }

  /**
   * Build a shopping sequence from interactions
   */
  private buildShoppingSequence(interactions: EnhancedInteractionData[], startIndex: number): ShoppingSequence | null {
    if (interactions.length < 2) return null;
    
    const startUrl = interactions[0].context?.pageUrl || '';
    const endUrl = interactions[interactions.length - 1].context?.pageUrl || '';
    
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
    
    // Calculate sequence quality
    const sequenceQuality = this.calculateSequenceQuality(interactions, productContext);
    
    return {
      interactions,
      sequenceType,
      startUrl,
      endUrl,
      productContext,
      completionGoal,
      userIntent,
      sequenceQuality
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
    
    // Build completion with detailed actions
    const actions = sequence.interactions.map((interaction, i) => {
      const actionType = interaction.interaction?.type || 'interact';
      const elementText = interaction.element?.text || '';
      const reasoning = this.getActionReasoning(interaction, sequence, i);
      
      return `Step ${i + 1}: ${actionType} "${elementText}" // ${reasoning}`;
    });
    
    // Include product configuration if available
    let productConfigContext = '';
    if (sequence.productContext) {
      productConfigContext = `\n\n[PRODUCT CONFIGURATION]\n${this.formatProductState(sequence.productContext)}`;
    }
    
    return {
      prompt: `[COMPLETE SHOPPING FLOW]\nUser Intent: ${sequence.userIntent}\nGoal: ${sequence.completionGoal}\nSequence: ${sequenceSteps.join(' → ')}${productConfigContext}`,
      completion: `// Complete ${sequence.sequenceType} flow\n${actions.join('\n')}`,
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
          conversionComplete: sequence.completionGoal.includes('cart'),
          clearUserIntent: true,
          journeyPrioritized: true
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
   * Helper methods for sequence analysis
   */
  private isSequenceStart(interaction: EnhancedInteractionData): boolean {
    const url = interaction.context?.pageUrl || '';
    const elementText = interaction.element?.text || '';
    
    return url.includes('/search') || 
           url.includes('/category') || 
           url.includes('/browse') ||
           elementText.toLowerCase().includes('shop') ||
           elementText.toLowerCase().includes('browse');
  }

  private isSequenceContinuation(interaction: EnhancedInteractionData, currentSequence: EnhancedInteractionData[]): boolean {
    if (currentSequence.length === 0) return false;
    
    const url = interaction.context?.pageUrl || '';
    const lastUrl = currentSequence[currentSequence.length - 1].context?.pageUrl || '';
    
    // Same domain and related pages
    return url.includes(new URL(lastUrl).hostname) &&
           (url.includes('/product') || url.includes('/category') || url.includes('/search'));
  }

  private isSequenceEnd(interaction: EnhancedInteractionData): boolean {
    const elementText = interaction.element?.text || '';
    const url = interaction.context?.pageUrl || '';
    
    return elementText.toLowerCase().includes('add to cart') ||
           elementText.toLowerCase().includes('add to bag') ||
           url.includes('/cart') ||
           url.includes('/checkout');
  }

  private determineSequenceType(interactions: EnhancedInteractionData[]): ShoppingSequence['sequenceType'] {
    const urls = interactions.map(i => i.context?.pageUrl || '');
    const hasSearch = urls.some(url => url.includes('/search'));
    const hasBrowse = urls.some(url => url.includes('/browse') || url.includes('/category'));
    const hasProduct = urls.some(url => url.includes('/product'));
    
    if (hasSearch && hasProduct) return 'search_to_cart';
    if (hasBrowse && hasProduct) return 'browse_to_cart';
    if (hasProduct) return 'product_configuration';
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
    
    if (elementText.toLowerCase().includes('add to cart')) return 'Add item to cart';
    if (elementText.toLowerCase().includes('buy now')) return 'Purchase item immediately';
    
    return 'Complete product selection';
  }

  private calculateSequenceQuality(interactions: EnhancedInteractionData[], productContext?: ProductConfigurationState): number {
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

  private getStageNameForInteraction(interaction: EnhancedInteractionData): string {
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

  private getActionReasoning(interaction: EnhancedInteractionData, sequence: ShoppingSequence, index: number): string {
    const elementText = interaction.element?.text || '';
    
    if (elementText.toLowerCase().includes('add to cart')) {
      return `Complete purchase decision for ${sequence.productContext?.productName || 'selected item'}`;
    }
    
    if (this.patternMatcher.detectSize(elementText)) {
      return `Select size for product configuration`;
    }
    
    if (this.patternMatcher.detectColor(elementText)) {
      return `Choose color preference`;
    }
    
    return `Progress toward ${sequence.completionGoal}`;
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
}