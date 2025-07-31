/**
 * ShoppingFlowAnalysisService
 * 
 * Handles shopping behavior and conversion funnel analysis including:
 * - Shopping flow analysis and funnel tracking
 * - Purchase funnel extraction
 * - Cart workflow analysis
 * - Product configuration flow
 * - Checkout sequence tracking
 * - Shopping behavior pattern analysis
 */

// import { ShoppingFlowAnalysis, PurchaseFunnel, CartWorkflow, ProductConfigurationFlow, CheckoutSequence, ShoppingBehaviorPattern, EcommerceActionSequence } from '../types/world-model-types';

export interface IShoppingFlowAnalysisService {
  extractShoppingFlowAnalysis(interactions: ParsedInteraction[], domain: string): ShoppingFlowAnalysis;
  extractPurchaseFunnel(interactions: ParsedInteraction[]): PurchaseFunnel;
  extractCartWorkflow(interactions: ParsedInteraction[]): CartWorkflow;
  extractProductConfigurationFlow(interactions: ParsedInteraction[]): ProductConfigurationFlow;
  extractCheckoutSequence(interactions: ParsedInteraction[]): CheckoutSequence;
  extractShoppingBehaviorPatterns(interactions: ParsedInteraction[]): ShoppingBehaviorPattern[];
  extractEcommerceActionSequences(interactions: ParsedInteraction[]): EcommerceActionSequence[];
}

export class ShoppingFlowAnalysisService implements IShoppingFlowAnalysisService {
  
  extractShoppingFlowAnalysis(interactions: ParsedInteraction[], domain: string): ShoppingFlowAnalysis {
    console.log(`🛌 SHOPPING_FLOW_PARSER: Analyzing ${interactions.length} interactions for shopping flow analysis`);
    
    // Extract purchase funnel analysis
    const purchaseFunnel = this.extractPurchaseFunnel(interactions);
    
    // Extract cart workflow analysis
    const cartWorkflow = this.extractCartWorkflow(interactions);
    
    // Extract product configuration flow
    const productConfigurationFlow = this.extractProductConfigurationFlow(interactions);
    
    // Extract checkout sequence analysis
    const checkoutSequence = this.extractCheckoutSequence(interactions);
    
    // Extract shopping behavior patterns
    const shoppingBehaviorPatterns = this.extractShoppingBehaviorPatterns(interactions);
    
    // Extract e-commerce action sequences
    const ecommerceActionSequences = this.extractEcommerceActionSequences(interactions);
    
    // Calculate discovery metadata
    const discoveryMetadata = {
      totalShoppingActions: this.countShoppingActions(interactions),
      funnelCompletionRate: this.calculateFunnelCompletionRate(purchaseFunnel),
      cartAbandonmentStage: this.determineCartAbandonmentStage(cartWorkflow),
      shoppingIntentStrength: this.calculateShoppingIntentStrength(interactions),
      extractedAt: new Date()
    };
    
    const shoppingFlowAnalysis: ShoppingFlowAnalysis = {
      purchaseFunnel,
      cartWorkflow,
      productConfigurationFlow,
      checkoutSequence,
      shoppingBehaviorPatterns,
      ecommerceActionSequences,
      discoveryMetadata
    };
    
    console.log(`🛌 SHOPPING_FLOW_PARSER: Extracted shopping flow analysis`);
    console.log(`   Purchase Funnel: ${purchaseFunnel.stages.length} stages, status ${purchaseFunnel.completionStatus}`);
    console.log(`   Cart Workflow: ${cartWorkflow.cartActions.length} cart actions`);
    console.log(`   Product Configuration: ${productConfigurationFlow.configurationSteps.length} configuration steps`);
    console.log(`   Shopping Behavior: ${shoppingBehaviorPatterns.length} behavior patterns identified`);
    console.log(`   E-commerce Actions: ${ecommerceActionSequences.length} action sequences`);
    
    return shoppingFlowAnalysis;
  }

