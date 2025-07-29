/**
 * Training Data Transformer Service - Fix Poor Training Data Quality
 * 
 * Per OPENAI_FOCUSED_REFACTOR.md: Fix training data transformation with rich contextual data
 * Per FOCUSED_TASKS.md: Use SelectorStrategyService + comprehensive context extraction
 * 
 * CRITICAL FIX: Use reliability scores and rich interaction data for contextual training examples
 */

import { SelectorStrategyService } from '../selectors/selector-strategy';
import { HybridJourneyTracker } from '../journey/hybrid-journey-tracker';
import { ProductContextBuilder, CartInteraction } from './product-context-builder';
import { ProductStateAccumulator, ProductConfigurationState } from './product-state-accumulator';
import { DynamicPatternMatcher, PatternMatchResult } from './dynamic-pattern-matcher';
import { SequenceAwareTrainer } from './sequence-aware-trainer';
import { DomContextService, DomContextServiceImpl } from './dom-context-service';
import { VisualContextService, VisualContextServiceImpl } from './visual-context-service';
import { BusinessContextService, BusinessContextServiceImpl } from './business-context-service';
import { JourneyContextService, JourneyContextServiceImpl } from './journey-context-service';
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
  createSequenceExamples(interactions: EnhancedInteractionData[]): TrainingExample[];
  createTaskDrivenExamples(interactions: EnhancedInteractionData[], taskContext?: any): TrainingExample[];
}

export class TrainingDataTransformerImpl implements TrainingDataTransformerService {
  private sessionData?: any; // Store session data for access in methods
  private journeyTracker: HybridJourneyTracker; // Real journey tracking
  private productContextBuilder: ProductContextBuilder; // Product variant tracking
  private productStateAccumulator: ProductStateAccumulator; // Sequential state tracking
  private patternMatcher: DynamicPatternMatcher; // Dynamic pattern matching
  private sequenceAwareTrainer: SequenceAwareTrainer; // Complete shopping flow training
  private allInteractions?: any[]; // Store all interactions for product context analysis
  
  // New context services for focused functionality
  private domContextService: DomContextService;
  private visualContextService: VisualContextService;
  private businessContextService: BusinessContextService;
  private journeyContextService: JourneyContextService;

  constructor(
    private selectorStrategy: SelectorStrategyService
  ) {
    console.log('🏗️ [TRAINING DATA TRANSFORMER] Initializing enhanced components', {
      componentActive: true
    });
    
    this.journeyTracker = new HybridJourneyTracker();
    this.productContextBuilder = new ProductContextBuilder();
    this.productStateAccumulator = new ProductStateAccumulator();
    
    // Initialize new context services
    this.domContextService = new DomContextServiceImpl();
    this.visualContextService = new VisualContextServiceImpl();
    this.businessContextService = new BusinessContextServiceImpl(this.productContextBuilder, this.productStateAccumulator);
    this.journeyContextService = new JourneyContextServiceImpl();
    this.patternMatcher = new DynamicPatternMatcher();
    this.sequenceAwareTrainer = new SequenceAwareTrainer();
    
    console.log('🏗️ [TRAINING DATA TRANSFORMER] All enhanced components loaded', {
      journeyTracker: !!this.journeyTracker,
      productContextBuilder: !!this.productContextBuilder,
      productStateAccumulator: !!this.productStateAccumulator,
      patternMatcher: !!this.patternMatcher,
      sequenceAwareTrainer: !!this.sequenceAwareTrainer,
      selectorStrategy: !!this.selectorStrategy
    });
  }

