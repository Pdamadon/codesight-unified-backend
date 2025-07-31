/**
 * Behavior-Based UnifiedSession Ingester
 * 
 * Uses intent-based classification to properly identify categories vs products
 * based on user behavior, navigation patterns, and contextual analysis.
 * 
 * Solves issues like "T-shirts & Tank Tops" being classified as products
 * by understanding that users were browsing category pages, not selecting products.
 */

import { WorldModelService } from '../database/service';
import { PageType, CategoryType, SiteType } from '../database/schema';
import { PrismaClient, Prisma } from '@prisma/client';
import { IntentBasedClassifier } from './intent-based-classifier';

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
  [key: string]: any;
}

interface SessionContext {
  pageType?: string;
  userIntent?: string;
  shoppingStage?: string;
  behaviorType?: string;
  qualityScore?: number;
}

interface ExtractedDomain {
  domain: string;
  siteName: string;
  siteType: SiteType;
  urlPatterns: {
    category: string[];
    product: string[];
    search: string[];
    sale: string[];
  };
}

interface ExtractedCategory {
  categoryPath: string;
  categoryName: string;
  categoryType: CategoryType;
  urls: string[];
  confidence: number;
  reasoning: string;
}

interface ExtractedProduct {
  productId: string;
  productName: string;
  price?: number;
  url: string;
  selector: string;
  categoryPath: string;
  confidence: number;
  reasoning: string;
  variants?: {
    colors?: ProductAttribute[];
    sizes?: ProductAttribute[];
    styles?: ProductAttribute[];
  };
  actions?: ProductAttribute[];
  availability?: ProductAttribute[];
}

interface ProductAttribute {
  value: string;
  selector: string;
  confidence: number;
  elementDetails: {
    tag: string;
    className?: string;
    id?: string;
    attributes?: any;
    xpath?: string;
  };
}

export class BehaviorBasedIngester {
  private worldModel: WorldModelService;
  private prisma: PrismaClient;
  private classifier: IntentBasedClassifier;

  constructor(worldModelService: WorldModelService) {
    this.worldModel = worldModelService;
    this.prisma = new PrismaClient();
    this.classifier = new IntentBasedClassifier();
  }