  extractPurchaseFunnel(interactions: ParsedInteraction[]): PurchaseFunnel {
    const stages: FunnelStage[] = [];
    const conversionEvents: ConversionEvent[] = [];
    
    // Identify funnel stages based on URL patterns and interactions
    let currentStage = 'browse';
    let stageStartTime: Date | undefined;
    
    for (let i = 0; i < interactions.length; i++) {
      const interaction = interactions[i];
      const url = interaction.context?.url || '';
      const newStage = this.determineStageFromUrl(url, interaction);
      
      if (newStage !== currentStage) {
        // Stage transition detected
        if (stageStartTime) {
          stages.push({
            stageId: `stage_${stages.length}`,
            stageName: this.getStageDisplayName(currentStage),
            stageType: currentStage as any,
            entryTime: stageStartTime,
            exitTime: new Date(interaction.timestamp || Date.now()),
            duration: (interaction.timestamp || Date.now()) - stageStartTime.getTime(),
            interactions: [],
            completionRate: 1.0
          });
        }
        
        currentStage = newStage;
        stageStartTime = new Date(interaction.timestamp || Date.now());
      }
      
      // Check for conversion events
      if (this.isConversionEvent(interaction)) {
        conversionEvents.push({
          eventType: this.getConversionEventType(interaction),
          timestamp: new Date(interaction.timestamp || Date.now()),
          productData: this.extractProductDataFromInteraction(interaction),
          value: this.extractValueFromInteraction(interaction)
        });
      }
    }
    
    return {
      stages,
      currentStage,
      progression: [],
      completionStatus: this.determineFunnelCompletionStatus(stages, interactions),
      dropOffPoints: [],
      conversionEvents
    };
  }

  extractCartWorkflow(interactions: ParsedInteraction[]): CartWorkflow {
    const cartActions: CartAction[] = [];
    
    // Look for cart-related interactions
    for (let i = 0; i < interactions.length; i++) {
      const interaction = interactions[i];
      
      if (this.isCartAction(interaction)) {
        cartActions.push({
          actionId: `cart_action_${cartActions.length}`,
          actionType: this.getCartActionType(interaction),
          timestamp: new Date(interaction.timestamp || Date.now()),
          productId: this.extractProductIdFromInteraction(interaction),
          quantity: this.extractQuantityFromInteraction(interaction),
          triggeredBy: interaction.element?.text || 'unknown',
          success: true
        });
      }
    }
    
    const cartState: CartState = {
      items: this.buildCartItems(cartActions),
      totalItems: cartActions.filter(a => a.actionType === 'add_to_cart').length,
      totalValue: 0,
      currency: 'USD',
      lastUpdated: new Date(),
      cartStatus: cartActions.length > 0 ? 'active' : 'empty'
    };
    
    const abandonmentAnalysis = {
      abandoned: this.isCartAbandoned(interactions, cartActions),
      abandonmentStage: this.getAbandonmentStage(interactions, cartActions),
      abandonmentReason: this.getAbandonmentReason(interactions, cartActions),
      timeToAbandonment: this.calculateTimeToAbandonment(interactions, cartActions)
    };
    
    return {
      cartActions,
      cartState,
      cartInteractions: [],
      abandonmentAnalysis
    };
  }

  extractProductConfigurationFlow(interactions: ParsedInteraction[]): ProductConfigurationFlow {
    const configurationSteps: ConfigurationStep[] = [];
    const selectionSequence: SelectionSequence[] = [];
    
    // Group interactions by product to understand configuration flows
    const productGroups = this.groupInteractionsByProduct(interactions);
    
    productGroups.forEach((productInteractions, productId) => {
      const steps = this.extractConfigurationStepsForProduct(productInteractions);
      configurationSteps.push(...steps);
      
      const sequence: SelectionSequence = {
        sequenceId: `seq_${productId}`,
        product: productId,
        selectionOrder: steps.map(s => s.stepType),
        selectionTimings: steps.map(s => s.endTime ? s.endTime.getTime() - s.startTime.getTime() : 0),
        finalConfiguration: this.extractFinalConfiguration(steps),
        decisionQuality: this.assessDecisionQuality(steps)
      };
      selectionSequence.push(sequence);
    });
    
    const configurationMetrics = {
      averageConfigurationTime: 0,
      completionRate: 0.8,
      mostCommonSequence: selectionSequence.length > 0 ? selectionSequence[0].selectionOrder : [],
      decisionStyle: this.analyzeDecisionStyle(configurationSteps),
      selectionSpeed: this.analyzeSelectionSpeed(configurationSteps)
    };
    
    return {
      configurationSteps,
      selectionSequence,
      configurationMetrics
    };
  }

