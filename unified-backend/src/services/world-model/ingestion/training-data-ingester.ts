/**
 * Training Data Ingester for World Model
 * 
 * Extracts sibling and spatial context from existing training data
 * and populates the world model database with discovered products
 */

import { WorldModelService } from '../database/service';
import { PageType, CategoryType, SiteType } from '../database/schema';
import { PrismaClient } from '@prisma/client';
import { UniversalTrainingParser } from './universal-training-parser';

interface TrainingExample {
  prompt: string;
  completion: string;
  context: any;
  quality?: any;
}

interface ExtractedProductData {
  productId: string;
  productName: string;
  price?: number;
  image?: string;
  url: string;
  selector: string;
  position: number;
  variants?: {
    colors?: any[];
    sizes?: any[];
  };
}

interface ExtractedPageContext {
  domain: string;
  categoryPath: string;
  pageType: PageType;
  url: string;
  totalProducts: number;
}

export class TrainingDataIngester {
  private worldModel: WorldModelService;
  private prisma: PrismaClient;
  private universalParser: UniversalTrainingParser;

  constructor(worldModelService: WorldModelService) {
    this.worldModel = worldModelService;
    this.prisma = new PrismaClient();
    this.universalParser = new UniversalTrainingParser(worldModelService);
  }

  /**
   * Main ingestion method - processes all training data
   */
  async ingestAllTrainingData(): Promise<void> {
    console.log('🔄 Starting training data ingestion...');

    // Get all training data from database
    const trainingRecords = await this.prisma.trainingData.findMany({
      where: {
        status: 'COMPLETED',
        jsonlData: { not: null }
      }
    });

    for (const record of trainingRecords) {
      console.log(`📊 Processing training record: ${record.id}`);
      await this.processTrainingRecord(record);
    }

    console.log('✅ Training data ingestion completed');
  }

  /**
   * Process a single training data record
   */
  private async processTrainingRecord(record: any): Promise<void> {
    try {
      const examples = this.parseTrainingData(record.jsonlData);
      
      console.log(`   Processing ${examples.length} examples from record ${record.id}`);
      
      // Use universal parser for any training data format
      await this.universalParser.parseTrainingExamples(examples);
      
    } catch (error) {
      console.error(`❌ Error processing record ${record.id}:`, error);
    }
  }

  /**
   * Parse JSONL training data into examples
   */
  private parseTrainingData(jsonlData: string): TrainingExample[] {
    const examples: TrainingExample[] = [];
    
    try {
      // Handle both JSON array and JSONL formats
      if (jsonlData.trim().startsWith('[')) {
        const jsonArray = JSON.parse(jsonlData);
        examples.push(...jsonArray);
      } else {
        const lines = jsonlData.split('\n').filter(line => line.trim());
        for (const line of lines) {
          examples.push(JSON.parse(line));
        }
      }
    } catch (error) {
      console.error('Error parsing training data:', error);
    }

    return examples;
  }

  /**
   * Process individual training example and extract world model data
   */
  private async processTrainingExample(example: TrainingExample): Promise<void> {
    try {
      // Extract page context from prompt
      const pageContext = this.extractPageContext(example.prompt);
      if (!pageContext) return;

      // Extract primary product data
      const primaryProduct = this.extractPrimaryProduct(example.prompt, example.completion);
      if (!primaryProduct) return;

      // Extract sibling products from spatial/siblings context
      const siblingProducts = this.extractSiblingProducts(example.prompt);

      // Extract sibling categories from spatial context
      const siblingCategories = this.extractSiblingCategories(example.prompt);

      // Extract variant information from the example
      const variantClusters = this.extractVariantClusters(example.prompt);

      // Ensure domain exists
      await this.ensureDomain(pageContext.domain);

      // Ensure category exists
      await this.ensureCategory(pageContext.domain, pageContext.categoryPath, pageContext.pageType);

      // Process category with sibling discovery if we have category interactions
      if (siblingCategories.length > 0) {
        const domainRecord = await this.worldModel.getDomain(pageContext.domain);
        if (domainRecord) {
          await this.worldModel.ingestCategoryWithSiblings({
            domainId: domainRecord._id!.toString(),
            primaryCategory: {
              categoryPath: pageContext.categoryPath,
              categoryName: this.formatCategoryName(pageContext.categoryPath),
              categoryType: this.determineCategoryType(pageContext.categoryPath)
            },
            siblingCategories,
            discoveryContext: {
              spatialContext: this.extractSpatialContext(example.prompt),
              menuStructure: this.extractMenuStructure(example.prompt)
            }
          });
        }
      }

      // Ingest the data
      await this.worldModel.ingestProductWithSiblings({
        domain: pageContext.domain,
        categoryPath: pageContext.categoryPath,
        primaryProduct: {
          ...primaryProduct,
          variants: variantClusters
        },
        siblingProducts,
        pageContext: {
          pageType: pageContext.pageType,
          url: pageContext.url,
          totalProductsOnPage: pageContext.totalProducts
        },
        spatialContext: this.extractSpatialContext(example.prompt),
        siblingsContext: this.extractSiblingsContext(example.prompt)
      });

    } catch (error) {
      console.error('Error processing training example:', error);
    }
  }

