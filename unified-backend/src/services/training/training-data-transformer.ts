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
  generateTrainingData(sessionId: string, enhancedInteractions: any[], sessionData?: any): Promise<TrainingDataResult>;
  createFineTuningExamples(interaction: EnhancedInteractionData): TrainingExample[];
  createSequenceExamples(interactions: EnhancedInteractionData[]): TrainingExample[];
  createTaskDrivenExamples(interactions: EnhancedInteractionData[], taskContext?: any): TrainingExample[];
}

export class TrainingDataTransformerImpl implements TrainingDataTransformerService {
  private sessionData?: any; // Store session data for access in methods

  constructor(
    private selectorStrategy: SelectorStrategyService
  ) {}

  /**
   * Main orchestration method - extracted from openai-integration-clean.ts
   */
  async generateTrainingData(sessionId: string, enhancedInteractions: any[], sessionData?: any): Promise<TrainingDataResult> {
    const startTime = Date.now();
    console.log(`\n🚀 [TRAINING DATA] Starting generation for session ${sessionId}`);
    console.log(`📊 [TRAINING DATA] Input: ${enhancedInteractions.length} enhanced interactions`);
    
    // Store session data for use in user intent extraction
    this.sessionData = sessionData;
    
    const allExamples: TrainingExample[] = [];
    let selectorEnhancements = 0;
    let contextEnhancements = 0;

    // Process each interaction with enhanced context extraction
    console.log(`\n🔄 [INDIVIDUAL EXAMPLES] Processing ${enhancedInteractions.length} individual interactions...`);
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
        console.warn(`❌ [INDIVIDUAL EXAMPLES] Failed to process interaction:`, error);
      }
    }
    console.log(`✅ [INDIVIDUAL EXAMPLES] Generated ${allExamples.length} individual training examples`);

    // Create sequence and task-driven examples
    console.log(`\n🛤️ [JOURNEY EXAMPLES] Creating sequence examples...`);
    const sequenceExamples = this.createSequenceExamples(enhancedInteractions);
    console.log(`✅ [JOURNEY EXAMPLES] Generated ${sequenceExamples.length} sequence examples`);
    
    console.log(`🎯 [TASK EXAMPLES] Creating task-driven examples...`);
    const taskExamples = this.createTaskDrivenExamples(enhancedInteractions);
    console.log(`✅ [TASK EXAMPLES] Generated ${taskExamples.length} task examples`);
    
    allExamples.push(...sequenceExamples, ...taskExamples);
    console.log(`📈 [TOTAL EXAMPLES] Combined total: ${allExamples.length} training examples`);

    // 🎯 JOURNEY-PRIORITIZED QUALITY FILTERING
    console.log(`🔍 [QUALITY FILTER] Applying journey-prioritized quality filtering...`);
    const qualityExamples = this.filterAndPrioritizeByJourneyQuality(allExamples);
    console.log(`✅ [QUALITY FILTER] Final output: ${qualityExamples.length} high-quality examples`);

    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    console.log(`\n📊 [TRAINING DATA] Generation completed in ${processingTime}ms`);
    console.log(`📊 [TRAINING DATA] Selector enhancements: ${selectorEnhancements}`);
    console.log(`📊 [TRAINING DATA] Context enhancements: ${contextEnhancements}`);
    console.log(`📊 [TRAINING DATA] Success rate: ${(qualityExamples.length / enhancedInteractions.length * 100).toFixed(1)}% examples per interaction`);
    
    return {
      examples: qualityExamples,
      metadata: this.calculateMetadata(qualityExamples),
      processing: {
        startTime,
        endTime,
        duration: processingTime,
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
        completion: `${playwrightAction.action} // ${businessContext.ecommerce} | Design: ${designSystemContext.brandColors} ${designSystemContext.designPatterns} | Behavior: ${behaviorPatternsContext.devicePreference} ${behaviorPatternsContext.interactionPatterns} | Nearby: ${nearbyElementsContext.interactionTargets} | Rel: ${reliability.toFixed(2)} | ${technicalContext.timing} | Backups: ${backupSelectors.length} | NearbyOptions: ${nearbyElementsContext.allElementSelectors.slice(0, 5).map((el: any) => `${el.text}[${el.selector.slice(0, 15)}]`).join(',')}`,
        context: {
          pageType: interaction.context?.pageType,
          userJourney: interaction.context?.userJourney,
          reliability,
          businessContext: businessContext.conversion,
          visual: { ...visualContext, designSystem: designSystemContext.summary, componentLibrary: designSystemContext.componentLibrary, brandColors: designSystemContext.brandColors, designPatterns: designSystemContext.designPatterns },
          element: { 
            ...elementContext, 
            nearbyElementsComplete: nearbyElementsContext.spatialSummary, 
            spatialRelationships: nearbyElementsContext.relationships, 
            interactionContext: nearbyElementsContext.interactionTargets,
            allNearbySelectors: nearbyElementsContext.allElementSelectors,
            completeElementMap: nearbyElementsContext.completeElementMap
          },
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
          element: { 
            ...elementContext, 
            nearbyElementsComplete: nearbyElementsContext.spatialSummary, 
            spatialRelationships: nearbyElementsContext.relationships, 
            interactionContext: nearbyElementsContext.interactionTargets,
            allNearbySelectors: nearbyElementsContext.allElementSelectors,
            completeElementMap: nearbyElementsContext.completeElementMap
          },
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
    console.log(`\n🔍 [QUALITY FILTER] Starting quality filtering with ${allExamples.length} examples`);
    
    // Separate journey examples from individual interaction examples
    const journeyExamples = allExamples.filter(ex => 
      ex.context?.pageType === 'journey-sequence' ||
      ex.context?.pageType === 'funnel-progression' ||
      ex.context?.pageType === 'decision-validation' ||
      ex.quality?.factors?.multiStepJourney ||
      ex.quality?.factors?.funnelProgression
    );
    
    const individualExamples = allExamples.filter(ex => !journeyExamples.includes(ex));
    console.log(`📊 [QUALITY FILTER] Found ${journeyExamples.length} journey examples, ${individualExamples.length} individual examples`);
    
    // 🎯 JOURNEY EXAMPLES: Lower quality threshold (0.4) - prioritize complete flows
    const qualityJourneyExamples = journeyExamples.filter(ex => ex.quality.score >= 0.4);
    console.log(`✅ [QUALITY FILTER] ${qualityJourneyExamples.length} journey examples pass quality threshold (0.4)`);
    
    // 🔍 INDIVIDUAL EXAMPLES: Lower quality threshold (0.3) - include rich spatial context
    const qualityIndividualExamples = individualExamples.filter(ex => ex.quality.score >= 0.3);
    console.log(`✅ [QUALITY FILTER] ${qualityIndividualExamples.length} individual examples pass quality threshold (0.3)`);
    
    // 📊 PRIORITIZATION STRATEGY:
    // 1. Include ALL high-quality journey examples first
    // 2. Add individual examples only if we have space and they're high quality
    const prioritizedExamples = [...qualityJourneyExamples];
    console.log(`🎯 [QUALITY FILTER] Starting with ${prioritizedExamples.length} high-quality journey examples`);
    
    // Add individual examples up to a reasonable limit (don't overwhelm with individual actions)
    const maxIndividualExamples = Math.max(qualityJourneyExamples.length, 5);
    const topIndividualExamples = qualityIndividualExamples
      .sort((a, b) => b.quality.score - a.quality.score)
      .slice(0, maxIndividualExamples);
    
    prioritizedExamples.push(...topIndividualExamples);
    console.log(`➕ [QUALITY FILTER] Added ${topIndividualExamples.length} top individual examples (max: ${maxIndividualExamples})`);
    
    // 🚀 FINAL BOOST: Give journey examples a small quality score boost for final sorting
    console.log(`🚀 [QUALITY FILTER] Applying journey priority boost and final sorting...`);
    const finalExamples = prioritizedExamples.map(example => {
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
    
    console.log(`✅ [QUALITY FILTER] Final result: ${finalExamples.length} high-quality examples`);
    console.log(`📈 [QUALITY FILTER] Conversion rate: ${(finalExamples.length / allExamples.length * 100).toFixed(1)}% examples retained`);
    
    return finalExamples;
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
      accessibility: '',
      allElementSelectors: [],
      completeElementMap: {}
    };

    if (!nearbyElements || nearbyElements.length === 0) {
      return { spatialSummary: 'no-nearby', relationships: 'isolated', interactionTargets: 'none', allElementSelectors: [] };
    }

    // 🎯 ENHANCED: Use ALL nearby elements (up to 15) with complete selector info
    const allElements = nearbyElements.slice(0, 15); // Increased for richer context
    
    // 🚀 NEW: Extract complete element information including selectors
    const completeElementInfo = allElements.map(el => {
      return {
        text: el.text || el.tagName || 'element',
        tagName: el.tagName || 'unknown',
        selector: el.selector || `${el.tagName || 'element'}`,
        distance: el.distance || 0,
        direction: el.direction || el.relationship || 'unknown',
        isInteractive: el.isInteractive !== false, // Default to true if not specified
        isVisible: el.isVisible !== false, // Default to true if not specified
        boundingBox: el.boundingBox || null,
        attributes: el.attributes || {},
        elementType: el.elementType || el.tagName || 'element'
      };
    });
    
    // Store complete element map for rich context
    context.completeElementMap = completeElementInfo.reduce((map: Record<string, any>, el, index) => {
      map[`element_${index}`] = el;
      return map;
    }, {} as Record<string, any>);
    
    // Extract all selectors for training data (THIS IS THE KEY ENHANCEMENT!)
    context.allElementSelectors = completeElementInfo.map(el => ({
      text: el.text,
      selector: el.selector,
      tagName: el.tagName,
      distance: el.distance,
      direction: el.direction,
      interactive: el.isInteractive
    }));

    // Enhanced spatial summary with selectors and interaction capability
    const spatialItems = completeElementInfo.map(el => {
      const interactivity = el.isInteractive ? '✓' : '✗';
      const visibility = el.isVisible ? '👁' : '🚫';
      return `${el.tagName}:${el.text.slice(0, 12)} ${interactivity}${visibility} (${el.direction}, ${el.distance}px) [${el.selector.slice(0, 20)}]`;
    });
    context.spatialSummary = spatialItems.join(', ');

    // Relationship mapping using enhanced element info
    const relationships: Record<string, number> = {};
    completeElementInfo.forEach(el => {
      relationships[el.direction] = (relationships[el.direction] || 0) + 1;
    });
    context.relationships = Object.entries(relationships)
      .map(([rel, count]) => `${rel}:${count}`)
      .join(' ');

    // Enhanced interaction targets with selectors (KEY ENHANCEMENT!)
    const interactionTargets = completeElementInfo
      .filter(el => el.isInteractive || el.elementType === 'button' || el.elementType === 'link' || el.elementType === 'input')
      .map(el => `${el.elementType}:"${el.text?.slice(0, 10) || 'btn'}"[${el.selector.slice(0, 15)}]`)
      .slice(0, 8); // Increased to show more options
    context.interactionTargets = interactionTargets.join(' ');

    // Element types distribution using enhanced info
    const elementTypes: Record<string, number> = {};
    completeElementInfo.forEach(el => {
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
   * 🛤️ ENHANCED JOURNEY-BASED GROUPING: Detect complete user journeys with improved logic
   * Groups interactions into logical sequences optimized for training data density
   */
  private groupInteractionsBySequence(interactions: EnhancedInteractionData[]): EnhancedInteractionData[][] {
    console.log(`\n🔄 [JOURNEY GROUPING] Starting with ${interactions.length} interactions`);
    
    if (interactions.length === 0) {
      console.log(`⚠️ [JOURNEY GROUPING] No interactions to process`);
      return [];
    }
    
    // Sort interactions by timestamp to maintain chronological order
    const sortedInteractions = [...interactions].sort((a, b) => {
      const timeA = a.interaction?.timestamp || 0;
      const timeB = b.interaction?.timestamp || 0;
      return timeA - timeB;
    });
    console.log(`✅ [JOURNEY GROUPING] Sorted ${sortedInteractions.length} interactions chronologically`);

    const journeys: EnhancedInteractionData[][] = [];
    
    // 🎯 ENHANCED JOURNEY DETECTION STRATEGY:
    // 1. Group by logical task completion sequences (3-7 interactions)
    // 2. Detect page flow progressions and funnel stages
    // 3. Identify decision points and validation sequences
    // 4. Create training-optimized interaction bundles
    
    let currentJourney: EnhancedInteractionData[] = [];
    let lastFunnelStage = '';
    let lastPageType = '';
    let lastTimestamp = 0;
    let currentTaskContext = '';
    let journeyBreaks = 0;
    
    console.log(`🔍 [JOURNEY GROUPING] Processing interactions for journey detection...`);
    for (const interaction of sortedInteractions) {
      const funnelStage = interaction.business?.conversion?.funnelStage || 'unknown';
      const pageType = interaction.context?.pageType || '';
      const pageUrl = interaction.context?.pageUrl || '';
      const timestamp = interaction.interaction?.timestamp || 0;
      const timeDiff = timestamp - lastTimestamp;
      const taskContext = this.extractTaskContext(interaction);
      
      // 🔄 ENHANCED JOURNEY BREAK DETECTION:
      const shouldStartNewJourney = 
        currentJourney.length === 0 || // First interaction
        timeDiff > 300000 || // >5 minutes gap (session break)
        this.isFunnelRegression(lastFunnelStage, funnelStage) || // User went backwards
        this.isJourneyComplete(currentJourney) || // Previous journey completed
        this.isTaskContextChange(currentTaskContext, taskContext) || // Major task change
        this.isOptimalJourneyLength(currentJourney) || // Optimal training length reached
        this.isPageFlowBreak(lastPageType, pageType, pageUrl); // Logical page flow break
      
      if (shouldStartNewJourney && currentJourney.length > 0) {
        // Save completed journey if it has meaningful content
        if (this.isValidJourney(currentJourney)) {
          journeys.push([...currentJourney]);
          console.log(`🎯 [JOURNEY GROUPING] Journey ${journeys.length}: ${currentJourney.length} interactions (${this.detectJourneyType(currentJourney)})`);
        } else {
          console.log(`⚠️ [JOURNEY GROUPING] Skipped invalid journey with ${currentJourney.length} interactions`);
        }
        currentJourney = [];
        journeyBreaks++;
      }
      
      // Add interaction to current journey
      currentJourney.push(interaction);
      lastFunnelStage = funnelStage;
      lastPageType = pageType;
      lastTimestamp = timestamp;
      currentTaskContext = taskContext;
    }
    
    // Add final journey if valid
    if (currentJourney.length > 0 && this.isValidJourney(currentJourney)) {
      journeys.push(currentJourney);
      console.log(`🎯 [JOURNEY GROUPING] Final journey ${journeys.length}: ${currentJourney.length} interactions (${this.detectJourneyType(currentJourney)})`);
    }
    
    console.log(`📊 [JOURNEY GROUPING] Detected ${journeys.length} valid journeys with ${journeyBreaks} breaks`);
    
    // 🎯 POST-PROCESSING: Create additional training-optimized bundles
    console.log(`🔄 [BUNDLE OPTIMIZATION] Creating optimized training bundles...`);
    const optimizedJourneys = this.createOptimizedTrainingBundles(journeys, sortedInteractions);
    console.log(`✅ [BUNDLE OPTIMIZATION] Generated ${optimizedJourneys.length} optimized bundles`);
    
    // 🎯 JOURNEY ENHANCEMENT: Add journey metadata
    console.log(`🔄 [METADATA ENHANCEMENT] Adding comprehensive journey metadata...`);
    const enrichedJourneys = optimizedJourneys.map(journey => this.enhanceJourneyWithMetadata(journey));
    console.log(`✅ [METADATA ENHANCEMENT] Enhanced ${enrichedJourneys.length} journeys with metadata`);
    
    return enrichedJourneys;
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
   * 🎯 ENHANCED JOURNEY METADATA: Add comprehensive journey-specific metadata for training optimization
   */
  private enhanceJourneyWithMetadata(journey: EnhancedInteractionData[]): EnhancedInteractionData[] {
    const journeyType = this.detectJourneyType(journey);
    const journeyGoal = this.extractJourneyGoal(journey);
    const userIntent = this.extractUserIntent(journey);
    
    // Extract comprehensive journey analytics
    const journeyAnalytics = this.analyzeJourneyPattern(journey);
    const decisionPoints = this.identifyDecisionPoints(journey);
    const funnelProgression = this.analyzeFunnelProgression(journey);
    const conversionSignals = this.extractConversionSignals(journey);
    
    // Add enhanced journey metadata to each interaction
    return journey.map((interaction, index) => ({
      ...interaction,
      journeyMetadata: {
        // Basic journey information
        journeyType,
        journeyGoal,
        userIntent,
        stepNumber: index + 1,
        totalSteps: journey.length,
        isJourneyStart: index === 0,
        isJourneyEnd: index === journey.length - 1,
        journeyProgress: ((index + 1) / journey.length * 100).toFixed(0) + '%',
        
        // 🆕 ENHANCED JOURNEY ANALYTICS
        journeyQuality: journeyAnalytics.quality,
        journeyCompleteness: journeyAnalytics.completeness,
        journeyComplexity: journeyAnalytics.complexity,
        estimatedConversionProbability: journeyAnalytics.conversionProbability,
        
        // Decision point analysis
        isDecisionPoint: decisionPoints.includes(index),
        decisionContext: decisionPoints.includes(index) ? this.getDecisionContext(interaction, journey, index) : null,
        decisionFactors: decisionPoints.includes(index) ? this.extractDecisionFactors(journey.slice(0, index + 1)) : [],
        
        // Funnel progression tracking
        currentFunnelStage: interaction.business?.conversion?.funnelStage || 'unknown',
        funnelProgression: funnelProgression,
        stageTransition: index > 0 ? this.analyzeFunnelTransition(journey[index - 1], interaction) : null,
        
        // Conversion signals and intent
        conversionSignals: conversionSignals.filter(signal => signal.stepIndex <= index),
        hasStrongConversionIntent: conversionSignals.some(signal => signal.stepIndex === index && signal.strength === 'high'),
        
        // Journey context for training
        similarStepsInJourney: this.findSimilarSteps(interaction, journey, index),
        pageFlowContext: this.getPageFlowContext(journey, index),
        taskContextProgression: this.getTaskContextProgression(journey, index),
        
        // Training optimization metadata
        trainingValue: this.calculateStepTrainingValue(interaction, journey, index),
        contextRichness: this.calculateContextRichness(interaction),
        bundleRole: this.determineBundleRole(interaction, journey, index)
      }
    }));
  }

  /**
   * 🏷️ EXPANDED JOURNEY TYPE DETECTION: Identify comprehensive journey patterns with granular templates
   */
  private detectJourneyType(journey: EnhancedInteractionData[]): string {
    const pages: string[] = journey.map(i => i.context?.pageType).filter((p): p is string => Boolean(p));
    const goals: string[] = journey.map(i => i.business?.conversion?.conversionGoal).filter((g): g is string => Boolean(g));
    const products: string[] = journey.map(i => i.business?.ecommerce?.productCategory).filter((p): p is string => Boolean(p));
    const urls: string[] = journey.map(i => i.context?.pageUrl?.toLowerCase()).filter((u): u is string => Boolean(u));
    const elements: string[] = journey.map(i => i.element?.text?.toLowerCase()).filter((e): e is string => Boolean(e));
    const stages: string[] = journey.map(i => i.business?.conversion?.funnelStage).filter((s): s is string => Boolean(s));
    
    // 🛒 E-COMMERCE JOURNEY TEMPLATES (Enhanced with more granular patterns)
    if (this.matchesEcommercePattern(pages, goals, products, elements, urls)) {
      // High-intent purchase patterns
      if (elements.some(el => el.includes('buy now') || el.includes('purchase'))) {
        return 'ecommerce-high-intent-purchase';
      }
      // Research-heavy patterns
      if (stages.includes('validation') && elements.some(el => el.includes('review') || el.includes('compare'))) {
        return 'ecommerce-research-validation-purchase';
      }
      // Price comparison patterns
      if (elements.some(el => el.includes('price') && el.includes('compare'))) {
        return 'ecommerce-price-comparison-purchase';
      }
      // Cart abandonment and recovery patterns
      if (goals.includes('add-to-cart') && !goals.includes('reach-checkout')) {
        return 'ecommerce-add-to-cart-journey';
      }
      // Multi-product comparison patterns
      if (products.length > 1 || elements.some(el => el.includes('compare'))) {
        return 'ecommerce-multi-product-comparison';
      }
      // Quick checkout patterns
      if (goals.some(g => ['add-to-cart', 'reach-checkout'].includes(g)) && journey.length <= 4) {
        return 'ecommerce-quick-checkout';
      }
      // Browse and discovery patterns  
      if (pages.includes('search-results') && pages.includes('category')) {
        return 'ecommerce-browse-discovery-purchase';
      }
      return 'ecommerce-purchase';
    }
    
    // 💼 SAAS/SOFTWARE JOURNEY TEMPLATES (Enhanced with conversion paths)
    if (this.matchesSaaSPattern(pages, goals, elements, urls)) {
      // Free trial conversion patterns
      if (pages.includes('pricing') && elements.some(el => el.includes('trial') || el.includes('free'))) {
        return 'saas-freemium-trial-signup';
      }
      // Enterprise sales patterns
      if (elements.some(el => el.includes('enterprise') || el.includes('sales'))) {
        return 'saas-enterprise-sales-inquiry';
      }
      // Demo and consultation patterns
      if (elements.some(el => el.includes('demo') || el.includes('schedule'))) {
        return 'saas-demo-consultation-request';
      }
      // Feature evaluation patterns
      if (pages.includes('features') && stages.includes('evaluation')) {
        return 'saas-feature-evaluation';
      }
      // Pricing research patterns
      if (pages.includes('pricing') && stages.includes('consideration')) {
        return 'saas-pricing-research';
      }
      // Direct paid signup patterns
      if (goals.some(g => ['subscription', 'subscription-selected'].includes(g))) {
        return 'saas-direct-paid-signup';
      }
      return 'saas-signup';
    }
    
    // 📅 BOOKING/RESERVATION JOURNEY TEMPLATES (Enhanced with booking types)
    if (this.matchesBookingPattern(pages, goals, elements, urls)) {
      // Restaurant reservation patterns
      if (elements.some(el => el.includes('table') || el.includes('restaurant'))) {
        return 'booking-restaurant-reservation';
      }
      // Hotel/accommodation patterns
      if (elements.some(el => el.includes('room') || el.includes('hotel') || el.includes('stay'))) {
        return 'booking-accommodation-reservation';
      }
      // Event/ticket booking patterns
      if (elements.some(el => el.includes('ticket') || el.includes('event'))) {
        return 'booking-event-ticket-purchase';
      }
      // Service appointment patterns
      if (elements.some(el => el.includes('appointment') || el.includes('consultation'))) {
        return 'booking-service-appointment';
      }
      // Date/time selection patterns
      if (elements.some(el => el.includes('date') || el.includes('time') || el.includes('calendar'))) {
        return 'booking-datetime-selection';
      }
      return 'booking-flow';
    }
    
    // 🎓 LEAD GENERATION JOURNEY TEMPLATES (Enhanced with content types)
    if (this.matchesLeadGenPattern(pages, goals, elements, urls)) {
      // Content marketing patterns
      if (elements.some(el => el.includes('download') || el.includes('whitepaper') || el.includes('ebook'))) {
        return 'leadgen-content-marketing-download';
      }
      // Newsletter and email patterns
      if (elements.some(el => el.includes('newsletter') || el.includes('subscribe') || el.includes('updates'))) {
        return 'leadgen-email-subscription';
      }
      // Quote and estimate patterns
      if (elements.some(el => el.includes('quote') || el.includes('estimate') || el.includes('pricing'))) {
        return 'leadgen-quote-estimate-request';
      }
      // Webinar and event patterns
      if (elements.some(el => el.includes('webinar') || el.includes('register'))) {
        return 'leadgen-webinar-registration';
      }
      // Contact and inquiry patterns
      if (pages.includes('contact') || elements.some(el => el.includes('contact') || el.includes('inquiry'))) {
        return 'leadgen-contact-inquiry';
      }
      return 'leadgen-contact';
    }
    
    // 🔍 RESEARCH/COMPARISON JOURNEY TEMPLATES (Enhanced with research types)
    if (this.matchesResearchPattern(pages, goals, elements, stages)) {
      // Product comparison patterns
      if (stages.includes('validation') && elements.some(el => el.includes('compare') || el.includes('vs'))) {
        return 'research-product-comparison-analysis';
      }
      // Technical specification patterns
      if (elements.some(el => el.includes('spec') || el.includes('technical') || el.includes('feature'))) {
        return 'research-technical-specification';
      }
      // Review and rating patterns
      if (elements.some(el => el.includes('review') || el.includes('rating') || el.includes('feedback'))) {
        return 'research-review-validation';
      }
      // Market research patterns
      if (pages.includes('search-results') && stages.includes('discovery')) {
        return 'research-market-discovery';
      }
      return 'research-evaluation';
    }
    
    // 🏪 LOCAL BUSINESS JOURNEY TEMPLATES (Enhanced with business types)
    if (this.matchesLocalBusinessPattern(elements, urls)) {
      // Location and hours patterns
      if (elements.some(el => el.includes('location') || el.includes('hours') || el.includes('address'))) {
        return 'local-business-location-hours-lookup';
      }
      // Menu and services patterns
      if (elements.some(el => el.includes('menu') || el.includes('service') || el.includes('offerings'))) {
        return 'local-business-menu-services-research';
      }
      // Contact and directions patterns
      if (elements.some(el => el.includes('phone') || el.includes('directions') || el.includes('map'))) {
        return 'local-business-contact-directions';
      }
      return 'local-business-research';
    }
    
    // 🆕 NEW JOURNEY TEMPLATES (Additional common patterns)
    
    // 🏦 FINANCIAL SERVICES JOURNEY TEMPLATES
    if (this.matchesFinancialPattern(pages, elements, urls)) {
      if (elements.some(el => el.includes('loan') || el.includes('mortgage'))) {
        return 'financial-loan-application';
      }
      if (elements.some(el => el.includes('insurance') || el.includes('coverage'))) {
        return 'financial-insurance-quote';
      }
      if (elements.some(el => el.includes('account') || el.includes('open'))) {
        return 'financial-account-opening';
      }
      return 'financial-services-inquiry';
    }
    
    // 🎓 EDUCATION JOURNEY TEMPLATES
    if (this.matchesEducationPattern(pages, elements, urls)) {
      if (elements.some(el => el.includes('course') || el.includes('program'))) {
        return 'education-course-enrollment';
      }
      if (elements.some(el => el.includes('application') || el.includes('apply'))) {
        return 'education-program-application';
      }
      return 'education-research';
    }
    
    // 🏥 HEALTHCARE JOURNEY TEMPLATES
    if (this.matchesHealthcarePattern(pages, elements, urls)) {
      if (elements.some(el => el.includes('appointment') || el.includes('schedule'))) {
        return 'healthcare-appointment-booking';
      }
      if (elements.some(el => el.includes('provider') || el.includes('doctor'))) {
        return 'healthcare-provider-search';
      }
      return 'healthcare-information-lookup';
    }
    
    // 🏠 REAL ESTATE JOURNEY TEMPLATES
    if (this.matchesRealEstatePattern(pages, elements, urls)) {
      if (elements.some(el => el.includes('buy') || el.includes('purchase'))) {
        return 'realestate-home-buying-search';
      }
      if (elements.some(el => el.includes('rent') || el.includes('rental'))) {
        return 'realestate-rental-search';
      }
      return 'realestate-property-research';
    }
    
    // 🎮 ENTERTAINMENT/MEDIA JOURNEY TEMPLATES
    if (this.matchesEntertainmentPattern(pages, elements, urls)) {
      if (elements.some(el => el.includes('stream') || el.includes('watch'))) {
        return 'entertainment-content-streaming';
      }
      if (elements.some(el => el.includes('subscribe') || el.includes('membership'))) {
        return 'entertainment-subscription-signup';
      }
      return 'entertainment-content-discovery';
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

  // 🆕 NEW PATTERN MATCHING METHODS

  // 🏦 Financial Services Pattern Matching
  private matchesFinancialPattern(pages: string[], elements: string[], urls: string[]): boolean {
    return elements.some(el => 
      el.includes('loan') || el.includes('mortgage') || el.includes('insurance') || 
      el.includes('bank') || el.includes('account') || el.includes('credit') ||
      el.includes('investment') || el.includes('finance')
    ) || urls.some(url => 
      url.includes('bank') || url.includes('finance') || url.includes('loan') || 
      url.includes('insurance') || url.includes('invest')
    ) || pages.some(p => p === 'financial' || p === 'banking');
  }

  // 🎓 Education Pattern Matching
  private matchesEducationPattern(pages: string[], elements: string[], urls: string[]): boolean {
    return elements.some(el => 
      el.includes('course') || el.includes('program') || el.includes('degree') ||
      el.includes('university') || el.includes('college') || el.includes('school') ||
      el.includes('learn') || el.includes('education') || el.includes('study')
    ) || urls.some(url => 
      url.includes('edu') || url.includes('university') || url.includes('college') ||
      url.includes('course') || url.includes('learn')
    ) || pages.some(p => p === 'education' || p === 'course' || p === 'program');
  }

  // 🏥 Healthcare Pattern Matching
  private matchesHealthcarePattern(pages: string[], elements: string[], urls: string[]): boolean {
    return elements.some(el => 
      el.includes('doctor') || el.includes('appointment') || el.includes('hospital') ||
      el.includes('clinic') || el.includes('health') || el.includes('medical') ||
      el.includes('provider') || el.includes('patient')
    ) || urls.some(url => 
      url.includes('health') || url.includes('medical') || url.includes('doctor') ||
      url.includes('clinic') || url.includes('hospital')
    ) || pages.some(p => p === 'healthcare' || p === 'medical' || p === 'appointment');
  }

  // 🏠 Real Estate Pattern Matching
  private matchesRealEstatePattern(pages: string[], elements: string[], urls: string[]): boolean {
    return elements.some(el => 
      el.includes('home') || el.includes('house') || el.includes('property') ||
      el.includes('real estate') || el.includes('rent') || el.includes('buy') ||
      el.includes('mortgage') || el.includes('listing')
    ) || urls.some(url => 
      url.includes('realestate') || url.includes('zillow') || url.includes('realtor') ||
      url.includes('homes') || url.includes('property')
    ) || pages.some(p => p === 'realestate' || p === 'property' || p === 'listing');
  }

  // 🎮 Entertainment/Media Pattern Matching
  private matchesEntertainmentPattern(pages: string[], elements: string[], urls: string[]): boolean {
    return elements.some(el => 
      el.includes('watch') || el.includes('stream') || el.includes('movie') ||
      el.includes('show') || el.includes('video') || el.includes('music') ||
      el.includes('play') || el.includes('entertainment')
    ) || urls.some(url => 
      url.includes('netflix') || url.includes('youtube') || url.includes('spotify') ||
      url.includes('stream') || url.includes('media') || url.includes('entertainment')
    ) || pages.some(p => p === 'entertainment' || p === 'media' || p === 'streaming');
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
   * Priority: 1) Generated task 2) Inferred intent 3) Generic fallback
   */
  private extractUserIntent(journey: EnhancedInteractionData[]): string {
    // PRIORITY 1: Check for AI-generated task from session data
    if (this.sessionData?.config?.generatedTask) {
      const generatedTask = this.sessionData.config.generatedTask;
      // Use task description as user intent
      if (generatedTask.description) {
        console.log('🎯 [TRAINING DATA] Using generated task as user intent:', generatedTask.description);
        return generatedTask.description;
      }
      // Fallback to task title if no description
      if (generatedTask.title) {
        console.log('🎯 [TRAINING DATA] Using generated task title as user intent:', generatedTask.title);
        return generatedTask.title;
      }
    }
    
    // PRIORITY 2: Look for search queries, product categories, or explicit intent data
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
    
    // PRIORITY 3: Fallback to journey type
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

  // 🆕 ENHANCED JOURNEY GROUPING HELPER METHODS

  /**
   * 🎯 EXTRACT TASK CONTEXT: Identify the primary task context for an interaction
   */
  private extractTaskContext(interaction: EnhancedInteractionData): string {
    const pageType = interaction.context?.pageType || '';
    const funnelStage = interaction.business?.conversion?.funnelStage || '';
    const conversionGoal = interaction.business?.conversion?.conversionGoal || '';
    const elementText = interaction.element?.text?.toLowerCase() || '';
    const pageUrl = interaction.context?.pageUrl?.toLowerCase() || '';
    
    // Create a composite task context identifier
    const contextParts = [];
    
    // Primary context from conversion goal
    if (conversionGoal) {
      contextParts.push(conversionGoal);
    }
    
    // Secondary context from page type and funnel stage
    if (pageType && funnelStage) {
      contextParts.push(`${pageType}-${funnelStage}`);
    }
    
    // Tertiary context from URL patterns
    if (pageUrl.includes('search')) contextParts.push('search');
    if (pageUrl.includes('product')) contextParts.push('product');
    if (pageUrl.includes('cart')) contextParts.push('cart');
    if (pageUrl.includes('checkout')) contextParts.push('checkout');
    
    // Element-based context
    if (elementText.includes('add to cart')) contextParts.push('add-to-cart');
    if (elementText.includes('buy') || elementText.includes('purchase')) contextParts.push('purchase');
    if (elementText.includes('sign up') || elementText.includes('register')) contextParts.push('signup');
    
    return contextParts.length > 0 ? contextParts.join('|') : 'general';
  }

  /**
   * 🔄 DETECT TASK CONTEXT CHANGE: Determine if there's a major task change
   */
  private isTaskContextChange(lastContext: string, currentContext: string): boolean {
    if (!lastContext || !currentContext) return false;
    
    const lastParts = lastContext.split('|');
    const currentParts = currentContext.split('|');
    
    // Check if primary contexts are completely different
    const lastPrimary = lastParts[0];
    const currentPrimary = currentParts[0];
    
    // Major context changes that warrant new journey
    const majorContexts = ['add-to-cart', 'purchase', 'signup', 'checkout', 'search'];
    
    if (majorContexts.includes(lastPrimary) && majorContexts.includes(currentPrimary) && lastPrimary !== currentPrimary) {
      return true;
    }
    
    // Check for complete context mismatch (no common elements)
    const commonContexts = lastParts.filter(part => currentParts.includes(part));
    return commonContexts.length === 0 && lastParts.length > 1 && currentParts.length > 1;
  }

  /**
   * 📏 CHECK OPTIMAL JOURNEY LENGTH: Determine if journey has reached optimal training length
   */
  private isOptimalJourneyLength(journey: EnhancedInteractionData[]): boolean {
    const length = journey.length;
    
    // Optimal training length is 3-7 interactions
    // Start considering breaks at 5 interactions, force break at 8
    if (length >= 8) return true; // Force break - too long for optimal training
    
    if (length >= 5) {
      // Consider break if we have a complete sub-journey
      const hasConversionAction = journey.some(i => 
        i.business?.conversion?.conversionGoal === 'add-to-cart' ||
        i.business?.conversion?.conversionGoal === 'reach-checkout' ||
        i.element?.text?.toLowerCase().includes('add to cart') ||
        i.element?.text?.toLowerCase().includes('checkout')
      );
      
      // Break if we have a natural completion point
      return hasConversionAction;
    }
    
    return false; // Continue building journey
  }

  /**
   * 🌊 DETECT PAGE FLOW BREAK: Identify logical breaks in page navigation flow
   */
  private isPageFlowBreak(lastPageType: string, currentPageType: string, currentUrl: string): boolean {
    if (!lastPageType || !currentPageType) return false;
    
    // Define logical page flow sequences
    const logicalFlows = {
      'home': ['search', 'category', 'product'],
      'search': ['search-results', 'product', 'category'],
      'search-results': ['product', 'search', 'category'],
      'category': ['product', 'search', 'subcategory'],
      'product': ['cart', 'checkout', 'product', 'category'],
      'cart': ['checkout', 'product', 'payment'],
      'checkout': ['payment', 'confirmation'],
      'signup': ['confirmation', 'home', 'dashboard'],
      'pricing': ['signup', 'checkout', 'trial']
    };
    
    // Check if current page type is a logical next step
    const expectedNextPages = logicalFlows[lastPageType as keyof typeof logicalFlows];
    if (expectedNextPages && !expectedNextPages.includes(currentPageType)) {
      // Additional checks for special cases
      
      // Allow same page type transitions (browsing multiple products)
      if (lastPageType === currentPageType) return false;
      
      // Allow return to homepage/search from anywhere (common pattern)
      if (currentPageType === 'home' || currentPageType === 'search') return false;
      
      // Check URL for navigation hints
      const url = currentUrl.toLowerCase();
      if (url.includes('back') || url.includes('return')) return false;
      
      return true; // This is a page flow break
    }
    
    return false; // Normal page flow
  }

  /**
   * 🎯 CREATE OPTIMIZED TRAINING BUNDLES: Generate additional training-focused interaction groups
   */
  private createOptimizedTrainingBundles(journeys: EnhancedInteractionData[][], allInteractions: EnhancedInteractionData[]): EnhancedInteractionData[][] {
    const optimizedBundles: EnhancedInteractionData[][] = [...journeys];
    console.log(`🔄 [BUNDLE OPTIMIZATION] Starting with ${journeys.length} base journeys`);
    
    // 🎯 STRATEGY 1: Create decision-focused bundles (3-4 interactions around key decisions)
    console.log(`🧠 [DECISION BUNDLES] Creating decision-focused bundles...`);
    const decisionBundles = this.createDecisionFocusedBundles(allInteractions);
    console.log(`✅ [DECISION BUNDLES] Generated ${decisionBundles.length} decision-focused bundles`);
    optimizedBundles.push(...decisionBundles);
    
    // 🎯 STRATEGY 2: Create funnel-progression bundles (interactions showing funnel advancement)
    console.log(`📊 [FUNNEL BUNDLES] Creating funnel-progression bundles...`);
    const funnelBundles = this.createFunnelProgressionBundles(allInteractions);
    console.log(`✅ [FUNNEL BUNDLES] Generated ${funnelBundles.length} funnel-progression bundles`);
    optimizedBundles.push(...funnelBundles);
    
    // 🎯 STRATEGY 3: Create task-completion bundles (goal-oriented interaction sequences)
    console.log(`🎯 [TASK BUNDLES] Creating task-completion bundles...`);
    const taskBundles = this.createTaskCompletionBundles(allInteractions);
    console.log(`✅ [TASK BUNDLES] Generated ${taskBundles.length} task-completion bundles`);
    optimizedBundles.push(...taskBundles);
    
    console.log(`📈 [BUNDLE OPTIMIZATION] Total bundles before deduplication: ${optimizedBundles.length}`);
    
    // Remove duplicates and ensure optimal training lengths
    console.log(`🧹 [DEDUPLICATION] Removing duplicates and optimizing lengths...`);
    const finalBundles = this.deduplicateAndOptimizeBundles(optimizedBundles);
    console.log(`✅ [DEDUPLICATION] Final optimized bundles: ${finalBundles.length}`);
    
    return finalBundles;
  }

  /**
   * 🧠 CREATE DECISION-FOCUSED BUNDLES: Group interactions around decision points
   */
  private createDecisionFocusedBundles(interactions: EnhancedInteractionData[]): EnhancedInteractionData[][] {
    const bundles: EnhancedInteractionData[][] = [];
    
    // Find decision points (interactions with validation/comparison elements)
    const decisionPoints = interactions.filter(interaction => {
      const elementText = interaction.element?.text?.toLowerCase() || '';
      const pageType = interaction.context?.pageType || '';
      const funnelStage = interaction.business?.conversion?.funnelStage || '';
      
      return funnelStage === 'validation' ||
             elementText.includes('compare') ||
             elementText.includes('review') ||
             elementText.includes('spec') ||
             pageType === 'comparison';
    });
    
    // Create bundles around each decision point (2 before, decision point, 2 after)
    for (const decisionPoint of decisionPoints) {
      const decisionIndex = interactions.indexOf(decisionPoint);
      if (decisionIndex !== -1) {
        const startIndex = Math.max(0, decisionIndex - 2);
        const endIndex = Math.min(interactions.length, decisionIndex + 3);
        const bundle = interactions.slice(startIndex, endIndex);
        
        if (bundle.length >= 3) {
          bundles.push(bundle);
        }
      }
    }
    
    return bundles;
  }

  /**
   * 📊 CREATE FUNNEL PROGRESSION BUNDLES: Group interactions showing funnel advancement
   */
  private createFunnelProgressionBundles(interactions: EnhancedInteractionData[]): EnhancedInteractionData[][] {
    const bundles: EnhancedInteractionData[][] = [];
    
    // Group interactions by funnel stage progression
    const funnelOrder = ['discovery', 'awareness', 'consideration', 'evaluation', 'validation', 'conversion'];
    
    let currentBundle: EnhancedInteractionData[] = [];
    let lastStageIndex = -1;
    
    for (const interaction of interactions) {
      const stage = interaction.business?.conversion?.funnelStage || '';
      const stageIndex = funnelOrder.indexOf(stage);
      
      if (stageIndex !== -1) {
        // If we're progressing forward in the funnel, continue bundle
        if (stageIndex >= lastStageIndex) {
          currentBundle.push(interaction);
          lastStageIndex = stageIndex;
          
          // Create bundle if we have optimal length
          if (currentBundle.length >= 4) {
            bundles.push([...currentBundle]);
            currentBundle = [interaction]; // Start new bundle with current interaction
          }
        } else {
          // Funnel regression - start new bundle
          if (currentBundle.length >= 2) {
            bundles.push([...currentBundle]);
          }
          currentBundle = [interaction];
          lastStageIndex = stageIndex;
        }
      }
    }
    
    // Add final bundle
    if (currentBundle.length >= 2) {
      bundles.push(currentBundle);
    }
    
    return bundles;
  }

  /**
   * ✅ CREATE TASK COMPLETION BUNDLES: Group goal-oriented interaction sequences
   */
  private createTaskCompletionBundles(interactions: EnhancedInteractionData[]): EnhancedInteractionData[][] {
    const bundles: EnhancedInteractionData[][] = [];
    
    // Find completion goals and work backwards to create meaningful sequences
    const completionGoals = ['add-to-cart', 'reach-checkout', 'signup-form-complete', 'booking-form-complete'];
    
    for (const interaction of interactions) {
      const goal = interaction.business?.conversion?.conversionGoal;
      if (goal && completionGoals.includes(goal)) {
        // Find the sequence leading to this completion
        const completionIndex = interactions.indexOf(interaction);
        const startIndex = Math.max(0, completionIndex - 4); // Up to 4 interactions leading to completion
        const bundle = interactions.slice(startIndex, completionIndex + 1);
        
        if (bundle.length >= 2) {
          bundles.push(bundle);
        }
      }
    }
    
    return bundles;
  }

  /**
   * 🧹 DEDUPLICATE AND OPTIMIZE BUNDLES: Remove duplicates and ensure optimal training lengths
   */
  private deduplicateAndOptimizeBundles(bundles: EnhancedInteractionData[][]): EnhancedInteractionData[][] {
    // Create unique signature for each bundle to detect duplicates
    const bundleSignatures = new Set<string>();
    const uniqueBundles: EnhancedInteractionData[][] = [];
    
    for (const bundle of bundles) {
      // Create signature from interaction IDs and timestamps
      const signature = bundle.map(i => 
        `${i.interaction?.timestamp || 0}-${i.element?.text?.slice(0, 10) || 'x'}`
      ).join('|');
      
      if (!bundleSignatures.has(signature)) {
        bundleSignatures.add(signature);
        
        // Ensure optimal bundle length (3-7 interactions)
        if (bundle.length >= 2 && bundle.length <= 8) {
          uniqueBundles.push(bundle);
        } else if (bundle.length > 8) {
          // Split overly long bundles
          for (let i = 0; i < bundle.length; i += 6) {
            const subBundle = bundle.slice(i, i + 6);
            if (subBundle.length >= 2) {
              uniqueBundles.push(subBundle);
            }
          }
        }
      }
    }
    
    return uniqueBundles;
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

  // 🆕 ENHANCED JOURNEY METADATA HELPER METHODS

  /**
   * 📊 ANALYZE JOURNEY PATTERN: Extract comprehensive journey analytics
   */
  private analyzeJourneyPattern(journey: EnhancedInteractionData[]): any {
    const funnelStages = journey.map(i => i.business?.conversion?.funnelStage).filter(Boolean);
    const uniqueStages = new Set(funnelStages);
    const pageTypes = journey.map(i => i.context?.pageType).filter(Boolean);
    const uniquePages = new Set(pageTypes);
    
    return {
      quality: this.calculateJourneyQuality(journey).score,
      completeness: uniqueStages.size / 6, // Based on 6 funnel stages
      complexity: Math.min(uniquePages.size / 5, 1), // Normalized complexity score
      conversionProbability: this.estimateConversionProbability(journey)
    };
  }

  /**
   * 🎯 IDENTIFY DECISION POINTS: Find key decision moments in the journey
   */
  private identifyDecisionPoints(journey: EnhancedInteractionData[]): number[] {
    const decisionIndices: number[] = [];
    
    journey.forEach((interaction, index) => {
      const elementText = interaction.element?.text?.toLowerCase() || '';
      const pageType = interaction.context?.pageType || '';
      const funnelStage = interaction.business?.conversion?.funnelStage || '';
      
      // Decision point criteria
      const isDecision = 
        funnelStage === 'validation' ||
        funnelStage === 'evaluation' ||
        elementText.includes('compare') ||
        elementText.includes('review') ||
        elementText.includes('spec') ||
        pageType === 'comparison' ||
        elementText.includes('add to cart') ||
        elementText.includes('checkout') ||
        elementText.includes('sign up');
        
      if (isDecision) {
        decisionIndices.push(index);
      }
    });
    
    return decisionIndices;
  }

  /**
   * 📈 ANALYZE FUNNEL PROGRESSION: Track movement through conversion funnel
   */
  private analyzeFunnelProgression(journey: EnhancedInteractionData[]): any {
    const funnelOrder = ['discovery', 'awareness', 'consideration', 'evaluation', 'validation', 'conversion'];
    const stages = journey.map(i => i.business?.conversion?.funnelStage).filter(Boolean);
    
    let progression = 0;
    let regressions = 0;
    let lastStageIndex = -1;
    
    stages.forEach(stage => {
      if (stage) {
        const stageIndex = funnelOrder.indexOf(stage);
        if (stageIndex !== -1) {
          if (stageIndex > lastStageIndex) {
            progression++;
          } else if (stageIndex < lastStageIndex) {
            regressions++;
          }
          lastStageIndex = stageIndex;
        }
      }
    });
    
    return {
      totalStages: new Set(stages).size,
      progressions: progression,
      regressions: regressions,
      maxStageReached: Math.max(...stages.filter(s => s).map(s => funnelOrder.indexOf(s!)).filter(i => i !== -1)),
      funnelEfficiency: progression / (progression + regressions + 1)
    };
  }

  /**
   * 🎯 EXTRACT CONVERSION SIGNALS: Identify signals indicating conversion intent
   */
  private extractConversionSignals(journey: EnhancedInteractionData[]): any[] {
    const signals: any[] = [];
    
    journey.forEach((interaction, index) => {
      const elementText = interaction.element?.text?.toLowerCase() || '';
      const goal = interaction.business?.conversion?.conversionGoal || '';
      const pageType = interaction.context?.pageType || '';
      
      // Strong conversion signals
      if (elementText.includes('add to cart') || goal === 'add-to-cart') {
        signals.push({ stepIndex: index, type: 'add-to-cart', strength: 'high' });
      }
      if (elementText.includes('checkout') || goal === 'reach-checkout') {
        signals.push({ stepIndex: index, type: 'checkout', strength: 'high' });
      }
      if (elementText.includes('buy now') || elementText.includes('purchase')) {
        signals.push({ stepIndex: index, type: 'immediate-purchase', strength: 'high' });
      }
      
      // Medium conversion signals
      if (pageType === 'product' && interaction.interaction?.type === 'CLICK') {
        signals.push({ stepIndex: index, type: 'product-engagement', strength: 'medium' });
      }
      if (elementText.includes('sign up') || goal === 'signup') {
        signals.push({ stepIndex: index, type: 'signup', strength: 'medium' });
      }
      
      // Weak conversion signals
      if (elementText.includes('learn more') || elementText.includes('details')) {
        signals.push({ stepIndex: index, type: 'information-seeking', strength: 'low' });
      }
    });
    
    return signals;
  }

  /**
   * 🧠 GET DECISION CONTEXT: Extract context around decision points
   */
  private getDecisionContext(interaction: EnhancedInteractionData, journey: EnhancedInteractionData[], index: number): any {
    const beforeContext = index > 0 ? journey.slice(Math.max(0, index - 2), index) : [];
    const afterContext = index < journey.length - 1 ? journey.slice(index + 1, Math.min(journey.length, index + 3)) : [];
    
    return {
      decisionType: this.categorizeDecision(interaction),
      leadingActions: beforeContext.map(i => ({
        action: i.interaction?.type,
        element: i.element?.text?.slice(0, 20),
        page: i.context?.pageType
      })),
      followupActions: afterContext.map(i => ({
        action: i.interaction?.type,
        element: i.element?.text?.slice(0, 20),
        page: i.context?.pageType
      })),
      timeSpent: this.calculateDecisionTime(beforeContext, interaction, afterContext)
    };
  }

  /**
   * 📊 ANALYZE FUNNEL TRANSITION: Analyze movement between funnel stages
   */
  private analyzeFunnelTransition(previousInteraction: EnhancedInteractionData, currentInteraction: EnhancedInteractionData): any {
    const prevStage = previousInteraction.business?.conversion?.funnelStage || 'unknown';
    const currentStage = currentInteraction.business?.conversion?.funnelStage || 'unknown';
    
    if (prevStage === currentStage) return null;
    
    const funnelOrder = ['discovery', 'awareness', 'consideration', 'evaluation', 'validation', 'conversion'];
    const prevIndex = funnelOrder.indexOf(prevStage);
    const currentIndex = funnelOrder.indexOf(currentStage);
    
    return {
      from: prevStage,
      to: currentStage,
      direction: currentIndex > prevIndex ? 'forward' : currentIndex < prevIndex ? 'backward' : 'lateral',
      stagesSkipped: Math.abs(currentIndex - prevIndex) - 1,
      isProgression: currentIndex > prevIndex
    };
  }

  /**
   * 🔍 FIND SIMILAR STEPS: Identify similar interactions within the journey
   */
  private findSimilarSteps(interaction: EnhancedInteractionData, journey: EnhancedInteractionData[], currentIndex: number): any[] {
    const currentAction = interaction.interaction?.type || '';
    const currentPageType = interaction.context?.pageType || '';
    
    return journey
      .map((step, index) => ({ step, index }))
      .filter(({ step, index }) => 
        index !== currentIndex &&
        (step.interaction?.type === currentAction || step.context?.pageType === currentPageType)
      )
      .map(({ step, index }) => ({
        stepIndex: index,
        similarity: this.calculateStepSimilarity(interaction, step),
        context: step.context?.pageType
      }))
      .filter(item => item.similarity > 0.5)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 3);
  }

  /**
   * 🌊 GET PAGE FLOW CONTEXT: Extract page navigation flow context
   */
  private getPageFlowContext(journey: EnhancedInteractionData[], currentIndex: number): any {
    const pageFlow = journey.map(i => i.context?.pageType).filter(Boolean) as string[];
    const currentPage = pageFlow[currentIndex];
    
    return {
      currentPage,
      previousPages: pageFlow.slice(0, currentIndex),
      upcomingPages: pageFlow.slice(currentIndex + 1),
      flowPattern: this.identifyFlowPattern(pageFlow, currentIndex),
      isFlowBreak: currentIndex > 0 && pageFlow[currentIndex - 1] && currentPage ? 
        this.isPageFlowBreak(pageFlow[currentIndex - 1], currentPage, '') : false
    };
  }

  /**
   * 📋 GET TASK CONTEXT PROGRESSION: Track task context evolution
   */
  private getTaskContextProgression(journey: EnhancedInteractionData[], currentIndex: number): any {
    const taskContexts = journey.map(i => this.extractTaskContext(i));
    const currentContext = taskContexts[currentIndex];
    
    return {
      currentTask: currentContext,
      taskEvolution: taskContexts.slice(0, currentIndex + 1),
      taskChanges: this.identifyTaskChanges(taskContexts, currentIndex),
      taskConsistency: this.calculateTaskConsistency(taskContexts.slice(0, currentIndex + 1))
    };
  }

  /**
   * 📈 CALCULATE STEP TRAINING VALUE: Determine training value of each step
   */
  private calculateStepTrainingValue(interaction: EnhancedInteractionData, journey: EnhancedInteractionData[], index: number): number {
    let value = 0.5; // Base value
    
    // Higher value for decision points
    if (this.identifyDecisionPoints(journey).includes(index)) {
      value += 0.2;
    }
    
    // Higher value for conversion actions
    const conversionSignals = this.extractConversionSignals(journey);
    if (conversionSignals.some(signal => signal.stepIndex === index && signal.strength === 'high')) {
      value += 0.2;
    }
    
    // Higher value for funnel progressions
    if (index > 0 && this.analyzeFunnelTransition(journey[index - 1], interaction)?.isProgression) {
      value += 0.1;
    }
    
    // Higher value for context-rich interactions
    const contextRichness = this.calculateContextRichness(interaction);
    value += (contextRichness - 0.5) * 0.2; // Scale context richness contribution
    
    return Math.min(value, 1.0);
  }

  /**
   * 🎨 CALCULATE CONTEXT RICHNESS: Measure how much context an interaction has
   */
  private calculateContextRichness(interaction: EnhancedInteractionData): number {
    let richness = 0;
    const maxFeatures = 15; // Max possible features
    
    if (interaction.selectors?.reliability) richness += 1;
    if (interaction.visual?.boundingBox) richness += 1;
    if (interaction.element?.nearbyElements?.length) richness += 1;
    if (interaction.context?.pageType) richness += 1;
    if (interaction.business?.conversion?.funnelStage) richness += 1;
    if (interaction.business?.ecommerce) richness += 1;
    if (interaction.state?.before) richness += 1;
    if (interaction.state?.after) richness += 1;
    if (interaction.element?.formContext) richness += 1;
    if (interaction.context?.accessibility) richness += 1;
    if (interaction.context?.performance) richness += 1;
    if (interaction.visual?.designSystem) richness += 1;
    if (interaction.business?.user?.behaviorPatterns) richness += 1;
    if (interaction.interaction?.timing) richness += 1;
    if (interaction.element?.ariaAttributes) richness += 1;
    
    return richness / maxFeatures;
  }

  /**
   * 🎭 DETERMINE BUNDLE ROLE: Identify the role of each step in the training bundle
   */
  private determineBundleRole(interaction: EnhancedInteractionData, journey: EnhancedInteractionData[], index: number): string {
    if (index === 0) return 'journey-initiator';
    if (index === journey.length - 1) return 'journey-completer';
    
    const decisionPoints = this.identifyDecisionPoints(journey);
    if (decisionPoints.includes(index)) return 'decision-maker';
    
    const conversionSignals = this.extractConversionSignals(journey);
    if (conversionSignals.some(signal => signal.stepIndex === index)) return 'conversion-indicator';
    
    if (index > 0) {
      const transition = this.analyzeFunnelTransition(journey[index - 1], interaction);
      if (transition?.isProgression) return 'funnel-advancer';
    }
    
    return 'journey-progressor';
  }

  // Helper methods for the enhanced journey metadata

  private estimateConversionProbability(journey: EnhancedInteractionData[]): number {
    const conversionSignals = this.extractConversionSignals(journey);
    const funnelAnalysis = this.analyzeFunnelProgression(journey);
    
    let probability = 0.1; // Base probability
    
    // Add probability based on conversion signals
    const highSignals = conversionSignals.filter(s => s.strength === 'high').length;
    const mediumSignals = conversionSignals.filter(s => s.strength === 'medium').length;
    
    probability += (highSignals * 0.3) + (mediumSignals * 0.15);
    probability += funnelAnalysis.funnelEfficiency * 0.3;
    probability += (funnelAnalysis.maxStageReached / 5) * 0.2;
    
    return Math.min(probability, 0.95); // Cap at 95%
  }

  private categorizeDecision(interaction: EnhancedInteractionData): string {
    const elementText = interaction.element?.text?.toLowerCase() || '';
    const funnelStage = interaction.business?.conversion?.funnelStage || '';
    
    if (elementText.includes('compare')) return 'comparison';
    if (elementText.includes('review')) return 'validation';
    if (elementText.includes('add to cart')) return 'purchase-decision';
    if (elementText.includes('sign up')) return 'commitment';
    if (funnelStage === 'evaluation') return 'evaluation';
    
    return 'general-decision';
  }

  private calculateDecisionTime(before: EnhancedInteractionData[], decision: EnhancedInteractionData, after: EnhancedInteractionData[]): number {
    const beforeTime = before.length > 0 ? before[before.length - 1].interaction?.timestamp || 0 : 0;
    const decisionTime = decision.interaction?.timestamp || 0;
    const afterTime = after.length > 0 ? after[0].interaction?.timestamp || 0 : decisionTime;
    
    return Math.max(0, afterTime - beforeTime);
  }

  private calculateStepSimilarity(step1: EnhancedInteractionData, step2: EnhancedInteractionData): number {
    let similarity = 0;
    let factors = 0;
    
    // Action type similarity
    if (step1.interaction?.type === step2.interaction?.type) {
      similarity += 1;
    }
    factors += 1;
    
    // Page type similarity
    if (step1.context?.pageType === step2.context?.pageType) {
      similarity += 1;
    }
    factors += 1;
    
    // Funnel stage similarity
    if (step1.business?.conversion?.funnelStage === step2.business?.conversion?.funnelStage) {
      similarity += 1;
    }
    factors += 1;
    
    return factors > 0 ? similarity / factors : 0;
  }

  private identifyFlowPattern(pageFlow: string[], currentIndex: number): string {
    const flow = pageFlow.slice(0, currentIndex + 1).join(' → ');
    
    if (flow.includes('search → category → product')) return 'browse-to-product';
    if (flow.includes('product → cart → checkout')) return 'purchase-flow';
    if (flow.includes('home → pricing → signup')) return 'conversion-flow';
    if (flow.includes('category → product → product')) return 'comparison-shopping';
    
    return 'custom-flow';
  }

  private identifyTaskChanges(taskContexts: string[], currentIndex: number): any[] {
    const changes: any[] = [];
    
    for (let i = 1; i <= currentIndex; i++) {
      if (taskContexts[i] !== taskContexts[i - 1]) {
        changes.push({
          stepIndex: i,
          from: taskContexts[i - 1],
          to: taskContexts[i],
          changeType: this.categorizeTaskChange(taskContexts[i - 1], taskContexts[i])
        });
      }
    }
    
    return changes;
  }

  private calculateTaskConsistency(taskContexts: string[]): number {
    if (taskContexts.length <= 1) return 1.0;
    
    const uniqueTasks = new Set(taskContexts);
    return 1 - (uniqueTasks.size - 1) / (taskContexts.length - 1);
  }

  private categorizeTaskChange(fromTask: string, toTask: string): string {
    if (fromTask.includes('search') && toTask.includes('product')) return 'search-to-evaluation';
    if (fromTask.includes('product') && toTask.includes('cart')) return 'evaluation-to-purchase';
    if (fromTask.includes('general') && !toTask.includes('general')) return 'task-focus';
    
    return 'task-shift';
  }
}

// Export singleton for dependency injection
export const trainingDataTransformer = (selectorStrategy: SelectorStrategyService) => 
  new TrainingDataTransformerImpl(selectorStrategy);