/**
 * PricingAndAvailabilityService
 * 
 * Handles pricing and stock information extraction including:
 * - Price extraction from nearby elements (ENHANCED)
 * - Stock availability detection
 * - Inventory analysis
 * - Price pattern recognition
 * - Discount and pricing variation detection
 */

export interface IPricingAndAvailabilityService {
  extractPriceAndAvailabilityFromInteractions(interactions: ParsedInteraction[], productUrl: string): PriceInfo;
  extractInventoryAndAvailability(interactions: ParsedInteraction[]): InventoryInfo;
  extractPriceFromNearbyElements(interaction: ParsedInteraction): PriceInfo | null;
  detectPricePattern(text: string): { amount: number; currency: string; confidence: number } | null;
}

export class PricingAndAvailabilityService implements IPricingAndAvailabilityService {
  
  /**
   * ENHANCED: Extract price and availability with improved nearby elements scanning
   * This addresses the pricing capture degradation issue
   */
  extractPriceAndAvailabilityFromInteractions(interactions: ParsedInteraction[], productUrl: string): PriceInfo {
    const productPageInteractions = interactions.filter(i => i.context?.url === productUrl);
    
    let bestPriceInfo: PriceInfo = {
      price: undefined,
      originalPrice: undefined,
      currency: 'USD',
      discountPercent: undefined,
      stockStatus: 'unknown',
      priceExtractedFrom: undefined
    };

    for (const interaction of productPageInteractions) {
      // ENHANCED: Comprehensive nearby elements scanning
      const nearbyPrice = this.extractPriceFromNearbyElements(interaction);
      if (nearbyPrice && nearbyPrice.price) {
        bestPriceInfo = { ...bestPriceInfo, ...nearbyPrice };
      }

      // Also check element text directly
      const elementPrice = this.detectPricePattern(interaction.element?.text || '');
      if (elementPrice && elementPrice.amount > 0) {
        bestPriceInfo.price = elementPrice.amount;
        bestPriceInfo.currency = elementPrice.currency;
        bestPriceInfo.priceExtractedFrom = 'element';
      }
    }

    return bestPriceInfo;
  }

  /**
   * CRITICAL FIX: Enhanced nearby elements scanning for pricing
   * This restores the pricing capture that was working before
   */
  extractPriceFromNearbyElements(interaction: ParsedInteraction): PriceInfo | null {
    const nearbyElements = interaction.element?.nearbyElements || [];
    
    if (nearbyElements.length === 0) {
      return null;
    }

    // Scan all nearby elements for price patterns
    for (const nearby of nearbyElements) {
      if (!nearby.text) continue;
      
      const priceMatch = this.detectPricePattern(nearby.text);
      if (priceMatch && priceMatch.confidence > 0.7) {
        // Look for original price (crossed out) in nearby elements
        let originalPrice: number | undefined;
        const originalPricePattern = /\$(\d+(?:\.\d{2})?)/g;
        
        // Check other nearby elements for original price
        for (const other of nearbyElements) {
          if (other !== nearby && other.text) {
            const originalMatch = this.detectPricePattern(other.text);
            if (originalMatch && originalMatch.amount > priceMatch.amount) {
              originalPrice = originalMatch.amount;
              break;
            }
          }
        }

        const discountPercent = originalPrice 
          ? Math.round(((originalPrice - priceMatch.amount) / originalPrice) * 100)
          : undefined;

        return {
          price: priceMatch.amount,
          originalPrice,
          discountPercent,
          currency: priceMatch.currency,
          stockStatus: this.detectStockStatus(nearbyElements),
          priceExtractedFrom: 'nearby_element'
        };
      }
    }

    return null;
  }

  /**
   * Enhanced price pattern detection with confidence scoring
   */
  detectPricePattern(text: string): { amount: number; currency: string; confidence: number } | null {
    if (!text) return null;

    // Multiple price patterns with confidence scoring
    const patterns = [
      { regex: /\$(\d+(?:\.\d{2})?)/g, confidence: 0.9, currency: 'USD' },
      { regex: /(\d+(?:\.\d{2})?)\s*USD/gi, confidence: 0.8, currency: 'USD' },
      { regex: /Price:\s*\$(\d+(?:\.\d{2})?)/gi, confidence: 0.95, currency: 'USD' },
      { regex: /Sale:\s*\$(\d+(?:\.\d{2})?)/gi, confidence: 0.9, currency: 'USD' },
      { regex: /Now:\s*\$(\d+(?:\.\d{2})?)/gi, confidence: 0.85, currency: 'USD' }
    ];

    for (const pattern of patterns) {
      const match = pattern.regex.exec(text);
      if (match) {
        const amount = parseFloat(match[1]);
        if (amount > 0 && amount < 10000) { // Reasonable price range
          return {
            amount,
            currency: pattern.currency,
            confidence: pattern.confidence
          };
        }
      }
    }

    return null;
  }

  /**
   * Detect stock status from nearby elements
   */
  private detectStockStatus(nearbyElements: any[]): 'in_stock' | 'out_of_stock' | 'limited_stock' | 'unknown' {
    for (const element of nearbyElements) {
      if (!element.text) continue;
      
      const text = element.text.toLowerCase();
      
      if (text.includes('out of stock') || text.includes('sold out') || text.includes('unavailable')) {
        return 'out_of_stock';
      }
      
      if (text.includes('limited') || text.includes('only') || text.includes('few left')) {
        return 'limited_stock';
      }
      
      if (text.includes('in stock') || text.includes('available') || text.includes('add to cart')) {
        return 'in_stock';
      }
    }
    
    return 'unknown';
  }

  extractInventoryAndAvailability(interactions: ParsedInteraction[]): InventoryInfo {
    // Implementation will be moved from DirectSessionParser
    throw new Error('Method not implemented');
  }
}

// Type definitions
interface PriceInfo {
  price?: number;
  originalPrice?: number;
  currency?: string;
  discountPercent?: number;
  stockStatus?: 'in_stock' | 'out_of_stock' | 'limited_stock' | 'unknown';
  priceExtractedFrom?: 'text' | 'attribute' | 'element' | 'nearby_element';
}

interface InventoryInfo {
  // Will be defined based on DirectSessionParser implementation
}

interface ParsedInteraction {
  type: string;
  element: any;
  context: any;
  timestamp: number;
  selectors: any;
}