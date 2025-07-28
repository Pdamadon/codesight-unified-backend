/**
 * Hybrid Journey Tracker
 * 
 * Combines rule-based detection with rich contextual analysis.
 * Designed to be called from training-data-transformer.ts to provide REAL journey context
 * instead of fake step templates.
 */

export interface RealJourneyContext {
  // Real session position (not fake 3/4)
  sessionStep: number; // 47 of 133
  totalSteps: number; // 133
  
  // Real task progress from user's actual defined steps  
  taskProgress: {
    currentTaskName: string; // "Browse for jeans" (from actual user task)
    currentTaskIndex: number; // 1 (0-based)
    totalTasks: number; // 3 
    completedTasks: string[]; // ["Search for graphic tees"]
    remainingTasks: string[]; // ["Select trendy sneakers"]
    progressPercent: number; // 33% (1 of 3 tasks)
  };
  
  // Detected user intent from actual interactions
  currentIntent: {
    action: string; // "selecting_product", "searching_for_jeans"
    product?: string; // "Levi's 511 Slim Jeans"
    confidence: number; // 0.85
    reasoning: string; // "Clicked product on search results page"
  };
  
  // Real navigation flow
  navigationFlow: {
    currentPage: string; // "product-detail"
    previousPages: string[]; // ["homepage", "search-results"] 
    flowReason: string; // "clicked jeans product from search"
  };
  
  // Rich behavioral context (like existing journey system)
  behavioralContext: {
    userFocus: string; // "Searching for jeans to complete casual outfit"
    decisionFactors: string[]; // ["Price under $125", "Fits casual style"]
    conversionLikelihood: number; // 0.7
    nextPredictedActions: string[]; // ["Check size options", "Add to cart"]
  };
}

export class HybridJourneyTracker {
  private allInteractions: any[] = [];
  private sessionData: any = null;
  private currentInteractionIndex: number = 0;
  
  /**
   * Initialize with session data - call this once per session from training transformer
   */
  initializeForSession(sessionData: any, allInteractions: any[]): void {
    this.sessionData = sessionData;
    this.allInteractions = allInteractions;
  }
  
  /**
   * Get real journey context for a specific interaction
   * Call this from training-data-transformer.ts for each interaction
   */
  getJourneyContextForInteraction(interaction: any, interactionIndex: number): RealJourneyContext {
    this.currentInteractionIndex = interactionIndex;
    
    // Step 1: Get real task progress from user's actual defined steps
    const taskProgress = this.analyzeRealTaskProgress();
    
    // Step 2: Detect intent from actual interaction patterns  
    const currentIntent = this.detectCurrentIntent(interaction);
    
    // Step 3: Build navigation flow from real page transitions
    const navigationFlow = this.buildNavigationFlow(interaction);
    
    // Step 4: Add behavioral context and predictions
    const behavioralContext = this.buildBehavioralContext(taskProgress, currentIntent);
    
    return {
      sessionStep: interactionIndex + 1,
      totalSteps: this.allInteractions.length,
      taskProgress,
      currentIntent,
      navigationFlow,
      behavioralContext
    };
  }
  
  private analyzeRealTaskProgress(): RealJourneyContext['taskProgress'] {
    const userTask = this.sessionData?.config?.generatedTask;
    if (!userTask || !userTask.steps) {
      return {
        currentTaskName: 'Unknown task',
        currentTaskIndex: 0,
        totalTasks: 1,
        completedTasks: [],
        remainingTasks: [],
        progressPercent: 0
      };
    }
    
    const userSteps = userTask.steps; // ["Search for graphic tees", "Browse for jeans", "Select trendy sneakers"]
    
    // Analyze interactions up to current point to determine which task step we're on
    const interactionsToHere = this.allInteractions.slice(0, this.currentInteractionIndex + 1);
    const currentTaskIndex = this.inferCurrentTaskIndex(interactionsToHere, userSteps);
    
    return {
      currentTaskName: userSteps[currentTaskIndex] || 'Complete task',
      currentTaskIndex,
      totalTasks: userSteps.length,
      completedTasks: userSteps.slice(0, currentTaskIndex),
      remainingTasks: userSteps.slice(currentTaskIndex + 1),
      progressPercent: Math.round(((currentTaskIndex + 1) / userSteps.length) * 100)
    };
  }
  
