/**
 * Intent-Based Classifier for UnifiedSession Data
 * 
 * Classifies elements based on user behavior and intent rather than just text analysis.
 * Uses navigation patterns, URL structure, and behavioral context to determine
 * if an interaction represents category navigation or product selection.
 */

interface ParsedInteraction {
  id: string;
  type: string;
  context?: {
    url?: string;
    pageType?: string;
    pageTitle?: string;
    pageContext?: any;
    [key: string]: any;
  };
  element?: {
    text?: string;
    tag?: string;
    tagName?: string;
    id?: string;
    className?: string;
    attributes?: any;
    nearbyElements?: any[];
    parentElements?: any[];
    siblingElements?: any[];
    [key: string]: any;
  };
  state?: any;
  action?: any;
  visual?: any;
  metadata?: any;
  overlays?: any;
  sequence?: any;
  selectors?: any;
  timestamp?: number;
  contextData?: any;
  interaction?: any;
  sessionTime?: number;
  elementDetails?: any;
}

interface SessionContext {
  pageType?: string;
  userIntent?: string;
  shoppingStage?: string;
  behaviorType?: string;
  qualityScore?: number;
}

interface ClassificationResult {
  type: 'product' | 'category' | 'navigation' | 'ui' | 'ignore' | 'product_attribute';
  confidence: number;
  reasoning: string;
  domain?: string;
  extractedData?: {
    name: string;
    url: string;
    categoryPath?: string;
    productId?: string;
  };
  attributeData?: {
    type: 'color' | 'size' | 'style' | 'availability' | 'action';
    value: string;
    parentProductUrl?: string;
    selector: string;
    elementDetails?: {
      tag: string;
      className?: string;
      id?: string;
      attributes?: any;
      xpath?: string;
    };
  };
}

export class IntentBasedClassifier {
  
  /**
   * Main classification method - analyzes user intent from interaction context
   */
  classifyInteraction(
    interaction: ParsedInteraction, 
    sessionContext: SessionContext,
    subsequentInteractions: ParsedInteraction[] = []
  ): ClassificationResult {
    
    // Skip non-meaningful interactions
    if (this.shouldIgnoreInteraction(interaction)) {
      return {
        type: 'ignore',
        confidence: 1.0,
        reasoning: 'Non-meaningful interaction type or missing data'
      };
    }
    
    // Check if this is a product attribute FIRST (colors, sizes, actions on product pages)
    const attributeAnalysis = this.analyzeProductAttribute(interaction, sessionContext);
    if (attributeAnalysis.confidence > 0.8) {
      return this.buildAttributeResult(attributeAnalysis, interaction, sessionContext);
    }
    
    // Analyze URL structure (most reliable indicator for non-attributes)
    const urlAnalysis = this.analyzeURL(interaction.context?.url);
    if (urlAnalysis.confidence > 0.8) {
      return this.buildResult(urlAnalysis, interaction, sessionContext);
    }
    
    // Analyze user navigation intent
    const navigationAnalysis = this.analyzeNavigationIntent(interaction, subsequentInteractions);
    if (navigationAnalysis.confidence > 0.7) {
      return this.buildResult(navigationAnalysis, interaction, sessionContext);
    }
    
    // Analyze behavioral context
    const behaviorAnalysis = this.analyzeBehavioralContext(interaction, sessionContext);
    if (behaviorAnalysis.confidence > 0.6) {
      return this.buildResult(behaviorAnalysis, interaction, sessionContext);
    }
    
    // Fall back to enhanced text analysis with context
    const textAnalysis = this.analyzeTextWithContext(interaction, sessionContext);
    return this.buildResult(textAnalysis, interaction, sessionContext);
  }
  