  /**
   * Extract page context from training prompt
   */
  private extractPageContext(prompt: string): ExtractedPageContext | null {
    const pageContextMatch = prompt.match(/\[PAGE CONTEXT\]\s*([\s\S]*?)\n\n/);
    if (!pageContextMatch) return null;

    const pageContextText = pageContextMatch[1];
    
    const siteMatch = pageContextText.match(/Site:\s*(.+)/);
    const urlMatch = pageContextText.match(/URL:\s*(.+)/);
    const pageTitleMatch = pageContextText.match(/Page Title:\s*(.+)/);
    const pageTypeMatch = pageContextText.match(/Page Type:\s*(.+)/);

    if (!siteMatch || !urlMatch) return null;

    const domain = siteMatch[1].trim();
    const url = urlMatch[1].trim();
    const pageTypeStr = pageTypeMatch?.[1]?.trim() || 'unknown';
    
    // Determine category path from URL or page title
    const categoryPath = this.determineCategoryPath(url, pageTitleMatch?.[1]);

    return {
      domain,
      categoryPath,
      pageType: this.mapToPageType(pageTypeStr),
      url,
      totalProducts: this.estimateProductCount(prompt)
    };
  }

  /**
   * Extract primary product data from the interaction
   */
  private extractPrimaryProduct(prompt: string, completion: string): ExtractedProductData | null {
    // Extract business context for product info
    const businessContextMatch = prompt.match(/\[BUSINESS CONTEXT\]\s*([\s\S]*?)\n\n/);
    if (!businessContextMatch) return null;

    const businessText = businessContextMatch[1];
    const productMatch = businessText.match(/Product:\s*([^,]+)\s*\(ID:\s*([^)]+)\)/);
    
    if (!productMatch) return null;

    const productName = productMatch[1].trim();
    const productId = productMatch[2].trim();

    // Extract selector from completion or selectors section
    const selectorMatch = prompt.match(/\[SELECTORS\]\s*([\s\S]*?)$/);
    const primarySelector = selectorMatch?.[1]?.split('\n')[0]?.match(/^\d+\.\s*(.+?)(?:\s*\(|$)/)?.[1] || '';

    // Extract price if available
    const priceMatch = businessText.match(/Price:\s*\$?([\d.]+)/);
    const price = priceMatch ? parseFloat(priceMatch[1]) : undefined;

    return {
      productId,
      productName,
      price,
      url: this.extractUrlFromPrompt(prompt),
      selector: primarySelector,
      position: 1, // Primary product is typically position 1
      variants: this.extractProductVariants(businessText)
    };
  }

