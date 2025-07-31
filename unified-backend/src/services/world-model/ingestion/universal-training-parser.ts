/**
 * Universal Training Data Parser
 * 
 * Extracts domain, category, and product information from any e-commerce
 * training data format by analyzing interaction sequences and selectors
 */

import { WorldModelService } from '../database/service';
import { PageType, CategoryType, SiteType } from '../database/schema';

interface UniversalTrainingExample {
  prompt: string;
  completion: string;
  context: any;
  quality?: any;
}

interface ExtractedDomain {
  domain: string;
  siteName: string;
  siteType: SiteType;
}

interface ExtractedCategory {
  categoryPath: string;
  categoryName: string;
  categoryType: CategoryType;
  url?: string;
}

interface ExtractedProduct {
  productId: string;
  productName: string;
  price?: number;
  url?: string;
  selector: string;
  categoryPath: string;
}

interface ExtractedInteraction {
  elementText: string;
  selector: string;
  position?: { x: number; y: number };
  attributes?: Record<string, string>;
  interactionType: string;
}

export class UniversalTrainingParser {
  private worldModel: WorldModelService;

  constructor(worldModelService: WorldModelService) {
    this.worldModel = worldModelService;
  }

  /**
   * Parse training examples in any format and extract world model data
   */
  async parseTrainingExamples(examples: UniversalTrainingExample[]): Promise<void> {
    console.log(`🔄 Parsing ${examples.length} training examples with universal parser...`);

    const domainsFound = new Set<string>();
    const categoriesFound = new Set<string>();
    const productsFound = new Set<string>();

    for (const example of examples) {
      try {
        await this.processExample(example, domainsFound, categoriesFound, productsFound);
      } catch (error) {
        console.warn(`⚠️ Error processing example:`, error);
      }
    }

    console.log(`✅ Universal parsing completed:`);
    console.log(`   • Domains: ${domainsFound.size}`);
    console.log(`   • Categories: ${categoriesFound.size}`);
    console.log(`   • Products: ${productsFound.size}`);
  }

  /**
   * Process individual training example
   */
  private async processExample(
    example: UniversalTrainingExample,
    domainsFound: Set<string>,
    categoriesFound: Set<string>,
    productsFound: Set<string>
  ): Promise<void> {
    
    // Extract domain information from any part of the data
    const domain = this.extractDomain(example);
    if (domain) {
      if (!domainsFound.has(domain.domain)) {
        await this.ensureDomain(domain);
        domainsFound.add(domain.domain);
      }

      // Extract interaction sequence from completion
      const interactions = this.extractInteractions(example.completion);
      
      // Extract categories from interaction text and selectors
      const categories = this.extractCategories(interactions, domain.domain);
      for (const category of categories) {
        const categoryKey = `${domain.domain}:${category.categoryPath}`;
        if (!categoriesFound.has(categoryKey)) {
          await this.ensureCategory(domain.domain, category);
          categoriesFound.add(categoryKey);
        }
      }

      // Extract products from interactions (if any)
      const products = this.extractProducts(interactions, domain.domain, categories);
      for (const product of products) {
        const productKey = `${domain.domain}:${product.productId}`;
        if (!productsFound.has(productKey)) {
          await this.ensureProduct(domain.domain, product, interactions);
          productsFound.add(productKey);
        }
      }
    }
  }