  /**
   * Main orchestration method - extracted from openai-integration-clean.ts
   */
  async generateTrainingData(sessionId: string, enhancedInteractions: any[], sessionData?: any): Promise<TrainingDataResult> {
    const startTime = Date.now();
    console.log(`\n🚀 [TRAINING DATA] Starting generation for session ${sessionId}`);
    console.log(`📊 [TRAINING DATA] Input: ${enhancedInteractions.length} enhanced interactions`);
    
    // Store session data and interactions for use in context extraction
    this.sessionData = sessionData;
    this.allInteractions = enhancedInteractions;
    
    // Update journey context service with session data
    this.journeyContextService = new JourneyContextServiceImpl(sessionData);
    
    // 🎯 REAL JOURNEY TRACKING: Initialize hybrid tracker with actual session data
    this.journeyTracker.initializeForSession(sessionData, enhancedInteractions);
    
    // 🛒 PRODUCT STATE TRACKING: Initialize state accumulator for sequential context
    this.productStateAccumulator.clearStates(); // Clear any previous session state
    
    const allExamples: TrainingExample[] = [];
    let selectorEnhancements = 0;
    let contextEnhancements = 0;

    // 🎯 OPENAI RECOMMENDED: Generate structured examples using new format with REAL journey tracking
    console.log(`\n🧠 [OPENAI FORMAT] Processing ${enhancedInteractions.length} interactions with OpenAI-recommended structure...`);
    for (let i = 0; i < enhancedInteractions.length; i++) {
      const interaction = enhancedInteractions[i];
      try {
        // Generate examples using the new OpenAI-recommended structure with REAL journey context
        const structuredExamples = this.createOpenAIStructuredExamples(interaction, i);
        allExamples.push(...structuredExamples);
        
        if (interaction.selectors?.reliability) {
          selectorEnhancements++;
        }
        if (interaction.element?.nearbyElements || interaction.visual?.boundingBox) {
          contextEnhancements++;
        }
      } catch (error) {
        console.warn(`❌ [OPENAI FORMAT] Failed to process interaction ${i}:`, error);
      }
    }
    console.log(`✅ [OPENAI FORMAT] Generated ${allExamples.length} structured training examples`);

    // 🎯 COMMENTED OUT: Legacy training formats to ensure consistent OpenAI structured format only
    // 🎯 NEW: SEQUENCE-AWARE TRAINING - Complete shopping flow examples
    console.log(`\n🛤️ [SEQUENCE EXAMPLES] Creating sequence-aware training examples for complete shopping flows...`);
    const sequenceExamples = this.sequenceAwareTrainer.generateSequenceTrainingExamples(enhancedInteractions);
    console.log(`✅ [SEQUENCE EXAMPLES] Generated ${sequenceExamples.length} sequence examples`);
    allExamples.push(...sequenceExamples);
    
    console.log(`🎯 [TASK EXAMPLES] Creating enhanced task-driven examples...`);
    const taskExamples = this.createTaskDrivenExamples(enhancedInteractions);
    console.log(`✅ [TASK EXAMPLES] Generated ${taskExamples.length} task examples`);
    
    allExamples.push(...taskExamples);
    console.log(`📈 [TOTAL EXAMPLES] OpenAI structured examples only: ${allExamples.length} training examples`);

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
   * 🧠 OPENAI RECOMMENDED: Create structured training examples using OpenAI's recommended format
   * This format uses clear section labels for better AI comprehension and learning efficiency
   * 🎯 NEW: Uses REAL journey tracking instead of fake step templates
   */
  createOpenAIStructuredExamples(interaction: EnhancedInteractionData, interactionIndex: number): TrainingExample[] {
    const examples: TrainingExample[] = [];
    const startTime = Date.now();

    // Extract reliable selectors using SelectorStrategyService
    const selectorResult = this.selectorStrategy.getBestSelectorWithScore(interaction.selectors || {});
    const bestSelector = selectorResult.bestSelector;
    const backupSelectors = selectorResult.backupSelectors;
    const reliability = selectorResult.reliability;

    // Only generate examples for reliable interactions
    if (reliability < 0.3 || bestSelector === 'element') {
      return examples;
    }

    // Extract all context data
    const url = interaction.context?.pageUrl || '';
    const hostname = url ? new URL(url).hostname : 'unknown-site';
    const elementText = interaction.element?.text || '';
    const actionType = interaction.interaction?.type?.toLowerCase() || 'interact';
    
    // Extract comprehensive context using new services
    const visualContext = this.visualContextService.extractVisualContext(interaction.visual);
    const elementContext = this.domContextService.extractElementContext(interaction.element);
    const pageContext = this.extractPageContext(interaction.context);
    const stateContext = this.extractStateContext(interaction.state);
    
    // 🔧 FIX: Use real URL and hostname from pageContext
    const realUrl = pageContext.url || url;
    const realHostname = realUrl ? (realUrl.includes('://') ? new URL(realUrl).hostname : realUrl) : hostname;
    const realPageTitle = pageContext.pageTitle || 'Unknown Page';
    
    // 🛒 PRODUCT STATE TRACKING: Process interaction through state accumulator
    const productState = this.productStateAccumulator.processInteraction(
      interaction, 
      this.allInteractions!, 
      interactionIndex
    );
    
    // Generate product state context for training examples
    const productStateContext = productState ? 
      this.productStateAccumulator.generateStateContext(productState.productId, interactionIndex) : 
      '';
    
    const businessContext = this.businessContextService.extractBusinessContext(interaction.business, realHostname, interaction, this.allInteractions, interactionIndex);
    const technicalContext = this.extractTechnicalContext(interaction);
    const nearbyElementsContext = this.visualContextService.extractCompleteNearbyElements(interaction.element?.nearbyElements || []);
    
    // 🎯 REAL JOURNEY TRACKING: Get actual journey context instead of fake templates
    const realJourneyContext = this.journeyTracker.getJourneyContextForInteraction(interaction, interactionIndex);

    // Get user goal from session data
    const userGoal = this.sessionData?.config?.generatedTask?.title || 
                    'Navigate and complete user goal';

    // 🎯 OPENAI STRUCTURED EXAMPLE: Clear section-based format
    const boundingBox = interaction.visual?.boundingBox;
    const element = interaction.element;
    const attributes = element?.attributes || {};
    
    // 🔧 DEBUG: Log element data to understand structure
    if (interactionIndex < 3) {
      console.log(`🔍 [DEBUG] Element data for interaction ${interactionIndex}:`, {
        tag: element?.tag,
        attributes: attributes,
        hasAttributes: Object.keys(attributes).length > 0
      });
    }
    
    // 🎯 SEMANTIC ENHANCEMENT: Get semantic journey context from SequenceAwareTrainer
    const stageName = (this.sequenceAwareTrainer as any).getStageNameForInteraction ? 
      (this.sequenceAwareTrainer as any).getStageNameForInteraction(interaction) : 'Navigation';
    const pageClassification = (this.sequenceAwareTrainer as any).classifyPageSemantically ? 
      (this.sequenceAwareTrainer as any).classifyPageSemantically(interaction) : { pageType: 'unknown', confidence: 0.5 };
    const behaviorDescription = (this.sequenceAwareTrainer as any).getSemanticBehaviorDescription ? 
      (this.sequenceAwareTrainer as any).getSemanticBehaviorDescription(pageClassification.pageType, interaction) : 
      'User progressing through shopping interface';
    
    // Build journey progression context (simplified for now)
    const journeyProgression = `${pageClassification.pageType} → ${stageName}`;
    const semanticContext = behaviorDescription;
    const sequenceType = 'navigation_flow'; // Will be enhanced with full sequence analysis later
    const sequenceQuality = pageClassification.confidence || 0.5;
    
    examples.push({
      prompt: `[USER GOAL]
${userGoal}
Task Progress: ${realJourneyContext.taskProgress.currentTaskName} (${realJourneyContext.taskProgress.currentTaskIndex + 1}/${realJourneyContext.taskProgress.totalTasks} - ${realJourneyContext.taskProgress.progressPercent}% complete)
${realJourneyContext.taskProgress.completedTasks.length > 0 ? `Completed: [${realJourneyContext.taskProgress.completedTasks.map(t => `"${t}" ✅`).join(', ')}]` : ''}
${realJourneyContext.taskProgress.remainingTasks.length > 0 ? `Remaining: [${realJourneyContext.taskProgress.remainingTasks.map(t => `"${t}"`).join(', ')}]` : ''}

[JOURNEY]
Step: ${realJourneyContext.sessionStep}/${realJourneyContext.totalSteps} - ${realJourneyContext.taskProgress.currentTaskName}
Current Intent: ${realJourneyContext.currentIntent.action}${realJourneyContext.currentIntent.product ? ` (${realJourneyContext.currentIntent.product})` : ''} (confidence: ${realJourneyContext.currentIntent.confidence.toFixed(2)})
Evidence: ${realJourneyContext.currentIntent.reasoning}
Navigation Flow: ${realJourneyContext.navigationFlow.previousPages.slice(-2).join(' → ')} → ${realJourneyContext.navigationFlow.currentPage}
Flow Reason: ${realJourneyContext.navigationFlow.flowReason}
User Focus: ${realJourneyContext.behavioralContext.userFocus}
Decision Factors: [${realJourneyContext.behavioralContext.decisionFactors.slice(0, 3).join(', ')}]

${productStateContext ? `[SHOPPING SEQUENCE CONTEXT]\n${productStateContext}\n` : ''}${this.generateUserPathSequence(this.allInteractions!, interactionIndex) ? `[USER PATH SEQUENCE]\n${this.generateUserPathSequence(this.allInteractions!, interactionIndex)}\n` : ''}[PAGE CONTEXT]
Site: ${realHostname}
URL: ${realUrl}
Page Title: ${realPageTitle}
Page Type: ${pageContext.pageType || 'unknown'}
Loading State: ${stateContext.loadingComplete ? 'Complete' : 'Loading'}

[DOM CONTEXT]
Target Element: <${element?.tag || 'button'} ${Object.entries(attributes).map(([k, v]) => `${k}="${v}"`).join(' ')}>${elementText}</${element?.tag || 'button'}>
Text Content: "${elementText}"
Element Type: ${elementContext.elementType || 'Interactive Element'}
Bounding Box: {x: ${boundingBox?.x || 0}, y: ${boundingBox?.y || 0}, width: ${boundingBox?.width || 0}, height: ${boundingBox?.height || 0}}
Visibility: ${visualContext.visibility || 'Visible'}, ${elementContext.clickable ? 'Clickable' : 'Not Clickable'}
State: ${this.domContextService.extractElementState(element, attributes)}
${elementContext.accessibilityContext ? `Accessibility: ${elementContext.accessibilityContext}` : ''}

[DOM HIERARCHY]
${this.domContextService.buildDomHierarchy(element, interaction)}

[SIBLINGS CONTEXT]
${this.domContextService.buildSiblingsContext(element, interaction)}

[FORM CONTEXT]
${this.domContextService.buildFormContext(element, interaction, elementContext)}

[SPATIAL CONTEXT]
${nearbyElementsContext.spatialSummary || 'No nearby elements detected'}
Parent Container: ${elementContext.parentContainer || 'Unknown container'}

[SELECTOR STRATEGIES]
${this.domContextService.buildPlaywrightSelectorStrategies(element, attributes, elementText, elementContext)}

[BUSINESS CONTEXT]
${this.businessContextService.formatBusinessContextForTraining(businessContext)}

[SELECTORS]
${[bestSelector, ...backupSelectors.slice(0, 2)].map((sel, i) => `${i + 1}. ${sel} ${i === 0 ? `(${reliability.toFixed(2)})` : ''}`).join('\n')}`,

      completion: `[ACTION]
${this.generateShoppingSpecificAction(actionType, interaction, productState, elementText, businessContext)}

[SELECTOR]
${bestSelector}

[REASONING]
${realJourneyContext.currentIntent.reasoning} | User Focus: ${realJourneyContext.behavioralContext.userFocus} | Task Impact: This action progresses "${realJourneyContext.taskProgress.currentTaskName}" toward completion

[CONFIDENCE]
${reliability.toFixed(2)} (selector) | ${realJourneyContext.currentIntent.confidence.toFixed(2)} (intent) | ${realJourneyContext.behavioralContext.conversionLikelihood.toFixed(2)} (conversion)

[TASK CONTEXT]
Current Task: ${realJourneyContext.taskProgress.currentTaskName} (${realJourneyContext.taskProgress.progressPercent}% complete)
Task ${realJourneyContext.taskProgress.currentTaskIndex + 1} of ${realJourneyContext.taskProgress.totalTasks}: ${realJourneyContext.taskProgress.completedTasks.length} completed, ${realJourneyContext.taskProgress.remainingTasks.length} remaining
Next Predicted: ${realJourneyContext.behavioralContext.nextPredictedActions.slice(0, 3).join(' → ')}
Decision Factors: ${realJourneyContext.behavioralContext.decisionFactors.slice(0, 2).join(', ')}

[FALLBACKS]
${backupSelectors.slice(0, 2).map((sel, i) => `${i + 1}. ${sel}`).join('\n')}

[COORDINATES]
{x: ${boundingBox?.x || 0}, y: ${boundingBox?.y || 0}}`,

      context: {
        pageType: pageContext.pageType,
        userJourney: realJourneyContext.navigationFlow.currentPage,
        reliability,
        spatialContext: nearbyElementsContext.spatialSummary,
        businessContext: businessContext.conversion,
        journeyContext: {
          sessionPosition: `${realJourneyContext.sessionStep}/${realJourneyContext.totalSteps}`,
          currentTask: realJourneyContext.taskProgress.currentTaskName,
          taskProgress: realJourneyContext.taskProgress.progressPercent,
          userIntent: realJourneyContext.currentIntent.action,
          conversionLikelihood: realJourneyContext.behavioralContext.conversionLikelihood
        }
      },
      quality: this.calculateComprehensiveQuality(interaction),
      rawData: {
        originalInteraction: interaction,
        processingTime: Date.now() - startTime,
        dataCompletion: this.calculateDataCompletion(interaction),
        enhancementFlags: ['openai-structured', 'section-based', 'enhanced-context', 'format-consistent']
      },
      journeyMetadata: {
        journeyType: 'real-user-session',
        journeyGoal: userGoal,
        userIntent: realJourneyContext.behavioralContext.userFocus,
        stepNumber: realJourneyContext.sessionStep,
        totalSteps: realJourneyContext.totalSteps,
        isJourneyStart: realJourneyContext.sessionStep === 1,
        isJourneyEnd: realJourneyContext.sessionStep === realJourneyContext.totalSteps,
        journeyProgress: Math.round((realJourneyContext.sessionStep / realJourneyContext.totalSteps) * 100) + '%'
      }
    });

    return examples;
  }

  /**
   * 🛒 SHOPPING-SPECIFIC: Generate contextual shopping actions instead of generic ones
   * Transforms "Click" → "Select size M" or "Add configured product to cart"
   */
  private generateShoppingSpecificAction(
    actionType: string,
    interaction: any,
    productState: any,
    elementText: string,
    businessContext: any
  ): string {
    // Enhanced shopping context analysis
    const element = interaction.element || {};
    const attributes = element.attributes || {};
    const lowerElementText = elementText.toLowerCase();
    const context = interaction.context || {};
    const url = context.url || context.pageUrl || '';

    // 🎯 CART INTERACTIONS: High-priority shopping actions
    if (this.isCartButton(element, elementText)) {
      if (productState && productState.readyForCart) {
        // Complete configuration - specific product details with full name
        const productName = productState.productName || 'product';
        const size = productState.selectedSize ? `, Size: ${productState.selectedSize}` : '';
        const color = productState.selectedColor ? `, Color: ${productState.selectedColor}` : '';
        return `Add ${productName} to cart${size}${color}`;
      } else if (productState) {
        // Incomplete configuration - show what's missing
        const productName = productState.productName || 'product';
        const missing = productState.requiredSelections?.filter((req: string) => 
          !productState.completedSelections?.includes(req)
        ) || [];
        if (missing.length > 0) {
          return `Add ${productName} to cart (missing: ${missing.join(', ')})`;
        }
        return `Add ${productName} to cart`;
      } else {
        // No product state - generic cart action
        return 'Add product to cart';
      }
    }

    // 🎨 COLOR SELECTIONS: Detect color swatch interactions
    if (this.isColorSelector(element, elementText, attributes)) {
      const colorValue = this.extractColorValue(elementText, attributes);
      return colorValue ? `Select color "${colorValue}"` : 'Select color option';
    }

    // 📏 SIZE SELECTIONS: Detect size selector interactions  
    if (this.isSizeSelector(element, elementText, attributes)) {
      const sizeValue = this.extractSizeValue(elementText, attributes);
      return sizeValue ? `Select size "${sizeValue}"` : 'Select size option';
    }

    // 🛍️ PRODUCT NAVIGATION: Product page interactions
    if (this.isProductInteraction(url, element, elementText)) {
      if (lowerElementText.includes('product') || url.includes('/product')) {
        return 'View product details';
      }
      if (lowerElementText.includes('quick') && lowerElementText.includes('shop')) {
        return 'Quick shop product';
      }
      return 'Navigate to product';
    }

    // 🏪 CATEGORY NAVIGATION: Category browsing
    if (this.isCategoryNavigation(url, elementText)) {
      return `Browse ${elementText || 'category'}`;
    }

    // 🔍 SEARCH INTERACTIONS: Search and filtering
    if (this.isSearchInteraction(element, elementText, attributes)) {
      return elementText ? `Search for "${elementText}"` : 'Perform search';
    }

    // ⚙️ FALLBACK: Use generic action mapping for non-shopping interactions
    return this.mapActionType(actionType);
  }

  /**
   * 🛒 Detect cart button interactions
   */
  private isCartButton(element: any, elementText: string): boolean {
    const lowerText = elementText.toLowerCase();
    const attributes = element.attributes || {};
    
    // 🚨 EXCLUDE: Don't detect color/size selectors as cart buttons
    if (attributes.name === 'color-radio' || 
        attributes.name?.includes('Size') ||
        attributes.type === 'radio' && (lowerText.length < 20 && !lowerText.includes('cart'))) {
      return false;
    }

    // Text-based detection - more specific patterns
    const cartTextPatterns = [
      'add to cart', 'add to bag', 'add to basket',
      'buy now', 'purchase now', 'add item'
    ];
    
    if (cartTextPatterns.some(pattern => lowerText.includes(pattern))) {
      return true;
    }

    // Attribute-based detection - more specific
    const cartAttributes = ['addtocart', 'addtobag', 'buynow', 'purchase'];
    const hasCartAttribute = cartAttributes.some(attr => 
      Object.values(attributes).some(value => 
        typeof value === 'string' && value.toLowerCase().includes(attr)
      )
    );

    // ID/class based detection for cart buttons
    const idClass = `${attributes.id || ''} ${attributes.class || ''}`.toLowerCase();
    const hasCartIdClass = ['cart', 'bag', 'buy'].some(term => 
      idClass.includes(`add-${term}`) || 
      idClass.includes(`${term}-button`) ||
      idClass.includes(`${term}btn`)
    );

    return hasCartAttribute || hasCartIdClass;
  }

  /**
   * 🎨 Detect color selector interactions
   */
  /**
   * 🔄 ENHANCED: Dynamic color selector detection
   * Uses pattern matcher instead of hardcoded color list
   */
  private isColorSelector(element: any, elementText: string, attributes: any): boolean {
    // Check attributes for color-related patterns (high confidence)
    const colorKeywords = ['color', 'swatch', 'variant'];
    const hasColorAttribute = colorKeywords.some(keyword => 
      Object.keys(attributes).some(key => key.toLowerCase().includes(keyword)) ||
      Object.values(attributes).some(value => 
        typeof value === 'string' && value.toLowerCase().includes(keyword)
      )
    );

    // Dynamic color detection using pattern matcher
    const colorResult = this.patternMatcher.detectColor(elementText, { attributes });
    const hasColorPattern = colorResult && colorResult.confidence >= 0.6;

    return hasColorAttribute || !!hasColorPattern;
  }

  /**
   * 📏 Detect size selector interactions
   */
  /**
   * 🔄 ENHANCED: Dynamic size selector detection
   * Uses pattern matcher instead of hardcoded size list
   */
  private isSizeSelector(element: any, elementText: string, attributes: any): boolean {
    // Check attributes for size-related patterns (high confidence)
    const sizeKeywords = ['size', 'dimension', 'fit'];
    const hasSizeAttribute = sizeKeywords.some(keyword => 
      Object.keys(attributes).some(key => key.toLowerCase().includes(keyword)) ||
      Object.values(attributes).some(value => 
        typeof value === 'string' && value.toLowerCase().includes(keyword)
      )
    );

    // Dynamic size detection using pattern matcher
    const sizeResult = this.patternMatcher.detectSize(elementText, { attributes });
    const hasSizePattern = sizeResult && sizeResult.confidence >= 0.7;

    return hasSizeAttribute || !!hasSizePattern;
  }

  /**
   * Extract color value for action description
   */
  /**
   * 🔄 ENHANCED: Smart color extraction with confidence scoring
   * Uses dynamic pattern matching instead of simple length checks
   */
  private extractColorValue(elementText: string, attributes: any): string | null {
    // Build context for better pattern matching
    const context = { attributes };
    
    // Priority candidates: aria-label > text > value
    const candidates = [
      { text: attributes['aria-label'], priority: 3 },
      { text: elementText, priority: 2 },
      { text: attributes.value, priority: 1 }
    ].filter(c => c.text);
    
    let bestResult: PatternMatchResult | null = null;
    
    for (const candidate of candidates) {
      const result = this.patternMatcher.detectColor(candidate.text, context);
      if (result) {
        // Boost confidence based on semantic priority
        const adjustedConfidence = result.confidence + (candidate.priority * 0.05);
        
        if (!bestResult || adjustedConfidence > bestResult.confidence) {
          bestResult = result;
          bestResult.confidence = Math.min(adjustedConfidence, 1.0);
        }
      }
    }
    
    return bestResult && bestResult.confidence >= 0.6 ? bestResult.value : null;
  }

  /**
   * Extract size value for action description
   */
  /**
   * 🔄 ENHANCED: Smart size extraction with confidence scoring  
   * Uses dynamic pattern matching instead of simple length checks
   */
  private extractSizeValue(elementText: string, attributes: any): string | null {
    // Build context for better pattern matching
    const context = { attributes };
    
    // Priority candidates: aria-label > text > value
    const candidates = [
      { text: attributes['aria-label'], priority: 3 },
      { text: elementText, priority: 2 },
      { text: attributes.value, priority: 1 }
    ].filter(c => c.text);
    
    let bestResult: PatternMatchResult | null = null;
    
    for (const candidate of candidates) {
      const result = this.patternMatcher.detectSize(candidate.text, context);
      if (result) {
        // Boost confidence based on semantic priority
        const adjustedConfidence = result.confidence + (candidate.priority * 0.05);
        
        if (!bestResult || adjustedConfidence > bestResult.confidence) {
          bestResult = result;
          bestResult.confidence = Math.min(adjustedConfidence, 1.0);
        }
      }
    }
    
    return bestResult && bestResult.confidence >= 0.7 ? bestResult.value : null;
  }

  /**
   * Detect product-related interactions
   */
  private isProductInteraction(url: string, element: any, elementText: string): boolean {
    return url.includes('/product') || 
           url.includes('/p/') ||
           elementText.toLowerCase().includes('product');
  }

  /**
   * Detect category navigation
   */
  private isCategoryNavigation(url: string, elementText: string): boolean {
    const categoryKeywords = ['men', 'women', 'kids', 'shirts', 'pants', 'shoes'];
    return categoryKeywords.some(keyword => 
      url.toLowerCase().includes(keyword) || 
      elementText.toLowerCase().includes(keyword)
    );
  }

  /**
   * Detect search interactions
   */
  private isSearchInteraction(element: any, elementText: string, attributes: any): boolean {
    const searchKeywords = ['search', 'find', 'query'];
    return searchKeywords.some(keyword =>
      Object.values(attributes).some(value => 
        typeof value === 'string' && value.toLowerCase().includes(keyword)
      ) || elementText.toLowerCase().includes(keyword)
    );
  }

  /**
   * Helper method to map action types to clear action names (LEGACY FALLBACK)
   */
  private mapActionType(actionType: string): string {
    const actionMap: { [key: string]: string } = {
      'click': 'Click',
      'input': 'Fill',
      'type': 'Fill', 
      'select': 'Select',
      'hover': 'Hover',
      'scroll': 'Scroll',
      'navigate': 'Navigate',
      'interact': 'Interact'
    };
    return actionMap[actionType] || 'Interact';
  }

  /**
   * Calculate quality score for OpenAI structured examples
   */
  private calculateOpenAIStructuredQuality(interaction: EnhancedInteractionData, reliability: number): number {
    let score = 0.6; // Base score for structured format
    
    // Reliability bonus
    score += reliability * 0.3;
    
    // Data completeness bonus
    if (interaction.element?.text) score += 0.05;
    if (interaction.visual?.boundingBox) score += 0.05;
    if (interaction.element?.nearbyElements?.length) score += 0.05;
    if (interaction.context?.pageUrl) score += 0.05;
    
    // User goal alignment bonus
    if (this.sessionData?.config?.generatedTask) score += 0.1;
    
    return Math.min(1.0, score);
  }

  /**
   * Create sequence examples (copied from openai-integration-clean.ts)
   */
  /**
   * 🛤️ JOURNEY-BASED SEQUENCE EXAMPLES: Generate training data for complete user journeys
   * Creates training examples that teach the AI complete user flows from discovery to realistic conversion endpoints
   */
  createSequenceExamples(interactions: EnhancedInteractionData[]): TrainingExample[] {
    // Use the comprehensive SequenceAwareTrainer for complete shopping flow training
    return this.sequenceAwareTrainer.generateSequenceTrainingExamples(interactions);
  }


  /**
   * 🏗️ JOURNEY STAGES EXAMPLE: Focus on funnel progression
   */
  private createJourneyStagesExample(journey: EnhancedInteractionData[], journeyType: string, userIntent: string): TrainingExample | null {
    const stages = journey.map(i => i.business?.conversion?.funnelStage).filter(Boolean);
    const uniqueStages = Array.from(new Set(stages));
    
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
    
    return Array.from(new Set(factors));
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
    
    // 🛒 PRIORITY: Separate cart interactions for special treatment
    const cartExamples = allExamples.filter(ex => this.isCartTrainingExample(ex));
    const nonCartExamples = allExamples.filter(ex => !cartExamples.includes(ex));
    console.log(`🛒 [QUALITY FILTER] Found ${cartExamples.length} cart interaction examples`);
    
    // Separate journey examples from individual interaction examples (excluding cart)
    const journeyExamples = nonCartExamples.filter(ex => 
      ex.context?.pageType === 'journey-sequence' ||
      ex.context?.pageType === 'funnel-progression' ||
      ex.context?.pageType === 'decision-validation' ||
      ex.quality?.factors?.multiStepJourney ||
      ex.quality?.factors?.funnelProgression
    );
    
    const individualExamples = nonCartExamples.filter(ex => !journeyExamples.includes(ex));
    console.log(`📊 [QUALITY FILTER] Found ${journeyExamples.length} journey examples, ${individualExamples.length} individual examples`);
    
    // 🛒 CART EXAMPLES: Lower quality threshold (0.2) - always include cart interactions
    const qualityCartExamples = cartExamples.filter(ex => ex.quality.score >= 0.2);
    console.log(`✅ [QUALITY FILTER] ${qualityCartExamples.length} cart examples pass quality threshold (0.2)`);
    
    // 🎯 JOURNEY EXAMPLES: Lower quality threshold (0.4) - prioritize complete flows
    const qualityJourneyExamples = journeyExamples.filter(ex => ex.quality.score >= 0.4);
    console.log(`✅ [QUALITY FILTER] ${qualityJourneyExamples.length} journey examples pass quality threshold (0.4)`);
    
    // 🔍 INDIVIDUAL EXAMPLES: Lower quality threshold (0.3) - include rich spatial context
    const qualityIndividualExamples = individualExamples.filter(ex => ex.quality.score >= 0.3);
    console.log(`✅ [QUALITY FILTER] ${qualityIndividualExamples.length} individual examples pass quality threshold (0.3)`);
    
    // 📊 ENHANCED PRIORITIZATION STRATEGY:
    // 1. Include ALL cart interactions first (highest priority)
    // 2. Include ALL high-quality journey examples second
    // 3. Add individual examples only if we have space and they're high quality
    const prioritizedExamples = [...qualityCartExamples];
    console.log(`🛒 [QUALITY FILTER] Starting with ${prioritizedExamples.length} cart interaction examples`);
    
    prioritizedExamples.push(...qualityJourneyExamples);
    console.log(`🎯 [QUALITY FILTER] Added ${qualityJourneyExamples.length} journey examples`);
    
    // Add individual examples up to a reasonable limit (don't overwhelm with individual actions)
    const maxIndividualExamples = Math.max(qualityJourneyExamples.length + qualityCartExamples.length, 5);
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
   * 🛒 Detect if a training example involves cart interactions
   * Used for prioritizing cart button training examples with lower quality threshold
   */
  private isCartTrainingExample(example: TrainingExample): boolean {
    const prompt = example.prompt.toLowerCase();
    const completion = example.completion.toLowerCase();
    
    // Pattern 1: Direct cart text detection
    const cartTextPatterns = [
      'add to cart', 'add to bag', 'add to basket',
      'add product', 'add item', 'buy now', 
      'purchase', 'checkout', 'shopping cart'
    ];
    const hasCartText = cartTextPatterns.some(pattern => 
      prompt.includes(pattern) || completion.includes(pattern)
    );
    
    // Pattern 2: Cart-specific business context
    const hasCartBusinessContext = 
      prompt.includes('[BUSINESS CONTEXT]') && 
      (prompt.includes('Product:') || prompt.includes('Size:') || prompt.includes('Color:'));
    
    // Pattern 3: E-commerce interaction with product context
    const hasEcommerceWithProduct = 
      prompt.includes('hostname: gap.com') && 
      (prompt.includes('product') || prompt.includes('size') || prompt.includes('color'));
    
    // Pattern 4: Completion indicates cart action
    const completionIndicatesCart = 
      completion.includes('cart') || 
      completion.includes('bag') || 
      completion.includes('add') ||
      completion.includes('purchase');
    
    // Return true if any pattern matches
    return hasCartText || hasCartBusinessContext || hasEcommerceWithProduct || completionIndicatesCart;
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
        quality: interactions[0] ? this.calculateComprehensiveQuality(interactions[0]) : this.getDefaultQuality()
      });
    }

