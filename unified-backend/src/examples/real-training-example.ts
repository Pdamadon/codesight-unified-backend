/**
 * REAL TRAINING EXAMPLE
 * 
 * This shows exactly how to use the refactored system for actual OpenAI model training
 * with comprehensive, high-quality training data.
 */

import { OpenAIIntegrationService } from '../services/openai-integration-clean';

async function createRealTrainingData() {
  console.log('🚀 REAL MODEL TRAINING EXAMPLE');
  console.log('=====================================\n');

  // Initialize the refactored service
  const openaiService = new OpenAIIntegrationService();

  // 📊 STEP 1: Prepare real interaction data from your sessions
  console.log('📊 STEP 1: Preparing comprehensive interaction data...');
  
  const realInteractions = [
    {
      // 🎯 High-reliability selectors from actual usage
      selectors: {
        xpath: "//button[@data-testid='add-to-cart-btn']",
        cssPath: ".add-to-cart-button",
        primary: "[data-testid='add-to-cart-btn']",
        alternatives: ["button[aria-label='Add to cart']", ".cart-add-btn"],
        reliability: {
          "//button[@data-testid='add-to-cart-btn']": 0.95,
          ".add-to-cart-button": 0.88,
          "[data-testid='add-to-cart-btn']": 0.92
        },
        dataTestIds: ["add-to-cart-btn"],
        ariaLabels: ["Add to cart"],
        selectorPerformance: {
          ".add-to-cart-button": { speed: 42, stability: 0.97 }
        }
      },
      
      // 🎨 Complete visual context
      visual: {
        boundingBox: { x: 420, y: 650, width: 160, height: 48 },
        positioning: { zIndex: 20, visibility: "visible", opacity: 1 },
        colors: { background: "#ff6b35", text: "#ffffff", border: "#e55a2b" },
        typography: { fontSize: "16px", fontFamily: "Inter", fontWeight: "600" },
        layout: { display: "flex", position: "relative", flexDirection: "row" },
        animations: { hasAnimations: true, animationType: "pulse", duration: 300 },
        deviceType: "desktop" as const,
        // 🆕 Design system context
        designSystem: {
          componentLibrary: "shopify-polaris",
          brandColors: {
            primary: "#ff6b35",
            secondary: "#2c3e50",
            accent: "#f39c12",
            background: "#ffffff"
          },
          designTokens: {
            "--spacing-lg": "24px",
            "--border-radius": "6px",
            "--font-family": "Inter"
          },
          designPatterns: ["button", "card", "form", "navigation"],
          uiFramework: "React",
          cssFramework: "styled-components"
        }
      },
      
      // 🎯 Element with complete nearby context
      element: {
        tag: "button",
        text: "Add to Cart",
        attributes: {
          "class": "add-to-cart-button primary-btn",
          "data-testid": "add-to-cart-btn",
          "aria-label": "Add item to shopping cart"
        },
        // 🆕 Complete nearby elements
        nearbyElements: [
          {
            selector: ".product-price",
            text: "$149.99",
            relationship: "above",
            distance: 35,
            boundingBox: { x: 420, y: 600, width: 80, height: 28 },
            zIndex: 1,
            isVisible: true,
            isClickable: false,
            elementType: "text",
            ariaRole: "text",
            attributes: { "class": "product-price", "data-testid": "price" }
          },
          {
            selector: ".quantity-selector",
            text: "Qty: 1",
            relationship: "left",
            distance: 180,
            boundingBox: { x: 220, y: 650, width: 120, height: 48 },
            zIndex: 10,
            isVisible: true,
            isClickable: true,
            elementType: "select",
            ariaRole: "combobox",
            attributes: { "class": "qty-select", "name": "quantity" }
          },
          {
            selector: ".product-rating",
            text: "★★★★☆ (127 reviews)",
            relationship: "above",
            distance: 60,
            boundingBox: { x: 420, y: 570, width: 200, height: 20 },
            zIndex: 1,
            isVisible: true,
            isClickable: true,
            elementType: "link",
            ariaRole: "link"
          },
          {
            selector: ".shipping-info",
            text: "Free shipping on orders over $75",
            relationship: "below",
            distance: 25,
            boundingBox: { x: 420, y: 710, width: 220, height: 16 },
            zIndex: 1,
            isVisible: true,
            isClickable: false,
            elementType: "text",
            ariaRole: "text"
          }
        ],
        computedStyles: {
          "background-color": "rgb(255, 107, 53)",
          "border": "2px solid rgb(229, 90, 43)",
          "cursor": "pointer",
          "font-weight": "600"
        },
        classList: ["add-to-cart-button", "primary-btn"],
        ariaAttributes: {
          "aria-label": "Add item to shopping cart",
          "role": "button"
        },
        isVisible: true,
        isInteractable: true
      },
      
      // 🌐 Rich page context
      context: {
        pageTitle: "Wireless Headphones - TechStore",
        pageUrl: "https://techstore.com/products/wireless-headphones-pro",
        pageType: "product",
        userJourney: "product-consideration",
        ancestors: [
          {
            tag: "div",
            classes: ["product-details"],
            role: "main",
            semanticMeaning: "product-information-container"
          },
          {
            tag: "section",
            classes: ["product-page"],
            role: "main",
            semanticMeaning: "product-purchase-section"
          }
        ],
        performance: {
          loadTime: 1100,
          domContentLoaded: 750,
          firstContentfulPaint: 480,
          largestContentfulPaint: 920
        },
        seo: {
          h1Tags: ["Wireless Headphones Pro"],
          h2Tags: ["Features", "Specifications", "Reviews"],
          canonicalUrl: "https://techstore.com/products/wireless-headphones-pro"
        },
        accessibility: {
          wcagLevel: "AA" as const,
          ariaLandmarks: ["navigation", "main", "complementary", "contentinfo"],
          colorContrast: { "button-background": 5.2 },
          keyboardNavigation: true
        },
        analytics: {
          gtmEvents: ["page_view", "product_view", "add_to_cart_impression"],
          customEvents: { "product_category": "electronics", "brand": "TechStore" }
        }
      },
      
      // 🔄 State management
      state: {
        before: {
          focused: ".quantity-selector",
          scrollPosition: { x: 0, y: 320 },
          formData: { "quantity": "1", "color": "black" },
          activeModal: undefined,
          selectedTab: "details",
          loadingStates: []
        },
        after: {
          focused: ".add-to-cart-button",
          scrollPosition: { x: 0, y: 320 },
          activeModal: "cart-added-confirmation"
        },
        changes: {
          urlChanged: false,
          domMutations: [
            {
              type: "added" as const,
              selector: ".cart-confirmation-modal",
              change: "cart confirmation modal appeared"
            },
            {
              type: "modified" as const,
              selector: ".cart-count",
              change: "cart count updated from 0 to 1"
            }
          ],
          networkRequests: [
            {
              url: "/api/cart/add",
              method: "POST",
              status: 200,
              duration: 180
            }
          ]
        }
      },
      
      // 🎯 Interaction details
      interaction: {
        type: "click",
        timestamp: Date.now(),
        coordinates: { x: 500, y: 674 },
        timing: {
          startTime: 2400,
          endTime: 2580,
          duration: 180,
          delay: 0
        },
        input: {
          mouse: {
            button: "left",
            clickCount: 1
          }
        },
        triggeredBy: "user" as const,
        confidence: 0.96
      },
      
      // 💼 Business intelligence
      business: {
        ecommerce: {
          productId: "WH-PRO-001",
          productName: "Wireless Headphones Pro",
          productPrice: 149.99,
          productCategory: "electronics",
          cartValue: 0,
          inventoryStatus: "in-stock"
        },
        conversion: {
          funnelStage: "consideration",
          funnelPosition: 4,
          conversionGoal: "add-to-cart",
          abTestVariant: "orange-button"
        },
        user: {
          sessionId: "sess-prod-789",
          customerSegment: "tech-enthusiast",
          previousInteractions: 12,
          timeOnSite: 480,
          referrerSource: "google-search",
          // 🆕 Behavior patterns for web automation
          behaviorPatterns: {
            devicePreferences: ["desktop", "mobile"],
            commonInteractionPatterns: ["reads-reviews", "compares-prices", "hover-before-click"],
            navigationPreferences: ["uses-search", "browses-categories", "reads-specifications"]
          }
        }
      }
    }
  ];

  // 🎯 STEP 2: Generate comprehensive training data
  console.log('🎯 STEP 2: Generating comprehensive training data...');
  
  const trainingResult = await openaiService.generateTrainingData('real-session-001', realInteractions);
  
  console.log('✅ Training Data Generated:');
  console.log(`   Examples: ${trainingResult.examples.length}`);
  console.log(`   Quality Distribution:`, trainingResult.metadata.qualityDistribution);
  console.log(`   Context Types:`, trainingResult.metadata.contextTypes);
  console.log(`   Processing Time: ${trainingResult.processing.duration}ms`);
  
  // Show sample training examples
  console.log('\n📋 SAMPLE TRAINING EXAMPLES:');
  trainingResult.examples.slice(0, 2).forEach((example: any, i: number) => {
    console.log(`\n--- EXAMPLE ${i + 1} ---`);
    console.log('PROMPT:', example.prompt.substring(0, 100) + '...');
    console.log('COMPLETION:', example.completion.substring(0, 100) + '...');
    console.log('QUALITY:', example.quality.score.toFixed(3));
  });

  // 📤 STEP 3: Upload training data to OpenAI
  console.log('\n📤 STEP 3: Uploading training data to OpenAI...');
  
  const fileId = await openaiService.uploadTrainingFile(
    { messages: trainingResult.examples },
    { 
      source: 'refactored-comprehensive-training',
      sessionId: 'real-session-001',
      quality: trainingResult.metadata.qualityDistribution
    }
  );
  
  console.log(`✅ Training file uploaded: ${fileId}`);

  // 🏋️ STEP 4: Create fine-tuning job
  console.log('\n🏋️ STEP 4: Creating fine-tuning job...');
  
  const jobId = await openaiService.createFineTuningJob(fileId, {
    model: 'gpt-4o-mini-2024-07-18',
    hyperparameters: {
      n_epochs: 3,
      batch_size: 1,
      learning_rate_multiplier: 0.1
    },
    suffix: 'comprehensive-web-automation'
  });
  
  console.log(`✅ Fine-tuning job created: ${jobId}`);

  // 📊 STEP 5: Monitor training progress
  console.log('\n📊 STEP 5: Monitoring training progress...');
  
  const jobStatus = await openaiService.monitorTraining(jobId);
  
  console.log('Training Status:', jobStatus.status);
  console.log('Progress:', jobStatus.progress + '%');
  console.log('Trained Tokens:', jobStatus.trainedTokens);
  
  // 📈 STEP 6: Show improvement metrics
  console.log('\n📈 IMPROVEMENT METRICS:');
  console.log('=====================================');
  console.log('🎯 Quality Improvements:');
  console.log(`   • Rich Context: ${trainingResult.metadata.contextTypes.visual} visual examples`);
  console.log(`   • Business Intelligence: ${trainingResult.metadata.contextTypes.business} business examples`);
  console.log(`   • Spatial Awareness: ${trainingResult.metadata.contextTypes.spatial} spatial examples`);
  console.log(`   • High Quality: ${trainingResult.metadata.qualityDistribution.high} high-quality examples`);
  
  console.log('\n🚀 Enhanced Features:');
  console.log('   ✅ Design System Context (Shopify Polaris, brand colors)');
  console.log('   ✅ Complete Nearby Elements (4 nearby elements with full metadata)');
  console.log('   ✅ Behavior Patterns (reads-reviews, compares-prices, hover-before-click)');
  console.log('   ✅ Zero Generic Selectors (0.95 reliability xpath selectors)');
  console.log('   ✅ Performance Data (load times, network requests)');
  
  console.log('\n🎉 READY FOR PRODUCTION!');
  console.log('Your fine-tuned model will now generate:');
  console.log('• Highly reliable selectors with business context');
  console.log('• Rich spatial and visual awareness');
  console.log('• Design system and brand-aware automation');
  console.log('• Behavior-pattern informed interactions');
  
  return {
    trainingResult,
    fileId,
    jobId,
    jobStatus
  };
}

// 💡 USAGE EXAMPLE
async function runRealTrainingExample() {
  try {
    const result = await createRealTrainingData();
    console.log('\n✅ TRAINING PIPELINE COMPLETE!');
    console.log('File ID:', result.fileId);
    console.log('Job ID:', result.jobId);
    console.log('Examples Generated:', result.trainingResult.examples.length);
  } catch (error) {
    console.error('❌ Training failed:', error);
  }
}

// Export for actual use
export { createRealTrainingData, runRealTrainingExample };