  extractCheckoutSequence(interactions: ParsedInteraction[]): CheckoutSequence {
    const checkoutSteps: CheckoutStep[] = [];
    const paymentMethods: PaymentMethod[] = [];
    
    // Look for checkout-related interactions
    const checkoutInteractions = interactions.filter(i => this.isCheckoutInteraction(i));
    
    const checkoutProgress = {
      currentStep: 'not_started',
      completedSteps: [],
      totalSteps: 0,
      completionPercentage: 0,
      estimatedTimeRemaining: 0
    };
    
    const paymentInfo = {
      selectedMethod: this.getSelectedPaymentMethod(interactions),
      availableMethods: this.extractPaymentMethods(interactions),
      paymentAttempts: this.extractPaymentAttempts(interactions),
      paymentStatus: this.determinePaymentStatus(interactions)
    };
    
    return {
      checkoutSteps,
      checkoutProgress,
      paymentMethods,
      paymentInfo
    };
  }

  extractShoppingBehaviorPatterns(interactions: ParsedInteraction[]): ShoppingBehaviorPattern[] {
    const patterns: ShoppingBehaviorPattern[] = [];
    
    // Analyze browsing behavior
    patterns.push(this.analyzeBrowsingBehavior(interactions));
    
    // Analyze comparison behavior
    patterns.push(this.analyzeComparisonBehavior(interactions));
    
    // Analyze research behavior
    patterns.push(this.analyzeResearchBehavior(interactions));
    
    return patterns.filter(p => p != null);
  }

  extractEcommerceActionSequences(interactions: ParsedInteraction[]): EcommerceActionSequence[] {
    const sequences: EcommerceActionSequence[] = [];
    
    // Group interactions into sequences
    const interactionSequences = this.groupInteractionsIntoSequences(interactions);
    
    for (const sequence of interactionSequences) {
      const actions = sequence.map((interaction, index) => ({
        actionId: `action_${index}`,
        actionType: this.getEcommerceActionType(interaction),
        actionName: this.getEcommerceActionName(interaction),
        timestamp: new Date(interaction.timestamp || Date.now()),
        productContext: this.extractProductContext(interaction),
        businessImpact: this.assessBusinessImpact(interaction)
      }));
      
      if (actions.length > 0) {
        sequences.push({
          sequenceId: `seq_${sequences.length}`,
          sequenceType: this.determineSequenceType(actions),
          actions,
          startTime: actions[0].timestamp,
          endTime: actions[actions.length - 1].timestamp,
          duration: actions[actions.length - 1].timestamp.getTime() - actions[0].timestamp.getTime(),
          sequenceQuality: this.assessSequenceQuality(actions),
          userIntent: this.inferUserIntentFromActions(actions),
          businessValue: this.assessBusinessValueForActions(actions)
        });
      }
    }
    
    return sequences;
  }

  // Private helper methods

  // Private helper methods implementation
  private determineStageFromUrl(url: string, interaction: ParsedInteraction): string {
    if (url.includes('/cart') || url.includes('/checkout')) return 'checkout';
    if (url.includes('/product') || url.includes('/p/')) return 'product';
    if (url.includes('/browse') || url.includes('/category')) return 'browse';
    return 'browse';
  }

  private getStageDisplayName(stage: string): string {
    const stageNames: { [key: string]: string } = {
      'browse': 'Browse Products',
      'product': 'Product Details',
      'cart': 'Shopping Cart',
      'checkout': 'Checkout Process'
    };
    return stageNames[stage] || stage;
  }

  private isConversionEvent(interaction: ParsedInteraction): boolean {
    const text = interaction.element?.text?.toLowerCase() || '';
    return text.includes('add to cart') || text.includes('buy now') || text.includes('checkout');
  }