  private detectCurrentIntent(interaction: any): RealJourneyContext['currentIntent'] {
    const elementText = interaction.element?.text?.toLowerCase() || '';
    const actionType = interaction.interaction?.type || '';
    const url = interaction.context?.pageUrl || '';
    
    // Rule-based intent detection
    if (actionType === 'input' || actionType === 'type') {
      const searchTerms = this.extractSearchTerms(interaction);
      return {
        action: `searching_for_${searchTerms.join('_')}`,
        confidence: 0.9,
        reasoning: `User typed "${searchTerms.join(' ')}" in search field`
      };
    }
    
    if (actionType === 'click' && this.isProductClick(elementText, url)) {
      return {
        action: 'selecting_product',
        product: elementText,
        confidence: 0.85,
        reasoning: 'Clicked product on search/category page'
      };
    }
    
    if (actionType === 'click' && this.isAddToCartClick(elementText)) {
      return {
        action: 'adding_to_cart',
        product: this.inferCurrentProduct(),
        confidence: 0.95,
        reasoning: 'Clicked add to cart button'
      };
    }
    
    return {
      action: 'browsing',
      confidence: 0.5,
      reasoning: `${actionType} on "${elementText}"`
    };
  }
  
  private buildNavigationFlow(interaction: any): RealJourneyContext['navigationFlow'] {
    const currentPage = this.detectPageType(interaction);
    const previousPages = this.buildPageHistory();
    const flowReason = this.inferNavigationReason();
    
    return {
      currentPage,
      previousPages,
      flowReason
    };
  }
  
  private buildBehavioralContext(taskProgress: any, currentIntent: any): RealJourneyContext['behavioralContext'] {
    const userFocus = this.buildUserFocus(taskProgress, currentIntent);
    const decisionFactors = this.identifyDecisionFactors(taskProgress);
    const conversionLikelihood = this.calculateConversionLikelihood(taskProgress);
    const nextPredictedActions = this.predictNextActions(currentIntent);
    
    return {
      userFocus,
      decisionFactors,
      conversionLikelihood,
      nextPredictedActions
    };
  }
  
  // Helper Methods
  private inferCurrentTaskIndex(interactions: any[], userSteps: string[]): number {
    // Analyze search history and element interactions to match with user's defined steps
    const searchTerms = this.extractAllSearchTerms(interactions);
    const clickedElements = interactions.map(i => i.element?.text?.toLowerCase() || '').join(' ');
    
    // Match current activity to user's task steps
    for (let i = userSteps.length - 1; i >= 0; i--) {
      const step = userSteps[i].toLowerCase();
      
      // Check if recent searches/interactions match this step
      if (step.includes('graphic') && (searchTerms.includes('graphic') || clickedElements.includes('graphic'))) {
        return i;
      }
      if (step.includes('jeans') && (searchTerms.includes('jeans') || clickedElements.includes('jean'))) {
        return i;
      }
      if (step.includes('sneakers') && (searchTerms.includes('sneakers') || clickedElements.includes('sneaker'))) {
        return i;
      }
    }
    
    // Default to progression based on session progress
    return Math.min(Math.floor((this.currentInteractionIndex / this.allInteractions.length) * userSteps.length), userSteps.length - 1);
  }
  
  private extractSearchTerms(interaction: any): string[] {
    const value = interaction.interaction?.value || interaction.element?.text || '';
    return value.toLowerCase().split(/\s+/).filter((term: string) => term.length > 2);
  }
  
  private extractAllSearchTerms(interactions: any[]): string[] {
    const allTerms: string[] = [];
    for (const interaction of interactions) {
      if (interaction.interaction?.type === 'input' || interaction.interaction?.type === 'type') {
        allTerms.push(...this.extractSearchTerms(interaction));
      }
    }
    return allTerms;
  }
  
