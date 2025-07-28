/**
 * Rule-Based Journey Tracker
 * 
 * Detects user intent and navigation patterns using deterministic rules
 * instead of fake step templates. Analyzes actual click sequences and page flows.
 */

export interface DetectedIntent {
  action: string; // "searching_for_jeans", "selecting_product", "adding_to_cart"
  confidence: number; // 0.1 to 1.0
  evidence: string[]; // ["clicked search", "typed 'jeans'", "on search results page"]
  context: {
    product?: string;
    category?: string;
    price?: number;
    quantity?: number;
  };
}

export interface NavigationFlow {
  sequence: string[]; // ["homepage", "search-results", "product-detail"]
  currentPosition: number; // 2 (in product-detail)
  transitionReason: string; // "clicked product from search results"
}

export interface TaskProgress {
  userDefinedSteps: string[]; // ["Search for graphic tees", "Browse for jeans", "Select trendy sneakers"]
  detectedProgress: {
    stepIndex: number; // 1 (working on jeans)
    stepName: string; // "Browse for jeans"
    evidence: string[]; // ["searched 'jeans'", "viewing jeans products"]
    completion: number; // 0.6 (60% through this step)
  };
  completedItems: any[]; // [{type: "graphic tee", price: 25, addedToCart: true}]
  budgetTracking: {
    total: number; // 150
    spent: number; // 25
    remaining: number; // 125
  };
}

export interface RealJourneyContext {
  // Actual session position
  sessionInteraction: number; // 47
  totalInteractions: number; // 133
  
  // Detected user intent
  currentIntent: DetectedIntent;
  
  // Real navigation flow
  navigationFlow: NavigationFlow;
  
  // Task progress based on user's actual goals
  taskProgress: TaskProgress;
  
  // What actually happened and what's likely next
  actionContext: {
    lastActions: string[]; // ["searched jeans", "clicked filter", "viewed product"]
    currentAction: string; // "viewing Levi's 511 jeans details"
    predictedNext: string[]; // ["select size", "add to cart", "continue shopping"]
  };
}

export class RuleBasedJourneyTracker {
  private interactions: any[] = [];
  private userTask: any = null;
  private cartItems: any[] = [];
  private searchHistory: string[] = [];
  private pageHistory: string[] = [];
  
  initializeWithSession(sessionData: any, allInteractions: any[]): void {
    this.interactions = allInteractions;
    this.userTask = sessionData?.config?.generatedTask || null;
    this.cartItems = [];
    this.searchHistory = [];
    this.pageHistory = [];
  }
  
  analyzeInteraction(interaction: any, interactionIndex: number): RealJourneyContext {
    // Detect current intent from this specific interaction
    const currentIntent = this.detectIntent(interaction, interactionIndex);
    
    // Build navigation flow from actual page transitions
    const navigationFlow = this.buildNavigationFlow(interaction, interactionIndex);
    
    // Analyze progress on user's actual defined tasks
    const taskProgress = this.analyzeTaskProgress(interactionIndex);
    
    // Build action context from real interaction sequence
    const actionContext = this.buildActionContext(interaction, interactionIndex);
    
    return {
      sessionInteraction: interactionIndex + 1,
      totalInteractions: this.interactions.length,
      currentIntent,
      navigationFlow,
      taskProgress,
      actionContext
    };
  }
  
  private detectIntent(interaction: any, index: number): DetectedIntent {
    const elementText = interaction.element?.text?.toLowerCase() || '';
    const actionType = interaction.interaction?.type || '';
    const url = interaction.context?.pageUrl || '';
    const previousInteractions = this.interactions.slice(Math.max(0, index - 3), index);
    
    // Rule 1: Search Intent
    if (actionType === 'input' || actionType === 'type') {
      const searchTerms = this.extractSearchTerms(interaction);
      if (searchTerms.length > 0) {
        this.searchHistory.push(...searchTerms);
        return {
          action: `searching_for_${searchTerms.join('_')}`,
          confidence: 0.95,
          evidence: [`typed "${searchTerms.join(' ')}"`, 'in search field'],
          context: { category: searchTerms[0] }
        };
      }
    }
    
    // Rule 2: Product Selection Intent
    if (actionType === 'click' && this.isProductClick(elementText, url)) {
      const product = this.extractProductName(elementText);
      return {
        action: 'selecting_product',
        confidence: 0.9,
        evidence: [`clicked "${elementText}"`, 'on search/category page', 'element appears to be product'],
        context: { product }
      };
    }
    
    // Rule 3: Add to Cart Intent
    if (actionType === 'click' && this.isAddToCartClick(elementText)) {
      const product = this.inferCurrentProduct(index);
      const price = this.extractPrice(interaction, index);
      
      if (product) {
        this.cartItems.push({ product, price, addedAt: index });
      }
      
      return {
        action: 'adding_to_cart',
        confidence: 0.95,
        evidence: [`clicked "${elementText}"`, 'on product page'],
        context: { product, price }
      };
    }
    
    // Rule 4: Navigation Intent
    if (actionType === 'click' && this.isNavigationClick(elementText, url)) {
      return {
        action: 'navigating',
        confidence: 0.8,
        evidence: [`clicked navigation element "${elementText}"`],
        context: { category: elementText }
      };
    }
    
    // Rule 5: Filter/Refine Intent
    if (actionType === 'click' && this.isFilterClick(elementText, url)) {
      return {
        action: 'filtering_results',
        confidence: 0.85,
        evidence: [`clicked filter "${elementText}"`, 'on search/category page'],
        context: { category: elementText }
      };
    }
    
    // Default: Browsing Intent
    return {
      action: 'browsing',
      confidence: 0.5,
      evidence: [`${actionType} on "${elementText}"`],
      context: {}
    };
  }
  
