/**
 * ProductExtractionService
 * 
 * Handles product information extraction including:
 * - Product detection from URLs and interactions
 * - Product name extraction (FIXED: uses state.before.title)
 * - Brand detection and classification
 * - Product type inference
 * - Visited product tracking
 */

// import { VisitedProduct, ProductInteraction } from '../types/world-model-types';

export interface IProductExtractionService {
  extractVisitedProducts(interactions: ParsedInteraction[]): VisitedProduct[];
  extractProductInteractions(interactions: ParsedInteraction[]): ProductInteraction[];
  extractProductInfoFromUrl(url: string): { productId: string; productName: string; brand: string; productType: string };
  extractProductNameFromInteractions(interactions: ParsedInteraction[], productUrl: string): string | null;
  extractBrandFromUrlAndName(url: string, productName: string, domainPrefix: string): string;
}

export class ProductExtractionService implements IProductExtractionService {
  
  extractVisitedProducts(interactions: ParsedInteraction[]): VisitedProduct[] {
    console.log(`📦 VISITED_PRODUCT_PARSER: Analyzing ${interactions.length} interactions for visited products`);
    
    const visitedProducts: VisitedProduct[] = [];
    const uniqueProductUrls = new Set<string>();
    const checkedUrls = new Set<string>();
    
    interactions.forEach((interaction, index) => {
      const url = interaction.context?.url || '';
      
      // Debug: check all unique URLs
      if (url && !checkedUrls.has(url)) {
        checkedUrls.add(url);
        const isProduct = this.isProductPage(url);
        console.log(`📦 URL_CHECK: ${url.substring(0, 80)}... -> ${isProduct ? 'PRODUCT PAGE' : 'not product'}`);
      }
      
      // Only process product pages
      if (!this.isProductPage(url)) return;
      
      // Avoid duplicates - one product per unique URL
      if (uniqueProductUrls.has(url)) return;
      uniqueProductUrls.add(url);
      
      // Extract product information from URL and context
      const productInfo = this.extractProductInfoFromUrl(url);
      const productName = this.extractProductNameFromInteractions(interactions, url);
      
      console.log(`📦 VISITED_PRODUCT: Found product page: ${productName || 'Unknown Product'} (${url.substring(0, 60)}...)`);
      
      visitedProducts.push({
        productId: productInfo.productId,
        productName: productName || productInfo.productName || 'Unknown Product',
        productUrl: url,
        brand: productInfo.brand,
        productType: productInfo.productType,
        visitTimestamp: interaction.timestamp || 0,
        interactionIndex: index,
        extractedFromUrl: true
      });
    });
    
    return visitedProducts;
  }

  extractProductInteractions(interactions: ParsedInteraction[]): ProductInteraction[] {
    const productInteractions: ProductInteraction[] = [];
    
    interactions.forEach((interaction, index) => {
      if (interaction.type !== 'CLICK') return;
      
      const element = interaction.element;
      const url = interaction.context?.url || '';
      
      if (!this.isProductPage(url)) return;
      
      const attributeType = this.classifyProductAttribute(element?.text || '', url);
      if (!attributeType) return;
      
      productInteractions.push({
        interactionId: `product-${index}-${Date.now()}`,
        productId: this.extractProductIdFromUrl(url),
        attributeType,
        attributeValue: element?.text || '',
        pageUrl: url,
        selector: interaction.selectors?.primary || '',
        elementType: element?.tag || 'unknown',
        interactionType: 'click',
        timestamp: interaction.timestamp || 0,
        extractedData: this.extractProductAttributeData(element?.text || '', url, interaction)
      });
    });
    
    return productInteractions;
  }

