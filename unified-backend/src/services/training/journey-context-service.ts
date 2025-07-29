/**
 * Journey Context Service
 * 
 * Extracted from training-data-transformer.ts to provide focused journey context functionality
 * for training data generation.
 * 
 * Handles user journey analysis, goal detection, intent extraction, pattern matching,
 * and comprehensive journey metadata for enhanced AI training.
 */

export interface JourneyContextService {
  detectJourneyType(journey: any[]): string;
  extractJourneyGoal(journey: any[]): string;
  extractUserIntent(journey: any[]): string;
  extractJourneyContext(interaction: any): any;
  analyzeJourneyPattern(journey: any[]): any;
  identifyDecisionPoints(journey: any[]): number[];
}

export class JourneyContextServiceImpl implements JourneyContextService {

  // Dependencies (would be injected in real implementation)
  private sessionData: any;

  constructor(sessionData?: any) {
    this.sessionData = sessionData;
  }

  /**
   * EXTRACTED: Detect comprehensive journey type with granular patterns
   */
  detectJourneyType(journey: any[]): string {
    const pages: string[] = journey.map(i => i.context?.pageType).filter((p): p is string => Boolean(p));
    const goals: string[] = journey.map(i => i.business?.conversion?.conversionGoal).filter((g): g is string => Boolean(g));
    const products: string[] = journey.map(i => i.business?.ecommerce?.productCategory).filter((p): p is string => Boolean(p));
    const urls: string[] = journey.map(i => i.context?.pageUrl?.toLowerCase()).filter((u): u is string => Boolean(u));
    const elements: string[] = journey.map(i => i.element?.text?.toLowerCase()).filter((e): e is string => Boolean(e));
    const stages: string[] = journey.map(i => i.business?.conversion?.funnelStage).filter((s): s is string => Boolean(s));
    
    // E-COMMERCE JOURNEY TEMPLATES (Enhanced with more granular patterns)
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
      if (goals.includes('reach-checkout') && journey.length <= 5) {
        return 'ecommerce-quick-checkout';
      }
      // Standard shopping flow
      return 'ecommerce-standard-shopping';
    }
    
    // SAAS JOURNEY TEMPLATES (Enhanced with subscription patterns)
    if (this.matchesSaaSPattern(pages, goals, elements, urls)) {
      // Free trial patterns
      if (elements.some(el => el.includes('free trial') || el.includes('try free'))) {
        return 'saas-free-trial-signup';
      }
      // Pricing comparison patterns
      if (pages.includes('pricing') && elements.some(el => el.includes('compare') || el.includes('plan'))) {
        return 'saas-pricing-plan-comparison';
      }
      // Feature evaluation patterns
      if (elements.some(el => el.includes('feature') || el.includes('demo'))) {
        return 'saas-feature-evaluation';
      }
      // Direct subscription patterns
      if (goals.includes('subscription-selected')) {
        return 'saas-direct-subscription';
      }
      return 'saas-signup';
    }
    
    // BOOKING JOURNEY TEMPLATES (Enhanced with service types)
    if (this.matchesBookingPattern(pages, goals, elements, urls)) {
      // Appointment booking patterns
      if (elements.some(el => el.includes('appointment') || el.includes('schedule'))) {
        return 'booking-appointment-scheduling';
      }
      // Event registration patterns
      if (elements.some(el => el.includes('event') || el.includes('register'))) {
        return 'booking-event-registration';
      }
      // Travel booking patterns
      if (elements.some(el => el.includes('flight') || el.includes('hotel') || el.includes('travel'))) {
        return 'booking-travel-reservation';
      }
      // Service booking patterns
      if (elements.some(el => el.includes('service') || el.includes('consultation'))) {
        return 'booking-service-appointment';
      }
      return 'booking-standard';
    }
    
    // LEAD GENERATION JOURNEY TEMPLATES (Enhanced with content types)
    if (this.matchesLeadGenPattern(pages, goals, elements, urls)) {
      // Content download patterns
      if (elements.some(el => el.includes('download') || el.includes('whitepaper') || el.includes('ebook'))) {
        return 'leadgen-content-download';
      }
      // Demo request patterns
      if (elements.some(el => el.includes('demo') || el.includes('presentation'))) {
        return 'leadgen-demo-request';
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
      return 'leadgen-contact';
    }
    
    // RESEARCH/COMPARISON JOURNEY TEMPLATES (Enhanced with research types)
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
      return 'research-evaluation';
    }
    
