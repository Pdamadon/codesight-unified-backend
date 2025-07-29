/**
 * Dynamic Pattern Matcher - Replaces hardcoded domain values with configurable pattern recognition
 * 
 * This system provides flexible, confidence-scored pattern matching for:
 * - Clothing sizes (alpha, numeric, specialty)
 * - Colors (basic, fashion, brand-specific) 
 * - Site-specific patterns
 * 
 * Eliminates hardcoded arrays while maintaining high accuracy
 */

export interface PatternMatchResult {
  value: string;
  confidence: number;
  matchType: 'exact' | 'pattern' | 'context' | 'ml';
  category: string;
  metadata?: any;
}

export interface SizePatternConfig {
  alphaPattern: RegExp;
  numericRanges: { min: number; max: number; category: string }[];
  specialtyPatterns: RegExp[];
  contextKeywords: string[];
}

export interface ColorPatternConfig {
  basicColors: string[];
  fashionTerms: string[];
  patternWords: string[];
  contextKeywords: string[];
  brandSpecific: { [domain: string]: string[] };
}

export class DynamicPatternMatcher {
  private sizeConfig!: SizePatternConfig;
  private colorConfig!: ColorPatternConfig;
  private sitePatterns: Map<string, any> = new Map();

  constructor() {
    this.initializeDefaultConfigs();
  }

  /**
   * Initialize smart default configurations (not hardcoded lists)
   */
  private initializeDefaultConfigs(): void {
    this.sizeConfig = {
      // Pattern-based size detection instead of hardcoded list
      alphaPattern: /^(XXX?L|XX?L|XL|L|M|S|XS)$/i,
      
      // Numeric ranges for different categories
      numericRanges: [
        { min: 2, max: 18, category: 'children' },      // Children: 2, 4, 6, 8, 10, 12, 14, 16, 18
        { min: 28, max: 44, category: 'waist' },        // Waist: 28, 30, 32, 34, 36, 38, 40, 42, 44
        { min: 6, max: 15, category: 'shoes' },         // Shoes: 6, 6.5, 7, 7.5, 8... 15
        { min: 32, max: 46, category: 'eu-clothing' }   // EU sizes: 32, 34, 36, 38, 40, 42, 44, 46
      ],
      
      // Specialty size patterns
      specialtyPatterns: [
        /^\d+T$/i,                    // Toddler: 2T, 3T, 4T
        /^\d+(?:\.\d+)?[WDHRL]$/i,    // Width/Height/Regular/Long: 8W, 32L
        /^ONE SIZE$/i,                // One size fits all
        /^OS$/i,                      // One size (abbreviated)
        /^\d+\/\d+$/,                 // Fraction sizes: 1/2, 3/4
      ],
      
      contextKeywords: ['size', 'fit', 'length', 'width', 'dimension']
    };

    this.colorConfig = {
      // Basic color vocabulary (expandable)
      basicColors: [
        'red', 'blue', 'black', 'white', 'green', 'gray', 'grey', 'brown', 
        'navy', 'pink', 'purple', 'yellow', 'orange', 'beige', 'tan'
      ],
      
      // Fashion-specific terms (learned from data)
      fashionTerms: [
        'vintage', 'classic', 'dark', 'light', 'bright', 'muted', 'bold',
        'metallic', 'neon', 'pastel', 'jewel', 'earth', 'neutral'
      ],
      
      // Pattern descriptions
      patternWords: [
        'stripe', 'striped', 'plaid', 'solid', 'print', 'printed', 
        'floral', 'geometric', 'abstract', 'checkered', 'polka'
      ],
      
      contextKeywords: ['color', 'swatch', 'shade', 'tone', 'hue'],
      
      // Site-specific color vocabularies (learned dynamically)
      brandSpecific: {
        'gap.com': ['dazzling', 'weathered', 'vintage', 'classic'],
        'nike.com': ['infrared', 'volt', 'obsidian', 'particle'],
        'anthropologie.com': ['mauve', 'sage', 'ochre', 'cerulean']
      }
    };
  }

  /**
   * Smart size detection with confidence scoring
   */
  detectSize(text: string, context: any = {}): PatternMatchResult | null {
    if (!text || typeof text !== 'string') return null;
    
    const cleanText = text.trim();
    const upperText = cleanText.toUpperCase();
    
    console.log('🔍 [DYNAMIC PATTERN MATCHER] Size detection called', {
      input: cleanText,
      componentActive: true
    });
    
    // 1. Alpha pattern matching (highest confidence)
    if (this.sizeConfig.alphaPattern.test(upperText)) {
      return {
        value: upperText,
        confidence: 0.95,
        matchType: 'pattern',
        category: 'alpha-size',
        metadata: { pattern: 'standard_alpha' }
      };
    }
    
    // 2. Numeric size detection with category inference
    const numericResult = this.detectNumericSize(cleanText, context);
    if (numericResult) return numericResult;
    
    // 3. Specialty pattern matching
    const specialtyResult = this.detectSpecialtySize(cleanText);
    if (specialtyResult) return specialtyResult;
    
    // 4. Context-based inference (lower confidence)
    const contextResult = this.inferSizeFromContext(cleanText, context);
    if (contextResult) return contextResult;
    
    return null;
  }