  private getConversionEventType(interaction: ParsedInteraction): 'product_view' | 'add_to_cart' | 'checkout_start' | 'payment_info' | 'purchase' {
    const text = interaction.element?.text?.toLowerCase() || '';
    if (text.includes('add to cart')) return 'add_to_cart';
    if (text.includes('checkout')) return 'checkout_start';
    if (text.includes('buy')) return 'purchase';
    return 'product_view';
  }

  private extractProductDataFromInteraction(interaction: ParsedInteraction): any {
    return {
      productId: 'unknown',
      productName: interaction.element?.text || 'unknown',
      url: interaction.context?.url || ''
    };
  }

  private extractValueFromInteraction(interaction: ParsedInteraction): number | undefined {
    // Try to extract price/value from interaction
    return undefined;
  }

  private determineFunnelCompletionStatus(stages: FunnelStage[], interactions: ParsedInteraction[]): 'completed' | 'abandoned' | 'in_progress' {
    const hasCheckout = stages.some(s => s.stageType === 'checkout');
    const hasPurchase = interactions.some(i => this.getConversionEventType(i) === 'purchase');
    
    if (hasPurchase) return 'completed';
    if (hasCheckout) return 'in_progress';
    return 'abandoned';
  }

  private isCartAction(interaction: ParsedInteraction): boolean {
    const text = interaction.element?.text?.toLowerCase() || '';
    return text.includes('add to cart') || text.includes('remove') || text.includes('quantity');
  }

  private getCartActionType(interaction: ParsedInteraction): 'add_to_cart' | 'remove_from_cart' | 'update_quantity' | 'view_cart' | 'proceed_to_checkout' {
    const text = interaction.element?.text?.toLowerCase() || '';
    if (text.includes('add to cart')) return 'add_to_cart';
    if (text.includes('remove')) return 'remove_from_cart';
    if (text.includes('quantity')) return 'update_quantity';
    if (text.includes('checkout')) return 'proceed_to_checkout';
    return 'view_cart';
  }

  private extractProductIdFromInteraction(interaction: ParsedInteraction): string | undefined {
    const url = interaction.context?.url || '';
    const match = url.match(/\/(\d+)/);
    return match ? match[1] : undefined;
  }

  private extractQuantityFromInteraction(interaction: ParsedInteraction): number | undefined {
    const text = interaction.element?.text || '';
    const match = text.match(/\d+/);
    return match ? parseInt(match[0]) : 1;
  }

  private buildCartItems(cartActions: CartAction[]): CartItem[] {
    const items: CartItem[] = [];
    // Implementation to build cart items from actions
    return items;
  }

  private isCartAbandoned(interactions: ParsedInteraction[], cartActions: CartAction[]): boolean {
    return cartActions.length > 0 && !cartActions.some(a => a.actionType === 'proceed_to_checkout');
  }

  private getAbandonmentStage(interactions: ParsedInteraction[], cartActions: CartAction[]): string | undefined {
    return 'cart';
  }

  private getAbandonmentReason(interactions: ParsedInteraction[], cartActions: CartAction[]): string | undefined {
    return 'unknown';
  }

  private calculateTimeToAbandonment(interactions: ParsedInteraction[], cartActions: CartAction[]): number | undefined {
    return undefined;
  }

  private groupInteractionsByProduct(interactions: ParsedInteraction[]): Map<string, ParsedInteraction[]> {
    const groups = new Map<string, ParsedInteraction[]>();
    // Implementation to group by product
    return groups;
  }

  private extractConfigurationStepsForProduct(interactions: ParsedInteraction[]): ConfigurationStep[] {
    return [];
  }

  private extractFinalConfiguration(steps: ConfigurationStep[]): { [attribute: string]: string } {
    return {};
  }

  private assessDecisionQuality(steps: ConfigurationStep[]): 'confident' | 'uncertain' | 'exploratory' {
    return 'confident';
  }

  private analyzeDecisionStyle(steps: ConfigurationStep[]): 'impulse' | 'research_heavy' | 'comparison_focused' | 'price_sensitive' {
    return 'research_heavy';
  }

