/**
 * Training Data Transformer Service - Fix Poor Training Data Quality
 * 
 * Per OPENAI_FOCUSED_REFACTOR.md: Fix training data transformation with rich contextual data
 * Per FOCUSED_TASKS.md: Use SelectorStrategyService + comprehensive context extraction
 * 
 * CRITICAL FIX: Use reliability scores and rich interaction data for contextual training examples
 */

import { SelectorStrategyService } from '../selectors/selector-strategy';
import { 
  EnhancedInteractionData, 
  TrainingExample, 
  TrainingDataResult, 
  ExampleType,
  PsychologyInsight,
  BusinessContext 
} from '../../types/training-types';

export interface TrainingDataTransformerService {
  generateTrainingData(sessionId: string, enhancedInteractions: any[]): Promise<TrainingDataResult>;
  createFineTuningExamples(interaction: EnhancedInteractionData): TrainingExample[];
  createSequenceExamples(interactions: EnhancedInteractionData[]): TrainingExample[];
  createTaskDrivenExamples(interactions: EnhancedInteractionData[], taskContext?: any): TrainingExample[];
}

export class TrainingDataTransformerImpl implements TrainingDataTransformerService {

  constructor(
    private selectorStrategy: SelectorStrategyService
  ) {}

  /**
   * Main orchestration method - extracted from openai-integration-clean.ts
   */
  async generateTrainingData(sessionId: string, enhancedInteractions: any[]): Promise<TrainingDataResult> {
    const startTime = Date.now();
    const allExamples: TrainingExample[] = [];
    let selectorEnhancements = 0;
    let contextEnhancements = 0;

    // Process each interaction with enhanced context extraction
    for (const interaction of enhancedInteractions) {
      try {
        // 🎯 CRITICAL FIX: Use SelectorStrategyService for reliable selectors
        const fineTuningExamples = this.createFineTuningExamples(interaction);
        allExamples.push(...fineTuningExamples);
        
        if (interaction.selectors?.reliability) {
          selectorEnhancements++;
        }
        if (interaction.element?.nearbyElements || interaction.visual?.boundingBox) {
          contextEnhancements++;
        }
      } catch (error) {
        console.warn(`Failed to process interaction:`, error);
      }
    }

    // Create sequence and task-driven examples
    const sequenceExamples = this.createSequenceExamples(enhancedInteractions);
    const taskExamples = this.createTaskDrivenExamples(enhancedInteractions);
    
    allExamples.push(...sequenceExamples, ...taskExamples);

    // 🎯 JOURNEY-PRIORITIZED QUALITY FILTERING
    const qualityExamples = this.filterAndPrioritizeByJourneyQuality(allExamples);

    const endTime = Date.now();
    
    return {
      examples: qualityExamples,
      metadata: this.calculateMetadata(qualityExamples),
      processing: {
        startTime,
        endTime,
        duration: endTime - startTime,
        selectorEnhancements,
        contextEnhancements
      }
    };
  }