  /**
   * Analyze URL structure to determine page type and user intent
   */
  private analyzeURL(url?: string): { type: string; confidence: number; reasoning: string } {
    if (!url) {
      return { type: 'ignore', confidence: 0.9, reasoning: 'No URL available' };
    }
    
    const lowerURL = url.toLowerCase();
    
    // Strong product indicators
    if (lowerURL.includes('/productpage') || 
        lowerURL.includes('/product/') ||
        lowerURL.match(/\/p\/[\w-]+/) ||
        lowerURL.match(/\/s\/[\w-]+\/\d+/) ||
        lowerURL.includes('product.do?pid=')) {
      return {
        type: 'product',
        confidence: 0.95,
        reasoning: 'URL structure indicates product detail page'
      };
    }
    
    // Strong category indicators
    if (lowerURL.match(/\/(men|women|kids|boys|girls)\/[\w-]+\/[\w-]+\.html/) ||
        lowerURL.includes('/browse/') ||
        lowerURL.includes('/category/') ||
        lowerURL.match(/\/(sale|new)\/[\w-]+/) ||
        lowerURL.includes('breadcrumb=')) {
      return {
        type: 'category',
        confidence: 0.9,
        reasoning: 'URL structure indicates category listing page'
      };
    }
    
    // Homepage or navigation
    if (lowerURL.match(/\.(com|net|org)\/?$/) || 
        lowerURL.includes('index.html')) {
      return {
        type: 'navigation',
        confidence: 0.8,
        reasoning: 'Homepage or index page'
      };
    }
    
    return { type: 'unknown', confidence: 0.0, reasoning: 'URL pattern not recognized' };
  }
  
  /**
   * Analyze user navigation intent by looking at what happens next
   */
  private analyzeNavigationIntent(
    interaction: ParsedInteraction, 
    subsequentInteractions: ParsedInteraction[]
  ): { type: string; confidence: number; reasoning: string } {
    
    if (interaction.type !== 'CLICK' || subsequentInteractions.length === 0) {
      return { type: 'unknown', confidence: 0.0, reasoning: 'No click or no subsequent interactions' };
    }
    
    // Find the next URL after this interaction
    const nextURL = this.findNextURL(subsequentInteractions);
    if (!nextURL) {
      return { type: 'unknown', confidence: 0.0, reasoning: 'No subsequent URL found' };
    }
    
    const currentURL = interaction.context?.url;
    const nextURLAnalysis = this.analyzeURL(nextURL);
    
    // If clicking led to a product page, this was product selection
    if (nextURLAnalysis.type === 'product') {
      return {
        type: 'product',
        confidence: 0.85,
        reasoning: `Click led to product page: ${nextURL}`
      };
    }
    
    // If clicking led to a category page, this was category navigation
    if (nextURLAnalysis.type === 'category') {
      return {
        type: 'category',
        confidence: 0.8,
        reasoning: `Click led to category page: ${nextURL}`
      };
    }
    
    // If staying on same page or minor URL change, likely UI interaction
    if (currentURL && nextURL && this.isSamePage(currentURL, nextURL)) {
      return {
        type: 'ui',
        confidence: 0.7,
        reasoning: 'Click did not change page significantly'
      };
    }
    
    return { type: 'unknown', confidence: 0.0, reasoning: 'Navigation intent unclear' };
  }
  
  /**
   * Analyze behavioral context from session data
   */
  private analyzeBehavioralContext(
    interaction: ParsedInteraction,
    sessionContext: SessionContext
  ): { type: string; confidence: number; reasoning: string } {
    
    // If user is browsing and on category pages, interactions are likely category navigation
    if (sessionContext.pageType === 'category' && 
        sessionContext.userIntent === 'browse' && 
        sessionContext.shoppingStage === 'awareness') {
      
      const elementText = interaction.element?.text;
      if (elementText && this.looksLikeCategoryName(elementText)) {
        return {
          type: 'category',
          confidence: 0.7,
          reasoning: 'User browsing categories, element looks like category name'
        };
      }
    }
    
    // If user intent changes from browse to purchase, they're selecting products
    if (sessionContext.userIntent === 'purchase' || 
        sessionContext.shoppingStage === 'consideration') {
      
      const elementText = interaction.element?.text;
      if (elementText && this.looksLikeProductName(elementText)) {
        return {
          type: 'product',
          confidence: 0.6,
          reasoning: 'User in purchasing mode, element looks like product'
        };
      }
    }
    
    return { type: 'unknown', confidence: 0.0, reasoning: 'Behavioral context not decisive' };
  }
  