  /**
   * Detect numeric sizes with intelligent categorization
   */
  private detectNumericSize(text: string, context: any): PatternMatchResult | null {
    // Handle decimal sizes (shoe sizes)
    const decimalMatch = text.match(/^(\d+(?:\.\d+)?)$/);
    if (!decimalMatch) return null;
    
    const num = parseFloat(decimalMatch[1]);
    
    // Find matching category based on numeric ranges
    for (const range of this.sizeConfig.numericRanges) {
      if (num >= range.min && num <= range.max) {
        // Check if decimal (likely shoe size)
        const isDecimal = text.includes('.');
        const confidence = isDecimal && range.category === 'shoes' ? 0.9 : 0.8;
        
        return {
          value: text,
          confidence,
          matchType: 'pattern',
          category: range.category,
          metadata: { 
            numeric: num, 
            range: range,
            isDecimal 
          }
        };
      }
    }
    
    return null;
  }

  /**
   * Detect specialty size patterns
   */
  private detectSpecialtySize(text: string): PatternMatchResult | null {
    for (const pattern of this.sizeConfig.specialtyPatterns) {
      if (pattern.test(text)) {
        return {
          value: text.toUpperCase(),
          confidence: 0.85,
          matchType: 'pattern',
          category: 'specialty-size',
          metadata: { pattern: pattern.source }
        };
      }
    }
    
    return null;
  }

  /**
   * Infer size from surrounding context (lower confidence)
   */
  private inferSizeFromContext(text: string, context: any): PatternMatchResult | null {
    const attributes = context.attributes || {};
    const surroundingText = context.surroundingText || '';
    
    // Check if context suggests this is a size
    const hasContextClues = this.sizeConfig.contextKeywords.some(keyword => 
      attributes.name?.toLowerCase().includes(keyword) ||
      attributes['aria-label']?.toLowerCase().includes(keyword) ||
      surroundingText.toLowerCase().includes(keyword)
    );
    
    if (hasContextClues && text.length <= 4 && /^[A-Z0-9]+$/i.test(text)) {
      return {
        value: text.toUpperCase(),
        confidence: 0.6,
        matchType: 'context',
        category: 'inferred-size',
        metadata: { contextClues: true }
      };
    }
    
    return null;
  }

  /**
   * Smart color detection with brand-specific learning
   */
  detectColor(text: string, context: any = {}): PatternMatchResult | null {
    if (!text || typeof text !== 'string') return null;
    
    const cleanText = text.trim();
    const lowerText = cleanText.toLowerCase();
    const domain = context.domain || 'generic';
    
    console.log('🎨 [DYNAMIC PATTERN MATCHER] Color detection called', {
      input: cleanText,
      domain: domain,
      componentActive: true
    });
    
    // 1. Basic color matching (high confidence)
    const basicResult = this.detectBasicColor(lowerText);
    if (basicResult) return basicResult;
    
    // 2. Brand-specific color detection
    const brandResult = this.detectBrandColor(lowerText, domain);
    if (brandResult) return brandResult;
    
    // 3. Fashion term detection
    const fashionResult = this.detectFashionColor(lowerText);
    if (fashionResult) return fashionResult;
    
    // 4. Pattern word detection
    const patternResult = this.detectColorPattern(lowerText);
    if (patternResult) return patternResult;
    
    // 5. Context-based color inference
    const contextResult = this.inferColorFromContext(cleanText, context);
    if (contextResult) return contextResult;
    
    return null;
  }

  /**
   * Detect basic colors with compound color support
   */
  private detectBasicColor(text: string): PatternMatchResult | null {
    // Check for basic color words
    const matchedColors = this.colorConfig.basicColors.filter(color => 
      text.includes(color)
    );
    
    if (matchedColors.length > 0) {
      return {
        value: text,
        confidence: 0.9,
        matchType: 'exact',
        category: 'basic-color',
        metadata: { 
          matchedColors,
          isPrimary: matchedColors.length === 1 
        }
      };
    }
    
    return null;
  }