  /**
   * 🎯 COMPLETELY REWRITTEN: COMPREHENSIVE context extraction with ALL data
   * 
   * Uses ALL available rich data: visual, spatial, business, accessibility, 
   * performance, state, form, SEO, analytics, timing, network, errors
   */
  createFineTuningExamples(interaction: EnhancedInteractionData): TrainingExample[] {
    const examples: TrainingExample[] = [];
    const startTime = Date.now();
    
    // 🚨 CRITICAL FIX: Use reliability-based selector selection
    const selectorResult = this.selectorStrategy.getBestSelectorWithScore(interaction.selectors || {});
    const bestSelector = selectorResult.bestSelector;
    const backupSelectors = selectorResult.backupSelectors;
    const reliability = selectorResult.reliability;

    // 🆕 COMPREHENSIVE DATA EXTRACTION - Use EVERYTHING
    const url = interaction.context?.pageUrl || '';
    const hostname = url ? new URL(url).hostname : 'unknown-site';
    const elementText = interaction.element?.text || '';
    const actionType = interaction.interaction?.type?.toLowerCase() || 'interact';
    
    // Extract ALL available context including NEW ENHANCED DATA
    const visualContext = this.extractVisualContext(interaction.visual);
    const elementContext = this.extractElementContext(interaction.element);
    const pageContext = this.extractPageContext(interaction.context);
    const stateContext = this.extractStateContext(interaction.state);
    const businessContext = this.extractBusinessContext(interaction.business, hostname);
    const technicalContext = this.extractTechnicalContext(interaction);
    
    // 🆕 NEW ENHANCED DATA EXTRACTION
    const nearbyElementsContext = this.extractCompleteNearbyElements(interaction.element?.nearbyElements || []);
    const designSystemContext = this.extractDesignSystemContext(interaction.visual?.designSystem);
    const behaviorPatternsContext = this.extractBehaviorPatternsContext(interaction.business?.user);
    
    // Generate Playwright action with reliable selector
    const playwrightAction = this.selectorStrategy.getPlaywrightAction(
      actionType as any, 
      bestSelector !== 'element' ? bestSelector : (interaction.interaction?.selector || 'element')
    );

    // 🎯 EXAMPLE 1: ULTRA-COMPREHENSIVE site-specific pattern with NEW DATA
    if (bestSelector !== 'element') {
      examples.push({
        prompt: `${hostname.toUpperCase()}: "${elementText}" ${actionType} | ${visualContext.layout} ${designSystemContext.componentLibrary} | ${elementContext.formContext} | ${nearbyElementsContext.spatialSummary} | ${behaviorPatternsContext.devicePreference} ${behaviorPatternsContext.interactionPatterns} user | ${pageContext.performance} performance`,
        completion: `${playwrightAction.action} // ${businessContext.ecommerce} | Design: ${designSystemContext.brandColors} ${designSystemContext.designPatterns} | Behavior: ${behaviorPatternsContext.devicePreference} ${behaviorPatternsContext.interactionPatterns} | Nearby: ${nearbyElementsContext.interactionTargets} | Rel: ${reliability.toFixed(2)} | ${technicalContext.timing} | Backups: ${backupSelectors.length}`,
        context: {
          pageType: interaction.context?.pageType,
          userJourney: interaction.context?.userJourney,
          reliability,
          businessContext: businessContext.conversion,
          visual: { ...visualContext, designSystem: designSystemContext.summary, componentLibrary: designSystemContext.componentLibrary, brandColors: designSystemContext.brandColors, designPatterns: designSystemContext.designPatterns },
          element: { ...elementContext, nearbyElementsComplete: nearbyElementsContext.spatialSummary, spatialRelationships: nearbyElementsContext.relationships, interactionContext: nearbyElementsContext.interactionTargets },
          page: pageContext,
          state: stateContext,
          business: { ...businessContext, behaviorPatterns: behaviorPatternsContext.patterns },
          technical: technicalContext
        },
        quality: this.calculateComprehensiveQuality(interaction),
        rawData: {
          originalInteraction: interaction,
          processingTime: Date.now() - startTime,
          dataCompletion: this.calculateDataCompletion(interaction),
          enhancementFlags: this.getEnhancementFlags(interaction)
        }
      });
    }

    // 🎯 EXAMPLE 2: VISUAL + SPATIAL + ACCESSIBILITY context
    if (visualContext.positioning && elementContext.ariaContext) {
      examples.push({
        prompt: `VISUAL-A11Y: "${elementText}" ${visualContext.positioning} | ${visualContext.colors} | ARIA: ${elementContext.ariaContext} | ${pageContext.accessibility} on ${hostname}`,
        completion: `${playwrightAction.action} // Visual: ${visualContext.deviceType} | A11y: WCAG-${pageContext.accessibility} | Colors: ${visualContext.colors}`,
        context: {
          spatialContext: `${visualContext.positioning} with ${elementContext.ariaContext}`,
          visual: visualContext,
          element: elementContext,
          page: pageContext
        },
        quality: this.calculateComprehensiveQuality(interaction)
      });
    }

    // 🎯 EXAMPLE 3: BUSINESS + E-COMMERCE + CONVERSION context  
    if (businessContext.ecommerce && businessContext.conversion) {
      examples.push({
        prompt: `E-COMMERCE: ${businessContext.ecommerce} | Funnel: ${businessContext.conversion} | User: ${businessContext.user} | "${elementText}" ${actionType}`,
        completion: `${playwrightAction.action} // Product: ${businessContext.ecommerce} | Stage: ${businessContext.conversion} | Timing: ${technicalContext.timing}`,
        context: {
          businessContext: `${businessContext.ecommerce} at ${businessContext.conversion}`,
          business: businessContext,
          technical: technicalContext
        },
        quality: this.calculateComprehensiveQuality(interaction)
      });
    }

    // 🎯 EXAMPLE 4: PERFORMANCE + NETWORK + SEO context
    if (pageContext.performance && technicalContext.network) {
      examples.push({
        prompt: `PERFORMANCE: ${pageContext.performance} | Network: ${technicalContext.network} | SEO: ${pageContext.seo} | "${elementText}" ${actionType}`,
        completion: `${playwrightAction.action} // Load: ${pageContext.performance} | Requests: ${technicalContext.network} | ${pageContext.seo}`,
        context: {
          page: pageContext,
          technical: technicalContext
        },
        quality: this.calculateComprehensiveQuality(interaction)
      });
    }

    // 🎯 EXAMPLE 5: STATE + FORM + INTERACTION context
    if (stateContext.before && elementContext.formContext) {
      examples.push({
        prompt: `FORM-STATE: ${elementContext.formContext} | Before: ${stateContext.before} | Changes: ${stateContext.changes} | "${elementText}" ${actionType}`,
        completion: `${playwrightAction.action} // Form: ${elementContext.formContext} | State: ${stateContext.before} → ${stateContext.after}`,
        context: {
          element: elementContext,
          state: stateContext
        },
        quality: this.calculateComprehensiveQuality(interaction)
      });
    }

    // 🎯 EXAMPLE 6: COMPLETE DOM + HIERARCHY + SIBLINGS context
    if (elementContext.domHierarchy && interaction.element?.siblingElements?.length) {
      const siblings = interaction.element.siblingElements.slice(0, 3).map(s => s.text).join(', ');
      examples.push({
        prompt: `DOM-COMPLETE: ${elementContext.domHierarchy} | Siblings: ${siblings} | Attrs: ${elementContext.attributes} | "${elementText}" ${actionType}`,
        completion: `${playwrightAction.action} // Path: ${elementContext.domHierarchy} | Near: ${siblings} | Computed: ${elementContext.computedStyles}`,
        context: {
          element: elementContext,
          spatialContext: `in ${elementContext.domHierarchy} with siblings: ${siblings}`
        },
        quality: this.calculateComprehensiveQuality(interaction)
      });
    }

    // 🎯 EXAMPLE 7: ANALYTICS + TRACKING + USER context
    if (pageContext.analytics && businessContext.user) {
      examples.push({
        prompt: `ANALYTICS: ${pageContext.analytics} | User: ${businessContext.user} | Session: ${technicalContext.timing} | "${elementText}" ${actionType}`,
        completion: `${playwrightAction.action} // Track: ${pageContext.analytics} | User: ${businessContext.user} | Time: ${technicalContext.timing}`,
        context: {
          page: pageContext,
          business: businessContext,
          technical: technicalContext
        },
        quality: this.calculateComprehensiveQuality(interaction)
      });
    }

    // 🎯 EXAMPLE 8: NEW ENHANCED DATA - Complete Nearby Elements + Design System + Behavior Patterns
    if (nearbyElementsContext.interactionTargets && designSystemContext.componentLibrary && behaviorPatternsContext.patterns) {
      examples.push({
        prompt: `ENHANCED-COMPLETE: "${elementText}" ${actionType} | Design: ${designSystemContext.componentLibrary} ${designSystemContext.brandColors} | Nearby: ${nearbyElementsContext.spatialSummary} (${nearbyElementsContext.interactionTargets}) | User: ${behaviorPatternsContext.preferredCategories} ${behaviorPatternsContext.purchasePattern} | on ${hostname}`,
        completion: `${playwrightAction.action} // UI: ${designSystemContext.componentLibrary} ${designSystemContext.designPatterns} | Spatial: ${nearbyElementsContext.relationships} | PersonalizedFor: ${behaviorPatternsContext.personalization} | PurchaseContext: ${behaviorPatternsContext.purchaseHistory}`,
        context: {
          visual: { ...visualContext, designSystem: designSystemContext.summary, componentLibrary: designSystemContext.componentLibrary, brandColors: designSystemContext.brandColors, designPatterns: designSystemContext.designPatterns },
          element: { ...elementContext, nearbyElementsComplete: nearbyElementsContext.spatialSummary, spatialRelationships: nearbyElementsContext.relationships, interactionContext: nearbyElementsContext.interactionTargets },
          business: { ...businessContext, behaviorPatterns: behaviorPatternsContext.patterns, purchaseHistory: behaviorPatternsContext.purchaseHistory, userPreferences: behaviorPatternsContext.preferences, personalizedContext: behaviorPatternsContext.personalization }
        },
        quality: this.calculateComprehensiveQuality(interaction)
      });
    }

    return examples;
  }

  /**
   * Create sequence examples (copied from openai-integration-clean.ts)
   */
  /**
   * 🛤️ JOURNEY-BASED SEQUENCE EXAMPLES: Generate training data for complete user journeys
   * Creates training examples that teach the AI complete user flows from discovery to realistic conversion endpoints
   */
  createSequenceExamples(interactions: EnhancedInteractionData[]): TrainingExample[] {
    const examples: TrainingExample[] = [];
    
    // Use enhanced journey detection to group interactions
    const journeys = this.groupInteractionsBySequence(interactions);
    
    for (const journey of journeys) {
      if (journey.length >= 2) {
        // Extract journey metadata from enhanced interactions (might not exist yet)
        const journeyMetadata = (journey[0] as any).journeyMetadata;
        const journeyType = journeyMetadata?.journeyType || this.detectJourneyType(journey);
        const journeyGoal = journeyMetadata?.journeyGoal || this.extractJourneyGoal(journey);
        const userIntent = journeyMetadata?.userIntent || this.extractUserIntent(journey);
        
        // 🎯 CREATE JOURNEY-AWARE TRAINING EXAMPLES
        
        // 1. COMPLETE JOURNEY EXAMPLE: Full user flow from start to realistic endpoint
        const journeyExample = this.createCompleteJourneyExample(journey, journeyType, journeyGoal, userIntent);
        if (journeyExample) examples.push(journeyExample);
        
        // 2. JOURNEY STAGES EXAMPLE: Focus on funnel progression
        const stagesExample = this.createJourneyStagesExample(journey, journeyType, userIntent);
        if (stagesExample) examples.push(stagesExample);
        
        // 3. DECISION-MAKING EXAMPLE: Focus on user decision factors
        const decisionExample = this.createDecisionMakingExample(journey, journeyGoal, userIntent);
        if (decisionExample) examples.push(decisionExample);
      }
    }

    return examples;
  }

  /**
   * 🎯 COMPLETE JOURNEY EXAMPLE: Full user flow with context and intent
   */
  private createCompleteJourneyExample(journey: EnhancedInteractionData[], journeyType: string, journeyGoal: string, userIntent: string): TrainingExample | null {
    if (journey.length < 2) return null;
    
    // Build journey prompt with user context
    const journeySteps = journey.map((interaction, i) => {
      const stepType = this.getJourneyStepType(interaction, i, journey.length);
      const element = interaction.element?.text || 'element';
      const actionType = interaction.interaction?.type || 'interact';
      const context = this.getStepContext(interaction);
      
      return `${stepType}: ${element} (${actionType}) ${context}`;
    });
    
    // Build journey completion with reliable selectors
    const journeyActions = journey.map((interaction, i) => {
      const selectorResult = this.selectorStrategy.getBestSelectorWithScore(interaction.selectors || {});
      const action = this.selectorStrategy.getPlaywrightAction(interaction.interaction?.type as any, selectorResult.bestSelector).action;
      const comment = this.getJourneyStepComment(interaction, i, journey.length, userIntent);
      
      return `${action}; ${comment}`;
    });
    
    return {
      prompt: `JOURNEY (${journeyType}): User Intent: "${userIntent}" | Goal: ${journeyGoal} | Flow: ${journeySteps.join(' → ')}`,
      completion: `// Complete ${journeyType} journey: ${userIntent}\n${journeyActions.join('\n')}`,
      context: {
        pageType: 'journey-sequence',
        userJourney: journeyType,
        journeyGoal,
        userIntent,
        journeyLength: journey.length,
        businessContext: journey[journey.length - 1]?.business?.conversion?.funnelStage || 'unknown'
      },
      quality: this.calculateJourneyQuality(journey)
    };
  }

