export interface HybridNavigationExample {
  // Enhanced metadata
  query: string;
  site: string;
  userStrategy: 'search_first' | 'category_browse' | 'filter_heavy' | 'brand_focused' | 'price_conscious';
  sessionContext: {
    userAgent: string;
    viewport: { width: number; height: number };
    timestamp: Date;
    sessionId: string;
  };

  // Navigation steps with hybrid data
  steps: HybridNavigationStep[];
  
  // Overall navigation analysis
  navigationAnalysis: {
    totalSteps: number;
    successRate: number;
    averageStepTime: number;
    userExperience: 'smooth' | 'difficult' | 'confusing';
    strategicEffectiveness: number; // 1-10 rating
  };

  // Results validation
  results: {
    productsFound: number;
    relevancyScore: number; // 1-10 how well results match query
    priceRangeMatch: boolean;
    expectedCategories: string[];
    unexpectedResults: string[];
  };
}

export interface HybridNavigationStep {
  stepNumber: number;
  intent: string; // What the user is trying to accomplish
  
  // Vision Analysis
  visionAnalysis: {
    userReasoning: string; // Why user clicked this element
    visualCues: string[]; // What made element stand out
    alternativesConsidered: string[]; // Other elements that were visible options
    confidenceLevel: number; // 1-10 how obvious this choice was
    clickContext: ClickContext;
  };

  // Multi-Selector Strategy
  selectors: SelectorSet;

  // Execution Validation
  executionData: {
    clickSuccess: boolean;
    pageLoadTime: number;
    resultingUrl: string;
    elementsFound: number;
    nextStepOptions: string[];
    errorEncountered?: string;
  };

  // Screenshots for training
  screenshots: {
    beforeClick: string; // Base64 encoded
    afterClick: string;
    annotated?: string; // With click location highlighted
  };
}

export interface ClickContext {
  coordinates: { x: number; y: number };
  elementBounds: { x: number; y: number; width: number; height: number };
  elementText: string;
  elementType: string; // button, link, input, etc.
  parentContext: string; // Description of parent elements
  pageSection: 'header' | 'main' | 'sidebar' | 'footer' | 'modal';
  visualHierarchy: number; // 1-5, how prominent element was
}

export interface SelectorSet {
  // Reliability ranked (most reliable first)
  primary: SelectorOption;
  secondary: SelectorOption;
  fallback: SelectorOption;
  visual: VisualSelector;
  
  // Reliability testing results
  reliabilityScores: {
    primary: number; // 0-1 success rate
    secondary: number;
    fallback: number;
    averageSpeed: number; // ms to find element
  };
}

export interface SelectorOption {
  selector: string;
  type: 'data-test' | 'id' | 'class' | 'xpath' | 'css' | 'text' | 'aria';
  stability: number; // 1-10 how likely to persist
  speed: number; // 1-10 how fast to execute
  specificity: number; // 1-10 how unique
}

export interface VisualSelector {
  text?: string;
  position: 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom';
  color?: string;
  size?: 'small' | 'medium' | 'large';
  style?: string; // button, link, icon, etc.
  nearbyElements?: string[]; // Elements that help locate this one
}

export interface HybridExtractionExample {
  site: string;
  url: string;
  query: string;
  
  // Vision-guided extraction
  visionAnalysis: {
    productLayoutType: 'grid' | 'list' | 'carousel' | 'mixed';
    visualPatterns: string[]; // Repeated visual elements
    extractionStrategy: string; // How human would identify products
    qualityIndicators: string[]; // Visual cues for data quality
  };

  // Multi-extraction approach
  extractionMethods: {
    primary: ExtractionMethod;
    fallback: ExtractionMethod;
    visual: VisualExtractionMethod;
  };

  // Validated results
  extractedData: EnhancedProductData[];
  
  // Quality metrics
  qualityMetrics: {
    completeness: number; // 0-1, how much data was extracted
    accuracy: number; // 0-1, how accurate the data is
    consistency: number; // 0-1, format consistency
    visualValidation: number; // 0-1, matches what human sees
  };
}

export interface ExtractionMethod {
  selectors: string[];
  code: string;
  framework: string; // playwright, puppeteer, selenium
  reliability: number;
  speed: number;
}

export interface VisualExtractionMethod {
  description: string; // How to find data visually
  visualCues: string[]; // What to look for
  fallbackStrategy: string; // If selectors fail
}

export interface EnhancedProductData {
  // Standard product fields
  title: string;
  price?: string;
  rating?: number;
  availability?: string;
  imageUrl?: string;
  productUrl?: string;
  
  // Enhanced fields
  extractionConfidence: number; // 0-1 how confident in this data
  visualValidation: boolean; // Does extracted data match screenshot
  selectorReliability: number; // How stable was the selector
  dataCompleteness: number; // 0-1 how much expected data was found
  
  // Visual context
  visualPosition: { x: number; y: number; width: number; height: number };
  nearbyProducts: number; // How many similar products around this one
  visualQuality: 'high' | 'medium' | 'low'; // Image/text quality
}

// Training dataset combining both approaches
export interface HybridTrainingDataset {
  site: string;
  version: string;
  collectionMethod: 'hybrid';
  
  navigationExamples: HybridNavigationExample[];
  extractionExamples: HybridExtractionExample[];
  
  metadata: {
    totalExamples: number;
    visionAnalysisCount: number;
    selectorReliabilityTests: number;
    averageConfidenceScore: number;
    strategiesIncluded: string[];
    difficultyDistribution: {
      easy: number;   // Clear visual cues, reliable selectors
      medium: number; // Some ambiguity, backup selectors needed
      hard: number;   // Complex layouts, multiple fallbacks required
    };
  };
  
  // Quality assurance data
  qualityAssurance: {
    visionAccuracy: number; // How often vision analysis was correct
    selectorStability: number; // How often selectors worked
    humanValidation: number; // Human-verified examples
    crossSiteReliability: number; // Works across different sessions
  };
}