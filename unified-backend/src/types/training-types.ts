/**
 * Training Data Transformer Types
 * 
 * Based on rich 6-group interaction data structure
 * Per FOCUSED_TASKS.md - extract spatial, visual, business context
 */

export interface EnhancedInteractionData {
  // Core groups from enhanced 6-group collection - EXPANDED WITH ALL DATA
  selectors: {
    xpath?: string;
    cssPath?: string;
    primary?: string;
    alternatives?: string[];
    reliability?: Record<string, number>;
    // 🆕 COMPREHENSIVE selector data
    dataTestIds?: string[];
    ariaLabels?: string[];
    semanticSelectors?: string[];
    customSelectors?: string[];
    selectorPerformance?: Record<string, { speed: number; stability: number }>;
  };
  visual: {
    boundingBox?: {
      x: number;
      y: number;
      width: number;
      height: number;
      top?: number;
      left?: number;
      bottom?: number;
      right?: number;
    };
    screenshot?: string;
    positioning?: {
      relative?: string;
      distance?: number;
      zIndex?: number;
      visibility?: string;
      opacity?: number;
    };
    // 🆕 COMPLETE visual context
    colors?: {
      background?: string;
      text?: string;
      border?: string;
    };
    typography?: {
      fontSize?: string;
      fontFamily?: string;
      fontWeight?: string;
    };
    layout?: {
      display?: string;
      position?: string;
      flexDirection?: string;
      gridArea?: string;
    };
    animations?: {
      hasAnimations?: boolean;
      animationType?: string;
      duration?: number;
    };
    responsiveBreakpoint?: string;
    deviceType?: 'mobile' | 'tablet' | 'desktop';
    // 🆕 DESIGN SYSTEM CONTEXT
    designSystem?: {
      componentLibrary?: string; // Material UI, Bootstrap, Tailwind, custom
      brandColors?: {
        primary?: string;
        secondary?: string;
        accent?: string;
        background?: string;
      };
      designTokens?: Record<string, string>; // CSS custom properties
      designPatterns?: string[]; // card, modal, dropdown, etc.
      uiFramework?: string; // React, Vue, Angular, vanilla
      cssFramework?: string; // Tailwind, Bootstrap, Bulma
    };
  };
  element: {
    tag?: string;
    text?: string;
    attributes?: Record<string, string>;
    nearbyElements?: Array<{
      selector: string;
      text: string;
      relationship: string;
      distance?: number;
      boundingBox?: { x: number; y: number; width: number; height: number };
      // 🆕 COMPLETE nearby elements context
      zIndex?: number;
      isVisible?: boolean;
      isClickable?: boolean;
      elementType?: string; // button, link, input, etc.
      ariaRole?: string;
      computedStyles?: Record<string, string>;
      attributes?: Record<string, string>;
    }>;
    // 🆕 COMPLETE element context
    computedStyles?: Record<string, string>;
    innerHTML?: string;
    outerHTML?: string;
    classList?: string[];
    dataset?: Record<string, string>;
    ariaAttributes?: Record<string, string>;
    roleDescription?: string;
    tabIndex?: number;
    isVisible?: boolean;
    isInteractable?: boolean;
    formContext?: {
      formName?: string;
      fieldName?: string;
      fieldType?: string;
      required?: boolean;
      validation?: string;
      placeholder?: string;
      value?: string;
    };
    siblingElements?: Array<{
      selector: string;
      text: string;
      position: 'before' | 'after';
      index: number;
    }>;
    childElements?: Array<{
      selector: string;
      text: string;
      tag: string;
      role?: string;
    }>;
  };
  context: {
    pageTitle?: string;
    pageUrl?: string;
    pageType?: string;
    userJourney?: string;
    ancestors?: Array<{
      tag: string;
      classes?: string[];
      attributes?: Record<string, string>;
      role?: string;
      semanticMeaning?: string;
    }>;
    // 🆕 COMPLETE page context
    meta?: {
      description?: string;
      keywords?: string[];
      author?: string;
      robots?: string;
    };
    performance?: {
      loadTime?: number;
      domContentLoaded?: number;
      firstContentfulPaint?: number;
      largestContentfulPaint?: number;
    };
    seo?: {
      h1Tags?: string[];
      h2Tags?: string[];
      canonicalUrl?: string;
      structuredData?: Record<string, any>;
    };
    analytics?: {
      gtmEvents?: string[];
      customEvents?: Record<string, any>;
      trackingIds?: string[];
    };
    accessibility?: {
      wcagLevel?: 'A' | 'AA' | 'AAA';
      ariaLandmarks?: string[];
      headingStructure?: Array<{ level: number; text: string }>;
      colorContrast?: Record<string, number>;
      keyboardNavigation?: boolean;
    };
  };
  state: {
    before?: {
      focused?: string;
      scrollPosition?: { x: number; y: number };
      formData?: Record<string, string>;
      // 🆕 COMPLETE state context
      activeModal?: string;
      selectedTab?: string;
      expandedAccordions?: string[];
      openDropdowns?: string[];
      loadingStates?: string[];
      errorStates?: Record<string, string>;
      validationErrors?: Record<string, string>;
      cookies?: Record<string, string>;
      localStorage?: Record<string, string>;
      sessionStorage?: Record<string, string>;
    };
    after?: {
      focused?: string;
      scrollPosition?: { x: number; y: number };
      formData?: Record<string, string>;
      activeModal?: string;
      selectedTab?: string;
      expandedAccordions?: string[];
      openDropdowns?: string[];
      loadingStates?: string[];
      errorStates?: Record<string, string>;
      validationErrors?: Record<string, string>;
    };
    // 🆕 STATE CHANGES
    changes?: {
      urlChanged?: boolean;
      domMutations?: Array<{
        type: 'added' | 'removed' | 'modified';
        selector: string;
        change: string;
      }>;
      styleChanges?: Record<string, { before: string; after: string }>;
      attributeChanges?: Record<string, { before: string; after: string }>;
      networkRequests?: Array<{
        url: string;
        method: string;
        status: number;
        duration: number;
      }>;
    };
  };
  interaction: {
    type: string;
    timestamp: number;
    coordinates?: { x: number; y: number };
    value?: string;
    selector?: string; // Fallback selector
    // 🆕 COMPLETE interaction context
    timing?: {
      startTime: number;
      endTime: number;
      duration: number;
      delay?: number;
    };
    input?: {
      keyboard?: {
        keys: string[];
        modifiers: string[];
        typing: boolean;
      };
      mouse?: {
        button: string;
        clickCount: number;
        pressure?: number;
      };
      touch?: {
        touches: number;
        gesture?: string;
      };
    };
    triggeredBy?: 'user' | 'script' | 'automation';
    confidence?: number;
    retry?: {
      attempt: number;
      reason: string;
      success: boolean;
    };
  };
  // 🆕 BUSINESS INTELLIGENCE
  business?: {
    ecommerce?: {
      productId?: string;
      productName?: string;
      productPrice?: number;
      productCategory?: string;
      cartValue?: number;
      inventoryStatus?: string;
      discounts?: Array<{ type: string; value: number }>;
    };
    conversion?: {
      funnelStage?: string;
      funnelPosition?: number;
      conversionGoal?: string;
      abTestVariant?: string;
      experimentId?: string;
    };
    user?: {
      sessionId?: string;
      userId?: string;
      customerSegment?: string;
      previousInteractions?: number;
      timeOnSite?: number;
      referrerSource?: string;
      deviceInfo?: {
        userAgent?: string;
        screenResolution?: string;
        browserVersion?: string;
      };
      // 🆕 SIMPLIFIED BEHAVIOR PATTERNS - only what matters for web automation
      behaviorPatterns?: {
        devicePreferences?: string[]; // mobile, desktop, tablet
        commonInteractionPatterns?: string[]; // scroll-before-click, hover-first, etc.
        navigationPreferences?: string[]; // uses-search, browses-categories, etc.
      };
    };
  };
}