  /**
   * 🏗️ JOURNEY STAGES EXAMPLE: Focus on funnel progression
   */
  private createJourneyStagesExample(journey: EnhancedInteractionData[], journeyType: string, userIntent: string): TrainingExample | null {
    const stages = journey.map(i => i.business?.conversion?.funnelStage).filter(Boolean);
    const uniqueStages = [...new Set(stages)];
    
    if (uniqueStages.length < 2) return null;
    
    const stageProgression = uniqueStages.join(' → ');
    const stageActions = journey.filter(i => i.business?.conversion?.funnelStage).map(interaction => {
      const stage = interaction.business?.conversion?.funnelStage || 'unknown';
      const selectorResult = this.selectorStrategy.getBestSelectorWithScore(interaction.selectors || {});
      const action = this.selectorStrategy.getPlaywrightAction(interaction.interaction?.type as any, selectorResult.bestSelector).action;
      
      return `// ${stage.toUpperCase()} STAGE\n${action}`;
    });
    
    return {
      prompt: `FUNNEL STAGES (${stageProgression}): User progressing through ${journeyType} with intent: "${userIntent}"`,
      completion: stageActions.join('\n\n'),
      context: {
        pageType: 'funnel-progression',
        userJourney: journeyType,
        funnelStages: uniqueStages as string[],
        userIntent
      },
      quality: this.calculateJourneyQuality(journey)
    };
  }

  /**
   * 🧠 DECISION-MAKING EXAMPLE: Focus on user decision factors
   */
  private createDecisionMakingExample(journey: EnhancedInteractionData[], journeyGoal: string, userIntent: string): TrainingExample | null {
    // Look for validation/research steps in the journey
    const validationSteps = journey.filter(i => 
      i.business?.conversion?.funnelStage === 'validation' ||
      i.context?.pageType === 'product' ||
      i.element?.text?.toLowerCase().includes('review') ||
      i.element?.text?.toLowerCase().includes('spec')
    );
    
    if (validationSteps.length === 0) return null;
    
    const decisionFactors = this.extractDecisionFactors(journey);
    const validationActions = validationSteps.map(interaction => {
      const selectorResult = this.selectorStrategy.getBestSelectorWithScore(interaction.selectors || {});
      const action = this.selectorStrategy.getPlaywrightAction(interaction.interaction?.type as any, selectorResult.bestSelector).action;
      const reason = this.getValidationReason(interaction);
      
      return `${action}; // ${reason}`;
    });
    
    return {
      prompt: `DECISION VALIDATION: User "${userIntent}" needs to validate: ${decisionFactors.join(', ')} before ${journeyGoal}`,
      completion: `// User validation process: ${decisionFactors.join(', ')}\n${validationActions.join('\n')}`,
      context: {
        pageType: 'decision-validation',
        userJourney: 'validation-process',
        decisionFactors,
        userIntent
      },
      quality: this.calculateJourneyQuality(journey)
    };
  }

  // Helper methods for journey example creation
  
  private getJourneyStepType(interaction: EnhancedInteractionData, index: number, totalSteps: number): string {
    if (index === 0) return 'START';
    if (index === totalSteps - 1) return 'CONVERT';
    
    const funnelStage = interaction.business?.conversion?.funnelStage;
    switch (funnelStage) {
      case 'discovery': return 'DISCOVER';
      case 'consideration': return 'CONSIDER';
      case 'evaluation': return 'EVALUATE';
      case 'validation': return 'VALIDATE';
      default: return 'STEP';
    }
  }

  private getStepContext(interaction: EnhancedInteractionData): string {
    const pageType = interaction.context?.pageType;
    const element = interaction.element?.text;
    
    if (pageType === 'search-results') return 'searching';
    if (pageType === 'product') return 'researching';
    if (element?.toLowerCase().includes('review')) return 'validating';
    if (element?.toLowerCase().includes('cart')) return 'converting';
    if (element?.toLowerCase().includes('checkout')) return 'converting';
    
    return 'progressing';
  }

  private getJourneyStepComment(interaction: EnhancedInteractionData, index: number, totalSteps: number, userIntent: string): string {
    if (index === 0) return `// User starts journey: ${userIntent}`;
    if (index === totalSteps - 1) return `// User reaches conversion endpoint: ${userIntent}`;
    
    const funnelStage = interaction.business?.conversion?.funnelStage;
    switch (funnelStage) {
      case 'consideration': return '// User comparing options';
      case 'validation': return '// User validating decision';
      case 'evaluation': return '// User evaluating details';
      default: return `// User progressing toward: ${userIntent}`;
    }
  }

  private extractDecisionFactors(journey: EnhancedInteractionData[]): string[] {
    const factors: string[] = [];
    
    journey.forEach(interaction => {
      const element = interaction.element?.text?.toLowerCase() || '';
      if (element.includes('price')) factors.push('price comparison');
      if (element.includes('review')) factors.push('user reviews');
      if (element.includes('spec')) factors.push('specifications');
      if (element.includes('rating')) factors.push('ratings');
      if (element.includes('feature')) factors.push('features');
    });
    
    return [...new Set(factors)];
  }

  private getValidationReason(interaction: EnhancedInteractionData): string {
    const element = interaction.element?.text?.toLowerCase() || '';
    if (element.includes('review')) return 'checking user reviews';
    if (element.includes('spec')) return 'reviewing specifications';
    if (element.includes('price')) return 'comparing prices';
    if (element.includes('rating')) return 'checking ratings';
    return 'validating decision';
  }

  private calculateJourneyQuality(journey: EnhancedInteractionData[]): { score: number; factors: any } {
    let score = 0.6; // Base score for journey examples
    
    // Initialize with default quality factors structure
    const factors = {
      hasReliableSelector: true, // Journey examples use reliable selectors
      hasSpatialContext: journey.some(i => i.element?.nearbyElements?.length),
      hasBusinessContext: journey.some(i => i.business),
      hasVisualContext: journey.some(i => i.visual?.boundingBox),
      hasAccessibilityContext: false,
      hasPerformanceContext: journey.some(i => i.context?.performance),
      hasStateContext: journey.some(i => i.state),
      hasFormContext: false,
      hasSEOContext: false,
      hasAnalyticsContext: false,
      hasTimingContext: journey.some(i => i.interaction?.timing),
      hasNetworkContext: false,
      hasErrorContext: false,
      hasUserContext: journey.some(i => i.business?.user),
      hasCompleteNearbyElements: journey.some(i => i.element?.nearbyElements?.length),
      hasDesignSystemContext: journey.some(i => i.visual?.designSystem),
      hasBehaviorPatternsContext: journey.some(i => i.business?.user?.behaviorPatterns),
      
      // Journey-specific quality indicators
      multiStepJourney: journey.length >= 3,
      funnelProgression: new Set(journey.map(i => i.business?.conversion?.funnelStage).filter(Boolean)).size >= 2,
      conversionComplete: journey.some(i => this.isJourneyComplete([i])),
      clearUserIntent: journey.some(i => i.state?.before?.formData || i.business?.ecommerce?.productName)
    };
    
    // Journey length bonus
    if (factors.multiStepJourney) {
      score += 0.1;
    }
    
    // Funnel progression bonus
    if (factors.funnelProgression) {
      score += 0.15;
    }
    
    // Realistic conversion completion bonus
    if (factors.conversionComplete) {
      score += 0.2;
    }
    
    // User intent clarity bonus
    if (factors.clearUserIntent) {
      score += 0.1;
    }
    
    return {
      score: Math.min(score, 1.0),
      factors
    };
  }