  private isProductClick(elementText: string, url: string): boolean {
    const productIndicators = ['levi', 'nike', 'adidas', 'tee', 'shirt', 'jean', 'sneaker'];
    const isProductPage = url.includes('/search') || url.includes('/category');
    return isProductPage && productIndicators.some(indicator => elementText.includes(indicator));
  }
  
  private isAddToCartClick(elementText: string): boolean {
    return ['add to cart', 'add to bag', 'purchase'].some(phrase => elementText.includes(phrase));
  }
  
  private detectPageType(interaction: any): string {
    const url = interaction.context?.pageUrl || '';
    if (url.includes('/search')) return 'search-results';
    if (url.includes('/product')) return 'product-detail';
    if (url.includes('/cart')) return 'cart';
    if (url.endsWith('.com/')) return 'homepage';
    return 'category';
  }
  
  private buildPageHistory(): string[] {
    const pageTypes = this.allInteractions
      .slice(0, this.currentInteractionIndex)
      .map(i => this.detectPageType(i));
    
    // Remove duplicates, keep order
    const uniquePages: string[] = [];
    for (const page of pageTypes) {
      if (uniquePages[uniquePages.length - 1] !== page) {
        uniquePages.push(page);
      }
    }
    return uniquePages;
  }
  
  private inferNavigationReason(): string {
    if (this.currentInteractionIndex === 0) return 'session started';
    
    const previous = this.allInteractions[this.currentInteractionIndex - 1];
    const prevAction = previous?.interaction?.type || '';
    const prevElement = previous?.element?.text || '';
    
    if (prevAction === 'click') return `clicked "${prevElement}"`;
    if (prevAction === 'input') return `searched for "${prevElement}"`;
    return `${prevAction} interaction`;
  }
  
  private buildUserFocus(taskProgress: any, currentIntent: any): string {
    const taskName = taskProgress.currentTaskName;
    const action = currentIntent.action;
    
    if (action.includes('searching')) {
      return `Searching for items to complete: ${taskName}`;
    }
    if (action === 'selecting_product') {
      return `Evaluating "${currentIntent.product}" for: ${taskName}`;
    }
    return `Working on: ${taskName}`;
  }
  
  private identifyDecisionFactors(taskProgress: any): string[] {
    const factors = ['Product matches task requirements'];
    
    // Extract budget from user task if available
    const description = this.sessionData?.config?.generatedTask?.description || '';
    const budgetMatch = description.match(/\$(\d+)/);
    if (budgetMatch) {
      factors.push(`Stay within $${budgetMatch[1]} budget`);
    }
    
    // Task-specific factors
    const taskName = taskProgress.currentTaskName.toLowerCase();
    if (taskName.includes('casual')) factors.push('Must fit casual style');
    if (taskName.includes('trendy')) factors.push('Must be fashionable');
    
    return factors;
  }
  
  private calculateConversionLikelihood(taskProgress: any): number {
    const baseRate = 0.5;
    const progressBonus = (taskProgress.currentTaskIndex / taskProgress.totalTasks) * 0.3;
    return Math.min(0.9, baseRate + progressBonus);
  }
  
  private predictNextActions(currentIntent: any): string[] {
    switch (currentIntent.action) {
      case 'selecting_product':
        return ['View product details', 'Check price', 'Select size', 'Add to cart'];
      case 'adding_to_cart':
        return ['Continue shopping', 'View cart', 'Proceed to checkout'];
      default:
        return ['Continue browsing', 'Refine search'];
    }
  }
  
  private inferCurrentProduct(): string {
    // Look at recent interactions to find product name
    const recentInteractions = this.allInteractions.slice(Math.max(0, this.currentInteractionIndex - 3), this.currentInteractionIndex + 1);
    
    for (const interaction of recentInteractions.reverse()) {
      const elementText = interaction.element?.text || '';
      if (this.isProductClick(elementText, '')) {
        return elementText;
      }
    }
    return 'Current product';
  }
}