  private buildNavigationFlow(interaction: any, index: number): NavigationFlow {
    const currentPageType = this.detectPageType(interaction);
    
    // Update page history
    if (this.pageHistory.length === 0 || this.pageHistory[this.pageHistory.length - 1] !== currentPageType) {
      this.pageHistory.push(currentPageType);
    }
    
    const transitionReason = this.inferTransitionReason(interaction, index);
    
    return {
      sequence: [...this.pageHistory],
      currentPosition: this.pageHistory.length - 1,
      transitionReason
    };
  }
  
  private analyzeTaskProgress(index: number): TaskProgress {
    if (!this.userTask || !this.userTask.steps) {
      return {
        userDefinedSteps: [],
        detectedProgress: { stepIndex: 0, stepName: 'Unknown', evidence: [], completion: 0 },
        completedItems: [],
        budgetTracking: { total: 0, spent: 0, remaining: 0 }
      };
    }
    
    const userSteps = this.userTask.steps;
    const budget = this.extractBudget(this.userTask.description || '');
    
    // Analyze which step we're on based on search history and cart items
    const currentStepInfo = this.inferCurrentStep(userSteps);
    
    // Calculate budget tracking
    const spent = this.cartItems.reduce((sum, item) => sum + (item.price || 0), 0);
    
    return {
      userDefinedSteps: userSteps,
      detectedProgress: currentStepInfo,
      completedItems: [...this.cartItems],
      budgetTracking: {
        total: budget,
        spent,
        remaining: budget - spent
      }
    };
  }
  
  private buildActionContext(interaction: any, index: number): RealJourneyContext['actionContext'] {
    const lastActions = this.interactions
      .slice(Math.max(0, index - 5), index)
      .map(i => this.describeAction(i));
    
    const currentAction = this.describeAction(interaction);
    const predictedNext = this.predictNextActions(interaction, index);
    
    return {
      lastActions,
      currentAction,
      predictedNext
    };
  }
  
  // Helper Methods for Intent Detection
  private extractSearchTerms(interaction: any): string[] {
    const inputValue = interaction.interaction?.value || '';
    const elementText = interaction.element?.text || '';
    
    // Extract search terms from input value or element text
    const terms = (inputValue || elementText)
      .toLowerCase()
      .split(/\s+/)
      .filter((term: string) => term.length > 2 && !['the', 'and', 'for', 'with'].includes(term));
    
    return terms;
  }
  
  private isProductClick(elementText: string, url: string): boolean {
    // Product clicks usually have product names, brands, or are on category/search pages
    const productIndicators = ['levi', 'nike', 'adidas', 'tee', 'shirt', 'jean', 'sneaker', 'shoe'];
    const pageIndicators = url.includes('/search') || url.includes('/category') || url.includes('/browse');
    
    return pageIndicators && productIndicators.some(indicator => 
      elementText.toLowerCase().includes(indicator)
    );
  }
  
  private isAddToCartClick(elementText: string): boolean {
    const cartIndicators = ['add to cart', 'add to bag', 'add item', 'purchase', 'buy now'];
    return cartIndicators.some(indicator => 
      elementText.toLowerCase().includes(indicator)
    );
  }
  
  private isNavigationClick(elementText: string, url: string): boolean {
    const navIndicators = ['men', 'women', 'shoes', 'clothing', 'sale', 'new', 'category'];
    return navIndicators.some(indicator => 
      elementText.toLowerCase().includes(indicator)
    );
  }
  
  private isFilterClick(elementText: string, url: string): boolean {
    const filterIndicators = ['filter', 'sort', 'size', 'color', 'price', 'brand', '$'];
    const isOnSearchPage = url.includes('/search') || url.includes('/browse');
    
    return isOnSearchPage && filterIndicators.some(indicator => 
      elementText.toLowerCase().includes(indicator)
    );
  }
  
  private detectPageType(interaction: any): string {
    const url = interaction.context?.pageUrl || '';
    const title = interaction.context?.pageTitle || '';
    const elementText = interaction.element?.text || '';
    
    if (url.includes('/search') || title.includes('Search Results')) return 'search-results';
    if (url.includes('/product/') || url.includes('/p/')) return 'product-detail';
    if (url.includes('/cart') || url.includes('/bag')) return 'cart';
    if (url.includes('/checkout')) return 'checkout';
    if (url.endsWith('.com/') || url.endsWith('.com')) return 'homepage';
    if (url.includes('/category/') || url.includes('/browse/')) return 'category';
    
    return 'unknown';
  }
  
