/**
 * Training Data Transformer Tests - COMPREHENSIVE DATA VALIDATION
 * 
 * Tests the complete overhaul from generic training data to rich contextual examples
 * Success Metric: No more "element" selectors, dramatic quality improvement
 */

import { TrainingDataTransformerImpl } from '../training-data-transformer';
import { SelectorStrategyServiceImpl } from '../../selectors/selector-strategy';
import { EnhancedInteractionData, TrainingExample } from '../../../types/training-types';

describe('COMPREHENSIVE Training Data Transformer', () => {
  let transformer: TrainingDataTransformerImpl;
  let selectorStrategy: SelectorStrategyServiceImpl;

  beforeEach(() => {
    selectorStrategy = new SelectorStrategyServiceImpl();
    transformer = new TrainingDataTransformerImpl(selectorStrategy);
  });

  describe('🎯 REAL NORDSTROM DATA - Complete Context Extraction', () => {
    it('should create rich training examples with ALL comprehensive data', () => {
      // Simulated comprehensive Nordstrom interaction with ALL data types
      const comprehensiveInteraction: EnhancedInteractionData = {
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
            x: 320,
            y: 180,
            width: 100,
            height: 35,
            top: 180,
            left: 320,
            bottom: 215,
            right: 420
          },
          positioning: {
            zIndex: 10,
            visibility: "visible",
            opacity: 1
          },
          colors: {
            background: "#ffffff",
            text: "#000000",
            border: "#e1e5e9"
          },
          typography: {
            fontSize: "14px",
            fontFamily: "BrandonText",
            fontWeight: "600"
          },
          layout: {
            display: "flex",
            position: "absolute",
            flexDirection: "row"
          },
          animations: {
            hasAnimations: true,
            animationType: "hover-scale",
            duration: 200
          },
          deviceType: "desktop",
          // 🆕 DESIGN SYSTEM CONTEXT
          designSystem: {
            componentLibrary: "custom-nordstrom",
            brandColors: {
              primary: "#000000",
              secondary: "#666666", 
              accent: "#0066cc",
              background: "#ffffff"
            },
            designTokens: {
              "--spacing-sm": "8px",
              "--border-radius": "4px",
              "--font-family": "BrandonText"
            },
            designPatterns: ["card", "button", "modal", "grid"],
            uiFramework: "React",
            cssFramework: "custom"
          }
        },
        element: {
          tag: "button",
          text: "Quick View",
          attributes: {
            "class": "tmRsy psaSN",
            "data-testid": "quick-view",
            "aria-label": "Quick View"
          },
          nearbyElements: [
            {
              selector: ".price",
              text: "$89.00",
              relationship: "above",
              distance: 15,
              boundingBox: { x: 320, y: 160, width: 60, height: 18 },
              // 🆕 COMPLETE nearby elements data
              zIndex: 1,
              isVisible: true,
              isClickable: false,
              elementType: "text",
              ariaRole: "text",
              attributes: { "class": "price", "data-testid": "price-display" }
            },
            {
              selector: ".add-to-cart",
              text: "Add to Bag",
              relationship: "right",
              distance: 120,
              boundingBox: { x: 450, y: 180, width: 90, height: 35 },
              // 🆕 COMPLETE nearby elements data
              zIndex: 10,
              isVisible: true,
              isClickable: true,
              elementType: "button",
              ariaRole: "button",
              attributes: { "class": "add-to-cart", "aria-label": "Add to Shopping Bag" }
            },
            {
              selector: ".size-selector",
              text: "Size: M",
              relationship: "left",
              distance: 25,
              boundingBox: { x: 280, y: 180, width: 35, height: 35 },
              zIndex: 5,
              isVisible: true,
              isClickable: true,
              elementType: "select",
              ariaRole: "combobox"
            },
            {
              selector: ".wishlist-btn",
              text: "♡",
              relationship: "below",
              distance: 45,
              boundingBox: { x: 370, y: 225, width: 24, height: 24 },
              zIndex: 5,
              isVisible: true,
              isClickable: true,
              elementType: "button",
              ariaRole: "button"
            }
          ],
          computedStyles: {
            "background-color": "rgb(255, 255, 255)",
            "border": "1px solid rgb(225, 229, 233)",
            "cursor": "pointer"
          },
          classList: ["tmRsy", "psaSN"],
          ariaAttributes: {
            "aria-label": "Quick View",
            "role": "button"
          },
          isVisible: true,
          isInteractable: true,
          siblingElements: [
            {
              selector: ".wishlist-btn",
              text: "♡",
              position: "after",
              index: 1
            }
          ]
        },
        context: {
          pageTitle: "Women's Clothing - Nordstrom",
          pageUrl: "https://www.nordstrom.com/browse/women/clothing",
          pageType: "category",
          userJourney: "product-discovery",
          ancestors: [
            {
              tag: "div",
              classes: ["product-tile"],
              role: "listitem"
            },
            {
              tag: "section", 
              classes: ["product-grid"],
              role: "list"
            }
          ],
          performance: {
            loadTime: 1200,
            domContentLoaded: 800,
            firstContentfulPaint: 600,
            largestContentfulPaint: 1000
          },
          seo: {
            h1Tags: ["Women's Clothing"],
            h2Tags: ["New Arrivals", "Best Sellers"],
            canonicalUrl: "https://www.nordstrom.com/browse/women/clothing"
          },
          accessibility: {
            wcagLevel: "AA",
            ariaLandmarks: ["navigation", "main", "contentinfo"],
            colorContrast: { "text-background": 4.5 },
            keyboardNavigation: true
          },
          analytics: {
            gtmEvents: ["page_view", "product_impression"],
            customEvents: { "category_view": "women-clothing" }
          }
        },
        state: {
          before: {
            focused: ".search-input",
            scrollPosition: { x: 0, y: 400 },
            formData: { "search": "women's clothing" },
            activeModal: undefined,
            selectedTab: "clothing",
            loadingStates: []
          },
          after: {
            focused: ".quick-view-btn",
            scrollPosition: { x: 0, y: 400 },
            activeModal: "quick-view-modal"
          },
          changes: {
            urlChanged: false,
            domMutations: [
              {
                type: "added",
                selector: ".quick-view-modal",
                change: "modal opened"
              }
            ],
            networkRequests: [
              {
                url: "/api/product/123/quick-view",
                method: "GET",
                status: 200,
                duration: 150
              }
            ]
          }
        },
        interaction: {
          type: "click",
          timestamp: Date.now(),
          coordinates: { x: 370, y: 197 },
          timing: {
            startTime: 1000,
            endTime: 1150,
            duration: 150,
            delay: 0
          },
          input: {
            mouse: {
              button: "left",
              clickCount: 1
            }
          },
          triggeredBy: "user",
          confidence: 0.95
        },
        business: {
          ecommerce: {
            productId: "prod-123",
            productName: "Women's Sweater",
            productPrice: 89.00,
            productCategory: "women-clothing",
            cartValue: 0,
            inventoryStatus: "in-stock"
          },
          conversion: {
            funnelStage: "product-discovery",
            funnelPosition: 2,
            conversionGoal: "add-to-cart",
            abTestVariant: "control"
          },
          user: {
            sessionId: "sess-abc123",
            customerSegment: "returning-customer",
            previousInteractions: 5,
            timeOnSite: 320,
            referrerSource: "google-search",
            // 🆕 SIMPLIFIED BEHAVIOR PATTERNS - only what matters for web automation
            behaviorPatterns: {
              devicePreferences: ["desktop", "mobile"],
              commonInteractionPatterns: ["hover-before-click", "scroll-into-view"],
              navigationPreferences: ["browse-categories", "uses-search"]
            }
          }
        }
      };

      const examples = transformer.createFineTuningExamples(comprehensiveInteraction);

      console.log('\n🎯 COMPREHENSIVE TRAINING EXAMPLES:');
      examples.forEach((example, i) => {
        console.log(`\n--- EXAMPLE ${i + 1} ---`);
        console.log('PROMPT:', example.prompt);
        console.log('COMPLETION:', example.completion);
        console.log('QUALITY:', example.quality.score.toFixed(3));
        console.log('FACTORS:', Object.keys(example.quality.factors).filter(k => example.quality.factors[k as keyof typeof example.quality.factors]).join(', '));
        if (example.rawData) {
          console.log('DATA COMPLETION:', example.rawData.dataCompletion.toFixed(1) + '%');
          console.log('ENHANCEMENT FLAGS:', example.rawData.enhancementFlags.join(', '));
        }
      });

      // 🎯 CRITICAL: No generic "element" selectors
      const hasGenericElement = examples.some(ex => 
        ex.completion.includes("'element'") || ex.completion.includes('"element"')
      );
      expect(hasGenericElement).toBe(false);

      // 🎯 Should use high-reliability xpath selector
      const hasReliableSelector = examples.some(ex =>
        ex.completion.includes("//button[@class='tmRsy psaSN']")
      );
      expect(hasReliableSelector).toBe(true);

      // 🎯 Should create multiple comprehensive example types
      expect(examples.length).toBeGreaterThanOrEqual(3);

      // 🎯 Should have high-quality examples with comprehensive data
      const highQualityExamples = examples.filter(ex => ex.quality.score >= 0.7);
      expect(highQualityExamples.length).toBeGreaterThanOrEqual(2);

      // 🎯 Should include comprehensive context categories
      const hasVisualContext = examples.some(ex => ex.context.visual);
      const hasBusinessContext = examples.some(ex => ex.context.business);
      const hasPageContext = examples.some(ex => ex.context.page);
      const hasTechnicalContext = examples.some(ex => ex.context.technical);
      
      expect(hasVisualContext).toBe(true);
      expect(hasBusinessContext).toBe(true);
      expect(hasPageContext).toBe(true);
      expect(hasTechnicalContext).toBe(true);

      // 🎯 Should track comprehensive quality factors INCLUDING NEW ENHANCED DATA
      const comprehensiveFactors = examples[0].quality.factors;
      expect(comprehensiveFactors.hasReliableSelector).toBe(true);
      expect(comprehensiveFactors.hasVisualContext).toBe(true);
      expect(comprehensiveFactors.hasBusinessContext).toBe(true);
      expect(comprehensiveFactors.hasAccessibilityContext).toBe(true);
      expect(comprehensiveFactors.hasPerformanceContext).toBe(true);
      
      // 🆕 NEW ENHANCED DATA QUALITY FACTORS
      expect(comprehensiveFactors.hasCompleteNearbyElements).toBe(true); // 4 nearby elements > 3
      expect(comprehensiveFactors.hasDesignSystemContext).toBe(true);     // Design system included
      expect(comprehensiveFactors.hasBehaviorPatternsContext).toBe(true); // Behavior patterns included

      console.log('\n🆕 NEW ENHANCED DATA QUALITY FACTORS:');
      console.log('Complete Nearby Elements:', comprehensiveFactors.hasCompleteNearbyElements);
      console.log('Design System Context:', comprehensiveFactors.hasDesignSystemContext);
      console.log('Behavior Patterns:', comprehensiveFactors.hasBehaviorPatternsContext);
    });

    it('should generate end-to-end training data with comprehensive metadata', async () => {
      const simpleInteraction: EnhancedInteractionData = {
        selectors: {
          primary: ".search-btn",
          reliability: { ".search-btn": 0.8 }
        },
        element: {
          text: "Search",
          nearbyElements: [{ selector: ".search-input", text: "", relationship: "left", distance: 10 }]
        },
        visual: {
          boundingBox: { x: 100, y: 50, width: 80, height: 32 }
        },
        context: {
          pageUrl: "https://www.nordstrom.com",
          pageType: "homepage",
          performance: { loadTime: 1000 }
        },
        interaction: {
          type: "click",
          timestamp: Date.now(),
          timing: { duration: 100, startTime: 0, endTime: 100 }
        },
        business: {
          ecommerce: { productName: "Search", productPrice: 0, productCategory: "navigation" }
        },
        state: {
          before: { focused: ".search-input" }
        }
      };

      const result = await transformer.generateTrainingData('test-session', [simpleInteraction]);

      console.log('\n🎯 TRAINING DATA RESULT:');
      console.log('Total Examples:', result.examples.length);
      console.log('Quality Distribution:', result.metadata.qualityDistribution);
      console.log('Context Types:', result.metadata.contextTypes);
      console.log('Processing Time:', result.processing.duration + 'ms');
      console.log('Enhancements:', result.processing.selectorEnhancements, 'selectors,', result.processing.contextEnhancements, 'context');

      expect(result.examples.length).toBeGreaterThan(0);
      expect(result.metadata.totalExamples).toBe(result.examples.length);
      expect(result.processing.duration).toBeGreaterThan(0);
      expect(result.processing.selectorEnhancements).toBe(1); // Has reliability scores
      expect(result.processing.contextEnhancements).toBe(1); // Has visual.boundingBox
      
      // Should filter out low-quality examples
      const allHighQuality = result.examples.every(ex => ex.quality.score >= 0.5);
      expect(allHighQuality).toBe(true);
    });
  });

  describe('🚀 BEFORE vs AFTER Quality Comparison', () => {
    it('should demonstrate dramatic quality improvement from generic to comprehensive', () => {
      // BEFORE: Minimal data (like old system)
      const genericInteraction: EnhancedInteractionData = {
        selectors: {
          primary: "button"
          // No reliability scores
        },
        element: {
          text: "" // Empty text
        },
        context: {
          pageUrl: "https://example.com"
        },
        interaction: {
          type: "click",
          timestamp: Date.now()
        },
        visual: {},
        state: {}
      };

      // AFTER: Rich comprehensive data  
      const richInteraction: EnhancedInteractionData = {
        selectors: {
          xpath: "//button[@data-testid='submit']",
          primary: ".submit-btn",
          reliability: { "//button[@data-testid='submit']": 0.9, ".submit-btn": 0.7 }
        },
        element: {
          text: "Submit Order",
          nearbyElements: [
            { selector: ".total-price", text: "$156.99", relationship: "above", distance: 20 }
          ]
        },
        visual: {
          boundingBox: { x: 400, y: 500, width: 120, height: 40 }
        },
        context: {
          pageUrl: "https://nordstrom.com/checkout",
          pageType: "checkout",
          performance: { loadTime: 800 }
        },
        interaction: {
          type: "click",
          timestamp: Date.now(),
          timing: { duration: 50, startTime: 0, endTime: 50 }
        },
        business: {
          ecommerce: { productName: "Order", productPrice: 156.99, productCategory: "checkout" },
          conversion: { funnelStage: "conversion", funnelPosition: 5 }
        },
        state: {
          before: { formData: { "email": "user@test.com", "address": "123 Main St" } }
        }
      };

      const genericExamples = transformer.createFineTuningExamples(genericInteraction);
      const richExamples = transformer.createFineTuningExamples(richInteraction);

      console.log('\n📊 QUALITY COMPARISON:');
      console.log('Generic Examples:', genericExamples.length);
      console.log('Rich Examples:', richExamples.length);
      
      if (genericExamples.length > 0) {
        console.log('Generic Quality:', genericExamples[0].quality.score.toFixed(3));
      }
      if (richExamples.length > 0) {
        console.log('Rich Quality:', richExamples[0].quality.score.toFixed(3));
      }

      // Rich examples should be higher quality and more numerous
      expect(richExamples.length).toBeGreaterThanOrEqual(genericExamples.length);
      
      if (richExamples.length > 0 && genericExamples.length > 0) {
        expect(richExamples[0].quality.score).toBeGreaterThan(genericExamples[0].quality.score);
      }

      // Rich examples should have better selectors
      const richHasReliableSelectors = richExamples.some(ex => 
        !ex.completion.includes("'element'") && !ex.completion.includes('"element"')
      );
      expect(richHasReliableSelectors).toBe(true);
    });
  });

  describe('🎯 SUCCESS METRICS - Zero Generic Elements', () => {
    it('should NEVER generate training examples with generic element selectors', async () => {
      const interactions = [
        {
          selectors: {
            xpath: "//input[@id='search-field']",
            primary: "#search-field",
            reliability: { "#search-field": 0.7, "//input[@id='search-field']": 0.8 }
          },
          element: { text: "", tag: "input" },
          context: { pageUrl: "https://nordstrom.com", pageType: "search" },
          interaction: { type: "input", timestamp: Date.now() },
          visual: { boundingBox: { x: 100, y: 100, width: 200, height: 30 } },
          state: {}
        },
        {
          selectors: {
            cssPath: ".checkout-btn",
            reliability: { ".checkout-btn": 0.9 }
          },
          element: { text: "Checkout", tag: "button" },
          context: { pageUrl: "https://nordstrom.com/cart", pageType: "cart" },
          interaction: { type: "click", timestamp: Date.now() },
          visual: {},
          state: {}
        }
      ];

      const result = await transformer.generateTrainingData('test-session', interactions);

      // 🚨 CRITICAL SUCCESS METRIC: NO GENERIC ELEMENTS
      const hasGenericElement = result.examples.some(example => 
        example.completion.includes("'element'") || example.completion.includes('"element"')
      );
      
      console.log('\n✅ SUCCESS METRIC CHECK:');
      console.log('Total Examples Generated:', result.examples.length);
      console.log('Contains Generic "element" Selectors:', hasGenericElement);
      console.log('Average Quality Score:', 
        result.examples.length > 0 ? 
        (result.examples.reduce((sum, ex) => sum + ex.quality.score, 0) / result.examples.length).toFixed(3) : 
        'N/A'
      );
      
      expect(hasGenericElement).toBe(false);
      expect(result.examples.length).toBeGreaterThan(0);
      
      // All examples should use reliable selectors
      result.examples.forEach(example => {
        expect(example.completion).not.toMatch(/['"]element['"]/);
      });
    });
  });
});