    // Additional journey types for comprehensive coverage
    if (this.matchesFinancialPattern(pages, elements, urls)) {
      if (elements.some(el => el.includes('loan') || el.includes('mortgage'))) {
        return 'financial-loan-application';
      }
      if (elements.some(el => el.includes('insurance') || el.includes('coverage'))) {
        return 'financial-insurance-quote';
      }
      return 'financial-services-inquiry';
    }
    
    return 'general-task';
  }

  /**
   * EXTRACTED: Extract realistic journey goal from interaction patterns
   */
  extractJourneyGoal(journey: any[]): string {
    const goals: string[] = journey.map(i => i.business?.conversion?.conversionGoal).filter((g): g is string => Boolean(g));
    const lastGoal = goals[goals.length - 1];
    
    // Use explicit conversion goal if available
    if (lastGoal) return lastGoal;
    
    // REALISTIC GOAL INFERENCE based on journey patterns:
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
    
    // Contact goals
    if (pages.includes('contact') || elements.some(el => el.includes('contact'))) {
      return 'contact-business';
    }
    
    return 'complete-task';
  }

  /**
   * EXTRACTED: Extract user intent with priority on AI-generated tasks
   */
  extractUserIntent(journey: any[]): string {
    // PRIORITY 1: Check for AI-generated task from session data
    console.log('🔍 [DEBUG] Checking for generated task in sessionData:', {
      hasSessionData: !!this.sessionData,
      hasConfig: !!this.sessionData?.config,
      hasGeneratedTask: !!this.sessionData?.config?.generatedTask,
      sessionDataKeys: this.sessionData ? Object.keys(this.sessionData) : 'none',
      configKeys: this.sessionData?.config ? Object.keys(this.sessionData.config) : 'none'
    });
    
    if (this.sessionData?.config?.generatedTask) {
      const generatedTask = this.sessionData.config.generatedTask;
      console.log('🎯 [JOURNEY CONTEXT] Found generated task:', generatedTask);
      
      // Use task description as user intent
      if (generatedTask.description) {
        console.log('🎯 [JOURNEY CONTEXT] Using generated task as user intent:', generatedTask.description);
        return generatedTask.description;
      }
      // Fallback to task title if no description
      if (generatedTask.title) {
        console.log('🎯 [JOURNEY CONTEXT] Using generated task title as user intent:', generatedTask.title);
        return generatedTask.title;
      }
    }
    
    // PRIORITY 2: Look for search queries, product categories, or explicit intent data
    for (const interaction of journey) {
      if (interaction.state?.before?.formData) {
        const searchQuery = interaction.state.before.formData['search'] || 
                           interaction.state.before.formData['query'] ||
                           interaction.state.before.formData['q'];
        if (searchQuery) {
          console.log('🎯 [JOURNEY CONTEXT] Found search query as user intent:', searchQuery);
          return `Search for: ${searchQuery}`;
        }
      }
      
      // Check business context for product categories
      if (interaction.business?.ecommerce?.productCategory) {
        const category = interaction.business.ecommerce.productCategory;
        console.log('🎯 [JOURNEY CONTEXT] Found product category as user intent:', category);
        return `Browse ${category} products`;
      }
    }
    
    // PRIORITY 3: Infer from journey type and elements
    const journeyType = this.detectJourneyType(journey);
    const elements = journey.map(i => i.element?.text?.toLowerCase()).filter(Boolean);
    
    if (journeyType.includes('ecommerce')) {
      const productElements = elements.filter(el => 
        !el.includes('menu') && !el.includes('search') && !el.includes('filter')
      );
      if (productElements.length > 0) {
        return `Shop for ${productElements[0]}`;
      }
      return 'Browse and shop products';
    }
    
    if (journeyType.includes('booking')) {
      return 'Make a booking or appointment';
    }
    
    if (journeyType.includes('saas')) {
      return 'Explore software solution and pricing';
    }
    
    if (journeyType.includes('leadgen')) {
      return 'Get information and make contact';
    }
    
    return 'Navigate and complete user goal';
  }

  /**
   * EXTRACTED: Extract comprehensive journey context for single interaction
   */
  extractJourneyContext(interaction: any): any {
    const url = interaction.context?.pageUrl || '';
    const pageType = interaction.context?.pageType || 'unknown';
    const elementText = interaction.element?.text || '';
    const funnelStage = interaction.business?.conversion?.funnelStage || 'unknown';
    const funnelPosition = interaction.business?.conversion?.funnelPosition || 0;
    const productName = interaction.business?.ecommerce?.productName || '';
    
    // Determine journey type and goal based on context
    const journeyType = this.determineJourneyType(url, pageType, elementText, funnelStage);
    const overallGoal = this.determineOverallGoal(journeyType, productName, funnelStage);
    
    // Extract journey progression
    const journeySteps = this.extractJourneySteps(url, pageType, funnelStage, journeyType);
    const currentStep = Math.max(1, funnelPosition || this.inferCurrentStep(pageType, url));
    const totalSteps = journeySteps.length;
    
    // Determine step context
    const currentStepName = journeySteps[currentStep - 1] || pageType;
    const nextStepName = journeySteps[currentStep] || 'completion';
    const previousSteps = journeySteps.slice(0, currentStep - 1);
    const nextSteps = journeySteps.slice(currentStep);
    
    // Generate contextual descriptions
    const stepDescription = this.generateStepDescription(currentStepName, elementText, pageType);
    const actionDescription = this.generateActionDescription(elementText, currentStepName, overallGoal);
    const actionReasoning = this.generateActionReasoning(elementText, funnelStage, overallGoal);
    
    return {
      journeyType,
      overallGoal,
      currentStep,
      totalSteps,
      currentStepName,
      nextStepName,
      previousSteps,
      nextSteps,
      stepDescription,
      actionDescription,
      actionReasoning,
      funnelStage,
      progressPercent: Math.round((currentStep / totalSteps) * 100)
    };
  }

  /**
   * EXTRACTED: Analyze journey pattern for quality and complexity metrics
   */
  analyzeJourneyPattern(journey: any[]): any {
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
   * EXTRACTED: Identify key decision points in the journey
   */
  identifyDecisionPoints(journey: any[]): number[] {
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
        elementText.includes('select') ||
        elementText.includes('choose') ||
        pageType === 'product' ||
        pageType === 'pricing' ||
        pageType === 'checkout';
      
      if (isDecision) {
        decisionIndices.push(index);
      }
    });
    
    return decisionIndices;
  }

  // Helper methods for pattern matching
  private matchesEcommercePattern(pages: string[], goals: string[], products: string[], elements: string[], urls: string[]): boolean {
    return goals.some(g => ['add-to-cart', 'purchase', 'reach-checkout'].includes(g)) ||
           products.length > 0 ||
           pages.some(p => ['product', 'cart', 'checkout'].includes(p)) ||
           urls.some(url => url.includes('shop') || url.includes('product') || url.includes('cart')) ||
           elements.some(el => el.includes('add to cart') || el.includes('buy') || el.includes('price'));
  }

  private matchesSaaSPattern(pages: string[], goals: string[], elements: string[], urls: string[]): boolean {
    return goals.some(g => ['signup', 'subscription', 'subscription-selected'].includes(g)) ||
           pages.some(p => ['pricing', 'signup', 'trial'].includes(p)) ||
           urls.some(url => url.includes('pricing') || url.includes('signup') || url.includes('trial')) ||
           elements.some(el => el.includes('sign up') || el.includes('subscribe') || el.includes('plan') || el.includes('trial'));
  }

  private matchesBookingPattern(pages: string[], goals: string[], elements: string[], urls: string[]): boolean {
    return goals.some(g => ['booking', 'booking-form-complete'].includes(g)) ||
           pages.some(p => ['booking', 'reservation'].includes(p)) ||
           urls.some(url => url.includes('book') || url.includes('reserve') || url.includes('appointment')) ||
           elements.some(el => el.includes('book') || el.includes('reserve') || el.includes('schedule') || el.includes('appointment'));
  }

  private matchesLeadGenPattern(pages: string[], goals: string[], elements: string[], urls: string[]): boolean {
    return goals.some(g => ['contact', 'lead-generation'].includes(g)) ||
           pages.some(p => ['contact', 'download'].includes(p)) ||
           urls.some(url => url.includes('contact') || url.includes('download') || url.includes('newsletter')) ||
           elements.some(el => el.includes('contact') || el.includes('download') || el.includes('newsletter') || el.includes('quote'));
  }

  private matchesResearchPattern(pages: string[], goals: string[], elements: string[], stages: string[]): boolean {
    return stages.some(s => ['evaluation', 'validation'].includes(s)) ||
           pages.some(p => ['search-results', 'comparison', 'reviews'].includes(p)) ||
           elements.some(el => el.includes('compare') || el.includes('review') || el.includes('spec') || el.includes('feature'));
  }

  private matchesFinancialPattern(pages: string[], elements: string[], urls: string[]): boolean {
    return elements.some(el => 
      el.includes('loan') || el.includes('mortgage') || el.includes('insurance') || 
      el.includes('bank') || el.includes('account') || el.includes('credit')
    ) || urls.some(url => 
      url.includes('bank') || url.includes('finance') || url.includes('loan') || 
      url.includes('insurance') || url.includes('invest')
    );
  }

  // Additional helper methods for journey context
  private determineJourneyType(url: string, pageType: string, elementText: string, funnelStage: string): string {
    if (pageType === 'product' || url.includes('product')) return 'ecommerce-shopping';
    if (pageType === 'pricing' || url.includes('pricing')) return 'saas-evaluation';
    if (pageType === 'booking' || url.includes('book')) return 'booking-appointment';
    if (funnelStage === 'validation') return 'research-validation';
    
    return 'general-navigation';
  }

  private determineOverallGoal(journeyType: string, productName: string, funnelStage: string): string {
    if (journeyType.includes('ecommerce')) {
      return productName ? `Purchase ${productName}` : 'Find and purchase product';
    }
    if (journeyType.includes('saas')) return 'Evaluate and sign up for service';
    if (journeyType.includes('booking')) return 'Make booking or appointment';
    if (journeyType.includes('research')) return 'Research and compare options';
    
    return 'Navigate and complete task';
  }

  private extractJourneySteps(url: string, pageType: string, funnelStage: string, journeyType: string): string[] {
    if (journeyType.includes('ecommerce')) {
      return ['Homepage', 'Category', 'Product', 'Configuration', 'Cart', 'Checkout'];
    }
    if (journeyType.includes('saas')) {
      return ['Landing', 'Features', 'Pricing', 'Trial', 'Registration'];
    }
    if (journeyType.includes('booking')) {
      return ['Services', 'Availability', 'Selection', 'Details', 'Confirmation'];
    }
    
    return ['Start', 'Navigation', 'Selection', 'Action', 'Completion'];
  }

  private inferCurrentStep(pageType: string, url: string): number {
    if (pageType === 'homepage' || url === '/') return 1;
    if (pageType === 'category') return 2;
    if (pageType === 'product') return 3;
    if (pageType === 'cart') return 5;
    if (pageType === 'checkout') return 6;
    
    return 3; // Default middle step
  }

  private generateStepDescription(stepName: string, elementText: string, pageType: string): string {
    return `${stepName}: User navigating ${pageType} and interacting with "${elementText}"`;
  }

  private generateActionDescription(elementText: string, stepName: string, goal: string): string {
    return `interact with "${elementText}" to progress towards ${goal}`;
  }

  private generateActionReasoning(elementText: string, funnelStage: string, goal: string): string {
    return `User selected "${elementText}" as part of ${funnelStage} stage to achieve: ${goal}`;
  }

  private calculateJourneyQuality(journey: any[]): { score: number } {
    let score = 0;
    
    // Length quality (longer is usually better)
    if (journey.length >= 3) score += 0.3;
    if (journey.length >= 5) score += 0.2;
    
    // Diversity quality (different page types)
    const uniquePages = new Set(journey.map(i => i.context?.pageType).filter(Boolean));
    score += Math.min(uniquePages.size * 0.1, 0.3);
    
    // Business context quality
    const hasBusinessContext = journey.some(i => i.business);
    if (hasBusinessContext) score += 0.2;
    
    return { score: Math.min(score, 1.0) };
  }

  private estimateConversionProbability(journey: any[]): number {
    let probability = 0.5; // Base probability
    
    // Positive signals
    if (journey.some(i => i.context?.pageType === 'product')) probability += 0.2;
    if (journey.some(i => i.context?.pageType === 'cart')) probability += 0.3;
    if (journey.some(i => i.element?.text?.includes('add to cart'))) probability += 0.2;
    
    // Length factor (longer journeys may indicate higher intent)
    if (journey.length >= 5) probability += 0.1;
    
    return Math.min(probability, 1.0);
  }
}