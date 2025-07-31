/**
 * UnifiedSession World Model Ingester
 * 
 * Extracts world model data directly from UnifiedSession data using
 * improved classification logic based on test parser findings
 */

import { WorldModelService } from '../database/service';
import { PageType, CategoryType, SiteType } from '../database/schema';
import { PrismaClient, Prisma } from '@prisma/client';

interface ParsedInteraction {
  id: string;
  type: string;
  context?: {
    url?: string;
    pageType?: string;
    [key: string]: any;
  };
  element?: {
    text?: string;
    tagName?: string;
    id?: string;
    className?: string;
    [key: string]: any;
  };
  selectors?: any;
  state?: any;
  visual?: any;
  timestamp?: number;
  sessionTime?: number;
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
}

interface ExtractedProduct {
  productId: string;
  productName: string;
  price?: number;
  url: string;
  selector: string;
  categoryPath: string;
  variants?: {
    colors?: string[];
    sizes?: string[];
  };
}

export class UnifiedSessionIngester {
  private worldModel: WorldModelService;
  private prisma: PrismaClient;

  constructor(worldModelService: WorldModelService) {
    this.worldModel = worldModelService;
    this.prisma = new PrismaClient();
  }

  /**
   * Main ingestion method - processes all UnifiedSession data
   */
  async ingestAllSessions(): Promise<void> {
    console.log('🔄 Starting UnifiedSession ingestion...');

    // Get all sessions with enhanced interactions
    const sessions = await this.prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: Prisma.JsonNull },
        interactionCount: { gt: 0 }
      },
      select: {
        id: true,
        enhancedInteractions: true,
        pageType: true,
        userIntent: true,
        shoppingStage: true,
        behaviorType: true,
        qualityScore: true
      }
    });

    console.log(`📊 Found ${sessions.length} sessions to process`);

    const stats = {
      domainsFound: new Set<string>(),
      categoriesCreated: new Set<string>(),
      productsCreated: new Set<string>(),
      errors: [] as string[]
    };

    for (const session of sessions) {
      try {
        console.log(`📝 Processing session: ${session.id.substring(0, 8)}...`);
        await this.processSession(session, stats);
      } catch (error) {
        console.error(`❌ Error processing session ${session.id}:`, error);
        stats.errors.push(`Session ${session.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log('\n✅ UnifiedSession ingestion completed');
    console.log(`📊 Results:`);
    console.log(`   • Domains: ${stats.domainsFound.size}`);
    console.log(`   • Categories: ${stats.categoriesCreated.size}`);
    console.log(`   • Products: ${stats.productsCreated.size}`);
    console.log(`   • Errors: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log('\n⚠️ Errors encountered:');
      stats.errors.slice(0, 5).forEach(error => console.log(`   ${error}`));
    }
  }

  /**
   * Process a single session
   */
  private async processSession(session: any, stats: any): Promise<void> {
    const interactions = this.parseInteractions(session.enhancedInteractions);
    if (!interactions || interactions.length === 0) {
      return;
    }

    // Extract domain information from interactions
    const domain = this.extractDomainInfo(interactions);
    if (!domain) {
      return;
    }

    stats.domainsFound.add(domain.domain);

    // Ensure domain exists in world model
    await this.ensureDomain(domain);

    // Extract and classify elements
    const { categories, products } = this.classifyElements(interactions, domain.domain);

    // Create categories
    for (const category of categories) {
      const key = `${domain.domain}:${category.categoryPath}`;
      if (!stats.categoriesCreated.has(key)) {
        await this.ensureCategory(domain.domain, category);
        stats.categoriesCreated.add(key);
      }
    }

    // Create products
    for (const product of products) {
      const key = `${domain.domain}:${product.productId}`;
      if (!stats.productsCreated.has(key)) {
        await this.ensureProduct(domain.domain, product, interactions);
        stats.productsCreated.add(key);
      }
    }
  }

  /**
   * Parse enhanced interactions from session
   */
  private parseInteractions(enhancedInteractions: any): ParsedInteraction[] | null {
    if (!enhancedInteractions) return null;

    try {
      let parsed;

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
          return numericKeys.map(key => parsed[key]);
        }
      }

      return Array.isArray(parsed) ? parsed : null;

    } catch (error) {
      return null;
    }
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
      siteType: SiteType.ECOMMERCE, // Assume e-commerce for now
      urlPatterns
    };
  }

  /**
   * Classify elements as categories or products using improved logic
   */
  private classifyElements(interactions: ParsedInteraction[], domain: string): {
    categories: ExtractedCategory[],
    products: ExtractedProduct[]
  } {
    const categories: ExtractedCategory[] = [];
    const products: ExtractedProduct[] = [];

    interactions.forEach(interaction => {
      if (!interaction.element?.text || !interaction.context?.url) {
        return;
      }

      const element = {
        text: interaction.element.text.trim(),
        tagName: interaction.element.tagName,
        url: interaction.context.url,
        pageType: interaction.context.pageType,
        interactionType: interaction.type
      };

      const classification = this.classifyElement(element);

      if (classification === 'product') {
        const product = this.extractProductData(element, interaction);
        if (product) {
          products.push(product);
        }
      } else if (classification === 'category') {
        const category = this.extractCategoryData(element);
        if (category) {
          categories.push(category);
        }
      }
    });

    return { categories, products };
  }

  /**
   * Improved element classification using lessons from test parsers
   */
  private classifyElement(element: any): 'product' | 'category' | 'navigation' | 'unknown' {
    const text = element.text.toLowerCase();
    const url = element.url.toLowerCase();

    // 1. URL-based classification (most reliable)
    if (url.includes('/product') || url.includes('/productpage') || url.match(/\/p\/|\/dp\//)) {
      // On product pages, look for actual product names vs navigation
      if (this.looksLikeProductName(text)) {
        return 'product';
      }
      // Size/color selections on product pages
      if (this.looksLikeVariantOption(text)) {
        return 'navigation';
      }
    }

    if (url.includes('/browse') || url.includes('/category') || url.match(/\/(men|women|kids|sale)\//)) {
      // On category pages, short navigation terms are categories
      if (this.looksLikeCategoryName(text) && text.length < 30) {
        return 'category';
      }
      // But product names are still products even on category pages
      if (this.looksLikeProductName(text) && text.length > 15) {
        return 'product';
      }
    }

    // 2. Navigation indicators (high priority)
    const navKeywords = ['add to bag', 'add to cart', 'checkout', 'cart', 'home', 'back', 'next', 'continue'];
    if (navKeywords.some(keyword => text.includes(keyword))) {
      return 'navigation';
    }

    // 3. Product vs Category text analysis
    if (this.looksLikeProductName(text)) {
      return 'product';
    }

    if (this.looksLikeCategoryName(text)) {
      return 'category';
    }

    return 'unknown';
  }

  /**
   * Check if text looks like a product name
   */
  private looksLikeProductName(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Strong product indicators
    const productKeywords = [
      'shirt', 'pants', 'dress', 'shoe', 'jacket', 'sweater', 'polo', 'tee',
      'fit', 'cotton', 'denim', 'leather', 'wool', 'cargo', 'sneaker'
    ];

    // Contains product keywords and is descriptive length
    const hasProductKeyword = productKeywords.some(keyword => lowerText.includes(keyword));
    const isDescriptiveLength = text.length > 10 && text.length < 200;
    
    // Has style/material descriptors
    const hasDescriptors = /\b(regular|slim|loose|organic|premium|classic|vintage)\b/.test(lowerText);
    
    // Has specific product patterns
    const hasProductPattern = /\b(fit|sleeve|neck|waist|cotton|polo|shirt|pants|dress|shoe)\b/.test(lowerText);

    return (hasProductKeyword && isDescriptiveLength) || 
           (hasDescriptors && hasProductPattern) ||
           (isDescriptiveLength && hasProductPattern && !this.looksLikeCategoryName(text));
  }

  /**
   * Check if text looks like a category name
   */
  private looksLikeCategoryName(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Category indicators
    const categoryKeywords = [
      'men', 'women', 'kids', 'boys', 'girls', 'baby',
      'shoes', 'clothing', 'accessories', 'sale', 'new',
      't-shirts', 'pants', 'dresses', 'jackets'
    ];

    // Short, generic category terms
    const hasCategory = categoryKeywords.some(keyword => lowerText.includes(keyword));
    const isShort = text.length < 50;
    const isGeneric = !text.includes('fit') && !text.includes('cotton') && !text.includes('-');

    return hasCategory && isShort && isGeneric;
  }

  /**
   * Check if text looks like a variant option (size/color)
   */
  private looksLikeVariantOption(text: string): boolean {
    const trimmed = text.trim();
    
    // Size patterns
    if (trimmed.match(/^(XS|S|M|L|XL|XXL|\d+|\d+W|\d+\.\d+)$/i)) return true;
    
    // Color patterns
    const colors = ['red', 'blue', 'green', 'black', 'white', 'gray', 'grey', 'navy', 'brown', 'pink'];
    if (colors.some(color => trimmed.toLowerCase() === color)) return true;
    
    return false;
  }

  /**
   * Extract product data from classified element
   */
  private extractProductData(element: any, interaction: ParsedInteraction): ExtractedProduct | null {
    const productId = this.generateProductId(element.text, element.url);
    const categoryPath = this.inferCategoryPath(element.url);
    
    return {
      productId,
      productName: element.text,
      url: element.url,
      selector: this.extractSelector(interaction),
      categoryPath,
      price: this.extractPrice(element.text),
      variants: this.extractVariants(interaction)
    };
  }

  /**
   * Extract category data from classified element
   */
  private extractCategoryData(element: any): ExtractedCategory | null {
    const categoryPath = this.generateCategoryPath(element.text, element.url);
    const categoryType = this.determineCategoryType(element.text);
    
    return {
      categoryPath,
      categoryName: element.text,
      categoryType,
      urls: [element.url]
    };
  }

  /**
   * Helper methods for data extraction
   */
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
      
      if (lowerURL.includes('/product') || lowerURL.includes('/productpage') || lowerURL.match(/\/p\/|\/dp\//)) {
        patterns.product.push(url);
      } else if (lowerURL.includes('/browse') || lowerURL.includes('/category') || lowerURL.match(/\/(men|women|kids)\//)) {
        patterns.category.push(url);
      } else if (lowerURL.includes('/search') || lowerURL.includes('?q=')) {
        patterns.search.push(url);
      } else if (lowerURL.includes('/sale')) {
        patterns.sale.push(url);
      }
    });

    return patterns;
  }

  private generateProductId(text: string, url: string): string {
    // Try to extract ID from URL first
    const urlId = url.match(/(?:pid|productId|id)=([^&]+)/i);
    if (urlId) {
      return urlId[1];
    }

    // Generate from text as fallback
    return 'product-' + text.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  }

  private inferCategoryPath(url: string): string {
    // Extract category from URL structure
    const pathMatch = url.match(/\/browse\/([^?]+)/);
    if (pathMatch) {
      return pathMatch[1].replace(/\//g, '/');
    }

    const categoryMatch = url.match(/\/(men|women|kids)\/([^?\/]+)/);
    if (categoryMatch) {
      return `${categoryMatch[1]}/${categoryMatch[2]}`;
    }

    return 'general';
  }

  private generateCategoryPath(text: string, url: string): string {
    // Try to infer from URL first
    const urlPath = this.inferCategoryPath(url);
    if (urlPath !== 'general') {
      return urlPath;
    }

    // Generate from text
    return text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');
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

  private extractSelector(interaction: ParsedInteraction): string {
    if (interaction.selectors && typeof interaction.selectors === 'object') {
      // Try to get primary selector
      const selectors = interaction.selectors;
      return selectors.primary || selectors.css || selectors.xpath || '';
    }
    return '';
  }

  private extractPrice(text: string): number | undefined {
    const priceMatch = text.match(/\$(\d+\.?\d*)/);
    return priceMatch ? parseFloat(priceMatch[1]) : undefined;
  }

  private extractVariants(interaction: ParsedInteraction): { colors?: string[], sizes?: string[] } | undefined {
    // This would need to analyze state changes or related interactions
    // For now, return undefined - could be enhanced later
    return undefined;
  }

  /**
   * Database operations
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
          overallSuccessRate: 0.7,
          totalInteractions: 0,
          lastValidated: new Date()
        }
      });
      console.log(`✅ Created domain: ${domainData.siteName} (${domainData.domain})`);
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
          siblingContext: 'unknown' as any,
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
          successRate: 0.7,
          totalAttempts: 0,
          lastVerified: new Date()
        }
      });
      console.log(`✅ Created category: ${categoryData.categoryName} (${categoryData.categoryPath})`);
    }
  }

  private async ensureProduct(domain: string, productData: ExtractedProduct, interactions: ParsedInteraction[]): Promise<void> {
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
        variants: productData.variants
      },
      siblingProducts: [], // Could extract from nearby interactions
      pageContext: {
        pageType: PageType.CATEGORY, // Could be inferred from URL
        url: productData.url,
        totalProductsOnPage: interactions.length
      },
      spatialContext: { nearbyElements: [] },
      siblingsContext: { siblings: [] }
    });
    console.log(`✅ Created product: ${productData.productName} (${productData.productId})`);
  }
}