export interface TrainingExample {
  prompt: string;
  completion: string;
  context: {
    // Core context
    pageType?: string;
    userJourney?: string;
    reliability?: number;
    spatialContext?: string;
    businessContext?: string;
    journeyContext?: any;
    
    // 🆕 COMPREHENSIVE context for richer training
    visual?: {
      colors?: string;
      typography?: string;
      layout?: string;
      positioning?: string;
      animations?: string;
      deviceType?: string;
      // 🆕 DESIGN SYSTEM CONTEXT
      designSystem?: string;
      componentLibrary?: string;
      brandColors?: string;
      designPatterns?: string;
    };
    element?: {
      tag?: string;
      attributes?: string;
      computedStyles?: string;
      ariaContext?: string;
      formContext?: string;
      domHierarchy?: string;
      // 🆕 COMPLETE nearby elements context
      nearbyElementsComplete?: string;
      spatialRelationships?: string;
      interactionContext?: string;
    };
    page?: {
      performance?: string;
      seo?: string;
      accessibility?: string;
      meta?: string;
    };
    state?: {
      before?: string;
      after?: string;
      changes?: string;
      interactions?: string;
    };
    business?: {
      ecommerce?: string;
      conversion?: string;
      user?: string;
      analytics?: string;
      // 🆕 SIMPLIFIED BEHAVIOR PATTERNS  
      behaviorPatterns?: string;
    };
    technical?: {
      selectors?: string;
      timing?: string;
      network?: string;
      errors?: string;
    };
    
    // 🛤️ JOURNEY-SPECIFIC CONTEXT PROPERTIES
    journeyGoal?: string;
    journeyLength?: number;
    funnelStages?: string[];
    decisionFactors?: string[];
    userIntent?: string;
  };
  quality: {
    score: number;
    factors: {
      // Core factors
      hasReliableSelector: boolean;
      hasSpatialContext: boolean;
      hasBusinessContext: boolean;
      hasVisualContext: boolean;
      
      // 🆕 COMPREHENSIVE quality factors
      hasAccessibilityContext: boolean;
      hasPerformanceContext: boolean;
      hasStateContext: boolean;
      hasFormContext: boolean;
      hasSEOContext: boolean;
      hasAnalyticsContext: boolean;
      hasTimingContext: boolean;
      hasNetworkContext: boolean;
      hasErrorContext: boolean;
      hasUserContext: boolean;
      
      // 🆕 NEW ENHANCED DATA QUALITY FACTORS
      hasCompleteNearbyElements: boolean;
      hasDesignSystemContext: boolean;
      hasBehaviorPatternsContext: boolean;
      
      // 🛤️ JOURNEY-SPECIFIC QUALITY FACTORS
      multiStepJourney?: boolean;
      funnelProgression?: boolean;
      conversionComplete?: boolean;
      clearUserIntent?: boolean;
      journeyPrioritized?: boolean;
    };
  };
  // 🆕 RAW DATA preservation for debugging and analysis
  rawData?: {
    originalInteraction: any;
    processingTime: number;
    dataCompletion: number; // % of available fields populated
    enhancementFlags: string[];
  };
  
  // 🛤️ JOURNEY METADATA for journey-based training
  journeyMetadata?: {
    journeyType: string;
    journeyGoal: string;
    userIntent: string;
    stepNumber: number;
    totalSteps: number;
    isJourneyStart: boolean;
    isJourneyEnd: boolean;
    journeyProgress: string;
  };
}

export interface TrainingDataResult {
  examples: TrainingExample[];
  metadata: {
    totalExamples: number;
    qualityDistribution: {
      high: number;    // >= 0.8
      medium: number;  // 0.5-0.8  
      low: number;     // < 0.5
    };
    contextTypes: {
      spatial: number;
      visual: number;
      business: number;
      dom: number;
    };
  };
  processing: {
    startTime: number;
    endTime: number;
    duration: number;
    selectorEnhancements: number;
    contextEnhancements: number;
  };
}

export type ExampleType = 'fine_tuning' | 'sequence' | 'task_driven';

export interface PsychologyInsight {
  category: string;
  insight: string;
  confidence: number;
  source: string;
}

export interface BusinessContext {
  sector?: string;
  userIntent?: string;
  conversionStage?: string;
  pageFunction?: string;
}