  /**
   * Main ingestion method - processes all UnifiedSession data with behavior analysis
   */
  async ingestAllSessions(): Promise<void> {
    console.log('🔄 Starting Behavior-Based UnifiedSession Ingestion...');
    console.log('🧠 Using intent-based classification with behavioral context\n');

    // Get all sessions with enhanced interactions and behavioral context
    const sessions = await this.prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: Prisma.JsonNull },
        interactionCount: { gt: 3 } // Minimum interactions for meaningful analysis
      },
      select: {
        id: true,
        enhancedInteractions: true,
        pageType: true,
        userIntent: true,
        shoppingStage: true,
        behaviorType: true,
        qualityScore: true
      },
      orderBy: { qualityScore: 'desc' } // Process highest quality sessions first
    });

    console.log(`📊 Found ${sessions.length} sessions with behavioral context`);

    const stats = {
      domainsFound: new Set<string>(),
      categoriesCreated: new Set<string>(),
      productsCreated: new Set<string>(),
      errors: [] as string[],
      classificationsAnalyzed: 0,
      highConfidenceClassifications: 0,
      lowConfidenceSkipped: 0,
      uiInteractionsFiltered: 0
    };

    for (const session of sessions) {
      try {
        console.log(`📝 Processing session: ${session.id.substring(0, 8)}... (Quality: ${session.qualityScore})`);
        await this.processSessionWithBehavior(session, stats);
      } catch (error) {
        console.error(`❌ Error processing session ${session.id}:`, error);
        stats.errors.push(`Session ${session.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log('\n✅ Behavior-Based Ingestion Completed');
    console.log('📊 Results:');
    console.log(`   • Domains: ${stats.domainsFound.size}`);
    console.log(`   • Categories: ${stats.categoriesCreated.size}`);
    console.log(`   • Products: ${stats.productsCreated.size}`);
    console.log(`   • Classifications Analyzed: ${stats.classificationsAnalyzed}`);
    console.log(`   • High Confidence Used: ${stats.highConfidenceClassifications}`);
    console.log(`   • Low Confidence Skipped: ${stats.lowConfidenceSkipped}`);
    console.log(`   • UI Interactions Filtered: ${stats.uiInteractionsFiltered}`);
    console.log(`   • Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n⚠️ Errors encountered:');
      stats.errors.slice(0, 5).forEach(error => console.log(`   ${error}`));
    }

    console.log('\n🎯 Behavior-Based Classification Benefits:');
    console.log('   ✅ Categories properly identified from browsing behavior');
    console.log('   ✅ Products only classified from selection behavior');
    console.log('   ✅ UI text filtered out automatically');
    console.log('   ✅ Real domains extracted from navigation patterns');
  }

  /**
   * Process a single session using behavioral context
   */
  private async processSessionWithBehavior(session: any, stats: any): Promise<void> {
    const interactions = this.parseInteractions(session.enhancedInteractions);
    if (!interactions || interactions.length === 0) {
      return;
    }

    console.log(`   📊 Analyzing ${interactions.length} interactions with behavioral context`);
    console.log(`   🧠 Context: ${session.pageType} | ${session.userIntent} | ${session.shoppingStage} | ${session.behaviorType}`);

    // Build session context for classification
    const sessionContext: SessionContext = {
      pageType: session.pageType,
      userIntent: session.userIntent,
      shoppingStage: session.shoppingStage,
      behaviorType: session.behaviorType,
      qualityScore: session.qualityScore
    };

    // Extract domain information from interactions
    const domain = this.extractDomainInfo(interactions);
    if (!domain) {
      return;
    }

    stats.domainsFound.add(domain.domain);

    // Ensure domain exists in world model
    await this.ensureDomain(domain);

    // Classify elements using intent-based analysis
    const { categories, products } = this.classifyWithBehavior(interactions, sessionContext, domain.domain);

    console.log(`   📁 Found ${categories.length} categories, 🛍️ ${products.length} products`);

    // Create categories (only high-confidence ones)
    for (const category of categories) {
      if (category.confidence >= 0.6) { // Only high-confidence categories
        const key = `${domain.domain}:${category.categoryPath}`;
        if (!stats.categoriesCreated.has(key)) {
          await this.ensureCategory(domain.domain, category);
          stats.categoriesCreated.add(key);
          console.log(`   ✅ Category: "${category.categoryName}" (confidence: ${category.confidence.toFixed(2)})`);
        }
        stats.highConfidenceClassifications++;
      } else {
        stats.lowConfidenceSkipped++;
      }
    }

    // Create products (only high-confidence ones)
    for (const product of products) {
      if (product.confidence >= 0.7) { // Higher threshold for products
        const key = `${domain.domain}:${product.productId}`;
        if (!stats.productsCreated.has(key)) {
          await this.ensureProduct(domain.domain, product, interactions);
          stats.productsCreated.add(key);
          console.log(`   ✅ Product: "${product.productName}" (confidence: ${product.confidence.toFixed(2)})`);
        }
        stats.highConfidenceClassifications++;
      } else {
        stats.lowConfidenceSkipped++;
      }
    }
  }

  /**
   * Classify elements using behavior-based analysis
   */
  private classifyWithBehavior(
    interactions: ParsedInteraction[], 
    sessionContext: SessionContext,
    domain: string
  ): { categories: ExtractedCategory[], products: ExtractedProduct[] } {
    
    console.log(`   🔍 CLASSIFY_WITH_BEHAVIOR: Processing ${interactions.length} interactions for domain ${domain}`);
    
    const categories: ExtractedCategory[] = [];
    
    try {
      // Group interactions by URL to find product pages and their attributes
      console.log(`   📊 GROUPING: Calling groupInteractionsByProductPage with ${interactions.length} interactions`);
      const productPageGroups = this.groupInteractionsByProductPage(interactions);
      console.log(`   📊 GROUPING: Returned ${productPageGroups.size} product page groups`);
      
      const products: ExtractedProduct[] = [];

      // Process each product page group
      for (const [url, pageInteractions] of productPageGroups) {
        console.log(`   🔄 AGGREGATION: Processing product page: ${url} (${pageInteractions.length} interactions)`);
        
        try {
          const productData = this.extractProductFromPageInteractions(pageInteractions, sessionContext, url);
          if (productData) {
            const variantCount = Object.keys(productData.variants || {}).length;
            const colorCount = productData.variants?.colors?.length || 0;
            const sizeCount = productData.variants?.sizes?.length || 0;
            const actionCount = productData.actions?.length || 0;
            
            console.log(`   ✅ AGGREGATION: Created aggregated product: "${productData.productName}"`);
            console.log(`      🎨 Colors: ${colorCount}, 📏 Sizes: ${sizeCount}, 🛒 Actions: ${actionCount}`);
            products.push(productData);
          } else {
            console.log(`   ❌ AGGREGATION: Could not create product from ${url}`);
          }
        } catch (aggregationError: any) {
          console.error(`   💥 AGGREGATION ERROR for ${url}:`, aggregationError.message);
        }
      }

      // Process remaining interactions for categories
      console.log(`   📁 CATEGORIES: Processing ${interactions.length} interactions for category classification`);
      let categoryCount = 0;
      
      interactions.forEach((interaction, index) => {
        const subsequentInteractions = interactions.slice(index + 1, index + 5);
        const classification = this.classifier.classifyInteraction(
          interaction, 
          sessionContext, 
          subsequentInteractions
        );

        if (classification.type === 'category' && classification.extractedData) {
          const category = this.buildCategoryFromClassification(classification, interaction);
          if (category) {
            categories.push(category);
            categoryCount++;
          }
        }
      });
      
      console.log(`   📁 CATEGORIES: Created ${categoryCount} categories`);
      console.log(`   🏁 CLASSIFY_WITH_BEHAVIOR: Returning ${categories.length} categories, ${products.length} products`);

      return { categories, products };
      
    } catch (error: any) {
      console.error(`   💥 CLASSIFY_WITH_BEHAVIOR ERROR:`, error.message);
      console.error(`   Stack:`, error.stack?.split('\n').slice(0, 3).join('\n'));
      
      // Fallback: return empty results
      return { categories: [], products: [] };
    }
  }

  /**
   * Group interactions by product page URL to aggregate attributes
   */
  private groupInteractionsByProductPage(interactions: ParsedInteraction[]): Map<string, ParsedInteraction[]> {
    console.log(`      🔧 GROUP_INTERACTIONS: Starting with ${interactions.length} interactions`);
    
    const productPageGroups = new Map<string, ParsedInteraction[]>();
    const urlsSeen = new Set<string>();
    const productPageMatches: string[] = [];
    const nonProductPageUrls: string[] = [];
    
    // Log first few interactions to debug
    console.log(`      📋 First 5 interactions to debug:`);
    interactions.slice(0, 5).forEach((interaction, index) => {
      const url = interaction.context?.url || 'no-url';
      const text = interaction.element?.text || 'no-text';
      console.log(`         ${index + 1}. URL: ${url.substring(0, 80)}...`);
      console.log(`            Text: "${text.substring(0, 40)}..." | Type: ${interaction.type}`);
    });

    interactions.forEach((interaction, index) => {
      const url = interaction.context?.url || 'no-url';
      urlsSeen.add(url);
      
      // Enhanced product page detection patterns with detailed logging
      const patterns = {
        productpage: url.includes('/productpage'),
        productDo: url.includes('/product.do'),
        browseProduct: url.includes('/browse/product') && url.includes('pid='),
        nordstrom: !!url.match(/\/s\/[^\/]+\/\d+/),
        generic: !!url.match(/\/p\/[^\/]+/),
        amazon: !!url.match(/\/dp\/[A-Z0-9]+/),
        pdpAnchor: url.includes('#pdp-page-content'),
        pidOnly: url.includes('pid=') && !url.includes('/browse/men') && !url.includes('/browse/women')
      };
      
      const isProductPage = Object.values(patterns).some(match => match);
      
      if (index < 3) { // Log first few for debugging
        console.log(`      🔎 URL ${index + 1}: ${url.substring(0, 100)}...`);
        console.log(`         Patterns: productpage=${patterns.productpage}, productDo=${patterns.productDo}, pdpAnchor=${patterns.pdpAnchor}`);
        console.log(`         IsProductPage: ${isProductPage}`);
      }
      
      if (isProductPage) {
        productPageMatches.push(url);
        
        // Create a normalized key for grouping
        let groupKey = '';
        
        // Extract product identifier for grouping
        if (url.includes('/productpage')) {
          // H&M style: extract product ID
          const match = url.match(/\/productpage\.(\d+)\./);
          groupKey = match ? `hm-product-${match[1]}` : url.split('?')[0].split('#')[0];
          if (index < 3) console.log(`         🏷️ H&M groupKey: ${groupKey} (match: ${match?.[1]})`);
        } else if (url.includes('pid=')) {
          // Gap style: extract product ID
          const pidMatch = url.match(/pid=([^&]+)/);
          groupKey = pidMatch ? `gap-product-${pidMatch[1]}` : url.split('?')[0].split('#')[0];
          if (index < 3) console.log(`         🏷️ Gap groupKey: ${groupKey} (pid: ${pidMatch?.[1]})`);
        } else if (url.match(/\/s\/[^\/]+\/(\d+)/)) {
          // Nordstrom style: extract product ID
          const match = url.match(/\/s\/[^\/]+\/(\d+)/);
          groupKey = match ? `nordstrom-product-${match[1]}` : url.split('?')[0].split('#')[0];
          if (index < 3) console.log(`         🏷️ Nordstrom groupKey: ${groupKey} (id: ${match?.[1]})`);
        } else {
          // Fallback: use base URL
          groupKey = url.split('?')[0].split('#')[0];
          if (index < 3) console.log(`         🏷️ Fallback groupKey: ${groupKey}`);
        }
        
        if (!productPageGroups.has(groupKey)) {
          productPageGroups.set(groupKey, []);
          if (index < 5) console.log(`         ➕ Created new group: ${groupKey}`);
        }
        productPageGroups.get(groupKey)!.push(interaction);
      } else {
        if (nonProductPageUrls.length < 5) {
          nonProductPageUrls.push(url.substring(0, 100));
        }
      }
    });

    console.log(`   🔍 SUMMARY: Examined ${urlsSeen.size} unique URLs from ${interactions.length} interactions`);
    console.log(`   📄 SUMMARY: Found ${productPageGroups.size} product pages with interactions`);
    console.log(`   ✅ SUMMARY: ${productPageMatches.length} URLs matched product page patterns`);
    console.log(`   ❌ SUMMARY: ${interactions.length - productPageMatches.length} URLs did not match`);
    
    // Show sample product page matches
    if (productPageMatches.length > 0) {
      console.log(`   🎯 Product page matches (first 3):`);
      productPageMatches.slice(0, 3).forEach((url, i) => {
        console.log(`      ${i + 1}. ${url.substring(0, 120)}...`);
      });
    }
    
    // Show sample non-matches
    if (nonProductPageUrls.length > 0) {
      console.log(`   ⚪ Non-product page URLs (first 3):`);
      nonProductPageUrls.slice(0, 3).forEach((url, i) => {
        console.log(`      ${i + 1}. ${url}...`);
      });
    }
    
    // Show grouping results
    productPageGroups.forEach((interactions, key) => {
      console.log(`      📦 GROUP: ${key} -> ${interactions.length} interactions`);
    });

    return productPageGroups;
  }

  /**
   * Check if text represents a valid product name (not category/UI)
   */
  private isValidProductName(text: string): boolean {
    if (!text || text.length < 2) return false;
    
    const lowerText = text.toLowerCase().trim();
    
    // Exclude obvious category terms
    const categoryTerms = [
      'sale', 'new', 'featured', 'trending', 'popular', 'best sellers',
      'men', 'women', 'kids', 'boys', 'girls', 'baby',
      'shoes', 'clothing', 'accessories', 'bags', 'jewelry',
      't-shirts', 'shirts', 'pants', 'dresses', 'jackets', 'sweaters'
    ];
    
    // Exclude UI terms
    const uiTerms = [
      'back', 'next', 'previous', 'continue', 'submit', 'search', 'filter',
      'sort by', 'view all', 'load more', 'size', 'color', 'add to bag',
      'add to cart', 'checkout', 'sign in', 'sign up'
    ];
    
    const allExcluded = [...categoryTerms, ...uiTerms];
    
    // Reject if it matches excluded terms exactly
    if (allExcluded.some(term => lowerText === term)) {
      return false;
    }
    
    // Reject very short generic terms
    if (lowerText.length < 5 && /^(s|m|l|xl|xxl|\d+)$/.test(lowerText)) {
      return false;
    }
    
    // Reject overly long text (likely descriptions or UI elements)
    if (lowerText.length > 60) {
      return false;
    }
    
    // Accept if it looks like a proper product name (longer, descriptive)
    return lowerText.length >= 5 || /^[a-z]+ [a-z]+/.test(lowerText);
  }

  /**
   * Check if one product name is better than another
   */
  private isBetterProductName(newName: string, currentName: string): boolean {
    const newLength = newName.length;
    const currentLength = currentName.length;
    
    // Prefer longer, more descriptive names
    if (newLength > currentLength + 5) {
      return true;
    }
    
    // Prefer names with multiple words (more descriptive)
    const newWords = newName.split(' ').length;
    const currentWords = currentName.split(' ').length;
    
    if (newWords > currentWords) {
      return true;
    }
    
    return false;
  }

  /**
   * Infer product name from URL patterns
   */
  private inferProductNameFromUrl(url: string): string | null {
    try {
      // H&M style - extract from productpage URLs
      if (url.includes('/productpage')) {
        const pathParts = url.split('/');
        const pathSegments = pathParts.filter(part => part && !part.includes('.html') && !part.includes('productpage'));
        if (pathSegments.length > 0) {
          const lastSegment = pathSegments[pathSegments.length - 1];
          if (lastSegment.length > 3) {
            return this.formatProductName(lastSegment);
          }
        }
      }
      
      // Gap style - extract from product.do URLs
      if (url.includes('product.do') && url.includes('pid=')) {
        const pidMatch = url.match(/pid=([^&]+)/);
        if (pidMatch) {
          return `Product ${pidMatch[1]}`;
        }
      }
      
      // Nordstrom style - extract from /s/ URLs
      const nordstromMatch = url.match(/\/s\/([^\/]+)\/\d+/);
      if (nordstromMatch) {
        return this.formatProductName(nordstromMatch[1]);
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Infer product name from page interactions
   */
  private inferProductNameFromInteractions(interactions: ParsedInteraction[]): string | null {
    // Look for the longest, most descriptive text that might be a product name
    let bestCandidate = '';
    
    for (const interaction of interactions) {
      const text = interaction.element?.text?.trim();
      if (text && text.length > bestCandidate.length && text.length < 60) {
        // Skip if it's obviously UI or category text
        if (!this.isUIText(text.toLowerCase()) && !this.isCategoryText(text.toLowerCase())) {
          bestCandidate = text;
        }
      }
    }
    
    return bestCandidate || null;
  }

  /**
   * Format a raw product name from URL
   */
  private formatProductName(raw: string): string {
    return raw
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
      .trim();
  }

  /**
   * Check if text is UI-related
   */
  private isUIText(text: string): boolean {
    const uiPatterns = ['add to', 'sign in', 'checkout', 'filter', 'sort', 'view all', 'load more'];
    return uiPatterns.some(pattern => text.includes(pattern));
  }

  /**
   * Check if text is category-related
   */
  private isCategoryText(text: string): boolean {
    const categoryPatterns = ['sale', 'new', 'men', 'women', 'shoes', 'clothing'];
    return categoryPatterns.some(pattern => text.includes(pattern));
  }

  /**
   * Extract a complete product with all its attributes from page interactions
   */
  private extractProductFromPageInteractions(
    pageInteractions: ParsedInteraction[], 
    sessionContext: SessionContext,
    url: string
  ): ExtractedProduct | null {
    
    console.log(`         🔧 EXTRACT_PRODUCT: Processing ${pageInteractions.length} interactions for ${url.substring(0, 80)}...`);
    
    let baseProduct: ExtractedProduct | null = null;
    const colors: ProductAttribute[] = [];
    const sizes: ProductAttribute[] = [];
    const styles: ProductAttribute[] = [];
    const actions: ProductAttribute[] = [];
    const availability: ProductAttribute[] = [];

    let classificationCounts = {
      product: 0,
      product_attribute: 0,
      category: 0,
      ui: 0,
      ignore: 0
    };

    // Analyze each interaction on this product page
    pageInteractions.forEach((interaction, index) => {
      const subsequentInteractions = pageInteractions.slice(index + 1, index + 5);
      const classification = this.classifier.classifyInteraction(
        interaction, 
        sessionContext, 
        subsequentInteractions
      );
      
      classificationCounts[classification.type as keyof typeof classificationCounts] = 
        (classificationCounts[classification.type as keyof typeof classificationCounts] || 0) + 1;
      
      if (index < 3) { // Log first few classifications
        console.log(`         🏷️ Interaction ${index + 1}: "${interaction.element?.text?.substring(0, 30)}" -> ${classification.type} (${classification.confidence.toFixed(2)})`);
      }

      if (classification.type === 'product' && classification.extractedData) {
        // Check if this should be the base product (avoid category/UI terms)
        const text = interaction.element?.text?.trim() || '';
        const isValidProductName = this.isValidProductName(text);
        
        if (isValidProductName && (!baseProduct || this.isBetterProductName(text, baseProduct.productName))) {
          // This is a better candidate for the main product
          const productResult = this.buildProductFromClassification(classification, interaction);
          if (productResult) {
            baseProduct = productResult;
          }
        }
      } else if (classification.type === 'product_attribute' && classification.attributeData) {
        // This is an attribute - add it to the appropriate list
        const attribute: ProductAttribute = {
          value: classification.attributeData.value,
          selector: classification.attributeData.selector,
          confidence: classification.confidence,
          elementDetails: classification.attributeData.elementDetails || {
            tag: '',
            className: '',
            id: '',
            attributes: {},
            xpath: ''
          }
        };

        // Classify the attribute type
        const value = attribute.value.toLowerCase();
        if (this.isColorValue(value)) {
          colors.push(attribute);
        } else if (this.isSizeValue(value)) {
          sizes.push(attribute);
        } else if (this.isStyleValue(value)) {
          styles.push(attribute);
        } else if (this.isActionValue(value)) {
          actions.push(attribute);
        } else if (this.isAvailabilityValue(value)) {
          availability.push(attribute);
        }
      }
    });

    console.log(`         📊 CLASSIFICATION_SUMMARY:`, classificationCounts);
    console.log(`         🎨 Found: ${colors.length} colors, 📏 ${sizes.length} sizes, 🛒 ${actions.length} actions`);

    // If we found a base product, enhance it with attributes
    if (baseProduct) {
      const base = baseProduct as ExtractedProduct;
      console.log(`         ✅ AGGREGATING: Base product "${base.productName}" with attributes`);
      
      const product: ExtractedProduct = {
        productId: base.productId,
        productName: base.productName,
        price: base.price,
        url: base.url,
        selector: base.selector,
        categoryPath: base.categoryPath,
        confidence: base.confidence,
        reasoning: base.reasoning,
        variants: {
          colors: colors.length > 0 ? colors : undefined,
          sizes: sizes.length > 0 ? sizes : undefined,
          styles: styles.length > 0 ? styles : undefined,
        },
        actions: actions.length > 0 ? actions : undefined,
        availability: availability.length > 0 ? availability : undefined
      };
      
      console.log(`         🎉 SUCCESS: Created aggregated product with ${colors.length + sizes.length + actions.length} total attributes`);
      return product;
    }

    // If no base product found but we have attributes, create a product from the URL/page
    if (colors.length > 0 || sizes.length > 0 || actions.length > 0) {
      console.log(`         🔄 FALLBACK: No base product found, creating from attributes`);
      const productName = this.inferProductNameFromUrl(url) || this.inferProductNameFromInteractions(pageInteractions) || 'Unknown Product';
      console.log(`         🏷️ FALLBACK: Inferred product name: "${productName}"`);
      
      const fallbackProduct = {
        productId: this.generateProductId(productName),
        productName: productName,
        url: url,
        selector: 'page-main-product',
        categoryPath: this.inferCategoryPath(url),
        confidence: 0.8,
        reasoning: 'Aggregated from product page attributes',
        variants: {
          colors: colors.length > 0 ? colors : undefined,
          sizes: sizes.length > 0 ? sizes : undefined,
          styles: styles.length > 0 ? styles : undefined,
        },
        actions: actions.length > 0 ? actions : undefined,
        availability: availability.length > 0 ? availability : undefined
      };
      
      console.log(`         🎉 FALLBACK: Created product "${productName}" with ${colors.length + sizes.length + actions.length} attributes`);
      return fallbackProduct;
    }

    console.log(`         ❌ NO_PRODUCT: No base product and no attributes found - returning null`);
    return null;
  }


  /**
   * Build category object from classification result
   */
  private buildCategoryFromClassification(
    classification: any,
    interaction: ParsedInteraction
  ): ExtractedCategory | null {
    
    if (!classification.extractedData) return null;

    return {
      categoryPath: classification.extractedData.categoryPath || this.generateCategoryPath(classification.extractedData.name),
      categoryName: classification.extractedData.name,
      categoryType: this.determineCategoryType(classification.extractedData.name),
      urls: [classification.extractedData.url],
      confidence: classification.confidence,
      reasoning: classification.reasoning
    };
  }

  /**
   * Build product object from classification result
   */
  private buildProductFromClassification(
    classification: any,
    interaction: ParsedInteraction
  ): ExtractedProduct | null {
    
    if (!classification.extractedData) return null;

    return {
      productId: classification.extractedData.productId || this.generateProductId(classification.extractedData.name),
      productName: classification.extractedData.name,
      price: this.extractPrice(classification.extractedData.name),
      url: classification.extractedData.url,
      selector: this.extractSelector(interaction),
      categoryPath: this.inferCategoryPath(classification.extractedData.url),
      confidence: classification.confidence,
      reasoning: classification.reasoning
    };
  }

  /**
   * Parse enhanced interactions from session with clean element extraction
   */
  private parseInteractions(enhancedInteractions: any): ParsedInteraction[] | null {
    if (!enhancedInteractions) return null;

    try {
      let parsed: any;

      if (typeof enhancedInteractions === 'string') {
        parsed = JSON.parse(enhancedInteractions);
      } else {
        parsed = enhancedInteractions;
      }

      // Handle array-like objects with numeric keys
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        const keys = Object.keys(parsed);
        const numericKeys = keys.filter(key => !isNaN(Number(key))).sort((a, b) => parseInt(a) - parseInt(b));

        if (numericKeys.length > 0) {
          parsed = numericKeys.map(key => (parsed as any)[key]);
        }
      }

      if (!Array.isArray(parsed)) return null;

      // Clean up each interaction to remove contaminated data
      return parsed.map(interaction => this.cleanInteraction(interaction));

    } catch (error) {
      return null;
    }
  }

  /**
   * Clean interaction data to focus only on the actual clicked element
   * and avoid sibling/nearby element contamination
   */
  private cleanInteraction(rawInteraction: any): ParsedInteraction {
    const cleaned: ParsedInteraction = {
      id: rawInteraction.id || 'unknown',
      type: rawInteraction.type || 'unknown',
      timestamp: rawInteraction.timestamp,
      sessionTime: rawInteraction.sessionTime
    };

    // Clean context data - focus on the actual page context
    if (rawInteraction.context) {
      cleaned.context = {
        url: rawInteraction.context.url,
        pageType: rawInteraction.context.pageType,
        pageTitle: rawInteraction.context.pageTitle,
        pageContext: rawInteraction.context.pageContext
      };
    }

    // Clean element data - focus ONLY on the clicked element, ignore siblings
    if (rawInteraction.element) {
      cleaned.element = {
        text: rawInteraction.element.text,
        tag: rawInteraction.element.tag || rawInteraction.element.tagName,
        tagName: rawInteraction.element.tagName || rawInteraction.element.tag,
        id: rawInteraction.element.id,
        className: rawInteraction.element.className,
        attributes: rawInteraction.element.attributes
        // EXPLICITLY EXCLUDE: siblingElements, nearbyElements, parentElements
        // These are causing the contamination!
      };
    }

    // Preserve other important data
    if (rawInteraction.selectors) {
      cleaned.selectors = rawInteraction.selectors;
    }

    if (rawInteraction.state) {
      cleaned.state = rawInteraction.state;
    }

    if (rawInteraction.metadata) {
      cleaned.metadata = rawInteraction.metadata;
    }

    return cleaned;
  }

  /**
   * Extract domain information from interactions
   */
  private extractDomainInfo(interactions: ParsedInteraction[]): ExtractedDomain | null {
    const urlsFound = new Set<string>();
    let primaryDomain = '';

    // Collect all URLs to understand the domain
    interactions.forEach(interaction => {
      if (interaction.context?.url) {
        urlsFound.add(interaction.context.url);
        
        if (!primaryDomain) {
          const domain = this.extractDomainFromURL(interaction.context.url);
          if (domain) {
            primaryDomain = domain;
          }
        }
      }
    });

    if (!primaryDomain) return null;

    // Analyze URL patterns
    const urls = Array.from(urlsFound);
    const urlPatterns = this.analyzeURLPatterns(urls);

    return {
      domain: primaryDomain,
      siteName: this.formatSiteName(primaryDomain),
      siteType: SiteType.ECOMMERCE,
      urlPatterns
    };
  }

  // Helper methods (reusing from original ingester where appropriate)
  private extractDomainFromURL(url: string): string | null {
    try {
      const match = url.match(/https?:\/\/([^\/]+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  private formatSiteName(domain: string): string {
    return domain
      .replace(/^www\./, '')
      .replace(/^www2\./, '')
      .replace(/^secure-www\./, '')
      .replace(/\.(com|net|org)$/, '')
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private analyzeURLPatterns(urls: string[]): ExtractedDomain['urlPatterns'] {
    const patterns = {
      category: [] as string[],
      product: [] as string[],
      search: [] as string[],
      sale: [] as string[]
    };

    urls.forEach(url => {
      const lowerURL = url.toLowerCase();
      
      if (lowerURL.includes('/productpage') || lowerURL.includes('/product/') || lowerURL.match(/\/p\/|\/dp\//)) {
        patterns.product.push(url);
      } else if (lowerURL.includes('/browse') || lowerURL.includes('/category') || lowerURL.match(/\/(men|women|kids)\/[\w-]+\/[\w-]+/)) {
        patterns.category.push(url);
      } else if (lowerURL.includes('/search') || lowerURL.includes('?q=')) {
        patterns.search.push(url);
      } else if (lowerURL.includes('/sale')) {
        patterns.sale.push(url);
      }
    });

    return patterns;
  }

  private generateCategoryPath(name: string): string {
    return name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
  }

  private generateProductId(name: string): string {
    return 'product-' + name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  }

  private determineCategoryType(text: string): CategoryType {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('sale') || lowerText.includes('clearance')) {
      return CategoryType.SALE;
    }
    if (lowerText.includes('new') || lowerText.includes('featured')) {
      return CategoryType.FEATURED;
    }
    
    return CategoryType.REGULAR;
  }

  private extractPrice(text: string): number | undefined {
    const priceMatch = text.match(/\$(\d+\.?\d*)/);
    return priceMatch ? parseFloat(priceMatch[1]) : undefined;
  }

  private extractSelector(interaction: ParsedInteraction): string {
    if (interaction.selectors && typeof interaction.selectors === 'object') {
      const selectors = interaction.selectors;
      return selectors.primary || selectors.css || selectors.xpath || '';
    }
    return '';
  }

  private inferCategoryPath(url: string): string {
    const pathMatch = url.match(/\/(men|women|kids)\/([\w-]+)\//);
    if (pathMatch) {
      return `${pathMatch[1]}/${pathMatch[2]}`;
    }
    return 'general';
  }

  private extractVariants(interaction: ParsedInteraction): { colors?: string[], sizes?: string[] } | undefined {
    return undefined; // Now handled by aggregateProductAttributes
  }


  // Helper methods to classify attribute values
  private isColorValue(value: string): boolean {
    const colors = [
      'black', 'white', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
      'brown', 'gray', 'grey', 'navy', 'beige', 'cream', 'tan', 'olive', 'maroon',
      'teal', 'burgundy', 'khaki', 'ivory', 'coral', 'salmon', 'mint', 'lavender',
      'crimson', 'emerald', 'turquoise', 'violet', 'magenta', 'cyan', 'lime'
    ];
    
    return colors.some(color => value.includes(color)) || 
           Boolean(value.match(/^[a-z]+\s*(blue|red|green|black|white|gray|grey)$/));
  }

  private isSizeValue(value: string): boolean {
    return Boolean(
      value.match(/^(xs|s|m|l|xl|xxl|xxxl)$/i) ||
      value.match(/^\d{1,2}$/) ||
      value.match(/^\d{2,3}w?$/i) ||
      value.match(/^\d{1,2}(\.\d)?$/)
    );
  }

  private isStyleValue(value: string): boolean {
    const styles = ['regular', 'slim', 'loose', 'relaxed', 'fit', 'straight', 'skinny'];
    return styles.some(style => value.includes(style));
  }

  private isActionValue(value: string): boolean {
    const actions = ['add to bag', 'add to cart', 'buy now', 'purchase', 'select'];
    return actions.some(action => value.includes(action));
  }

  private isAvailabilityValue(value: string): boolean {
    const availability = ['in stock', 'out of stock', 'available', 'sold out'];
    return availability.some(avail => value.includes(avail));
  }

  /**
   * Database operations (reusing existing methods)
   */
  private async ensureDomain(domainData: ExtractedDomain): Promise<void> {
    const existing = await this.worldModel.getDomain(domainData.domain);
    if (!existing) {
      await this.worldModel.upsertDomain({
        domain: domainData.domain,
        siteType: domainData.siteType,
        siteName: domainData.siteName,
        globalSelectors: {},
        layoutPatterns: {
          hasTopNavigation: true,
          hasSideNavigation: false,
          hasFooterNavigation: false,
          responsiveBreakpoints: [768, 1024]
        },
        urlPatterns: domainData.urlPatterns,
        authenticationFlow: {
          loginUrl: '/login',
          signupUrl: '/signup',
          guestCheckoutAvailable: true,
          socialLoginOptions: []
        },
        reliability: {
          overallSuccessRate: 0.8,
          totalInteractions: 0,
          lastValidated: new Date()
        }
      });
    }
  }

  private async ensureCategory(domain: string, categoryData: ExtractedCategory): Promise<void> {
    const domainRecord = await this.worldModel.getDomain(domain);
    if (!domainRecord) return;

    const existing = await this.worldModel.getCategory(domainRecord._id!.toString(), categoryData.categoryPath);
    if (!existing) {
      await this.worldModel.upsertCategory({
        domainId: domainRecord._id!.toString(),
        categoryPath: categoryData.categoryPath,
        categoryName: categoryData.categoryName,
        categoryType: categoryData.categoryType,
        urlPatterns: categoryData.urls,
        canonicalUrl: categoryData.urls[0] || '',
        spatialNavigationContext: {
          spatialRelationships: [],
          navigationLevel: categoryData.categoryPath.split('/').length - 1,
          breadcrumbs: categoryData.categoryPath.split('/')
        },
        pageSelectors: {},
        productDiscoveryRules: {
          expectedProductTypes: [],
          siblingContext: 'behavior_based' as any,
          averageProductsPerPage: 24,
          paginationPattern: 'numbered'
        },
        priceRange: {
          min: 0,
          max: 1000,
          currency: 'USD'
        },
        navigationFlow: {
          commonEntryPoints: [],
          commonExitPoints: [],
          averageTimeOnPage: 120
        },
        siblingCategories: [],
        reliability: {
          successRate: categoryData.confidence,
          totalAttempts: 1,
          lastVerified: new Date()
        }
      });
    }
  }

  private async ensureProduct(domain: string, productData: ExtractedProduct, interactions: ParsedInteraction[]): Promise<void> {
    // Convert enhanced product attributes to the format expected by world model
    const variants: any = {};
    
    if (productData.variants?.colors) {
      variants.colors = productData.variants.colors.map(color => ({
        value: color.value,
        selector: color.selector,
        elementDetails: color.elementDetails,
        confidence: color.confidence
      }));
    }
    
    if (productData.variants?.sizes) {
      variants.sizes = productData.variants.sizes.map(size => ({
        value: size.value,
        selector: size.selector,
        elementDetails: size.elementDetails,
        confidence: size.confidence
      }));
    }
    
    if (productData.variants?.styles) {
      variants.styles = productData.variants.styles.map(style => ({
        value: style.value,
        selector: style.selector,
        elementDetails: style.elementDetails,
        confidence: style.confidence
      }));
    }

    // Include actions and availability as additional metadata
    const enhancedMetadata: any = {};
    
    if (productData.actions) {
      enhancedMetadata.actions = productData.actions.map(action => ({
        value: action.value,
        selector: action.selector,
        elementDetails: action.elementDetails,
        confidence: action.confidence
      }));
    }
    
    if (productData.availability) {
      enhancedMetadata.availability = productData.availability.map(avail => ({
        value: avail.value,
        selector: avail.selector,
        elementDetails: avail.elementDetails,
        confidence: avail.confidence
      }));
    }

    await this.worldModel.ingestProductWithSiblings({
      domain,
      categoryPath: productData.categoryPath,
      primaryProduct: {
        productId: productData.productId,
        productName: productData.productName,
        price: productData.price || 0,
        url: productData.url,
        selector: productData.selector,
        position: 1,
        variants: variants,
        metadata: enhancedMetadata // Store actions and availability here
      },
      siblingProducts: [],
      pageContext: {
        pageType: PageType.CATEGORY,
        url: productData.url,
        totalProductsOnPage: interactions.length
      },
      spatialContext: { nearbyElements: [] },
      siblingsContext: { 
        siblings: [],
        confidence: productData.confidence,
        reasoning: productData.reasoning,
        attributeCount: (productData.variants?.colors?.length || 0) + 
                       (productData.variants?.sizes?.length || 0) + 
                       (productData.variants?.styles?.length || 0) + 
                       (productData.actions?.length || 0) + 
                       (productData.availability?.length || 0)
      }
    });
  }
}