  private inferTransitionReason(interaction: any, index: number): string {
    if (index === 0) return 'session started';
    
    const previousInteraction = this.interactions[index - 1];
    const prevAction = previousInteraction?.interaction?.type || '';
    const prevElement = previousInteraction?.element?.text || '';
    
    if (prevAction === 'click' && this.isProductClick(prevElement, '')) {
      return `clicked product "${prevElement}"`;
    }
    if (prevAction === 'input' || prevAction === 'type') {
      return `searched for "${prevElement}"`;
    }
    if (prevAction === 'click') {
      return `clicked "${prevElement}"`;
    }
    
    return `${prevAction} interaction`;
  }
  
  private inferCurrentStep(userSteps: string[]): TaskProgress['detectedProgress'] {
    // Match current search/cart state to user's defined steps
    const recentSearches = this.searchHistory.slice(-3);
    const cartProducts = this.cartItems.map(item => item.product || '');
    
    for (let i = 0; i < userSteps.length; i++) {
      const step = userSteps[i].toLowerCase();
      
      // Check if recent activity matches this step
      if (step.includes('graphic') && step.includes('tee')) {
        const hasGraphicTeeActivity = recentSearches.some(s => s.includes('graphic') || s.includes('tee')) ||
                                    cartProducts.some(p => p.includes('tee'));
        if (hasGraphicTeeActivity) {
          return {
            stepIndex: i,
            stepName: userSteps[i],
            evidence: [`searched for graphic tees`, `${cartProducts.length} items in cart`],
            completion: cartProducts.some(p => p.includes('tee')) ? 1.0 : 0.6
          };
        }
      }
      
      if (step.includes('jeans')) {
        const hasJeansActivity = recentSearches.some(s => s.includes('jeans')) ||
                                cartProducts.some(p => p.includes('jean'));
        if (hasJeansActivity) {
          return {
            stepIndex: i,
            stepName: userSteps[i],
            evidence: [`searched for jeans`, `viewing jeans products`],
            completion: cartProducts.some(p => p.includes('jean')) ? 1.0 : 0.7
          };
        }
      }
      
      if (step.includes('sneakers')) {
        const hasSneakerActivity = recentSearches.some(s => s.includes('sneaker')) ||
                                  cartProducts.some(p => p.includes('sneaker'));
        if (hasSneakerActivity) {
          return {
            stepIndex: i,
            stepName: userSteps[i],
            evidence: [`searched for sneakers`, `browsing sneaker options`],
            completion: cartProducts.some(p => p.includes('sneaker')) ? 1.0 : 0.5
          };
        }
      }
    }
    
    // Default to first incomplete step
    return {
      stepIndex: Math.min(this.cartItems.length, userSteps.length - 1),
      stepName: userSteps[this.cartItems.length] || 'Complete outfit',
      evidence: [`${this.cartItems.length} items completed`],
      completion: 0.3
    };
  }
  
  private extractBudget(description: string): number {
    const budgetMatch = description.match(/\$(\d+)/);
    return budgetMatch ? parseInt(budgetMatch[1]) : 150; // default
  }
  
  private extractProductName(elementText: string): string {
    // Extract brand and product type from element text
    return elementText.trim();
  }
  
  private inferCurrentProduct(index: number): string {
    // Look at recent interactions to infer what product is being viewed
    const recentInteractions = this.interactions.slice(Math.max(0, index - 5), index + 1);
    
    for (const interaction of recentInteractions.reverse()) {
      const elementText = interaction.element?.text || '';
      if (this.isProductClick(elementText, '')) {
        return elementText;
      }
    }
    
    return 'Unknown product';
  }
  
  private extractPrice(interaction: any, index: number): number {
    // Look for price indicators in nearby interactions
    const recentInteractions = this.interactions.slice(Math.max(0, index - 3), index + 1);
    
    for (const int of recentInteractions) {
      const text = int.element?.text || '';
      const priceMatch = text.match(/\$(\d+)/);
      if (priceMatch) {
        return parseInt(priceMatch[1]);
      }
    }
    
    return 0;
  }
  
  private describeAction(interaction: any): string {
    const actionType = interaction.interaction?.type || '';
    const elementText = interaction.element?.text || '';
    
    if (actionType === 'click') return `clicked "${elementText}"`;
    if (actionType === 'input' || actionType === 'type') return `typed "${elementText}"`;
    return `${actionType} ${elementText}`;
  }
  
  private predictNextActions(interaction: any, index: number): string[] {
    const pageType = this.detectPageType(interaction);
    
    switch (pageType) {
      case 'search-results':
        return ['click on product', 'refine filters', 'try different search'];
      case 'product-detail':
        return ['select size/color', 'add to cart', 'view more details', 'go back'];
      case 'cart':
        return ['proceed to checkout', 'continue shopping', 'update quantities'];
      default:
        return ['navigate to products', 'search for items'];
    }
  }
}