  /**
   * 🎯 JOURNEY-PRIORITIZED QUALITY FILTERING
   * Prioritizes complete journey examples over individual interactions
   */
  private filterAndPrioritizeByJourneyQuality(allExamples: TrainingExample[]): TrainingExample[] {
    // Separate journey examples from individual interaction examples
    const journeyExamples = allExamples.filter(ex => 
      ex.context?.pageType === 'journey-sequence' ||
      ex.context?.pageType === 'funnel-progression' ||
      ex.context?.pageType === 'decision-validation' ||
      ex.quality?.factors?.multiStepJourney ||
      ex.quality?.factors?.funnelProgression
    );
    
    const individualExamples = allExamples.filter(ex => !journeyExamples.includes(ex));
    
    // 🎯 JOURNEY EXAMPLES: Lower quality threshold (0.4) - prioritize complete flows
    const qualityJourneyExamples = journeyExamples.filter(ex => ex.quality.score >= 0.4);
    
    // 🔍 INDIVIDUAL EXAMPLES: Higher quality threshold (0.6) - be selective
    const qualityIndividualExamples = individualExamples.filter(ex => ex.quality.score >= 0.6);
    
    // 📊 PRIORITIZATION STRATEGY:
    // 1. Include ALL high-quality journey examples first
    // 2. Add individual examples only if we have space and they're high quality
    const prioritizedExamples = [...qualityJourneyExamples];
    
    // Add individual examples up to a reasonable limit (don't overwhelm with individual actions)
    const maxIndividualExamples = Math.max(qualityJourneyExamples.length, 5);
    const topIndividualExamples = qualityIndividualExamples
      .sort((a, b) => b.quality.score - a.quality.score)
      .slice(0, maxIndividualExamples);
    
    prioritizedExamples.push(...topIndividualExamples);
    
    // 🚀 FINAL BOOST: Give journey examples a small quality score boost for final sorting
    return prioritizedExamples.map(example => {
      if (journeyExamples.includes(example)) {
        return {
          ...example,
          quality: {
            ...example.quality,
            score: Math.min(example.quality.score + 0.1, 1.0), // Small boost for journey examples
            factors: {
              ...example.quality.factors,
              journeyPrioritized: true
            }
          }
        };
      }
      return example;
    }).sort((a, b) => b.quality.score - a.quality.score); // Sort by quality (journeys will be higher)
  }

  /**
   * Create task-driven examples (copied from openai-integration-clean.ts)
   */
  createTaskDrivenExamples(interactions: EnhancedInteractionData[], taskContext?: any): TrainingExample[] {
    const examples: TrainingExample[] = [];
    
    // Analyze task completion patterns
    const taskPatterns = this.analyzeTaskPatterns(interactions, taskContext);
    
    for (const pattern of taskPatterns) {
      examples.push({
        prompt: `TASK: ${pattern.task} on ${pattern.hostname}`,
        completion: pattern.solution,
        context: {
          pageType: pattern.pageType,
          userJourney: 'task-completion',
          businessContext: pattern.task
        },
        quality: this.calculateComprehensiveQuality(interactions[0] || {})
      });
    }

    return examples;
  }

  // 🔧 HELPER METHODS (per FOCUSED_TASKS.md - keep embedded)

  private buildSpatialContext(nearbyElements: any[], boundingBox?: any): string {
    if (nearbyElements.length === 0) return '';
    
    return nearbyElements.slice(0, 3).map(el => 
      `${el.relationship || 'near'} "${el.text}" (${el.distance || 'close'})`
    ).join(', ');
  }

  private buildDOMHierarchy(ancestors: any[]): string {
    if (ancestors.length === 0) return '';
    
    return ancestors.slice(-3).map(a => 
      `${a.tag}${a.classes?.length ? `.${a.classes[0]}` : ''}`
    ).join(' > ');
  }

  private buildStateContext(stateBefore: any): string {
    const parts = [];
    if (stateBefore.focused) parts.push(`focus on ${stateBefore.focused}`);
    if (stateBefore.scrollPosition) parts.push(`scroll at (${stateBefore.scrollPosition.x},${stateBefore.scrollPosition.y})`);
    if (stateBefore.formData) parts.push(`form data present`);
    return parts.join(', ');
  }

  private analyzeBusinessContext(hostname: string, pageType: string, userJourney: string): BusinessContext {
    const context: BusinessContext = {};
    
    // Business sector detection
    if (hostname.includes('nordstrom') || hostname.includes('shop')) {
      context.sector = 'e-commerce';
      context.userIntent = pageType === 'product' ? 'product-research' : 'shopping';
      context.conversionStage = userJourney === 'checkout' ? 'conversion' : 'discovery';
    }
    
    return context;
  }

  private calculateQuality(factors: {
    hasReliableSelector: boolean;
    hasSpatialContext: boolean;
    hasBusinessContext: boolean; 
    hasVisualContext: boolean;
  }) {
    let score = 0;
    if (factors.hasReliableSelector) score += 0.4;
    if (factors.hasSpatialContext) score += 0.2;
    if (factors.hasBusinessContext) score += 0.2;
    if (factors.hasVisualContext) score += 0.2;

    return {
      score,
      factors
    };
  }

  // 🔧 COMPREHENSIVE CONTEXT EXTRACTION METHODS

  private extractVisualContext(visual: any): any {
    const context: any = {};
    
    if (visual?.boundingBox) {
      context.positioning = `(${visual.boundingBox.x},${visual.boundingBox.y}) ${visual.boundingBox.width}×${visual.boundingBox.height}`;
    }
    
    if (visual?.colors) {
      context.colors = `bg:${visual.colors.background || 'auto'} txt:${visual.colors.text || 'auto'} border:${visual.colors.border || 'auto'}`;
    }
    
    if (visual?.typography) {
      context.typography = `${visual.typography.fontSize || '16px'} ${visual.typography.fontFamily || 'default'} ${visual.typography.fontWeight || 'normal'}`;
    }
    
    if (visual?.layout) {
      context.layout = `${visual.layout.display || 'block'} ${visual.layout.position || 'static'}`;
    }
    
    if (visual?.animations) {
      context.animations = visual.animations.hasAnimations ? 
        `${visual.animations.animationType} ${visual.animations.duration}ms` : 'static';
    }
    
    context.deviceType = visual?.deviceType || 'desktop';
    
    return context;
  }

  private extractElementContext(element: any): any {
    const context: any = {};
    
    context.tag = element?.tag || 'unknown';
    
    if (element?.attributes) {
      const keyAttrs = Object.entries(element.attributes)
        .slice(0, 3)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      context.attributes = keyAttrs;
    }
    
    if (element?.computedStyles) {
      const keyStyles = Object.entries(element.computedStyles)
        .slice(0, 3)
        .map(([k, v]) => `${k}:${v}`)
        .join('; ');
      context.computedStyles = keyStyles;
    }
    
    if (element?.ariaAttributes) {
      const ariaData = Object.entries(element.ariaAttributes)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ');
      context.ariaContext = ariaData;
    }
    
    if (element?.formContext) {
      context.formContext = `${element.formContext.formName || 'form'}.${element.formContext.fieldName || 'field'} (${element.formContext.fieldType || 'text'})${element.formContext.required ? ' *required' : ''}`;
    }
    
    // Build DOM hierarchy from ancestors
    if (element?.ancestors) {
      context.domHierarchy = element.ancestors.slice(-3).map((a: any) => 
        `${a.tag}${a.classes?.length ? `.${a.classes[0]}` : ''}`
      ).join(' > ');
    }
    
    return context;
  }