  private analyzeSelectionSpeed(steps: ConfigurationStep[]): 'fast' | 'medium' | 'slow' {
    return 'medium';
  }

  private isCheckoutInteraction(interaction: ParsedInteraction): boolean {
    const url = interaction.context?.url || '';
    return url.includes('/checkout') || url.includes('/payment');
  }

  private extractPaymentMethods(interactions: ParsedInteraction[]): PaymentMethod[] {
    return [];
  }

  private getSelectedPaymentMethod(interactions: ParsedInteraction[]): string | undefined {
    return undefined;
  }

  private extractPaymentAttempts(interactions: ParsedInteraction[]): PaymentAttempt[] {
    return [];
  }

  private determinePaymentStatus(interactions: ParsedInteraction[]): 'not_attempted' | 'processing' | 'successful' | 'failed' {
    return 'not_attempted';
  }

  private analyzeBrowsingBehavior(interactions: ParsedInteraction[]): ShoppingBehaviorPattern {
    return {
      patternType: 'browsing',
      strength: 0.8,
      indicators: ['multiple_page_views'],
      description: 'User browsing multiple products'
    };
  }

  private analyzeComparisonBehavior(interactions: ParsedInteraction[]): ShoppingBehaviorPattern {
    return {
      patternType: 'comparison',
      strength: 0.6,
      indicators: ['product_comparison'],
      description: 'User comparing products'
    };
  }

  private analyzeResearchBehavior(interactions: ParsedInteraction[]): ShoppingBehaviorPattern {
    return {
      patternType: 'research',
      strength: 0.7,
      indicators: ['detailed_viewing'],
      description: 'User researching products'
    };
  }

  private groupInteractionsIntoSequences(interactions: ParsedInteraction[]): ParsedInteraction[][] {
    // Simple grouping - can be enhanced
    return [interactions];
  }

  private getEcommerceActionType(interaction: ParsedInteraction): string {
    return interaction.type || 'click';
  }

  private getEcommerceActionName(interaction: ParsedInteraction): string {
    return interaction.element?.text || 'unknown_action';
  }

  private extractProductContext(interaction: ParsedInteraction): any {
    return {
      url: interaction.context?.url,
      productPage: interaction.context?.url?.includes('/product')
    };
  }

  private assessBusinessImpact(interaction: ParsedInteraction): 'revenue_generating' | 'engagement' | 'research' | 'support' {
    const text = interaction.element?.text?.toLowerCase() || '';
    if (text.includes('buy') || text.includes('cart')) return 'revenue_generating';
    if (text.includes('view') || text.includes('click')) return 'engagement';
    return 'research';
  }

  private determineSequenceType(actions: EcommerceAction[]): 'product_discovery' | 'variant_selection' | 'cart_management' | 'checkout_flow' {
    return 'product_discovery';
  }

  private assessSequenceQuality(actions: EcommerceAction[]): number {
    return 0.8;
  }

  private countShoppingActions(interactions: ParsedInteraction[]): number {
    return interactions.filter(i => this.isShoppingAction(i)).length;
  }

  private isShoppingAction(interaction: ParsedInteraction): boolean {
    const text = interaction.element?.text?.toLowerCase() || '';
    return text.includes('cart') || text.includes('buy') || text.includes('checkout') || text.includes('product');
  }

  private calculateFunnelCompletionRate(funnel: PurchaseFunnel): number {
    return funnel.stages.length > 0 ? funnel.stages.filter(s => s.completionRate > 0.5).length / funnel.stages.length : 0;
  }

  private determineCartAbandonmentStage(cartWorkflow: CartWorkflow): string | undefined {
    return cartWorkflow.abandonmentAnalysis?.abandonmentStage;
  }

  private calculateShoppingIntentStrength(interactions: ParsedInteraction[]): number {
    const shoppingActions = this.countShoppingActions(interactions);
    return Math.min(shoppingActions / interactions.length, 1.0);
  }

  private inferUserIntentFromActions(actions: EcommerceAction[]): string {
    if (actions.some(a => a.actionName.includes('cart'))) return 'purchase_intent';
    if (actions.some(a => a.actionName.includes('product'))) return 'research_intent';
    return 'browsing_intent';
  }

