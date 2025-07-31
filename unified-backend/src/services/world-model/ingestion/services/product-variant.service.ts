/**
 * ProductVariantService
 * 
 * Handles product variations and configurations including:
 * - Product variant extraction
 * - Color and design information
 * - Product grouping by base product
 * - Variant configuration tracking
 * - Size and option detection
 */

// import { ProductVariant } from '../types/world-model-types';

export interface IProductVariantService {
  extractProductVariants(interactions: ParsedInteraction[]): ProductVariant[];
  extractColorAndDesignInfo(interactions: ParsedInteraction[], variantId: string): ColorDesignInfo;
  groupByBaseProduct(interactions: ParsedInteraction[]): Map<string, { baseProductId: string; interactions: ParsedInteraction[] }>;
  detectSizeVariants(interactions: ParsedInteraction[]): SizeVariant[];
  detectColorVariants(interactions: ParsedInteraction[]): ColorVariant[];
}

export class ProductVariantService implements IProductVariantService {
  
  extractProductVariants(interactions: ParsedInteraction[]): ProductVariant[] {
    console.log(`🎨 PRODUCT_VARIANT_PARSER: Analyzing ${interactions.length} interactions for product variants`);
    
    const variants: ProductVariant[] = [];
    
    // Simple implementation for now
    interactions.forEach((interaction, index) => {
      const text = interaction.element?.text || '';
      const url = interaction.context?.url || '';
      
      if (this.isSizeText(text) || this.isColorName(text)) {
        variants.push({
          variantId: `variant_${index}`,
          productId: this.extractProductIdFromUrl(url) || 'unknown',
          variantType: this.isSizeText(text) ? 'size' : 'color'
        });
      }
    });
    
    console.log(`🎨 PRODUCT_VARIANT_PARSER: Found ${variants.length} product variants`);
    return variants;
  }

  extractColorAndDesignInfo(interactions: ParsedInteraction[], variantId: string): ColorDesignInfo {
    // Implementation will be moved from DirectSessionParser
    throw new Error('Method not implemented');
  }

  groupByBaseProduct(interactions: ParsedInteraction[]): Map<string, { baseProductId: string; interactions: ParsedInteraction[] }> {
    // Implementation will be moved from DirectSessionParser
    throw new Error('Method not implemented');
  }

  detectSizeVariants(interactions: ParsedInteraction[]): SizeVariant[] {
    // Implementation will be moved from DirectSessionParser
    throw new Error('Method not implemented');
  }

  detectColorVariants(interactions: ParsedInteraction[]): ColorVariant[] {
    // Implementation will be moved from DirectSessionParser
    throw new Error('Method not implemented');
  }

  // Private helper methods will be moved here
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

  private extractProductIdFromUrl(url: string): string | undefined {
    const match = url.match(/\/(\\d+)(?:[?#]|$)/);
    return match ? match[1] : undefined;
  }
}

// Type definitions
interface ProductVariant {
  variantId: string;
  productId: string;
  variantType: string;
}

interface ColorDesignInfo {
  colors: string[];
  designs: string[];
}

interface SizeVariant {
  size: string;
  interactions: ParsedInteraction[];
}

interface ColorVariant {
  color: string;
  interactions: ParsedInteraction[];
}

interface ParsedInteraction {
  type: string;
  element: any;
  context: any;
  timestamp: number;
  selectors: any;
}