  private extractPageContext(contextData: any): any {
    const context: any = {};
    
    if (contextData?.performance) {
      context.performance = `load:${contextData.performance.loadTime || 'unknown'}ms fcp:${contextData.performance.firstContentfulPaint || 'unknown'}ms`;
    }
    
    if (contextData?.seo) {
      context.seo = `h1:${contextData.seo.h1Tags?.length || 0} canonical:${contextData.seo.canonicalUrl ? 'yes' : 'no'}`;
    }
    
    if (contextData?.accessibility) {
      context.accessibility = `${contextData.accessibility.wcagLevel || 'unknown'} landmarks:${contextData.accessibility.ariaLandmarks?.length || 0}`;
    }
    
    if (contextData?.meta) {
      context.meta = `desc:"${contextData.meta.description?.slice(0, 50) || 'none'}" keywords:${contextData.meta.keywords?.length || 0}`;
    }
    
    if (contextData?.analytics) {
      context.analytics = `gtm:${contextData.analytics.gtmEvents?.length || 0} custom:${Object.keys(contextData.analytics.customEvents || {}).length}`;
    }
    
    return context;
  }

  private extractStateContext(state: any): any {
    const context: any = {};
    
    if (state?.before) {
      const beforeParts = [];
      if (state.before.focused) beforeParts.push(`focus:${state.before.focused}`);
      if (state.before.scrollPosition) beforeParts.push(`scroll:(${state.before.scrollPosition.x},${state.before.scrollPosition.y})`);
      if (state.before.activeModal) beforeParts.push(`modal:${state.before.activeModal}`);
      if (state.before.formData) beforeParts.push(`form:${Object.keys(state.before.formData).length}fields`);
      context.before = beforeParts.join(' ');
    }
    
    if (state?.after) {
      const afterParts = [];
      if (state.after.focused) afterParts.push(`focus:${state.after.focused}`);
      if (state.after.scrollPosition) afterParts.push(`scroll:(${state.after.scrollPosition.x},${state.after.scrollPosition.y})`);
      if (state.after.activeModal) afterParts.push(`modal:${state.after.activeModal}`);
      context.after = afterParts.join(' ');
    }
    
    if (state?.changes) {
      const changeParts = [];
      if (state.changes.urlChanged) changeParts.push('url-change');
      if (state.changes.domMutations?.length) changeParts.push(`dom:${state.changes.domMutations.length}mutations`);
      if (state.changes.networkRequests?.length) changeParts.push(`network:${state.changes.networkRequests.length}requests`);
      context.changes = changeParts.join(' ');
    }
    
    return context;
  }

  private extractBusinessContext(business: any, hostname: string): any {
    const context: any = {};
    
    if (business?.ecommerce) {
      context.ecommerce = `${business.ecommerce.productName || 'product'} $${business.ecommerce.productPrice || 0} ${business.ecommerce.productCategory || 'category'}`;
    }
    
    if (business?.conversion) {
      context.conversion = `${business.conversion.funnelStage || 'unknown'} step-${business.conversion.funnelPosition || 0} ${business.conversion.abTestVariant || 'control'}`;
    }
    
    if (business?.user) {
      context.user = `segment:${business.user.customerSegment || 'unknown'} session:${business.user.timeOnSite || 0}s interactions:${business.user.previousInteractions || 0}`;
    }
    
    // Fallback business context detection from hostname
    if (!business && hostname) {
      if (hostname.includes('nordstrom') || hostname.includes('shop')) {
        context.ecommerce = 'e-commerce site';
        context.conversion = 'retail funnel';
      }
    }
    
    return context;
  }

  private extractTechnicalContext(interaction: any): any {
    const context: any = {};
    
    if (interaction?.interaction?.timing) {
      context.timing = `${interaction.interaction.timing.duration || 0}ms delay:${interaction.interaction.timing.delay || 0}ms`;
    }
    
    if (interaction?.selectors) {
      const selectorCount = [
        interaction.selectors.xpath,
        interaction.selectors.cssPath,
        interaction.selectors.primary,
        ...(interaction.selectors.alternatives || [])
      ].filter(Boolean).length;
      context.selectors = `${selectorCount}selectors reliability:${Object.keys(interaction.selectors.reliability || {}).length}scores`;
    }
    
    if (interaction?.state?.changes?.networkRequests) {
      const requests = interaction.state.changes.networkRequests;
      const avgDuration = requests.length > 0 ? 
        requests.reduce((sum: number, req: any) => sum + (req.duration || 0), 0) / requests.length : 0;
      context.network = `${requests.length}requests ${avgDuration.toFixed(0)}ms avg`;
    }
    
    if (interaction?.state?.before?.errorStates || interaction?.state?.after?.errorStates) {
      const errorCount = Object.keys({
        ...(interaction.state.before?.errorStates || {}),
        ...(interaction.state.after?.errorStates || {})
      }).length;
      context.errors = errorCount > 0 ? `${errorCount}errors` : 'no-errors';
    }
    
    return context;
  }

  private calculateComprehensiveQuality(interaction: EnhancedInteractionData): any {
    const factors = {
      // Core factors
      hasReliableSelector: (interaction.selectors?.reliability && Object.keys(interaction.selectors.reliability).length > 0) || false,
      hasSpatialContext: (interaction.element?.nearbyElements?.length || 0) > 0,
      hasBusinessContext: !!interaction.business,
      hasVisualContext: !!interaction.visual?.boundingBox,
      
      // Comprehensive factors
      hasAccessibilityContext: !!interaction.context?.accessibility,
      hasPerformanceContext: !!interaction.context?.performance,
      hasStateContext: !!(interaction.state?.before || interaction.state?.after),
      hasFormContext: !!interaction.element?.formContext,
      hasSEOContext: !!interaction.context?.seo,
      hasAnalyticsContext: !!interaction.context?.analytics,
      hasTimingContext: !!interaction.interaction?.timing,
      hasNetworkContext: !!(interaction.state?.changes?.networkRequests?.length),
      hasErrorContext: !!(interaction.state?.before?.errorStates || interaction.state?.after?.errorStates),
      hasUserContext: !!interaction.business?.user,

      // 🆕 NEW ENHANCED DATA QUALITY FACTORS
      hasCompleteNearbyElements: !!(interaction.element?.nearbyElements?.length && interaction.element.nearbyElements.length > 3),
      hasDesignSystemContext: !!interaction.visual?.designSystem,
      hasBehaviorPatternsContext: !!interaction.business?.user?.behaviorPatterns
    };

    // Calculate weighted score with ALL comprehensive factors
    let score = 0;
    if (factors.hasReliableSelector) score += 0.15;      // Reduced to make room for new factors
    if (factors.hasSpatialContext) score += 0.08;       // Reduced slightly
    if (factors.hasBusinessContext) score += 0.08;      // Reduced slightly  
    if (factors.hasVisualContext) score += 0.08;        // Reduced slightly
    if (factors.hasAccessibilityContext) score += 0.08;
    if (factors.hasPerformanceContext) score += 0.08;
    if (factors.hasStateContext) score += 0.05;
    if (factors.hasFormContext) score += 0.05;
    if (factors.hasSEOContext) score += 0.05;
    if (factors.hasAnalyticsContext) score += 0.05;
    if (factors.hasTimingContext) score += 0.025;
    if (factors.hasNetworkContext) score += 0.025;
    if (factors.hasErrorContext) score += 0.025;
    if (factors.hasUserContext) score += 0.025;
    
    // 🆕 NEW ENHANCED DATA SCORING (high value!)
    if (factors.hasCompleteNearbyElements) score += 0.15;  // High value - complete spatial context
    if (factors.hasDesignSystemContext) score += 0.12;     // High value - UI pattern recognition  
    if (factors.hasBehaviorPatternsContext) score += 0.08; // Good value - interaction patterns

    return {
      score,
      factors
    };
  }