  /**
   * Extract sibling categories from spatial context
   */
  private extractSiblingCategories(prompt: string): any[] {
    const spatialContextMatch = prompt.match(/\[SPATIAL CONTEXT\]\s*([\s\S]*?)\n\n/);
    if (!spatialContextMatch) return [];

    const spatialText = spatialContextMatch[1];
    const siblingCategories: any[] = [];
    let position = 1;

    // Parse spatial elements that look like categories
    const elementMatches = spatialText.matchAll(/(\w+):([^✓🚫]+)[\s✓🚫]+.*?\(([^)]+)\).*?\[([^\]]+)\]/g);
    
    for (const match of elementMatches) {
      const elementType = match[1];
      const text = match[2].trim();
      const spatialPosition = match[3];
      const selector = match[4];

      // Check if this looks like a category (not a product or UI element)
      if (this.looksLikeCategory(text, elementType)) {
        siblingCategories.push({
          categoryName: text,
          categoryPath: this.inferCategoryPath(text),
          selector,
          spatialPosition,
          relativePosition: this.parseRelativePosition(spatialPosition),
          distance: this.parseDistance(spatialPosition),
          menuLevel: 0, // Will be enhanced later
          position
        });
        position++;
      }
    }

    return siblingCategories;
  }

  /**
   * Extract sibling products from spatial context
   */
  private extractSiblingProducts(prompt: string): ExtractedProductData[] {
    const spatialContextMatch = prompt.match(/\[SPATIAL CONTEXT\]\s*([\s\S]*?)\n\n/);
    if (!spatialContextMatch) return [];

    const spatialText = spatialContextMatch[1];
    const siblingProducts: ExtractedProductData[] = [];
    let position = 2; // Start after primary product

    // Parse spatial elements that look like products
    const elementMatches = spatialText.matchAll(/(\w+):([^✓🚫]+)[\s✓🚫]+.*?\[([^\]]+)\]/g);
    
    for (const match of elementMatches) {
      const elementType = match[1];
      const text = match[2].trim();
      const selector = match[3];

      // Skip if it's clearly not a product (buttons, inputs, etc.)
      if (this.looksLikeProduct(text, elementType)) {
        siblingProducts.push({
          productId: `sibling-${position}`, // Generate temp ID
          productName: text,
          url: '', // Will be filled by pattern matching
          selector,
          position
        });
        position++;
      }
    }

    return siblingProducts;
  }

  /**
   * Extract variant cluster information from the prompt
   */
  private extractVariantClusters(prompt: string): any {
    const variants: any = {};

    // Look for shopping sequence context with variant info
    const shoppinContextMatch = prompt.match(/\[SHOPPING SEQUENCE CONTEXT\]\s*([\s\S]*?)\n\n/);
    if (shoppinContextMatch) {
      const contextText = shoppinContextMatch[1];
      
      // Extract color information
      const colorMatch = contextText.match(/Color:\s*([^✅\n]+)/);
      if (colorMatch) {
        variants.colors = {
          selected: colorMatch[1].trim(),
          containerSelector: this.extractVariantContainer(prompt, 'color'),
          selectorPattern: this.extractVariantPattern(prompt, 'color')
        };
      }

      // Extract size information
      const sizeMatch = contextText.match(/Size:\s*([^✅\n]+)/);
      if (sizeMatch) {
        variants.sizes = {
          selected: sizeMatch[1].trim(),
          containerSelector: this.extractVariantContainer(prompt, 'size'),
          selectorPattern: this.extractVariantPattern(prompt, 'size')
        };
      }
    }

    return variants;
  }

  /**
   * Extract spatial context data
   */
  private extractSpatialContext(prompt: string): any {
    const spatialMatch = prompt.match(/\[SPATIAL CONTEXT\]\s*([\s\S]*?)\n\n/);
    if (!spatialMatch) return { nearbyElements: [] };

    const spatialText = spatialMatch[1];
    const nearbyElements: any[] = [];

    const elementMatches = spatialText.matchAll(/(\w+):([^✓🚫]+)[\s✓🚫]+\(([^)]+)\)\s*\[([^\]]+)\]/g);
    
    for (const match of elementMatches) {
      nearbyElements.push({
        elementType: match[1],
        text: match[2].trim(),
        position: match[3],
        selector: match[4]
      });
    }

    return { nearbyElements };
  }

  /**
   * Extract siblings context data
   */
  private extractSiblingsContext(prompt: string): any {
    const siblingsMatch = prompt.match(/\[SIBLINGS CONTEXT\]\s*([\s\S]*?)\n\n/);
    if (!siblingsMatch) return { siblings: [] };

    const siblingsText = siblingsMatch[1];
    const siblings: any[] = [];

    // Parse sibling information
    const siblingLines = siblingsText.split('\n').filter(line => line.trim());
    for (const line of siblingLines) {
      const siblingMatch = line.match(/(Previous|Next):\s*"([^"]+)"\s*\[([^\]]+)\]/);
      if (siblingMatch) {
        siblings.push({
          direction: siblingMatch[1].toLowerCase(),
          text: siblingMatch[2],
          selector: siblingMatch[3]
        });
      }
    }

    return { siblings };
  }

  // ===========================
  // HELPER METHODS
  // ===========================

  private async ensureDomain(domain: string): Promise<void> {
    const existing = await this.worldModel.getDomain(domain);
    if (!existing) {
      await this.worldModel.upsertDomain({
        domain,
        siteType: SiteType.ECOMMERCE,
        siteName: this.formatSiteName(domain),
        globalSelectors: {},
        layoutPatterns: {
          hasTopNavigation: true,
          hasSideNavigation: false,
          responsiveBreakpoints: [768, 1024]
        },
        urlPatterns: {
          category: [],
          product: [],
          search: [],
          sale: []
        },
        reliability: {
          overallSuccessRate: 0.5,
          totalInteractions: 0,
          lastValidated: new Date()
        }
      });
    }
  }

  private async ensureCategory(domain: string, categoryPath: string, pageType: PageType): Promise<void> {
    const domainRecord = await this.worldModel.getDomain(domain);
    if (!domainRecord) return;

    const existing = await this.worldModel.getCategory(domainRecord._id!.toString(), categoryPath);
    if (!existing) {
      await this.worldModel.upsertCategory({
        domainId: domainRecord._id!.toString(),
        categoryPath,
        categoryName: this.formatCategoryName(categoryPath),
        categoryType: this.determineCategoryType(categoryPath),
        urlPatterns: [],
        canonicalUrl: '',
        spatialNavigationContext: {
          spatialRelationships: [],
          navigationLevel: categoryPath.split('/').length - 1,
          breadcrumbs: categoryPath.split('/')
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
        reliability: {
          successRate: 0.5,
          totalAttempts: 0,
          lastVerified: new Date()
        }
      });
    }
  }

  private determineCategoryPath(url: string, pageTitle?: string): string {
    // Extract category from URL structure
    const urlPath = url.split('?')[0]; // Remove query params
    
    // Common e-commerce URL patterns
    const categoryMatches = [
      urlPath.match(/\/browse\/([^/]+(?:\/[^/]+)*)/),
      urlPath.match(/\/([^/]+)\/([^/]+)/),
      urlPath.match(/\/category\/([^/]+)/),
      urlPath.match(/\/([^/]+)/)
    ];

    for (const match of categoryMatches) {
      if (match) {
        return match[1].replace(/[?#].*$/, ''); // Clean up
      }
    }

    // Fallback to page title analysis
    if (pageTitle) {
      const titleCategory = pageTitle.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
      return `unknown/${titleCategory}`;
    }

    return 'unknown/general';
  }

  private mapToPageType(pageTypeStr: string): PageType {
    const lowerType = pageTypeStr.toLowerCase();
    if (lowerType.includes('category')) return PageType.CATEGORY;
    if (lowerType.includes('product')) return PageType.PRODUCT_DETAIL;
    if (lowerType.includes('search')) return PageType.SEARCH_RESULTS;
    if (lowerType.includes('sale')) return PageType.SALE;
    if (lowerType.includes('cart')) return PageType.CART;
    if (lowerType.includes('home')) return PageType.HOMEPAGE;
    return PageType.CATEGORY; // Default assumption
  }

  private determineCategoryType(categoryPath: string): CategoryType {
    if (categoryPath.includes('sale')) return CategoryType.SALE;
    if (categoryPath.includes('search')) return CategoryType.SEARCH;
    if (categoryPath.includes('featured') || categoryPath.includes('new')) return CategoryType.FEATURED;
    return CategoryType.REGULAR;
  }

  private estimateProductCount(prompt: string): number {
    // Look for clues about product count in the prompt
    const userPathMatch = prompt.match(/\[USER PATH SEQUENCE\]/);
    if (userPathMatch) {
      // Count product-related interactions as proxy
      const productInteractions = (prompt.match(/viewed product|clicked.*product/gi) || []).length;
      return Math.max(productInteractions * 4, 12); // Estimate
    }
    return 24; // Default assumption
  }

  private looksLikeCategory(text: string, elementType: string): boolean {
    // Skip obvious non-categories
    const nonCategoryKeywords = ['button', 'input', 'search', 'cart', 'account', 'login', 'checkout', 'filter', 'sort'];
    const lowerText = text.toLowerCase();
    
    if (nonCategoryKeywords.some(keyword => lowerText.includes(keyword))) {
      return false;
    }

    // Look for category-like characteristics
    const categoryKeywords = [
      // Main categories
      'men', 'women', 'kids', 'boys', 'girls', 'baby',
      // Product types
      'shirts', 'pants', 'jeans', 'shoes', 'dresses', 'jackets', 'accessories',
      'tops', 'bottoms', 'outerwear', 'sweaters', 'hoodies',
      // Special categories
      'sale', 'new', 'clearance', 'featured', 'trending', 'arrivals'
    ];
    
    const hasCategory = categoryKeywords.some(keyword => lowerText.includes(keyword));
    const isShort = text.length < 30; // Categories are usually short
    const isLink = elementType.toLowerCase() === 'a' || elementType.includes('link');
    
    return hasCategory && isShort && (isLink || elementType === 'span');
  }

  private looksLikeProduct(text: string, elementType: string): boolean {
    // Skip obvious non-products
    const nonProductKeywords = ['button', 'input', 'filter', 'sort', 'price', 'size', 'color', 'sale'];
    const lowerText = text.toLowerCase();
    
    if (nonProductKeywords.some(keyword => lowerText.includes(keyword))) {
      return false;
    }

    // Look for product-like characteristics
    const productKeywords = ['shirt', 'pants', 'shoe', 'dress', 'jacket', 'jean', 'tee', 'top'];
    return productKeywords.some(keyword => lowerText.includes(keyword)) || text.length > 10;
  }

  private parseRelativePosition(spatialPosition: string): string {
    if (spatialPosition.includes('left')) return 'left';
    if (spatialPosition.includes('right')) return 'right';
    if (spatialPosition.includes('above')) return 'above';
    if (spatialPosition.includes('below')) return 'below';
    return 'unknown';
  }

  private parseDistance(spatialPosition: string): number {
    const distanceMatch = spatialPosition.match(/(\d+)px/);
    return distanceMatch ? parseInt(distanceMatch[1]) : 0;
  }

  private extractMenuStructure(prompt: string): any {
    // Try to infer menu structure from DOM context
    const domContextMatch = prompt.match(/\[DOM CONTEXT\]\s*([\s\S]*?)\n\n/);
    if (!domContextMatch) return { type: 'horizontal' };

    const domText = domContextMatch[1];
    
    // Look for navigation indicators
    if (domText.includes('nav') || domText.includes('menu')) {
      if (domText.includes('dropdown') || domText.includes('flyout')) {
        return { type: 'dropdown' };
      }
      if (domText.includes('vertical') || domText.includes('sidebar')) {
        return { type: 'vertical' };
      }
    }

    return { type: 'horizontal' }; // Default assumption
  }

  private inferCategoryPath(categoryName: string): string {
    const cleanName = categoryName
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');

    // Add hierarchy hints based on common patterns
    if (cleanName.includes('men') && !cleanName.startsWith('men')) {
      return `men/${cleanName.replace('men-', '')}`;
    }
    if (cleanName.includes('women') && !cleanName.startsWith('women')) {
      return `women/${cleanName.replace('women-', '')}`;
    }
    if (cleanName.includes('kids') && !cleanName.startsWith('kids')) {
      return `kids/${cleanName.replace('kids-', '')}`;
    }

    return cleanName;
  }

  private extractUrlFromPrompt(prompt: string): string {
    const urlMatch = prompt.match(/URL:\s*(.+)/);
    return urlMatch ? urlMatch[1].trim() : '';
  }

  private extractProductVariants(businessText: string): any {
    const variants: any = {};
    
    const colorMatch = businessText.match(/Selected:\s*Color:\s*([^,]+)/);
    if (colorMatch) {
      variants.colors = [{ value: colorMatch[1].trim() }];
    }

    const sizeMatch = businessText.match(/Selected:\s*Size:\s*([^,]+)/);
    if (sizeMatch) {
      variants.sizes = [{ value: sizeMatch[1].trim() }];
    }

    return variants;
  }

  private extractVariantContainer(prompt: string, variantType: string): string {
    // Look for container patterns in DOM context
    const domContextMatch = prompt.match(/\[DOM CONTEXT\]\s*([\s\S]*?)\n\n/);
    if (!domContextMatch) return '';

    const domText = domContextMatch[1];
    const containerMatch = domText.match(new RegExp(`${variantType}[\\s\\w-]*container[^"]*"([^"]+)"`, 'i'));
    return containerMatch ? containerMatch[1] : '';
  }

  private extractVariantPattern(prompt: string, variantType: string): string {
    // Look for ID patterns that can be templated
    const selectorMatch = prompt.match(/\[SELECTORS\]\s*([\s\S]*?)$/);
    if (!selectorMatch) return '';

    const selectorsText = selectorMatch[1];
    const patternMatch = selectorsText.match(new RegExp(`#[\\w-]*${variantType}[\\w-]*--([\\w-]+)`, 'i'));
    if (patternMatch) {
      return patternMatch[0].replace(patternMatch[1], `{${variantType.toUpperCase()}}`);
    }

    return '';
  }

  private formatSiteName(domain: string): string {
    return domain.replace(/^www\./, '').replace(/\.com$/, '').toLowerCase();
  }

  private formatCategoryName(categoryPath: string): string {
    return categoryPath.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  }
}