  extractProductInfoFromUrl(url: string): { productId: string; productName: string; brand: string; productType: string } {
    let productId = 'unknown-product';
    let productName = '';
    let brand = '';
    let productType = 'unknown';
    
    // Extract domain for product ID prefix
    const domain = url.split('/')[2] || 'unknown';
    const domainPrefix = domain.replace(/^www\./, '').split('.')[0];
    
    // Enhanced product ID extraction from URL with better pattern matching
    const idMatches = [
      // E-commerce specific patterns
      url.match(/\/p\/[^\/]+\/(\d+)/),                    // /p/slug/123 (Home Depot)
      url.match(/\/productpage\.(\d{10,})/),              // /productpage.0967955145 (H&M)
      url.match(/\/product\/[^\/]*?(\d{6,})/),            // /product/item123456
      url.match(/\/item\/[^\/]*?(\d{4,})/),               // /item/123456
      url.match(/\/browse\/product\/(\d+)/),              // /browse/product/123
      url.match(/\/products\/[^\/]*?(\d{4,})/),           // /products/item1234
      
      // Generic patterns (more specific to avoid false matches)
      url.match(/[\/\-](\d{8,})(?:[\/\?\#]|$)/),          // 8+ digit numbers (very likely product IDs)
      url.match(/[\/\-](\d{6,})(?:[\/\?\#]|$)/),          // 6+ digit numbers 
      url.match(/[\/\-](\d{4,})(?:[\/\?\#\.]|$)/),        // 4+ digits at path boundaries
    ];
    
    // Find the most specific/reliable ID
    for (const match of idMatches) {
      if (match && match[1]) {
        const id = match[1];
        // Prefer longer IDs as they're more specific
        if (id.length >= 6) {
          productId = `${domainPrefix}-${id}`;
          break;
        } else if (id.length >= 4 && productId === 'unknown-product') {
          productId = `${domainPrefix}-${id}`;
        }
      }
    }
    
    // Clean up product ID to remove common artifacts
    if (productId !== 'unknown-product') {
      // Remove URL artifacts and normalize
      productId = productId.replace(/[^\w-]/g, '').toLowerCase();
    }
    
    // Enhanced product name extraction from URL slug
    const slugMatch = url.match(/\/p\/([^\/]+)\/\d+/) || 
                      url.match(/\/product\/([^\/\d]+)/) ||
                      url.match(/\/item\/([^\/\d]+)/);
    
    if (slugMatch && slugMatch[1]) {
      const urlSlug = slugMatch[1];
      productName = urlSlug
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase())
        .replace(/\s+/g, ' ')
        .trim();
      
      // Clean up common URL artifacts from product names
      productName = productName
        .replace(/\bGc\b/gi, '')
        .replace(/\bSrp\b/gi, '')
        .replace(/\bWh\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
    }
    
    // Enhanced brand detection from URL and product name
    brand = this.extractBrandFromUrlAndName(url, productName, domainPrefix);
    
    // Enhanced product type detection
    productType = this.inferProductTypeFromUrlAndName(url, productName);
    
    return { productId, productName, brand, productType };
  }

  /**
   * CRITICAL FIX: Extract product name from page title instead of element text
   * This fixes the "Unknown Product" issue by looking in the correct field
   */
  extractProductNameFromInteractions(interactions: ParsedInteraction[], productUrl: string): string | null {
    // Look for interactions on this specific product page
    const productPageInteractions = interactions.filter(i => i.context?.url === productUrl);
    
    for (const interaction of productPageInteractions) {
      // FIXED: Look in state.before.title instead of element.text
      const pageTitle = interaction.state?.before?.title;
      if (pageTitle && typeof pageTitle === 'string' && pageTitle.length > 10) {
        // Clean up site-specific suffixes (generic approach)
        let productName = pageTitle
          .replace(/ - The Home Depot$/, '')
          .replace(/ - H&M.*$/, '')
          .replace(/ - Gap.*$/, '')
          .replace(/ - .*$/, '') // Generic site suffix removal
          .trim();
        
        if (productName.length > 5 && !this.isUIElement(productName)) {
          return productName;
        }
      }
    }
    
    return null;
  }

  extractBrandFromUrlAndName(url: string, productName: string, domainPrefix: string): string {
    const text = `${url} ${productName}`.toLowerCase();
    
    // Common brand patterns (case-insensitive)
    const brandPatterns = [
      // Home improvement brands
      { pattern: /hampton[\s-]?bay/i, brand: 'Hampton Bay' },
      { pattern: /stylewell/i, brand: 'StyleWell' },
      { pattern: /husky/i, brand: 'Husky' },
      { pattern: /ryobi/i, brand: 'RYOBI' },
      { pattern: /milwaukee/i, brand: 'Milwaukee' },
      { pattern: /dewalt/i, brand: 'DEWALT' },
      
      // Fashion brands
      { pattern: /h[&\s]?m/i, brand: 'H&M' },
      { pattern: /gap/i, brand: 'Gap' },
      { pattern: /banana[\s-]?republic/i, brand: 'Banana Republic' },
      { pattern: /old[\s-]?navy/i, brand: 'Old Navy' },
      { pattern: /athleta/i, brand: 'Athleta' },
      
      // Generic brand detection from product names
      { pattern: /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s(?:brand|by|collection)/i, brand: '$1' },
    ];
    
    for (const { pattern, brand } of brandPatterns) {
      const match = text.match(pattern);
      if (match) {
        return brand.includes('$1') ? match[1] : brand;
      }
    }
    
    // Try to extract brand from URL path segments
    const pathSegments = url.split('/').filter(segment => segment.length > 0);
    for (const segment of pathSegments) {
      const decodedSegment = decodeURIComponent(segment).toLowerCase();
      // Look for brand-like segments (capitalized words in URLs)
      if (decodedSegment.includes('hampton') || decodedSegment.includes('stylewell')) {
        if (decodedSegment.includes('hampton')) return 'Hampton Bay';
        if (decodedSegment.includes('stylewell')) return 'StyleWell';
      }
    }
    
    return '';
  }

  // Private helper methods
  private isUIElement(text: string): boolean {
    const uiPatterns = [
      'click', 'button', 'menu', 'nav', 'search', 'filter', 'sort',
      'add to cart', 'buy now', 'checkout', 'continue', 'back', 'next'
    ];
    
    const lowerText = text.toLowerCase();
    return uiPatterns.some(pattern => lowerText.includes(pattern));
  }

  private isProductPage(url: string): boolean {
    return url.includes('/productpage') || 
           url.includes('/product/') || 
           url.includes('/p/') || 
           (url.includes('/browse/') && !!url.match(/\d+/));
  }

  private classifyProductAttribute(text: string, url: string): string | null {
    if (!text || text.length < 2) return null;
    
    const lowerText = text.toLowerCase();
    
    if (this.isSizeText(text)) return 'size';
    if (this.isColorName(text)) return 'color';
    if (lowerText.includes('add to cart') || lowerText.includes('buy')) return 'purchase';
    if (lowerText.includes('qty') || lowerText.includes('quantity')) return 'quantity';
    
    return null;
  }

  private isSizeText(text: string): boolean {
    const sizePatterns = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'small', 'medium', 'large', 'extra'];
    const lowerText = text.toLowerCase();
    return sizePatterns.some(pattern => lowerText.includes(pattern));
  }

  private isColorName(text: string): boolean {
    const colorNames = ['red', 'blue', 'green', 'black', 'white', 'navy', 'gray', 'brown', 'pink', 'purple', 'yellow', 'orange'];
    const lowerText = text.toLowerCase();
    return colorNames.some(color => lowerText.includes(color));
  }

  private extractProductIdFromUrl(url: string): string {
    const idMatches = [
      url.match(/\/p\/[^\/]+\/(\d+)/),
      url.match(/\/productpage\.(\d{10,})/),
      url.match(/\/product\/[^\/]*?(\d{6,})/),
      url.match(/[\/\-](\d{6,})(?:[\/\?\#]|$)/)
    ];
    
    for (const match of idMatches) {
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return 'unknown';
  }

  private extractProductAttributeData(text: string, url: string, interaction: ParsedInteraction): any {
    return {
      value: text,
      url: url,
      timestamp: interaction.timestamp,
      confidence: 0.8
    };
  }

  private inferProductTypeFromUrlAndName(url: string, productName: string): string {
    const text = `${url} ${productName}`.toLowerCase();
    
    // Product type patterns
    const typePatterns = [
      // Furniture types
      { pattern: /(?:patio|outdoor).*(?:furniture|dining|conversation|set)/i, type: 'outdoor_furniture' },
      { pattern: /(?:dining|kitchen).*(?:set|table|chair)/i, type: 'dining_furniture' },
      { pattern: /(?:living|family).*(?:room|furniture|sofa|couch)/i, type: 'living_room_furniture' },
      { pattern: /(?:bedroom|bed|mattress|dresser)/i, type: 'bedroom_furniture' },
      
      // Clothing types
      { pattern: /(?:t-?shirt|tee|top|blouse)/i, type: 'shirt' },
      { pattern: /(?:pants|jeans|trousers|chinos)/i, type: 'pants' },
      { pattern: /(?:dress|gown|frock)/i, type: 'dress' },
      { pattern: /(?:jacket|coat|blazer|hoodie|sweatshirt)/i, type: 'outerwear' },
      { pattern: /(?:shoes|sneakers|boots|sandals)/i, type: 'footwear' }
    ];
    
    for (const { pattern, type } of typePatterns) {
      if (pattern.test(text)) {
        return type;
      }
    }
    
    return 'unknown';
  }
}

// Type definitions (temporary - will be imported from proper types file)
interface ParsedInteraction {
  type: string;
  element: any;
  context: any;
  state?: {
    before?: {
      title?: string;
    };
  };
  timestamp: number;
  selectors: any;
}

interface VisitedProduct {
  productId: string;
  productName: string;
  productUrl: string;
  brand: string;
  productType: string;
  visitTimestamp: number;
  interactionIndex: number;
  extractedFromUrl: boolean;
  // Enhanced price and availability information
  price?: number;
  originalPrice?: number;
  currency?: string;
  discountPercent?: number;
  stockStatus?: 'in_stock' | 'out_of_stock' | 'limited_stock' | 'unknown';
  availability?: string;
  priceExtractedFrom?: 'text' | 'attribute' | 'element';
}

interface ProductInteraction {
  interactionId: string;
  productId: string;
  attributeType: string;
  attributeValue: string;
  pageUrl: string;
  selector: string;
  elementType: string;
  interactionType: string;
  timestamp: number;
  extractedData: any;
}