  private calculateDataCompletion(interaction: EnhancedInteractionData): number {
    let totalFields = 0;
    let populatedFields = 0;

    // Count all possible fields and populated ones
    const checkObject = (obj: any, path = '') => {
      if (!obj) return;
      
      Object.keys(obj).forEach(key => {
        totalFields++;
        if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
          populatedFields++;
        }
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          checkObject(obj[key], `${path}.${key}`);
        }
      });
    };

    checkObject(interaction);
    return totalFields > 0 ? (populatedFields / totalFields) * 100 : 0;
  }

  private getEnhancementFlags(interaction: EnhancedInteractionData): string[] {
    const flags = [];
    
    if (interaction.selectors?.reliability) flags.push('reliability-scores');
    if (interaction.visual?.boundingBox) flags.push('visual-positioning');
    if (interaction.element?.nearbyElements?.length) flags.push('spatial-context');
    if (interaction.context?.accessibility) flags.push('accessibility-data');
    if (interaction.context?.performance) flags.push('performance-data');
    if (interaction.business) flags.push('business-intelligence');
    if (interaction.state?.changes) flags.push('state-tracking');
    if (interaction.element?.formContext) flags.push('form-context');
    if (interaction.context?.analytics) flags.push('analytics-data');
    if (interaction.interaction?.timing) flags.push('timing-data');
    
    // 🆕 NEW ENHANCED DATA FLAGS
    if (interaction.element?.nearbyElements && interaction.element.nearbyElements.length > 3) flags.push('complete-nearby-elements');
    if (interaction.visual?.designSystem) flags.push('design-system-context');
    if (interaction.business?.user?.behaviorPatterns) flags.push('behavior-patterns');
    
    return flags;
  }

  // 🆕 NEW ENHANCED DATA EXTRACTION METHODS

  private extractCompleteNearbyElements(nearbyElements: any[]): any {
    const context: any = {
      spatialSummary: '',
      relationships: '',
      interactionTargets: '',
      elementTypes: '',
      accessibility: ''
    };

    if (!nearbyElements || nearbyElements.length === 0) {
      return { spatialSummary: 'no-nearby', relationships: 'isolated', interactionTargets: 'none' };
    }

    // Use ALL nearby elements instead of just first 3
    const allElements = nearbyElements.slice(0, 10); // Cap at 10 for performance

    // Spatial summary with complete positioning
    const spatialItems = allElements.map(el => 
      `${el.elementType || 'element'}:${el.text?.slice(0, 15) || 'empty'} (${el.relationship}, ${el.distance || 0}px)`
    );
    context.spatialSummary = spatialItems.join(', ');

    // Relationship mapping
    const relationships: Record<string, number> = {};
    allElements.forEach(el => {
      relationships[el.relationship] = (relationships[el.relationship] || 0) + 1;
    });
    context.relationships = Object.entries(relationships)
      .map(([rel, count]) => `${rel}:${count}`)
      .join(' ');

    // Interaction targets (clickable/focusable nearby elements)
    const interactionTargets = allElements
      .filter(el => el.isClickable || el.elementType === 'button' || el.elementType === 'link' || el.elementType === 'input')
      .map(el => `${el.elementType}:"${el.text?.slice(0, 10) || 'btn'}"`)
      .slice(0, 5);
    context.interactionTargets = interactionTargets.join(' ');

    // Element types distribution
    const elementTypes: Record<string, number> = {};
    allElements.forEach(el => {
      const type = el.elementType || 'unknown';
      elementTypes[type] = (elementTypes[type] || 0) + 1;
    });
    context.elementTypes = Object.entries(elementTypes)
      .map(([type, count]) => `${type}:${count}`)
      .join(' ');

    // Accessibility context
    const accessibleElements = allElements.filter(el => el.ariaRole || el.attributes?.['aria-label']);
    context.accessibility = accessibleElements.length > 0 ? 
      `${accessibleElements.length}accessible roles:${accessibleElements.map(el => el.ariaRole).filter(Boolean).join(',')}` : 
      'no-aria';

    return context;
  }

  private extractDesignSystemContext(designSystem: any): any {
    const context: any = {
      summary: '',
      componentLibrary: '',
      brandColors: '',
      designPatterns: '',
      framework: ''
    };

    if (!designSystem) {
      return { 
        summary: 'no-design-system', 
        componentLibrary: 'unknown', 
        brandColors: 'default', 
        designPatterns: 'basic' 
      };
    }

    // Component library detection
    context.componentLibrary = designSystem.componentLibrary || 
      designSystem.uiFramework || 'custom';

    // Brand colors summary
    if (designSystem.brandColors) {
      const colors = [];
      if (designSystem.brandColors.primary) colors.push(`primary:${designSystem.brandColors.primary}`);
      if (designSystem.brandColors.secondary) colors.push(`secondary:${designSystem.brandColors.secondary}`);
      if (designSystem.brandColors.accent) colors.push(`accent:${designSystem.brandColors.accent}`);
      context.brandColors = colors.length > 0 ? colors.join(' ') : 'default-colors';
    } else {
      context.brandColors = 'default-colors';
    }

    // Design patterns
    context.designPatterns = designSystem.designPatterns?.slice(0, 3).join(' ') || 'basic-patterns';

    // Framework summary
    const frameworks = [];
    if (designSystem.uiFramework) frameworks.push(designSystem.uiFramework);
    if (designSystem.cssFramework) frameworks.push(designSystem.cssFramework);
    context.framework = frameworks.join('+') || 'vanilla';

    // Overall summary
    context.summary = `${context.componentLibrary} ${context.framework} ${context.designPatterns}`;

    return context;
  }

  private extractBehaviorPatternsContext(user: any): any {
    const context: any = {
      patterns: '',
      devicePreference: '',
      interactionPatterns: '',
      navigationStyle: ''
    };

    if (!user || !user.behaviorPatterns) {
      return { 
        patterns: 'standard-user', 
        devicePreference: 'desktop', 
        interactionPatterns: 'standard',
        navigationStyle: 'standard'
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
    
    context.patterns = patterns.join(' ') || 'standard-behavior';

    return context;
  }

  /**
   * 🛤️ JOURNEY-BASED GROUPING: Detect complete user journeys by funnel stages
   * Groups interactions into logical user journey sequences from discovery to conversion
   */
  private groupInteractionsBySequence(interactions: EnhancedInteractionData[]): EnhancedInteractionData[][] {
    if (interactions.length === 0) return [];
    
    // Sort interactions by timestamp to maintain chronological order
    const sortedInteractions = [...interactions].sort((a, b) => {
      const timeA = a.interaction?.timestamp || 0;
      const timeB = b.interaction?.timestamp || 0;
      return timeA - timeB;
    });

    const journeys: EnhancedInteractionData[][] = [];
    
    // 🎯 JOURNEY DETECTION STRATEGY:
    // 1. Group by funnel stages: discovery → consideration → validation → conversion
    // 2. Look for natural breaks (page changes, long time gaps)
    // 3. Identify complete journeys with conversion events
    
    let currentJourney: EnhancedInteractionData[] = [];
    let lastFunnelStage = '';
    let lastPageUrl = '';
    let lastTimestamp = 0;
    
    for (const interaction of sortedInteractions) {
      const funnelStage = interaction.business?.conversion?.funnelStage || 'unknown';
      const pageUrl = interaction.context?.pageUrl || '';
      const timestamp = interaction.interaction?.timestamp || 0;
      const timeDiff = timestamp - lastTimestamp;
      
      // 🔄 JOURNEY BREAK DETECTION:
      // Start new journey if:
      // 1. First interaction
      // 2. Large time gap (>5 minutes = new session)
      // 3. Going backwards in funnel (user started over)
      // 4. Conversion completed (journey finished)
      
      const shouldStartNewJourney = 
        currentJourney.length === 0 || // First interaction
        timeDiff > 300000 || // >5 minutes gap
        this.isFunnelRegression(lastFunnelStage, funnelStage) || // User went backwards
        this.isJourneyComplete(currentJourney); // Previous journey completed
      
      if (shouldStartNewJourney && currentJourney.length > 0) {
        // Save completed journey if it has meaningful content
        if (this.isValidJourney(currentJourney)) {
          journeys.push([...currentJourney]);
        }
        currentJourney = [];
      }
      
      // Add interaction to current journey
      currentJourney.push(interaction);
      lastFunnelStage = funnelStage;
      lastPageUrl = pageUrl;
      lastTimestamp = timestamp;
    }
    
    // Add final journey if valid
    if (currentJourney.length > 0 && this.isValidJourney(currentJourney)) {
      journeys.push(currentJourney);
    }
    
    // 🎯 JOURNEY ENHANCEMENT: Add journey metadata
    return journeys.map(journey => this.enhanceJourneyWithMetadata(journey));
  }

  /**
   * 🔍 FUNNEL STAGE ANALYSIS: Detect if user went backwards in the funnel
   */
  private isFunnelRegression(lastStage: string, currentStage: string): boolean {
    const funnelOrder = ['discovery', 'awareness', 'consideration', 'evaluation', 'validation', 'conversion', 'retention'];
    const lastIndex = funnelOrder.indexOf(lastStage);
    const currentIndex = funnelOrder.indexOf(currentStage);
    
    // Consider it regression if user went back 2+ stages (normal to bounce between adjacent stages)
    return lastIndex !== -1 && currentIndex !== -1 && (lastIndex - currentIndex) >= 2;
  }

  /**
   * ✅ JOURNEY COMPLETION DETECTION: Check if journey reached realistic conversion endpoint
   * Updated to reflect real user behavior - stops at payment/checkout pages, not actual transactions
   */
  private isJourneyComplete(journey: EnhancedInteractionData[]): boolean {
    if (journey.length === 0) return false;
    
    const lastInteraction = journey[journey.length - 1];
    const funnelStage = lastInteraction.business?.conversion?.funnelStage;
    const conversionGoal = lastInteraction.business?.conversion?.conversionGoal;
    const pageType = lastInteraction.context?.pageType;
    const pageUrl = lastInteraction.context?.pageUrl?.toLowerCase() || '';
    const elementText = lastInteraction.element?.text?.toLowerCase() || '';
    
    // 🎯 REALISTIC CONVERSION ENDPOINTS (not actual payment completion):
    
    // 1. Explicit conversion goals that indicate intent completion
    const intentCompleteGoals = [
      'add-to-cart',
      'reach-checkout', 
      'view-payment-form',
      'booking-form-complete',
      'signup-form-complete',
      'subscription-selected',
      'checkout-reached'
    ];
    
    if (intentCompleteGoals.includes(conversionGoal || '')) {
      return true;
    }
    
    // 2. Page-based conversion detection
    if (pageType === 'checkout' || pageType === 'payment' || pageType === 'billing') {
      return true;
    }
    
    // 3. URL-based conversion detection
    const conversionUrls = ['checkout', '/cart', '/payment', '/billing', '/book', '/signup', '/register'];
    if (conversionUrls.some(url => pageUrl.includes(url))) {
      return true;
    }
    
    // 4. Element-based conversion detection (user clicked conversion-intent elements)
    const conversionElements = [
      'add to cart',
      'checkout',
      'proceed to payment',
      'book now',
      'reserve',
      'sign up',
      'get started',
      'subscribe',
      'buy now'
    ];
    if (conversionElements.some(element => elementText.includes(element))) {
      return true;
    }
    
    // 5. Traditional funnel stage completion
    return funnelStage === 'conversion' || funnelStage === 'retention';
  }

  /**
   * 📊 JOURNEY VALIDATION: Check if journey is worth training on
   */
  private isValidJourney(journey: EnhancedInteractionData[]): boolean {
    if (journey.length < 2) return false; // Need at least 2 interactions
    
    // Check for meaningful progression
    const funnelStages = journey.map(i => i.business?.conversion?.funnelStage).filter(Boolean);
    const uniqueStages = new Set(funnelStages);
    
    // Valid if: has multiple stages OR single stage with meaningful interactions
    return uniqueStages.size >= 2 || journey.length >= 3;
  }

  /**
   * 🎯 JOURNEY ENHANCEMENT: Add journey-specific metadata
   */
  private enhanceJourneyWithMetadata(journey: EnhancedInteractionData[]): EnhancedInteractionData[] {
    const journeyType = this.detectJourneyType(journey);
    const journeyGoal = this.extractJourneyGoal(journey);
    const userIntent = this.extractUserIntent(journey);
    
    // Add journey metadata to each interaction
    return journey.map((interaction, index) => ({
      ...interaction,
      journeyMetadata: {
        journeyType,
        journeyGoal,
        userIntent,
        stepNumber: index + 1,
        totalSteps: journey.length,
        isJourneyStart: index === 0,
        isJourneyEnd: index === journey.length - 1,
        journeyProgress: ((index + 1) / journey.length * 100).toFixed(0) + '%'
      }
    }));
  }

  /**
   * 🏷️ ENHANCED JOURNEY TYPE DETECTION: Identify comprehensive journey patterns with templates
   */
  private detectJourneyType(journey: EnhancedInteractionData[]): string {
    const pages: string[] = journey.map(i => i.context?.pageType).filter((p): p is string => Boolean(p));
    const goals: string[] = journey.map(i => i.business?.conversion?.conversionGoal).filter((g): g is string => Boolean(g));
    const products: string[] = journey.map(i => i.business?.ecommerce?.productCategory).filter((p): p is string => Boolean(p));
    const urls: string[] = journey.map(i => i.context?.pageUrl?.toLowerCase()).filter((u): u is string => Boolean(u));
    const elements: string[] = journey.map(i => i.element?.text?.toLowerCase()).filter((e): e is string => Boolean(e));
    const stages: string[] = journey.map(i => i.business?.conversion?.funnelStage).filter((s): s is string => Boolean(s));
    
    // 🛒 E-COMMERCE JOURNEY TEMPLATES
    if (this.matchesEcommercePattern(pages, goals, products, elements, urls)) {
      // Detect specific e-commerce sub-patterns
      if (stages.includes('validation') && elements.some(el => el.includes('review'))) {
        return 'ecommerce-research-purchase'; // Research-heavy purchase
      }
      if (goals.some(g => ['add-to-cart', 'reach-checkout'].includes(g))) {
        return 'ecommerce-direct-purchase'; // Direct purchase intent
      }
      if (pages.includes('search-results') && pages.includes('category')) {
        return 'ecommerce-browse-purchase'; // Browsing-based purchase
      }
      return 'ecommerce-purchase';
    }
    
    // 💼 SAAS/SOFTWARE JOURNEY TEMPLATES  
    if (this.matchesSaaSPattern(pages, goals, elements, urls)) {
      // Detect specific SaaS sub-patterns
      if (pages.includes('pricing') && elements.some(el => el.includes('trial'))) {
        return 'saas-trial-signup'; // Free trial signup
      }
      if (elements.some(el => el.includes('demo') || el.includes('schedule'))) {
        return 'saas-demo-request'; // Demo request
      }
      if (goals.some(g => ['subscription', 'subscription-selected'].includes(g))) {
        return 'saas-paid-signup'; // Paid subscription
      }
      return 'saas-signup';
    }
    
    // 📅 BOOKING/RESERVATION JOURNEY TEMPLATES
    if (this.matchesBookingPattern(pages, goals, elements, urls)) {
      // Detect specific booking sub-patterns
      if (elements.some(el => el.includes('date') || el.includes('time'))) {
        return 'booking-datetime-selection'; // Date/time selection flow
      }
      if (elements.some(el => el.includes('room') || el.includes('table'))) {
        return 'booking-venue-reservation'; // Venue booking
      }
      if (elements.some(el => el.includes('appointment') || el.includes('consultation'))) {
        return 'booking-appointment'; // Appointment booking
      }
      return 'booking-flow';
    }
    
    // 🎓 LEAD GENERATION JOURNEY TEMPLATES
    if (this.matchesLeadGenPattern(pages, goals, elements, urls)) {
      if (elements.some(el => el.includes('download') || el.includes('whitepaper'))) {
        return 'leadgen-content-download'; // Content download
      }
      if (elements.some(el => el.includes('newsletter') || el.includes('subscribe'))) {
        return 'leadgen-newsletter-signup'; // Newsletter signup
      }
      if (elements.some(el => el.includes('quote') || el.includes('estimate'))) {
        return 'leadgen-quote-request'; // Quote request
      }
      return 'leadgen-contact';
    }
    
    // 🔍 RESEARCH/COMPARISON JOURNEY TEMPLATES
    if (this.matchesResearchPattern(pages, goals, elements, stages)) {
      if (stages.includes('validation') && elements.some(el => el.includes('compare'))) {
        return 'research-comparison'; // Comparison-focused research
      }
      if (elements.some(el => el.includes('spec') || el.includes('feature'))) {
        return 'research-specification'; // Specification research
      }
      return 'research-evaluation';
    }
    
    // 🏪 LOCAL BUSINESS JOURNEY TEMPLATES
    if (this.matchesLocalBusinessPattern(elements, urls)) {
      if (elements.some(el => el.includes('location') || el.includes('hours'))) {
        return 'local-business-info'; // Location/hours lookup
      }
      if (elements.some(el => el.includes('menu') || el.includes('service'))) {
        return 'local-business-services'; // Services/menu research
      }
      return 'local-business-research';
    }
    
    return 'general-task';
  }

  // 🛒 E-commerce Pattern Matching
  private matchesEcommercePattern(pages: string[], goals: string[], products: string[], elements: string[], urls: string[]): boolean {
    return goals.some(g => ['add-to-cart', 'purchase', 'reach-checkout'].includes(g)) ||
           products.length > 0 ||
           pages.some(p => ['product', 'cart', 'checkout'].includes(p)) ||
           urls.some(url => url.includes('shop') || url.includes('product') || url.includes('cart')) ||
           elements.some(el => el.includes('add to cart') || el.includes('buy') || el.includes('price'));
  }

  // 💼 SaaS Pattern Matching
  private matchesSaaSPattern(pages: string[], goals: string[], elements: string[], urls: string[]): boolean {
    return goals.some(g => ['signup', 'subscription', 'subscription-selected'].includes(g)) ||
           pages.some(p => ['pricing', 'signup', 'trial'].includes(p)) ||
           urls.some(url => url.includes('pricing') || url.includes('signup') || url.includes('trial')) ||
           elements.some(el => el.includes('sign up') || el.includes('subscribe') || el.includes('plan') || el.includes('trial'));
  }

  // 📅 Booking Pattern Matching
  private matchesBookingPattern(pages: string[], goals: string[], elements: string[], urls: string[]): boolean {
    return goals.some(g => ['booking', 'booking-form-complete'].includes(g)) ||
           pages.some(p => ['booking', 'reservation'].includes(p)) ||
           urls.some(url => url.includes('book') || url.includes('reserve') || url.includes('appointment')) ||
           elements.some(el => el.includes('book') || el.includes('reserve') || el.includes('schedule') || el.includes('appointment'));
  }

  // 🎓 Lead Generation Pattern Matching
  private matchesLeadGenPattern(pages: string[], goals: string[], elements: string[], urls: string[]): boolean {
    return goals.some(g => ['contact', 'lead-generation'].includes(g)) ||
           pages.some(p => ['contact', 'download'].includes(p)) ||
           urls.some(url => url.includes('contact') || url.includes('download') || url.includes('newsletter')) ||
           elements.some(el => el.includes('contact') || el.includes('download') || el.includes('newsletter') || el.includes('quote'));
  }

  // 🔍 Research Pattern Matching
  private matchesResearchPattern(pages: string[], goals: string[], elements: string[], stages: string[]): boolean {
    return stages.some(s => ['evaluation', 'validation'].includes(s)) ||
           pages.some(p => ['search-results', 'comparison', 'reviews'].includes(p)) ||
           elements.some(el => el.includes('compare') || el.includes('review') || el.includes('spec') || el.includes('feature'));
  }

  // 🏪 Local Business Pattern Matching
  private matchesLocalBusinessPattern(elements: string[], urls: string[]): boolean {
    return elements.some(el => el.includes('location') || el.includes('hours') || el.includes('address') || el.includes('phone')) ||
           urls.some(url => url.includes('location') || url.includes('contact') || url.includes('hours'));
  }

  /**
   * 🎯 JOURNEY GOAL EXTRACTION: Identify what user is trying to accomplish (realistic endpoints)
   */
  private extractJourneyGoal(journey: EnhancedInteractionData[]): string {
    const goals: string[] = journey.map(i => i.business?.conversion?.conversionGoal).filter((g): g is string => Boolean(g));
    const lastGoal = goals[goals.length - 1];
    
    // Use explicit conversion goal if available
    if (lastGoal) return lastGoal;
    
    // 🎯 REALISTIC GOAL INFERENCE based on journey patterns:
    
    const pages: string[] = journey.map(i => i.context?.pageType).filter((p): p is string => Boolean(p));
    const urls: string[] = journey.map(i => i.context?.pageUrl?.toLowerCase()).filter((u): u is string => Boolean(u));
    const elements: string[] = journey.map(i => i.element?.text?.toLowerCase()).filter((e): e is string => Boolean(e));
    
    // E-commerce goals (stop at cart/checkout, not payment)
    if (pages.some(p => ['product', 'search-results'].includes(p))) {
      if (urls.some(url => url.includes('cart') || url.includes('checkout'))) return 'reach-checkout';
      if (elements.some(el => el.includes('add to cart'))) return 'add-to-cart';
      return 'product-research-to-cart';
    }
    
    // Booking goals (stop at booking form, not payment)
    if (pages.includes('booking') || urls.some(url => url.includes('book'))) {
      return 'complete-booking-form';
    }
    
    // Signup goals (stop at registration, not subscription payment)
    if (pages.includes('signup') || urls.some(url => url.includes('signup') || url.includes('register'))) {
      return 'complete-registration';
    }
    
    // SaaS goals (stop at plan selection/checkout, not payment)
    if (pages.includes('pricing') || elements.some(el => el.includes('subscribe') || el.includes('plan'))) {
      return 'select-subscription-plan';
    }
    
    // General research to action intent
    if (pages.includes('search-results')) return 'research-to-action';
    
    return 'complete-user-intent';
  }

  /**
   * 🧠 USER INTENT EXTRACTION: Understand why user is taking this journey
   */
  private extractUserIntent(journey: EnhancedInteractionData[]): string {
    // Look for search queries, product categories, or explicit intent data
    for (const interaction of journey) {
      if (interaction.state?.before?.formData) {
        const searchQuery = interaction.state.before.formData['search'] || 
                           interaction.state.before.formData['query'] ||
                           interaction.state.before.formData['q'];
        if (searchQuery) return `searching for: ${searchQuery}`;
      }
      
      if (interaction.business?.ecommerce?.productName) {
        return `interested in: ${interaction.business.ecommerce.productName}`;
      }
    }
    
    // Fallback to journey type
    const journeyType = this.detectJourneyType(journey);
    switch (journeyType) {
      case 'ecommerce-purchase': return 'looking to buy product';
      case 'saas-signup': return 'evaluating software solution';
      case 'booking-flow': return 'making reservation/booking';
      case 'product-research': return 'researching products/options';
      default: return 'completing task';
    }
  }

  private analyzeTaskPatterns(interactions: EnhancedInteractionData[], taskContext?: any): any[] {
    // Analyze patterns in task completion
    return []; // Simplified for now  
  }

  private calculateMetadata(examples: TrainingExample[]): TrainingDataResult['metadata'] {
    const qualityDistribution = {
      high: examples.filter(ex => ex.quality.score >= 0.8).length,
      medium: examples.filter(ex => ex.quality.score >= 0.5 && ex.quality.score < 0.8).length,
      low: examples.filter(ex => ex.quality.score < 0.5).length
    };

    const contextTypes = {
      spatial: examples.filter(ex => ex.quality.factors.hasSpatialContext).length,
      visual: examples.filter(ex => ex.quality.factors.hasVisualContext).length,
      business: examples.filter(ex => ex.quality.factors.hasBusinessContext).length,
      dom: examples.filter(ex => ex.context?.pageType).length
    };

    return {
      totalExamples: examples.length,
      qualityDistribution,
      contextTypes
    };
  }
}

// Export singleton for dependency injection
export const trainingDataTransformer = (selectorStrategy: SelectorStrategyService) => 
  new TrainingDataTransformerImpl(selectorStrategy);