  /**
   * Enhanced text analysis with context awareness
   */
  private analyzeTextWithContext(
    interaction: ParsedInteraction,
    sessionContext: SessionContext
  ): { type: string; confidence: number; reasoning: string } {
    
    const elementText = interaction.element?.text;
    if (!elementText) {
      return { type: 'ignore', confidence: 0.9, reasoning: 'No element text' };
    }
    
    const text = elementText.trim().toLowerCase();
    
    // Filter out obvious UI text
    if (this.isUIText(text)) {
      return {
        type: 'ignore',
        confidence: 0.8,
        reasoning: 'Appears to be UI text'
      };
    }
    
    // Product name patterns (specific, descriptive)
    if (this.looksLikeProductName(text)) {
      return {
        type: 'product',
        confidence: 0.6,
        reasoning: 'Text pattern suggests product name'
      };
    }
    
    // Category name patterns (generic, plural)
    if (this.looksLikeCategoryName(text)) {
      return {
        type: 'category',
        confidence: 0.5,
        reasoning: 'Text pattern suggests category name'
      };
    }
    
    return { type: 'ignore', confidence: 0.5, reasoning: 'Text pattern not recognized' };
  }
  
  /**
   * Check if interaction should be ignored entirely
   */
  private shouldIgnoreInteraction(interaction: ParsedInteraction): boolean {
    // Ignore non-click interactions for classification
    if (!['CLICK', 'navigation_restored'].includes(interaction.type)) {
      return true;
    }
    
    // Ignore interactions without meaningful data
    if (!interaction.element?.text && !interaction.context?.url) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Find the next URL in subsequent interactions
   */
  private findNextURL(interactions: ParsedInteraction[]): string | null {
    for (const interaction of interactions) {
      if (interaction.context?.url) {
        return interaction.context.url;
      }
    }
    return null;
  }
  
  /**
   * Check if two URLs represent the same page (ignoring query params)
   */
  private isSamePage(url1: string, url2: string): boolean {
    try {
      const base1 = url1.split('?')[0].split('#')[0];
      const base2 = url2.split('?')[0].split('#')[0];
      return base1 === base2;
    } catch {
      return url1 === url2;
    }
  }
  
  /**
   * Check if text looks like a category name
   */
  private looksLikeCategoryName(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Category keywords
    const categoryKeywords = [
      'men', 'women', 'kids', 'boys', 'girls', 'baby',
      'sale', 'new', 'featured', 'trending',
      'shoes', 'clothing', 'accessories', 'bags',
      't-shirts', 'shirts', 'pants', 'dresses', 'jackets'
    ];
    
    // Must be short and contain category keywords
    const hasCategory = categoryKeywords.some(keyword => lowerText.includes(keyword));
    const isShort = text.length < 50;
    const isGeneric = !text.includes('fit') && !text.includes('cotton') && !text.includes('-');
    
    return hasCategory && isShort && isGeneric;
  }
  
  /**
   * Check if text looks like a product name
   */
  private looksLikeProductName(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Product indicators
    const productKeywords = [
      'shirt', 'polo', 'tee', 'pants', 'jeans', 'dress', 'shoe', 'sneaker',
      'jacket', 'sweater', 'hoodie', 'blazer', 'coat', 'vest'
    ];
    
    // Style/material descriptors
    const descriptors = [
      'regular', 'slim', 'loose', 'fitted', 'relaxed',
      'cotton', 'linen', 'wool', 'denim', 'leather',
      'organic', 'premium', 'classic', 'vintage'
    ];
    
    const hasProduct = productKeywords.some(keyword => lowerText.includes(keyword));
    const hasDescriptor = descriptors.some(desc => lowerText.includes(desc));
    const isDescriptive = text.length > 15 && text.length < 150;
    
    return (hasProduct && isDescriptive) || (hasDescriptor && hasProduct);
  }
  
  /**
   * Check if text is UI/interface text that should be ignored
   */
  private isUIText(text: string): boolean {
    const uiPatterns = [
      'add to bag', 'add to cart', 'checkout', 'sign in', 'sign up',
      'search', 'filter', 'sort by', 'view all', 'load more',
      'back', 'next', 'previous', 'continue', 'submit',
      'check out customer reviews', 'finding the best fit',
      'selected size', 'color:', 'size:', '$', 'not saved to favorites'
    ];
    
    return uiPatterns.some(pattern => text.includes(pattern)) ||
           text.length > 100 || // Very long text is likely UI/description
           !!text.match(/^\d+\.\d+$/) || // Just numbers
           !!text.match(/^[A-Z\s]+$/); // All caps (likely UI labels)
  }
  
  /**
   * Build final classification result
   */
  private buildResult(
    analysis: { type: string; confidence: number; reasoning: string },
    interaction: ParsedInteraction,
    sessionContext: SessionContext
  ): ClassificationResult {
    
    const result: ClassificationResult = {
      type: analysis.type as any,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning
    };
    
    // Extract additional data for valid classifications
    if (analysis.type === 'product' || analysis.type === 'category') {
      const url = interaction.context?.url;
      const text = interaction.element?.text;
      
      if (url && text) {
        result.domain = this.extractDomain(url);
        result.extractedData = {
          name: text.trim(),
          url: url,
          categoryPath: analysis.type === 'category' ? this.generateCategoryPath(text, url) : undefined,
          productId: analysis.type === 'product' ? this.generateProductId(text, url) : undefined
        };
      }
    }
    
    return result;
  }
  
  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const match = url.match(/https?:\/\/([^\/]+)/);
      return match ? match[1] : 'unknown';
    } catch {
      return 'unknown';
    }
  }
  
  /**
   * Generate category path from text and URL
   */
  private generateCategoryPath(text: string, url: string): string {
    // Extract from URL structure first for specific category pages
    const pathMatch = url.match(/\/(men|women|kids)\/([\w-]+)\/([\w-]+)/);
    if (pathMatch) {
      return `${pathMatch[1]}/${pathMatch[2]}/${pathMatch[3]}`;
    }
    
    // For main category pages, extract section from URL
    const mainCategoryMatch = url.match(/\/browse\/(men|women|kids|boys|girls|baby)/i);
    if (mainCategoryMatch) {
      return mainCategoryMatch[1].toLowerCase();
    }
    
    // Check for category in URL parameters
    const categoryParam = url.match(/[?&]category=([^&]+)/i);
    if (categoryParam) {
      return decodeURIComponent(categoryParam[1]).toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
    }
    
    // Fallback: Use text but ensure it matches URL context
    const textPath = text.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
    
    // Add comprehensive URL validation - fix all category mismatches
    const urlContains = {
      men: url.includes('men') || url.includes('Men'),
      women: url.includes('women') || url.includes('Women'), 
      boys: url.includes('boys') || url.includes('Boys'),
      girls: url.includes('girls') || url.includes('Girls'),
      baby: url.includes('baby') || url.includes('Baby') || url.includes('toddler')
    };
    
    // Detect and correct mismatches between text and URL
    // The URL should be the source of truth for category paths
    if (urlContains.men && !urlContains.women && !urlContains.boys && !urlContains.girls && !urlContains.baby) {
      if (textPath !== 'men') {
        console.log(`⚠️ MISMATCH: "${text}" text with men URL - CORRECTING path to "men"`);
      }
      return 'men';
    }
    if (urlContains.women && !urlContains.men && !urlContains.boys && !urlContains.girls && !urlContains.baby) {
      if (textPath !== 'women') {
        console.log(`⚠️ MISMATCH: "${text}" text with women URL - CORRECTING path to "women"`);
      }
      return 'women';
    }
    if (urlContains.boys && !urlContains.men && !urlContains.women && !urlContains.girls && !urlContains.baby) {
      if (textPath !== 'boys') {
        console.log(`⚠️ MISMATCH: "${text}" text with boys URL - CORRECTING path to "boys"`);
      }
      return 'boys';
    }
    if (urlContains.girls && !urlContains.men && !urlContains.women && !urlContains.boys && !urlContains.baby) {
      if (textPath !== 'girls') {
        console.log(`⚠️ MISMATCH: "${text}" text with girls URL - CORRECTING path to "girls"`);
      }
      return 'girls';
    }
    if (urlContains.baby && !urlContains.men && !urlContains.women && !urlContains.boys && !urlContains.girls) {
      if (textPath !== 'baby') {
        console.log(`⚠️ MISMATCH: "${text}" text with baby URL - CORRECTING path to "baby"`);
      }
      return 'baby';
    }
    
    return textPath;
  }
  
  /**
   * Generate product ID from text and URL
   */
  private generateProductId(text: string, url: string): string {
    // Try to extract from URL
    const urlId = url.match(/(?:pid|productId|id)=([^&]+)/i) ||
                 url.match(/\/productpage\.(\d+)\./) ||
                 url.match(/\/p\/([\w-]+)/) ||
                 url.match(/\/s\/[\w-]+\/(\d+)/);
    
    if (urlId) {
      return urlId[1];
    }
    
    // Generate from text
    return 'product-' + text.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  }

  /**
   * Analyze if interaction represents a product attribute (color, size, style, etc.)
   */
  private analyzeProductAttribute(
    interaction: ParsedInteraction,
    sessionContext: SessionContext
  ): { type: string; confidence: number; reasoning: string; attributeType?: string } {
    
    const elementText = interaction.element?.text?.trim();
    if (!elementText) {
      return { type: 'unknown', confidence: 0.0, reasoning: 'No element text' };
    }

    const text = elementText.toLowerCase();
    const url = interaction.context?.url || '';

    // Only check attributes on product pages (where people select variants)
    if (!url.includes('/productpage') && !url.includes('/product.do') && !url.includes('/browse/product')) {
      return { type: 'unknown', confidence: 0.0, reasoning: 'Not on product detail page' };
    }

    // Debug logging for attribute detection
    console.log(`               🔍 ATTRIBUTE_CHECK: Testing "${elementText}" on URL: ${url.substring(0, 80)}...`);

    // Color detection
    const colorMatch = this.detectColor(text);
    console.log(`               🎨 COLOR: "${elementText}" -> confidence: ${colorMatch.confidence}`);
    if (colorMatch.confidence > 0.8) {
      return {
        type: 'product_attribute',
        confidence: colorMatch.confidence,
        reasoning: `Detected color attribute: ${colorMatch.value}`,
        attributeType: 'color'
      };
    }

    // Size detection  
    const sizeMatch = this.detectSize(text);
    console.log(`               📏 SIZE: "${elementText}" -> confidence: ${sizeMatch.confidence}`);
    if (sizeMatch.confidence > 0.8) {
      return {
        type: 'product_attribute',
        confidence: sizeMatch.confidence,
        reasoning: `Detected size attribute: ${sizeMatch.value}`,
        attributeType: 'size'
      };
    }

    // Action detection (Add to Bag, Add to Cart, etc.) - prioritize these
    const actionMatch = this.detectAction(text);
    console.log(`               🛒 ACTION: "${elementText}" -> confidence: ${actionMatch.confidence}`);
    if (actionMatch.confidence > 0.8) {
      return {
        type: 'product_attribute',
        confidence: actionMatch.confidence,
        reasoning: `Detected product action: ${actionMatch.value}`,
        attributeType: 'action'
      };
    }

    // Style/fit detection
    const styleMatch = this.detectStyle(text);
    if (styleMatch.confidence > 0.7) {
      return {
        type: 'product_attribute',
        confidence: styleMatch.confidence,
        reasoning: `Detected style attribute: ${styleMatch.value}`,
        attributeType: 'style'
      };
    }

    // Availability detection
    const availabilityMatch = this.detectAvailability(text);
    if (availabilityMatch.confidence > 0.8) {
      return {
        type: 'product_attribute',
        confidence: availabilityMatch.confidence,
        reasoning: `Detected availability status: ${availabilityMatch.value}`,
        attributeType: 'availability'
      };
    }

    return { type: 'unknown', confidence: 0.0, reasoning: 'Not recognized as product attribute' };
  }

  /**
   * Detect color attributes
   */
  private detectColor(text: string): { value: string; confidence: number } {
    const colors = [
      'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
      'brown', 'gray', 'grey', 'navy', 'beige', 'cream', 'tan', 'olive', 'maroon',
      'teal', 'burgundy', 'khaki', 'ivory', 'coral', 'salmon', 'mint', 'lavender',
      'crimson', 'emerald', 'turquoise', 'violet', 'magenta', 'cyan', 'lime',
      'dark', 'light', 'bright', 'pale', 'deep'
    ];

    // Exact color match
    const exactMatch = colors.find(color => text === color);
    if (exactMatch) {
      return { value: text, confidence: 0.95 };
    }

    // Color with modifier (e.g., "dark blue", "light green")
    const colorWithModifier = colors.find(color => text.includes(color));
    if (colorWithModifier) {
      return { value: text, confidence: 0.9 };
    }

    // Color patterns (hex-like names, brand color names)
    if (text.match(/^[a-z]+\s*(blue|red|green|black|white|gray|grey)$/)) {
      return { value: text, confidence: 0.85 };
    }

    return { value: text, confidence: 0.0 };
  }

  /**
   * Detect size attributes
   */
  private detectSize(text: string): { value: string; confidence: number } {
    // Clothing sizes
    if (text.match(/^(xs|s|m|l|xl|xxl|xxxl)$/i) || 
        text.match(/^(extra small|small|medium|large|extra large)$/i)) {
      return { value: text.toUpperCase(), confidence: 0.95 };
    }

    // Numeric sizes (clothing)
    if (text.match(/^\d{1,2}$/) && parseInt(text) >= 0 && parseInt(text) <= 50) {
      return { value: text, confidence: 0.9 };
    }

    // Waist sizes (30W, 32, etc.)
    if (text.match(/^\d{2,3}w?$/i)) {
      return { value: text.toUpperCase(), confidence: 0.9 };
    }

    // Shoe sizes (including half sizes)
    if (text.match(/^\d{1,2}(\.\d)?$/) && parseFloat(text) >= 3 && parseFloat(text) <= 20) {
      return { value: text, confidence: 0.85 };
    }

    // Size with descriptors
    if (text.match(/^(size\s*)?\d+/i)) {
      return { value: text.replace(/^size\s*/i, ''), confidence: 0.8 };
    }

    return { value: text, confidence: 0.0 };
  }

  /**
   * Detect action attributes (Add to Bag, etc.)
   */
  private detectAction(text: string): { value: string; confidence: number } {
    const actions = [
      'add to bag', 'add to cart', 'buy now', 'purchase', 'checkout',
      'add to wishlist', 'save for later', 'quick add', 'select'
    ];

    const exactMatch = actions.find(action => text === action);
    if (exactMatch) {
      return { value: text, confidence: 0.95 };
    }

    const partialMatch = actions.find(action => text.includes(action));
    if (partialMatch) {
      return { value: text, confidence: 0.9 };
    }

    return { value: text, confidence: 0.0 };
  }

  /**
   * Detect style/fit attributes
   */
  private detectStyle(text: string): { value: string; confidence: number } {
    const styles = [
      'regular fit', 'slim fit', 'loose fit', 'relaxed fit', 'straight fit',
      'skinny', 'wide leg', 'bootcut', 'regular', 'slim', 'loose', 'relaxed'
    ];

    const exactMatch = styles.find(style => text === style);
    if (exactMatch) {
      return { value: text, confidence: 0.9 };
    }

    const partialMatch = styles.find(style => text.includes(style));
    if (partialMatch) {
      return { value: text, confidence: 0.8 };
    }

    return { value: text, confidence: 0.0 };
  }

  /**
   * Detect availability status
   */
  private detectAvailability(text: string): { value: string; confidence: number } {
    const availabilityTerms = [
      'in stock', 'out of stock', 'low stock', 'available', 'unavailable',
      'sold out', 'limited availability', 'pre-order', 'backorder'
    ];

    const exactMatch = availabilityTerms.find(term => text === term);
    if (exactMatch) {
      return { value: text, confidence: 0.95 };
    }

    const partialMatch = availabilityTerms.find(term => text.includes(term));
    if (partialMatch) {
      return { value: text, confidence: 0.9 };
    }

    return { value: text, confidence: 0.0 };
  }

  /**
   * Build result for product attributes
   */
  private buildAttributeResult(
    analysis: { type: string; confidence: number; reasoning: string; attributeType?: string },
    interaction: ParsedInteraction,
    sessionContext: SessionContext
  ): ClassificationResult {
    
    const result: ClassificationResult = {
      type: 'product_attribute' as any,
      confidence: analysis.confidence,
      reasoning: analysis.reasoning,
      attributeData: {
        type: analysis.attributeType as any,
        value: interaction.element?.text?.trim() || '',
        parentProductUrl: interaction.context?.url,
        selector: this.extractElementSelector(interaction),
        elementDetails: {
          tag: interaction.element?.tag || interaction.element?.tagName || '',
          className: interaction.element?.className,
          id: interaction.element?.id,
          attributes: interaction.element?.attributes,
          xpath: this.generateXPath(interaction)
        }
      }
    };

    // Extract domain
    if (interaction.context?.url) {
      result.domain = this.extractDomain(interaction.context.url);
    }

    return result;
  }

  /**
   * Extract the best available selector for the element
   */
  private extractElementSelector(interaction: ParsedInteraction): string {
    // Check if selectors are already provided
    if (interaction.selectors) {
      const selectors = interaction.selectors as any;
      if (selectors.css) return selectors.css;
      if (selectors.xpath) return selectors.xpath;
      if (selectors.primary) return selectors.primary;
    }

    // Build selector from element details
    const element = interaction.element;
    if (!element) return '';

    let selector = element.tag || element.tagName || '';

    // Add ID if available
    if (element.id) {
      selector += `#${element.id}`;
    }

    // Add class if available
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        selector += '.' + classes.join('.');
      }
    }

    // Add attributes for better specificity
    if (element.attributes) {
      Object.entries(element.attributes).forEach(([key, value]) => {
        if (key === 'data-color' || key === 'data-size' || key === 'data-value') {
          selector += `[${key}="${value}"]`;
        }
      });
    }

    return selector || 'unknown-selector';
  }

  /**
   * Generate XPath for the element (basic implementation)
   */
  private generateXPath(interaction: ParsedInteraction): string {
    const element = interaction.element;
    if (!element) return '';

    let xpath = `//${element.tag || element.tagName || '*'}`;

    if (element.id) {
      xpath = `//*[@id="${element.id}"]`;
    } else if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        xpath += `[@class="${element.className}"]`;
      }
    }

    // Add text content for better matching
    if (element.text && element.text.length < 50) {
      xpath += `[text()="${element.text.trim()}"]`;
    }

    return xpath;
  }
}