  /**
   * Extract domain information from training example
   */
  private extractDomain(example: UniversalTrainingExample): ExtractedDomain | null {
    // Method 1: Look for domain in selectors (most reliable)
    const selectorMatches = example.completion.match(/Selector:\s*[#.][\w-]+[\w.-]*\/[\w\/.-]+/g);
    if (selectorMatches) {
      for (const selectorMatch of selectorMatches) {
        const domainMatch = selectorMatch.match(/\/[\w.-]+\.(com|net|org|co\.uk|ca)/);
        if (domainMatch) {
          const domain = domainMatch[0].substring(1); // Remove leading /
          return {
            domain,
            siteName: this.formatSiteName(domain),
            siteType: SiteType.ECOMMERCE
          };
        }
      }
    }

    // Method 2: Look for href attributes with full URLs
    const hrefMatches = example.completion.match(/href="([^"]+)"/g);
    if (hrefMatches) {
      for (const hrefMatch of hrefMatches) {
        const urlMatch = hrefMatch.match(/href="https?:\/\/([^\/]+)/);
        if (urlMatch) {
          const domain = urlMatch[1].replace(/^www\./, '');
          return {
            domain,
            siteName: this.formatSiteName(domain),
            siteType: SiteType.ECOMMERCE
          };
        }
      }
    }

    // Method 3: Look for domain patterns in ID attributes
    const idMatches = example.completion.match(/id="[^"]*[\w.-]+\.(com|net|org)[\w.-]*"/g);
    if (idMatches) {
      for (const idMatch of idMatches) {
        const domainMatch = idMatch.match(/([\w.-]+\.(com|net|org|co\.uk|ca))/);
        if (domainMatch) {
          const domain = domainMatch[1];
          return {
            domain,
            siteName: this.formatSiteName(domain),
            siteType: SiteType.ECOMMERCE
          };
        }
      }
    }

    // Method 4: Infer from interaction patterns (fallback)
    if (example.completion.includes('product') || example.completion.includes('cart') || example.completion.includes('checkout')) {
      return {
        domain: 'unknown-ecommerce.com',
        siteName: 'Unknown E-commerce Site',
        siteType: SiteType.ECOMMERCE
      };
    }

    return null;
  }

  /**
   * Extract interaction sequence from completion text
   */
  private extractInteractions(completion: string): ExtractedInteraction[] {
    const interactions: ExtractedInteraction[] = [];
    
    // Parse step-by-step interactions
    const stepMatches = completion.match(/Step \d+: interact\('([^']+)'\)[^|]*\|?([^|]*)\|?([^|]*)\|?([^|]*)/g);
    
    if (stepMatches) {
      for (const stepMatch of stepMatches) {
        const parts = stepMatch.match(/Step \d+: interact\('([^']+)'\)[^|]*(?:\| Selector: ([^|]+))?(?:\| Position: \(([^)]+)\))?(?:\| Attrs: ([^|]+))?/);
        
        if (parts) {
          const elementText = parts[1];
          const selector = parts[2] || '';
          const position = parts[3] ? this.parsePosition(parts[3]) : undefined;
          const attributes = parts[4] ? this.parseAttributes(parts[4]) : undefined;

          interactions.push({
            elementText,
            selector,
            position,
            attributes,
            interactionType: 'click'
          });
        }
      }
    }

    return interactions;
  }

  /**
   * Extract categories from interactions
   */
  private extractCategories(interactions: ExtractedInteraction[], domain: string): ExtractedCategory[] {
    const categories: ExtractedCategory[] = [];
    
    for (const interaction of interactions) {
      const elementText = interaction.elementText.trim();
      
      // Skip empty interactions or non-category-like elements
      if (!elementText || elementText === '' || elementText === 'Back') continue;

      // Check if this looks like a category based on common e-commerce patterns
      if (this.looksLikeCategory(elementText, interaction)) {
        const categoryPath = this.generateCategoryPath(elementText, interaction);
        const categoryType = this.determineCategoryType(elementText, interaction);

        categories.push({
          categoryPath,
          categoryName: elementText,
          categoryType,
          url: this.extractUrlFromInteraction(interaction)
        });
      }
    }

    return categories;
  }

  /**
   * Extract products from interactions
   */
  private extractProducts(
    interactions: ExtractedInteraction[], 
    domain: string, 
    categories: ExtractedCategory[]
  ): ExtractedProduct[] {
    const products: ExtractedProduct[] = [];
    
    for (const interaction of interactions) {
      const elementText = interaction.elementText.trim();
      
      // Check if this looks like a product
      if (this.looksLikeProduct(elementText, interaction)) {
        const productId = this.generateProductId(elementText, interaction);
        const categoryPath = this.inferProductCategory(elementText, categories);

        products.push({
          productId,
          productName: elementText,
          selector: interaction.selector,
          categoryPath,
          url: this.extractUrlFromInteraction(interaction),
          price: this.extractPriceFromText(elementText)
        });
      }
    }

    return products;
  }

  /**
   * Check if element text looks like a category
   */
  private looksLikeCategory(elementText: string, interaction: ExtractedInteraction): boolean {
    const lowerText = elementText.toLowerCase();
    
    // Category indicators
    const categoryKeywords = [
      // Main categories
      'men', 'women', 'kids', 'boys', 'girls', 'baby', 'home',
      // Product categories
      'shoes', 'clothing', 'accessories', 'bags', 'jewelry',
      'shirts', 'pants', 'dresses', 'jackets', 'sweaters',
      'sneakers', 'boots', 'sandals', 'heels',
      // Special categories
      'sale', 'new', 'clearance', 'trending', 'featured'
    ];

    const hasCategory = categoryKeywords.some(keyword => lowerText.includes(keyword));
    const isReasonableLength = elementText.length < 50; // Categories are usually short
    const hasNavigationContext = interaction.selector.includes('nav') || 
                                 interaction.selector.includes('menu') ||
                                 interaction.selector.includes('category');

    return hasCategory && isReasonableLength || hasNavigationContext;
  }

  /**
   * Check if element text looks like a product
   */
  private looksLikeProduct(elementText: string, interaction: ExtractedInteraction): boolean {
    const lowerText = elementText.toLowerCase();
    
    // Product indicators
    const productIndicators = [
      'shirt', 'pant', 'dress', 'shoe', 'jacket', 'sweater',
      'polo', 'tee', 'jean', 'boot', 'sneaker', 'coat',
      'fit', 'cotton', 'regular', 'slim', 'cargo'
    ];

    const hasProductKeyword = productIndicators.some(keyword => lowerText.includes(keyword));
    const isProductLength = elementText.length > 10 && elementText.length < 200;
    const hasProductContext = interaction.selector.includes('product') || 
                             (interaction.attributes?.class?.includes('product') || false);

    return (hasProductKeyword && isProductLength) || hasProductContext;
  }

  /**
   * Helper methods
   */
  private formatSiteName(domain: string): string {
    return domain.replace(/^www\./, '').replace(/\.(com|net|org)$/, '').replace(/[^a-zA-Z0-9]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private generateCategoryPath(elementText: string, interaction: ExtractedInteraction): string {
    // Generate path from element text
    let path = elementText.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');

    // Add hierarchy hints from selector or href
    if (interaction.attributes?.href) {
      const hrefParts = interaction.attributes.href.split('/').filter(part => part && part !== 'en_us');
      if (hrefParts.length > 0) {
        path = hrefParts.join('/');
      }
    }

    return path;
  }

  private determineCategoryType(elementText: string, interaction: ExtractedInteraction): CategoryType {
    const lowerText = elementText.toLowerCase();
    if (lowerText.includes('sale') || lowerText.includes('clearance')) return CategoryType.SALE;
    if (lowerText.includes('new') || lowerText.includes('featured')) return CategoryType.FEATURED;
    return CategoryType.REGULAR;
  }

  private generateProductId(elementText: string, interaction: ExtractedInteraction): string {
    // Try to extract ID from selector or attributes
    if (interaction.attributes?.id) {
      return interaction.attributes.id;
    }
    
    // Generate from text as fallback
    return 'product-' + elementText.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 50);
  }

  private inferProductCategory(elementText: string, categories: ExtractedCategory[]): string {
    const lowerText = elementText.toLowerCase();
    
    // Try to match with discovered categories
    for (const category of categories) {
      if (lowerText.includes(category.categoryName.toLowerCase())) {
        return category.categoryPath;
      }
    }

    // Fallback to generic categorization
    if (lowerText.includes('shoe') || lowerText.includes('sneaker')) return 'shoes';
    if (lowerText.includes('shirt') || lowerText.includes('polo')) return 'clothing/shirts';
    if (lowerText.includes('pant') || lowerText.includes('jean')) return 'clothing/pants';
    
    return 'general';
  }

  private parsePosition(positionStr: string): { x: number; y: number } | undefined {
    const match = positionStr.match(/(\d+),(\d+)/);
    return match ? { x: parseInt(match[1]), y: parseInt(match[2]) } : undefined;
  }

  private parseAttributes(attrsStr: string): Record<string, string> {
    const attrs: Record<string, string> = {};
    const matches = attrsStr.match(/(\w+)="([^"]*)"/g);
    
    if (matches) {
      for (const match of matches) {
        const [, key, value] = match.match(/(\w+)="([^"]*)"/) || [];
        if (key && value) attrs[key] = value;
      }
    }
    
    return attrs;
  }

  private extractUrlFromInteraction(interaction: ExtractedInteraction): string | undefined {
    return interaction.attributes?.href;
  }

  private extractPriceFromText(text: string): number | undefined {
    const priceMatch = text.match(/\$(\d+\.?\d*)/);
    return priceMatch ? parseFloat(priceMatch[1]) : undefined;
  }

  /**
   * Database operations (reuse from existing ingester)
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
        urlPatterns: {
          category: [],
          product: [],
          search: [],
          sale: []
        },
        authenticationFlow: {
          loginUrl: '/login',
          signupUrl: '/signup',
          guestCheckoutAvailable: true,
          socialLoginOptions: []
        },
        reliability: {
          overallSuccessRate: 0.5,
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
        urlPatterns: categoryData.url ? [categoryData.url] : [],
        canonicalUrl: categoryData.url || '',
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
          successRate: 0.5,
          totalAttempts: 0,
          lastVerified: new Date()
        }
      });
      console.log(`✅ Created category: ${categoryData.categoryName} (${categoryData.categoryPath})`);
    }
  }

  private async ensureProduct(domain: string, productData: ExtractedProduct, interactions: ExtractedInteraction[]): Promise<void> {
    // Use existing product ingestion logic with extracted data
    await this.worldModel.ingestProductWithSiblings({
      domain,
      categoryPath: productData.categoryPath,
      primaryProduct: {
        productId: productData.productId,
        productName: productData.productName,
        price: productData.price || 0,
        url: productData.url || '',
        selector: productData.selector,
        position: 1
      },
      siblingProducts: [], // Could extract from nearby interactions
      pageContext: {
        pageType: PageType.CATEGORY,
        url: productData.url || '',
        totalProductsOnPage: interactions.length
      },
      spatialContext: { nearbyElements: [] },
      siblingsContext: { siblings: [] }
    });
    console.log(`✅ Created product: ${productData.productName} (${productData.productId})`);
  }
}