  private assessBusinessValueForActions(actions: EcommerceAction[]): 'high' | 'medium' | 'low' {
    const revenueActions = actions.filter(a => a.businessImpact === 'revenue_generating').length;
    if (revenueActions > actions.length * 0.5) return 'high';
    if (revenueActions > 0) return 'medium';
    return 'low';
  }
}

// Type definitions (temporary - will be imported from proper types file)
interface ParsedInteraction {
  type: string;
  element: any;
  context: any;
  timestamp: number;
  selectors: any;
}

interface ShoppingFlowAnalysis {
  purchaseFunnel: PurchaseFunnel;
  cartWorkflow: CartWorkflow;
  productConfigurationFlow: ProductConfigurationFlow;
  checkoutSequence: CheckoutSequence;
  shoppingBehaviorPatterns: ShoppingBehaviorPattern[];
  ecommerceActionSequences: EcommerceActionSequence[];
  discoveryMetadata: any;
}

interface PurchaseFunnel {
  stages: FunnelStage[];
  currentStage: string;
  progression: any[];
  completionStatus: 'completed' | 'abandoned' | 'in_progress';
  dropOffPoints: any[];
  conversionEvents: ConversionEvent[];
}

interface FunnelStage {
  stageId: string;
  stageName: string;
  stageType: any;
  entryTime: Date;
  exitTime: Date;
  duration: number;
  interactions: any[];
  completionRate: number;
}

interface ConversionEvent {
  eventType: 'product_view' | 'add_to_cart' | 'checkout_start' | 'payment_info' | 'purchase';
  timestamp: Date;
  productData: any;
  value?: number;
}

interface CartWorkflow {
  cartActions: CartAction[];
  cartState: CartState;
  cartInteractions: any[];
  abandonmentAnalysis: any;
}

interface CartAction {
  actionId: string;
  actionType: 'add_to_cart' | 'remove_from_cart' | 'update_quantity' | 'view_cart' | 'proceed_to_checkout';
  timestamp: Date;
  productId?: string;
  quantity?: number;
  triggeredBy: string;
  success: boolean;
}

interface CartState {
  items: CartItem[];
  totalItems: number;
  totalValue: number;
  currency: string;
  lastUpdated: Date;
  cartStatus: 'active' | 'empty';
}

interface CartItem {
  productId: string;
  quantity: number;
  price?: number;
}

interface ProductConfigurationFlow {
  configurationSteps: ConfigurationStep[];
  selectionSequence: SelectionSequence[];
  configurationMetrics: any;
}

interface ConfigurationStep {
  stepType: string;
  startTime: Date;
  endTime?: Date;
}

interface SelectionSequence {
  sequenceId: string;
  product: string;
  selectionOrder: string[];
  selectionTimings: number[];
  finalConfiguration: { [attribute: string]: string };
  decisionQuality: 'confident' | 'uncertain' | 'exploratory';
}

interface CheckoutSequence {
  checkoutSteps: CheckoutStep[];
  checkoutProgress: any;
  paymentMethods: PaymentMethod[];
  paymentInfo: any;
}

interface CheckoutStep {
  stepId: string;
  stepName: string;
}

interface PaymentMethod {
  methodId: string;
  methodName: string;
}

interface PaymentAttempt {
  attemptId: string;
  timestamp: Date;
}

interface ShoppingBehaviorPattern {
  patternType: string;
  strength: number;
  indicators: string[];
  description: string;
}

interface EcommerceActionSequence {
  sequenceId: string;
  sequenceType: 'product_discovery' | 'variant_selection' | 'cart_management' | 'checkout_flow';
  actions: EcommerceAction[];
  startTime: Date;
  endTime: Date;
  duration: number;
  sequenceQuality: number;
  userIntent: string;
  businessValue: 'high' | 'medium' | 'low';
}

interface EcommerceAction {
  actionId: string;
  actionType: string;
  actionName: string;
  timestamp: Date;
  productContext: any;
  businessImpact: 'revenue_generating' | 'engagement' | 'research' | 'support';
}