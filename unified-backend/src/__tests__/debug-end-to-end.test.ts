/**
 * DEBUG END-TO-END TEST
 * 
 * This test debugs why the end-to-end validation is returning 0 examples
 */

import { OpenAIIntegrationService } from '../services/openai-integration-clean';

// Mock OpenAI and Prisma (same as validation test)
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: jest.fn().mockResolvedValue({ choices: [{ message: { content: 'Mock analysis' } }] }) } },
    fineTuning: { jobs: { create: jest.fn(), retrieve: jest.fn(), list: jest.fn(), cancel: jest.fn() } },
    files: { create: jest.fn() }
  }))
}));

jest.mock('../lib/database', () => ({
  prisma: {
    visionAnalysisCache: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(), update: jest.fn(), deleteMany: jest.fn(),
      count: jest.fn().mockResolvedValue(10),
      aggregate: jest.fn().mockResolvedValue({ _sum: { hitCount: 50 } }),
      findMany: jest.fn().mockResolvedValue([]),
      createMany: jest.fn()
    }
  }
}));

describe('🔍 DEBUG END-TO-END', () => {
  let openaiService: OpenAIIntegrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    openaiService = new OpenAIIntegrationService();
  });

  it('should debug why end-to-end returns 0 examples', async () => {
    // Use EXACT SAME data that works in direct transformer test
    const workingInteraction = {
      selectors: {
        xpath: "//button[@class='tmRsy psaSN']",
        cssPath: ".tmRsy.psaSN",
        primary: ".quick-view-btn",
        alternatives: ["button[data-testid='quick-view']", "[aria-label='Quick View']"],
        reliability: {
          ".tmRsy.psaSN": 0.85,
          "//button[@class='tmRsy psaSN']": 0.90,
          "button[data-testid='quick-view']": 0.75,
          "[aria-label='Quick View']": 0.80
        },
        dataTestIds: ["quick-view"],
        ariaLabels: ["Quick View"],
        selectorPerformance: {
          ".tmRsy.psaSN": { speed: 50, stability: 0.95 }
        }
      },
      visual: {
        boundingBox: {
          x: 320, y: 180, width: 100, height: 35,
          top: 180, left: 320, bottom: 215, right: 420
        },
        positioning: { zIndex: 10, visibility: "visible", opacity: 1 },
        colors: { background: "#ffffff", text: "#000000", border: "#e1e5e9" },
        typography: { fontSize: "14px", fontFamily: "BrandonText", fontWeight: "600" },
        layout: { display: "flex", position: "absolute", flexDirection: "row" },
        animations: { hasAnimations: true, animationType: "hover-scale", duration: 200 },
        deviceType: "desktop",
        designSystem: {
          componentLibrary: "custom-nordstrom",
          brandColors: { primary: "#000000", secondary: "#666666", accent: "#0066cc", background: "#ffffff" },
          designTokens: { "--spacing-sm": "8px", "--border-radius": "4px", "--font-family": "BrandonText" },
          designPatterns: ["card", "button", "modal", "grid"],
          uiFramework: "React",
          cssFramework: "custom"
        }
      },
      element: {
        tag: "button",
        text: "Quick View",
        attributes: { "class": "tmRsy psaSN", "data-testid": "quick-view", "aria-label": "Quick View" },
        nearbyElements: [
          {
            selector: ".price", text: "$89.00", relationship: "above", distance: 15,
            boundingBox: { x: 320, y: 160, width: 60, height: 18 },
            zIndex: 1, isVisible: true, isClickable: false, elementType: "text", ariaRole: "text",
            attributes: { "class": "price", "data-testid": "price-display" }
          },
          {
            selector: ".add-to-cart", text: "Add to Bag", relationship: "right", distance: 120,
            boundingBox: { x: 450, y: 180, width: 90, height: 35 },
            zIndex: 10, isVisible: true, isClickable: true, elementType: "button", ariaRole: "button",
            attributes: { "class": "add-to-cart", "aria-label": "Add to Shopping Bag" }
          },
          {
            selector: ".size-selector", text: "Size: M", relationship: "left", distance: 25,
            boundingBox: { x: 280, y: 180, width: 35, height: 35 },
            zIndex: 5, isVisible: true, isClickable: true, elementType: "select", ariaRole: "combobox"
          },
          {
            selector: ".wishlist-btn", text: "♡", relationship: "below", distance: 45,
            boundingBox: { x: 370, y: 225, width: 24, height: 24 },
            zIndex: 5, isVisible: true, isClickable: true, elementType: "button", ariaRole: "button"
          }
        ],
        computedStyles: { "background-color": "rgb(255, 255, 255)", "border": "1px solid rgb(225, 229, 233)", "cursor": "pointer" },
        classList: ["tmRsy", "psaSN"],
        ariaAttributes: { "aria-label": "Quick View", "role": "button" },
        isVisible: true,
        isInteractable: true,
        siblingElements: [{ selector: ".wishlist-btn", text: "♡", position: "after", index: 1 }]
      },
      context: {
        pageTitle: "Women's Clothing - Nordstrom",
        pageUrl: "https://www.nordstrom.com/browse/women/clothing",
        pageType: "category",
        userJourney: "product-discovery",
        ancestors: [
          { tag: "div", classes: ["product-tile"], role: "listitem" },
          { tag: "section", classes: ["product-grid"], role: "list" }
        ],
        performance: { loadTime: 1200, domContentLoaded: 800, firstContentfulPaint: 600, largestContentfulPaint: 1000 },
        seo: { h1Tags: ["Women's Clothing"], h2Tags: ["New Arrivals", "Best Sellers"], canonicalUrl: "https://www.nordstrom.com/browse/women/clothing" },
        accessibility: { wcagLevel: "AA", ariaLandmarks: ["navigation", "main", "contentinfo"], colorContrast: { "text-background": 4.5 }, keyboardNavigation: true },
        analytics: { gtmEvents: ["page_view", "product_impression"], customEvents: { "category_view": "women-clothing" } }
      },
      state: {
        before: { focused: ".search-input", scrollPosition: { x: 0, y: 400 }, formData: { "search": "women's clothing" }, activeModal: undefined, selectedTab: "clothing", loadingStates: [] },
        after: { focused: ".quick-view-btn", scrollPosition: { x: 0, y: 400 }, activeModal: "quick-view-modal" },
        changes: {
          urlChanged: false,
          domMutations: [{ type: "added", selector: ".quick-view-modal", change: "modal opened" }],
          networkRequests: [{ url: "/api/product/123/quick-view", method: "GET", status: 200, duration: 150 }]
        }
      },
      interaction: {
        type: "click", timestamp: Date.now(), coordinates: { x: 370, y: 197 },
        timing: { startTime: 1000, endTime: 1150, duration: 150, delay: 0 },
        input: { mouse: { button: "left", clickCount: 1 } },
        triggeredBy: "user", confidence: 0.95
      },
      business: {
        ecommerce: { productId: "prod-123", productName: "Women's Sweater", productPrice: 89.00, productCategory: "women-clothing", cartValue: 0, inventoryStatus: "in-stock" },
        conversion: { funnelStage: "product-discovery", funnelPosition: 2, conversionGoal: "add-to-cart", abTestVariant: "control" },
        user: {
          sessionId: "sess-abc123", customerSegment: "returning-customer", previousInteractions: 5, timeOnSite: 320, referrerSource: "google-search",
          behaviorPatterns: {
            devicePreferences: ["desktop", "mobile"],
            commonInteractionPatterns: ["hover-before-click", "scroll-into-view"],
            navigationPreferences: ["browse-categories", "uses-search"]
          }
        }
      }
    };

    console.log('🔍 DEBUGGING: Testing end-to-end with EXACT working data...');
    
    // Test 1: Call directly through the facade
    const result = await openaiService.generateTrainingData('debug-test', [workingInteraction]);
    
    console.log('📊 END-TO-END RESULT:');
    console.log('Total Examples:', result.examples.length);
    console.log('Metadata:', result.metadata);
    console.log('Processing:', result.processing);
    
    if (result.examples.length === 0) {
      console.log('❌ NO EXAMPLES - investigating...');
      
      // Test 2: Access the transformer directly
      const directTransformer = openaiService.services.trainingTransformer;
      const directResult = await directTransformer.generateTrainingData('debug-direct', [workingInteraction]);
      
      console.log('📊 DIRECT TRANSFORMER RESULT:');
      console.log('Total Examples:', directResult.examples.length);
      console.log('Quality Distribution:', directResult.metadata.qualityDistribution);
      
      if (directResult.examples.length > 0) {
        console.log('✅ DIRECT TRANSFORMER WORKS');
        console.log('First Example Quality:', directResult.examples[0].quality.score);
        console.log('Quality Factors:', directResult.examples[0].quality.factors);
      } else {
        console.log('❌ DIRECT TRANSFORMER ALSO FAILS');
      }
    } else {
      console.log('✅ END-TO-END WORKS!');
    }

    // Test 3: Check if it's a quality filtering issue
    console.log('🔍 Checking quality thresholds...');
    
    expect(true).toBe(true); // Always pass - this is a debug test
  });
});