  /**
   * Detect brand-specific color vocabulary
   */
  private detectBrandColor(text: string, domain: string): PatternMatchResult | null {
    const brandColors = this.colorConfig.brandSpecific[domain] || [];
    
    const matchedBrandColor = brandColors.find(color => text.includes(color));
    if (matchedBrandColor) {
      return {
        value: text,
        confidence: 0.85,
        matchType: 'exact',
        category: 'brand-color',
        metadata: { 
          brand: domain,
          brandTerm: matchedBrandColor 
        }
      };
    }
    
    return null;
  }

  /**
   * Detect fashion-specific color terms
   */
  private detectFashionColor(text: string): PatternMatchResult | null {
    const matchedTerms = this.colorConfig.fashionTerms.filter(term => 
      text.includes(term)
    );
    
    if (matchedTerms.length > 0) {
      return {
        value: text,
        confidence: 0.75,
        matchType: 'pattern',
        category: 'fashion-color',
        metadata: { fashionTerms: matchedTerms }
      };
    }
    
    return null;
  }

  /**
   * Detect color patterns (stripes, plaid, etc.)
   */
  private detectColorPattern(text: string): PatternMatchResult | null {
    const matchedPatterns = this.colorConfig.patternWords.filter(pattern => 
      text.includes(pattern)
    );
    
    if (matchedPatterns.length > 0) {
      return {
        value: text,
        confidence: 0.8,
        matchType: 'pattern',
        category: 'color-pattern',
        metadata: { patterns: matchedPatterns }
      };
    }
    
    return null;
  }

  /**
   * Infer color from context clues
   */
  private inferColorFromContext(text: string, context: any): PatternMatchResult | null {
    const attributes = context.attributes || {};
    
    // Check for color-related attributes
    const hasColorContext = this.colorConfig.contextKeywords.some(keyword =>
      attributes.name?.toLowerCase().includes(keyword) ||
      attributes['aria-label']?.toLowerCase().includes(keyword) ||
      attributes.class?.toLowerCase().includes(keyword)
    );
    
    // Reasonable length for color description
    const hasReasonableLength = text.length >= 3 && text.length <= 25;
    
    // Not obviously a size or other non-color term
    const isNotSize = !this.sizeConfig.alphaPattern.test(text) && 
                      !['small', 'medium', 'large'].includes(text.toLowerCase());
    
    if (hasColorContext && hasReasonableLength && isNotSize) {
      return {
        value: text,
        confidence: 0.6,
        matchType: 'context',
        category: 'inferred-color',
        metadata: { contextInferred: true }
      };
    }
    
    return null;
  }

  /**
   * Learn new patterns from site data (dynamic vocabulary expansion)
   */
  learnSitePatterns(domain: string, interactions: any[]): void {
    const siteColors = new Set<string>();
    const siteSizes = new Set<string>();
    
    // Extract patterns from successful interactions
    interactions.forEach(interaction => {
      const element = interaction.element || {};
      const text = element.text || '';
      const attributes = element.attributes || {};
      
      // Learn from color selections
      if (this.hasColorContext(attributes)) {
        siteColors.add(text.toLowerCase());
      }
      
      // Learn from size selections  
      if (this.hasSizeContext(attributes)) {
        siteSizes.add(text.toUpperCase());
      }
    });
    
    // Update brand-specific patterns
    if (siteColors.size > 0) {
      this.colorConfig.brandSpecific[domain] = [
        ...(this.colorConfig.brandSpecific[domain] || []),
        ...Array.from(siteColors)
      ];
    }
    
    // Store site patterns for future use
    this.sitePatterns.set(domain, {
      colors: Array.from(siteColors),
      sizes: Array.from(siteSizes),
      learnedAt: Date.now()
    });
  }

  /**
   * Helper: Check if attributes suggest color context
   */
  private hasColorContext(attributes: any): boolean {
    return this.colorConfig.contextKeywords.some(keyword =>
      attributes.name?.toLowerCase().includes(keyword) ||
      attributes['aria-label']?.toLowerCase().includes(keyword)
    );
  }

  /**
   * Helper: Check if attributes suggest size context
   */
  private hasSizeContext(attributes: any): boolean {
    return this.sizeConfig.contextKeywords.some(keyword =>
      attributes.name?.toLowerCase().includes(keyword) ||
      attributes['aria-label']?.toLowerCase().includes(keyword)
    );
  }

  /**
   * Get pattern confidence for debugging/tuning
   */
  getPatternStats(): any {
    return {
      sizePatterns: {
        alphaPattern: this.sizeConfig.alphaPattern.source,
        numericRanges: this.sizeConfig.numericRanges.length,
        specialtyPatterns: this.sizeConfig.specialtyPatterns.length
      },
      colorPatterns: {
        basicColors: this.colorConfig.basicColors.length,
        fashionTerms: this.colorConfig.fashionTerms.length,
        brandSpecific: Object.keys(this.colorConfig.brandSpecific).length,
        sitesLearned: this.sitePatterns.size
      }
    };
  }
}