    return examples;
  }

  /**
   * Default quality for cases where no interaction data is available
   */
  private getDefaultQuality(): any {
    return {
      score: 0.3,
      factors: {
        hasReliableSelector: false,
        hasSpatialContext: false,
        hasBusinessContext: false,
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
        hasUserContext: false,
        hasCompleteNearbyElements: false,
        hasDesignSystemContext: false,
        hasBehaviorPatternsContext: false,
        multiStepJourney: false,
        funnelProgression: false,
        conversionComplete: false,
        clearUserIntent: false,
        journeyPrioritized: false
      }
    };
  }

  // 🔧 HELPER METHODS (per FOCUSED_TASKS.md - keep embedded)



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





  private extractPageContext(contextData: any): any {
    const context: any = {};
    
    // 🔧 FIX: Extract real page data from context
    context.url = contextData?.url || contextData?.pageUrl || '';
    context.pageTitle = contextData?.pageTitle || '';
    
    // Determine page type from URL
    if (context.url) {
      const url = context.url.toLowerCase();
      if (url.includes('/search')) context.pageType = 'search-results';
      else if (url.includes('/product') || url.includes('/p/')) context.pageType = 'product-detail';
      else if (url.includes('/cart') || url.includes('/bag')) context.pageType = 'cart';
      else if (url.includes('/checkout')) context.pageType = 'checkout';
      else if (url.includes('/browse') || url.includes('/category')) context.pageType = 'category';
      else if (url.match(/\.\w+\/$/) || url.match(/\.\w+$/)) context.pageType = 'homepage';
      else context.pageType = 'content';
    }
    
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
      hasBehaviorPatternsContext: !!interaction.business?.user?.behaviorPatterns,
      
      // 🎯 HOVER-SPECIFIC QUALITY FACTORS (Enhanced)
      hasHoverContext: interaction.interaction?.type === 'HOVER',
      hasHoverClickSequence: false, // Will be set below
      hasDropdownRevealContext: false, // Will be set below
      
      // 🚀 ENHANCED HOVER QUALITY FACTORS (PHASE 4C)
      hasCompleteHoverSequence: false,     // Full hover→reveal→click sequence
      hasMegaMenuContext: false,           // Complex mega-menu interactions
      hasOptimalHoverTiming: false,        // Good timing between hover and click
      hasRichDropdownContext: false,       // Rich context captured during hover
      hasHoverFailurePattern: false,       // Failed or incomplete hover sequences
      hasMultiLevelDropdown: false,        // Nested dropdown navigation
      hasHoverAccessibilityContext: false, // ARIA/accessibility info from hover
      hasDropdownCategorization: false     // Semantic categorization of revealed items
    };

    // Extract hover context for quality assessment
    const hoverContext = this.extractHoverContext(interaction, undefined, undefined);
    factors.hasHoverClickSequence = hoverContext.isHoverClickSequence;
    factors.hasDropdownRevealContext = !!(hoverContext.revealedElements?.length > 0 || hoverContext.wasRevealedByHover);
    
    // 🚀 ENHANCED HOVER QUALITY ASSESSMENT (PHASE 4C)
    const enhancedHoverFactors = this.assessEnhancedHoverQuality(interaction, hoverContext, undefined, undefined);
    Object.assign(factors, enhancedHoverFactors);

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
    
    // 🎯 HOVER-SPECIFIC SCORING (very high value for e-commerce automation!)
    if (factors.hasHoverContext) score += 0.08;            // Base hover interaction value
    if (factors.hasHoverClickSequence) score += 0.12;      // Good hover→click sequences
    if (factors.hasDropdownRevealContext) score += 0.10;   // Dropdown content revelation
    
    // 🚀 ENHANCED HOVER SCORING (PHASE 4C) - Premium scoring for sophisticated hover patterns
    if (factors.hasCompleteHoverSequence) score += 0.18;      // HIGHEST - Complete hover→reveal→click sequences
    if (factors.hasMegaMenuContext) score += 0.15;            // Very high - Complex mega-menu navigation
    if (factors.hasOptimalHoverTiming) score += 0.12;         // High - Well-timed hover interactions
    if (factors.hasRichDropdownContext) score += 0.10;        // Good - Rich context capture
    if (factors.hasMultiLevelDropdown) score += 0.14;         // Very high - Nested dropdown complexity
    if (factors.hasHoverAccessibilityContext) score += 0.08;  // Good - Accessibility context
    if (factors.hasDropdownCategorization) score += 0.06;     // Decent - Semantic categorization
    
    // 🚨 HOVER QUALITY PENALTIES
    if (factors.hasHoverFailurePattern) score -= 0.15;        // Penalty for failed hover sequences

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
   * 🎯 Extract hover-specific context for dropdown navigation training
   */
  private extractHoverContext(interaction: any, allInteractions?: any[], interactionIndex?: number): any {
    const context: any = {
      isHoverInteraction: false,
      hoverSequence: '',
      dropdownContext: '',
      revealedElements: [],
      isHoverClickSequence: false,
      hoverPurpose: ''
    };

    // Check if this is a hover interaction
    const interactionType = interaction.interaction?.type;
    if (interactionType === 'HOVER') {
      context.isHoverInteraction = true;
      
      // Extract hover-specific data from hoverContext
      const hoverData = interaction.hoverContext;
      if (hoverData) {
        context.dropdownContext = hoverData.dropdownTarget || '';
        context.revealedElements = hoverData.revealedElements || [];
        
        // Check if next interaction is a click (hover→click sequence)
        if (allInteractions && interactionIndex !== undefined && interactionIndex < allInteractions.length - 1) {
          const nextInteraction = allInteractions[interactionIndex + 1];
          if (nextInteraction?.interaction?.type === 'CLICK') {
            context.isHoverClickSequence = true;
            context.hoverPurpose = 'Enable subsequent click action';
            
            // Build sequence description
            const nextElementText = nextInteraction.element?.text || '';
            context.hoverSequence = `Hover over "${context.dropdownContext}" reveals menu, then click "${nextElementText}"`;
          } else {
            context.hoverSequence = `Hover over "${context.dropdownContext}" reveals dropdown menu`;
            context.hoverPurpose = 'Reveal dropdown navigation options';
          }
        } else {
          context.hoverSequence = `Hover over "${context.dropdownContext}" to reveal navigation`;
          context.hoverPurpose = 'Display hidden navigation elements';
        }
        
        // Add revealed elements to context
        if (context.revealedElements.length > 0) {
          const revealedTexts = context.revealedElements.map((el: any) => el.text).slice(0, 3);
          context.hoverSequence += ` (reveals: ${revealedTexts.join(', ')})`;
        }
      }
    }
    // Check if this is a click that follows a hover (part of hover→click sequence)
    else if (interactionType === 'CLICK' && allInteractions && interactionIndex !== undefined && interactionIndex > 0) {
      const prevInteraction = allInteractions[interactionIndex - 1];
      const clickedElementText = interaction.element?.text || '';
      
      if (prevInteraction?.interaction?.type === 'HOVER') {
        const hoverData = prevInteraction.hoverContext;
        const revealedElements = hoverData?.revealedElements || [];
        
        // Check if clicked element was revealed by the hover
        const wasRevealed = revealedElements.some((el: any) => 
          el.text && clickedElementText && el.text.trim() === clickedElementText.trim()
        );
        
        if (wasRevealed) {
          context.isHoverClickSequence = true;
          context.hoverSequence = `Element "${clickedElementText}" revealed by hover on "${hoverData?.dropdownTarget || 'navigation'}", then clicked`;
          context.hoverPurpose = 'Click on dynamically revealed dropdown element';
          context.dropdownContext = hoverData?.dropdownTarget || '';
          context.wasRevealedByHover = true;
        } else {
          // Click after hover but not on revealed element
          context.isHoverClickSequence = true;
          context.hoverSequence = `Click after hover on "${hoverData?.dropdownTarget || 'navigation'}"`;
          context.hoverPurpose = 'Complete hover-initiated navigation sequence';
        }
      }
      
      // Also check interactions within the last 2-3 interactions for hover context
      // (in case there are other interactions between hover and click)
      if (!context.isHoverClickSequence && interactionIndex > 1) {
        for (let i = Math.max(0, interactionIndex - 3); i < interactionIndex; i++) {
          const checkInteraction = allInteractions[i];
          if (checkInteraction?.interaction?.type === 'HOVER') {
            const hoverData = checkInteraction.hoverContext;
            const revealedElements = hoverData?.revealedElements || [];
            
            const wasRevealed = revealedElements.some((el: any) => 
              el.text && clickedElementText && el.text.trim() === clickedElementText.trim()
            );
            
            if (wasRevealed) {
              context.isHoverClickSequence = true;
              context.hoverSequence = `Element "${clickedElementText}" revealed by earlier hover on "${hoverData?.dropdownTarget || 'navigation'}", now clicked`;
              context.hoverPurpose = 'Click on dynamically revealed dropdown element (delayed)';
              context.dropdownContext = hoverData?.dropdownTarget || '';
              context.wasRevealedByHover = true;
              break;
            }
          }
        }
      }
    }

    return context;
  }

  /**
   * 🚀 ENHANCED HOVER QUALITY ASSESSMENT (PHASE 4C)
   * Sophisticated analysis of hover interaction patterns for premium training data quality
   */
  private assessEnhancedHoverQuality(interaction: any, hoverContext: any, allInteractions?: any[], interactionIndex?: number): any {
    const factors: any = {
      hasCompleteHoverSequence: false,
      hasMegaMenuContext: false,
      hasOptimalHoverTiming: false,
      hasRichDropdownContext: false,
      hasHoverFailurePattern: false,
      hasMultiLevelDropdown: false,
      hasHoverAccessibilityContext: false,
      hasDropdownCategorization: false
    };

    // 🔍 ANALYSIS 1: Complete Hover Sequence Detection
    if (hoverContext.isHoverClickSequence && hoverContext.wasRevealedByHover) {
      // Check for complete sequence: hover → dropdown appears → element clicked
      const hasRevealedElements = hoverContext.revealedElements?.length > 0;
      const hasDropdownTarget = !!hoverContext.dropdownContext;
      const hasClickTarget = !!hoverContext.hoverPurpose;
      
      if (hasRevealedElements && hasDropdownTarget && hasClickTarget) {
        factors.hasCompleteHoverSequence = true;
      }
    }

    // 🔍 ANALYSIS 2: Mega-Menu Complexity Detection
    if (hoverContext.revealedElements?.length > 0) {
      const numRevealedElements = hoverContext.revealedElements.length;
      
      // Mega-menu indicators
      const hasManyItems = numRevealedElements >= 8;
      const hasCategories = hoverContext.revealedElements.some((el: any) => 
        el.role === 'heading' || el.tag === 'h1' || el.tag === 'h2' || el.tag === 'h3'
      );
      const hasComplexStructure = hoverContext.revealedElements.some((el: any) => 
        el.text?.includes('|') || el.classes?.includes('mega') || el.classes?.includes('grid')
      );
      
      if (hasManyItems || hasCategories || hasComplexStructure) {
        factors.hasMegaMenuContext = true;
      }
    }

    // 🔍 ANALYSIS 3: Hover Timing Analysis
    if (allInteractions && interactionIndex !== undefined && hoverContext.isHoverClickSequence) {
      // Find the hover and subsequent click
      let hoverTimestamp = null;
      let clickTimestamp = null;
      
      if (interaction.interaction?.type === 'HOVER') {
        hoverTimestamp = interaction.interaction?.timestamp;
        // Look for next click
        for (let i = interactionIndex + 1; i < Math.min(interactionIndex + 3, allInteractions.length); i++) {
          if (allInteractions[i]?.interaction?.type === 'CLICK') {
            clickTimestamp = allInteractions[i].interaction?.timestamp;
            break;
          }
        }
      } else if (interaction.interaction?.type === 'CLICK') {
        clickTimestamp = interaction.interaction?.timestamp;
        // Look for previous hover
        for (let i = Math.max(0, interactionIndex - 3); i < interactionIndex; i++) {
          if (allInteractions[i]?.interaction?.type === 'HOVER') {
            hoverTimestamp = allInteractions[i].interaction?.timestamp;
          }
        }
      }
      
      if (hoverTimestamp && clickTimestamp) {
        const timeDiff = Math.abs(clickTimestamp - hoverTimestamp);
        // Optimal timing: 200ms - 2000ms (not too fast, not too slow)
        if (timeDiff >= 200 && timeDiff <= 2000) {
          factors.hasOptimalHoverTiming = true;
        }
        // Failure pattern: too fast (< 100ms) suggests accidental hover
        if (timeDiff < 100) {
          factors.hasHoverFailurePattern = true;
        }
      }
    }

    // 🔍 ANALYSIS 4: Rich Dropdown Context Assessment
    const contextRichness = this.assessHoverContextRichness(hoverContext, interaction);
    factors.hasRichDropdownContext = contextRichness.isRich;
    factors.hasMultiLevelDropdown = contextRichness.hasNesting;
    factors.hasDropdownCategorization = contextRichness.hasCategorization;

    // 🔍 ANALYSIS 5: Accessibility Context Detection
    const hoverData = interaction.hoverContext;
    if (hoverData) {
      const hasAriaLabels = hoverContext.revealedElements?.some((el: any) => 
        el.ariaLabel || el.ariaDescribedBy || el.role
      );
      const hasFocusManagement = hoverData.focusContext || hoverData.keyboardNavigation;
      const hasAccessibleStructure = hoverContext.revealedElements?.some((el: any) => 
        el.role === 'menuitem' || el.role === 'button' || el.role === 'link'
      );
      
      if (hasAriaLabels || hasFocusManagement || hasAccessibleStructure) {
        factors.hasHoverAccessibilityContext = true;
      }
    }

    // 🔍 ANALYSIS 6: Failure Pattern Detection
    if (!factors.hasHoverFailurePattern) {
      // Check for other failure patterns
      const isIncompleteSequence = hoverContext.isHoverInteraction && !hoverContext.isHoverClickSequence;
      const hasNoRevealedElements = hoverContext.isHoverInteraction && (!hoverContext.revealedElements || hoverContext.revealedElements.length === 0);
      const hasEmptyDropdownContext = hoverContext.isHoverInteraction && !hoverContext.dropdownContext;
      
      if (isIncompleteSequence || hasNoRevealedElements || hasEmptyDropdownContext) {
        factors.hasHoverFailurePattern = true;
      }
    }

    return factors;
  }

  /**
   * 🎯 Assess richness of hover context for quality scoring
   */
  private assessHoverContextRichness(hoverContext: any, interaction: any): any {
    const assessment = {
      isRich: false,
      hasNesting: false,
      hasCategorization: false,
      contextScore: 0
    };

    const revealedElements = hoverContext.revealedElements || [];
    
    // Rich context indicators
    let richnessFactor = 0;
    
    // 1. Number of revealed elements
    if (revealedElements.length >= 5) richnessFactor += 2;
    else if (revealedElements.length >= 3) richnessFactor += 1;
    
    // 2. Element diversity
    const elementTypes = new Set(revealedElements.map((el: any) => el.tag));
    if (elementTypes.size >= 3) richnessFactor += 2;
    
    // 3. Semantic structure
    const hasHeaders = revealedElements.some((el: any) => ['h1', 'h2', 'h3', 'h4'].includes(el.tag));
    const hasLists = revealedElements.some((el: any) => ['ul', 'ol', 'li'].includes(el.tag));
    const hasNavigation = revealedElements.some((el: any) => el.role === 'navigation' || el.tag === 'nav');
    
    if (hasHeaders) richnessFactor += 1;
    if (hasLists) richnessFactor += 1;
    if (hasNavigation) richnessFactor += 1;
    
    // 4. Multi-level nesting detection
    const hasNestedStructure = revealedElements.some((el: any) => 
      el.classes?.includes('sub') || el.classes?.includes('nested') || 
      el.parentElement?.classes?.includes('dropdown')
    );
    if (hasNestedStructure) {
      assessment.hasNesting = true;
      richnessFactor += 2;
    }
    
    // 5. Categorization detection
    const categoryKeywords = ['men', 'women', 'kids', 'sale', 'new', 'category', 'collection'];
    const hasCategoryStructure = revealedElements.some((el: any) => 
      categoryKeywords.some(keyword => el.text?.toLowerCase().includes(keyword))
    );
    if (hasCategoryStructure) {
      assessment.hasCategorization = true;
      richnessFactor += 1;
    }

    // 6. Business context richness
    const businessContext = interaction.business;
    if (businessContext?.ecommerce?.product || businessContext?.ecommerce?.navigation) {
      richnessFactor += 1;
    }

    assessment.contextScore = richnessFactor;
    assessment.isRich = richnessFactor >= 4; // Threshold for "rich" context

    return assessment;
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
          console.log(`🎯 [JOURNEY GROUPING] Journey ${journeys.length}: ${currentJourney.length} interactions (${this.journeyContextService.detectJourneyType(currentJourney)})`);
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
      console.log(`🎯 [JOURNEY GROUPING] Final journey ${journeys.length}: ${currentJourney.length} interactions (${this.journeyContextService.detectJourneyType(currentJourney)})`);
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
    const journeyType = this.journeyContextService.detectJourneyType(journey);
    const journeyGoal = this.journeyContextService.extractJourneyGoal(journey);
    const userIntent = this.journeyContextService.extractUserIntent(journey);
    
    // Extract comprehensive journey analytics
    const journeyAnalytics = this.journeyContextService.analyzeJourneyPattern(journey);
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
   * 🎯 JOURNEY GOAL EXTRACTION: Identify what user is trying to accomplish (realistic endpoints)
   */

  /**
   * 🧠 USER INTENT EXTRACTION: Understand why user is taking this journey
   * Priority: 1) Generated task 2) Inferred intent 3) Generic fallback
   */

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

  /**
   * Helper methods for enhanced DOM-grounded training examples
   */
  private getSelectorReasoningText(selector: string, reliability: number): string {
    if (selector.includes('data-testid') || selector.includes('data-test')) {
      return 'data-testid provides stable semantic identification';
    }
    if (selector.includes('#') && !selector.includes(' ')) {
      return 'unique ID selector offers high specificity';
    }
    if (selector.startsWith('//') || selector.startsWith('/')) {
      return `XPath selector with ${reliability > 0.8 ? 'strong' : 'moderate'} DOM stability`;
    }
    if (selector.includes('[aria-label') || selector.includes('[role')) {
      return 'accessibility attributes provide semantic context';
    }
    if (selector.includes('.') && selector.split('.').length <= 3) {
      return 'class-based selector with reasonable specificity';
    }
    return `generic selector with ${reliability.toFixed(2)} reliability score`;
  }

  private getExpectedOutcome(interaction: EnhancedInteractionData): string {
    const actionType = interaction.interaction?.type?.toLowerCase() || 'click';
    const pageType = interaction.context?.pageType || 'unknown';
    const elementText = interaction.element?.text || '';
    
    // Business-specific outcomes
    if (elementText.toLowerCase().includes('add to cart') || elementText.toLowerCase().includes('add to bag')) {
      return 'product added to cart, cart counter update';
    }
    if (elementText.toLowerCase().includes('checkout') || elementText.toLowerCase().includes('proceed')) {
      return 'navigation to checkout/payment page';
    }
    if (elementText.toLowerCase().includes('search') || elementText.toLowerCase().includes('find')) {
      return 'search results display, page content update';
    }
    if (elementText.toLowerCase().includes('sign up') || elementText.toLowerCase().includes('register')) {
      return 'navigation to registration form';
    }
    if (elementText.toLowerCase().includes('login') || elementText.toLowerCase().includes('sign in')) {
      return 'authentication modal or login page';
    }
    
    // Action-specific outcomes
    if (actionType === 'input' || actionType === 'type') {
      return 'form field populated, validation feedback';
    }
    if (actionType === 'select') {
      return 'dropdown selection, form state update';
    }
    if (actionType === 'hover') {
      return 'tooltip display, visual state change';
    }
    
    // Page-specific outcomes
    if (pageType === 'product') {
      return 'product detail interaction, state change';
    }
    if (pageType === 'category') {
      return 'category navigation, filtered results';
    }
    if (pageType === 'cart') {
      return 'cart modification, total update';
    }
    
    return 'page state change, UI update';
  }












  /**
   * Infer ARIA role from HTML element and attributes
   */
  private inferAriaRole(tag: string, attributes: any): string | null {
    // Explicit roles take precedence
    if (attributes.role) return attributes.role;
    
    // Implicit roles based on HTML semantics
    const roleMap: { [key: string]: string | null } = {
      'button': 'button',
      'a': attributes.href ? 'link' : null,
      'input': this.getInputRole(attributes.type),
      'select': 'combobox',
      'textarea': 'textbox',
      'h1': 'heading',
      'h2': 'heading',
      'h3': 'heading',
      'h4': 'heading',
      'h5': 'heading',
      'h6': 'heading',
      'nav': 'navigation',
      'main': 'main',
      'header': 'banner',
      'footer': 'contentinfo',
      'aside': 'complementary',
      'section': 'region',
      'article': 'article',
      'form': 'form',
      'table': 'table',
      'img': 'img',
      'ul': 'list',
      'ol': 'list',
      'li': 'listitem'
    };
    
    return roleMap[tag] || null;
  }

  /**
   * Get appropriate role for input elements based on type
   */
  private getInputRole(inputType: string): string | null {
    const inputRoles: { [key: string]: string } = {
      'button': 'button',
      'submit': 'button',
      'reset': 'button',
      'checkbox': 'checkbox',
      'radio': 'radio',
      'text': 'textbox',
      'email': 'textbox',
      'password': 'textbox',
      'search': 'searchbox',
      'tel': 'textbox',
      'url': 'textbox',
      'number': 'spinbutton',
      'range': 'slider'
    };
    
    return inputRoles[inputType] || 'textbox';
  }


  /**
   * 🔄 Generate user path sequence showing how user arrived at current element
   */
  private generateUserPathSequence(allInteractions: any[], currentIndex: number): string | null {
    if (currentIndex < 1) return null; // Need previous interactions
    
    // Look back up to 5 interactions to show user path
    const lookbackCount = Math.min(5, currentIndex);
    const pathInteractions = allInteractions.slice(currentIndex - lookbackCount, currentIndex + 1);
    
    const pathSteps: string[] = [];
    
    pathInteractions.forEach((interaction, index) => {
      const isCurrentInteraction = index === pathInteractions.length - 1;
      const stepNumber = currentIndex - lookbackCount + index + 1;
      
      // Extract key information for path step
      const context = interaction.context || {};
      const element = interaction.element || {};
      const url = context.url || context.pageUrl || '';
      const pageTitle = context.pageTitle || '';
      const elementText = (element.text || '').slice(0, 30);
      const elementTag = element.tag || 'element';
      
      // Determine page type from URL
      const pageType = this.inferPageTypeFromUrl(url);
      
      // Create meaningful step description
      let stepDescription = '';
      if (pageType === 'homepage') {
        stepDescription = 'Started on homepage';
      } else if (pageType === 'category') {
        stepDescription = `Browsed ${this.extractCategoryFromUrl(url)} category`;
      } else if (pageType === 'product') {
        const productName = pageTitle.split('|')[0]?.trim() || 'product';
        stepDescription = `Viewed ${productName.slice(0, 25)}${productName.length > 25 ? '...' : ''}`;
      } else if (pageType === 'search') {
        stepDescription = 'Performed search';
      } else {
        stepDescription = `Navigated to ${pageType}`;
      }
      
      // Add element interaction detail if not a navigation
      if (elementText && elementTag !== 'body' && elementTag !== 'html') {
        if (elementText.toLowerCase().includes('add to')) {
          stepDescription += ` → Clicked "${elementText}"`;
        } else if (elementTag === 'input' && element.attributes?.type === 'radio') {
          stepDescription += ` → Selected "${elementText}"`;
        } else if (elementText.length > 0) {
          stepDescription += ` → Clicked "${elementText.slice(0, 20)}${elementText.length > 20 ? '...' : ''}"`;
        }
      }
      
      // Format the step
      const stepMarker = isCurrentInteraction ? '→ [CURRENT]' : `→ Step ${stepNumber}`;
      pathSteps.push(`${stepMarker} ${stepDescription}`);
    });
    
    return pathSteps.length > 1 ? pathSteps.join('\n') : null;
  }

  /**
   * Infer page type from URL for path sequence
   */
  private inferPageTypeFromUrl(url: string): string {
    if (!url) return 'unknown';
    
    const lowerUrl = url.toLowerCase();
    
    if (lowerUrl === '/' || lowerUrl.includes('/home') || lowerUrl.endsWith('.com') || lowerUrl.endsWith('.com/')) {
      return 'homepage';
    }
    if (lowerUrl.includes('/product') || lowerUrl.includes('/p/')) {
      return 'product';
    }
    if (lowerUrl.includes('/category') || lowerUrl.includes('/browse') || lowerUrl.includes('/men') || lowerUrl.includes('/women')) {
      return 'category';
    }
    if (lowerUrl.includes('/search') || lowerUrl.includes('?q=')) {
      return 'search';
    }
    if (lowerUrl.includes('/cart') || lowerUrl.includes('/bag')) {
      return 'cart';
    }
    if (lowerUrl.includes('/checkout')) {
      return 'checkout';
    }
    
    return 'page';
  }

  /**
   * Extract category name from URL for path descriptions
   */
  private extractCategoryFromUrl(url: string): string {
    const categories = ['men', 'women', 'kids', 'shirts', 'pants', 'shoes', 'hoodies'];
    const lowerUrl = url.toLowerCase();
    
    for (const category of categories) {
      if (lowerUrl.includes(category)) {
        return category.charAt(0).toUpperCase() + category.slice(1);
      }
    }
    
    return 'items';
  }

  /**
   * Extract product ID from interaction context for state accumulator
   */
}

// Export singleton for dependency injection
export const trainingDataTransformer = (selectorStrategy: SelectorStrategyService) => 
  new TrainingDataTransformerImpl(selectorStrategy);