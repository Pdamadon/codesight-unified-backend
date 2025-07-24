/**
 * JOURNEY-BASED TRAINING DATA
 * 
 * This shows how to capture the complete user journey to teach the AI
 * the navigation path, decision points, and context that leads to each interaction.
 */

import { OpenAIIntegrationService } from '../services/openai-integration-clean';

async function createJourneyBasedTraining() {
  console.log('🛤️ JOURNEY-BASED TRAINING EXAMPLE');
  console.log('=====================================\n');

  const openaiService = new OpenAIIntegrationService();

  // 🛤️ COMPLETE USER JOURNEY: From homepage to "Add to Cart"
  const completeJourney = [
    
    // 🏠 STEP 1: Homepage - User starts browsing
    {
      journeyStep: 1,
      journeyStage: "discovery",
      journeyGoal: "find-headphones",
      selectors: {
        xpath: "//input[@placeholder='Search products...']",
        primary: ".search-input",
        reliability: { "//input[@placeholder='Search products...']": 0.92 }
      },
      element: {
        text: "",
        placeholder: "Search products...",
        nearbyElements: [
          { selector: ".search-btn", text: "Search", relationship: "right", distance: 10 },
          { selector: ".categories", text: "Electronics", relationship: "below", distance: 50 },
          { selector: ".hero-banner", text: "50% Off Headphones!", relationship: "above", distance: 80 }
        ]
      },
      interaction: { type: "input", value: "wireless headphones" },
      context: {
        pageTitle: "TechStore - Electronics & Gadgets",
        pageUrl: "https://techstore.com/",
        pageType: "homepage",
        userJourney: "product-search-start"
      },
      // 🧠 Journey context - WHY user is here
      journeyContext: {
        userIntent: "searching for wireless headphones",
        triggerEvent: "saw hero banner advertising 50% off headphones",
        previousPage: "google search results",
        searchQuery: "best wireless headphones 2024",
        decisionFactors: ["price", "reviews", "brand reputation"],
        timeSpentOnPage: 15,
        scrollBehavior: "viewed hero banner, scrolled to see categories"
      },
      business: {
        conversion: { funnelStage: "awareness", funnelPosition: 1 },
        user: {
          behaviorPatterns: {
            commonInteractionPatterns: ["reads-hero-banners", "uses-search-immediately"],
            navigationPreferences: ["direct-search", "avoids-browsing-categories"]
          }
        }
      }
    },

    // 🔍 STEP 2: Search Results - User evaluates options
    {
      journeyStep: 2,
      journeyStage: "consideration", 
      journeyGoal: "evaluate-headphone-options",
      selectors: {
        xpath: "//div[@class='product-card'][1]//h3[@class='product-title']",
        primary: ".product-card:first-child .product-title",
        reliability: { "//div[@class='product-card'][1]//h3[@class='product-title']": 0.89 }
      },
      element: {
        text: "Wireless Headphones Pro",
        nearbyElements: [
          { selector: ".price", text: "$149.99", relationship: "below", distance: 20 },
          { selector: ".rating", text: "★★★★☆ (127)", relationship: "below", distance: 35 },
          { selector: ".quick-view", text: "Quick View", relationship: "below", distance: 50 },
          { selector: ".product-image", text: "", relationship: "above", distance: 15 }
        ]
      },
      interaction: { type: "click" },
      context: {
        pageTitle: "Search Results: wireless headphones - TechStore",
        pageUrl: "https://techstore.com/search?q=wireless+headphones",
        pageType: "search-results",
        userJourney: "product-evaluation"
      },
      // 🧠 Journey context - Decision making process
      journeyContext: {
        userIntent: "comparing wireless headphones options",
        searchResults: 24,
        sortedBy: "relevance",
        filtersApplied: [],
        viewedProducts: ["Wireless Headphones Pro", "BeatsBuds Elite", "SonyMax 1000"],
        comparisonCriteria: ["price range $100-200", "good reviews", "noise cancellation"],
        timeSpentOnPage: 45,
        scrollBehavior: "viewed first 6 products, compared prices and ratings",
        decisionTrigger: "high rating (4.3 stars) and competitive price"
      },
      business: {
        conversion: { funnelStage: "consideration", funnelPosition: 2 },
        user: {
          behaviorPatterns: {
            commonInteractionPatterns: ["compares-multiple-products", "reads-ratings-first", "price-conscious"],
            navigationPreferences: ["uses-product-cards", "avoids-filters", "sorts-by-reviews"]
          }
        }
      }
    },

    // 📱 STEP 3: Product Page - User researches details
    {
      journeyStep: 3,
      journeyStage: "evaluation",
      journeyGoal: "research-product-details",
      selectors: {
        xpath: "//button[@class='tab-btn'][text()='Reviews']",
        primary: ".tab-btn[data-tab='reviews']",
        reliability: { "//button[@class='tab-btn'][text()='Reviews']": 0.94 }
      },
      element: {
        text: "Reviews",
        nearbyElements: [
          { selector: ".tab-btn[data-tab='specs']", text: "Specifications", relationship: "left", distance: 120 },
          { selector: ".tab-btn[data-tab='details']", text: "Details", relationship: "left", distance: 240 },
          { selector: ".review-summary", text: "4.3/5 (127 reviews)", relationship: "below", distance: 30 }
        ]
      },
      interaction: { type: "click" },
      context: {
        pageTitle: "Wireless Headphones Pro - TechStore",
        pageUrl: "https://techstore.com/products/wireless-headphones-pro",
        pageType: "product",
        userJourney: "product-research"
      },
      // 🧠 Journey context - Deep research phase
      journeyContext: {
        userIntent: "researching product quality through reviews",
        previousActions: ["viewed product images", "read key features", "checked price"],
        activeTab: "details",
        timeSpentOnProduct: 180,
        scrollBehavior: "read full description, viewed all product images",
        informationGathered: {
          keyFeatures: ["noise cancellation", "30hr battery", "wireless charging"],
          priceComparison: "competitive with similar products",
          brandReputation: "established tech brand"
        },
        decisionFactors: ["need to verify quality through reviews", "want to see real user experiences"],
        hesitationPoints: ["price is at upper budget limit", "want to confirm noise cancellation quality"]
      },
      business: {
        conversion: { funnelStage: "evaluation", funnelPosition: 3 },
        user: {
          behaviorPatterns: {
            commonInteractionPatterns: ["thorough-researcher", "reads-reviews-before-buying", "compares-features"],
            navigationPreferences: ["uses-tabs", "reads-specifications", "checks-reviews"]
          }
        }
      }
    },

    // 📝 STEP 4: Reviews Tab - User validates decision
    {
      journeyStep: 4,
      journeyStage: "validation",
      journeyGoal: "validate-purchase-decision",
      selectors: {
        xpath: "//div[@class='review-item'][1]//button[@class='helpful-btn']",
        primary: ".review-item:first-child .helpful-btn",
        reliability: { "//div[@class='review-item'][1]//button[@class='helpful-btn']": 0.87 }
      },
      element: {
        text: "Helpful (23)",
        nearbyElements: [
          { selector: ".review-rating", text: "★★★★★", relationship: "above", distance: 25 },
          { selector: ".review-text", text: "Amazing noise cancellation...", relationship: "above", distance: 40 },
          { selector: ".review-author", text: "TechLover2024", relationship: "above", distance: 55 }
        ]
      },
      interaction: { type: "click" },
      context: {
        pageTitle: "Wireless Headphones Pro - Reviews - TechStore",
        pageUrl: "https://techstore.com/products/wireless-headphones-pro#reviews",
        pageType: "product-reviews",
        userJourney: "purchase-validation"
      },
      // 🧠 Journey context - Final validation
      journeyContext: {
        userIntent: "validating product quality through peer reviews",
        reviewsRead: 8,
        reviewInsights: {
          positivePatterns: ["excellent noise cancellation", "long battery life", "comfortable fit"],
          concerns: ["slightly expensive", "bass could be stronger"],
          overallSentiment: "highly positive (4.3/5 average)"
        },
        timeSpentOnReviews: 240,
        validationComplete: true,
        purchaseConfidence: "high",
        decisionTrigger: "consistently positive reviews about main feature (noise cancellation)"
      },
      business: {
        conversion: { funnelStage: "validation", funnelPosition: 4 },
        user: {
          behaviorPatterns: {
            commonInteractionPatterns: ["reads-multiple-reviews", "values-peer-opinions", "detail-oriented"],
            navigationPreferences: ["reads-top-reviews", "checks-helpful-votes", "looks-for-cons"]
          }
        }
      }
    },

    // 🛒 STEP 5: Add to Cart - User commits to purchase
    {
      journeyStep: 5,
      journeyStage: "conversion",
      journeyGoal: "complete-purchase-intent",
      selectors: {
        xpath: "//button[@data-testid='add-to-cart-btn']",
        cssPath: ".add-to-cart-button",
        primary: "[data-testid='add-to-cart-btn']",
        reliability: { "//button[@data-testid='add-to-cart-btn']": 0.95 }
      },
      element: {
        text: "Add to Cart",
        nearbyElements: [
          { selector: ".product-price", text: "$149.99", relationship: "above", distance: 35 },
          { selector: ".quantity-selector", text: "Qty: 1", relationship: "left", distance: 180 },
          { selector: ".shipping-info", text: "Free shipping on orders over $75", relationship: "below", distance: 25 },
          { selector: ".stock-status", text: "In Stock", relationship: "above", distance: 60 }
        ]
      },
      interaction: { type: "click" },
      context: {
        pageTitle: "Wireless Headphones Pro - TechStore",
        pageUrl: "https://techstore.com/products/wireless-headphones-pro",
        pageType: "product",
        userJourney: "purchase-commitment"
      },
      // 🧠 Journey context - Final conversion
      journeyContext: {
        userIntent: "purchasing wireless headphones after thorough research",
        journeyDuration: 480, // 8 minutes total
        confidenceLevel: "high",
        researchCompleted: {
          featuresValidated: true,
          priceAccepted: true,
          reviewsRead: 8,
          competitorsCompared: 3
        },
        conversionTriggers: [
          "positive reviews confirmed quality",
          "price within budget range",
          "features match requirements",
          "free shipping available"
        ],
        finalDecisionFactors: [
          "noise cancellation confirmed by reviews",
          "30hr battery life meets needs", 
          "competitive price point",
          "established brand trust"
        ]
      },
      business: {
        ecommerce: {
          productId: "WH-PRO-001",
          productName: "Wireless Headphones Pro",
          productPrice: 149.99,
          productCategory: "electronics"
        },
        conversion: { funnelStage: "conversion", funnelPosition: 5 },
        user: {
          behaviorPatterns: {
            commonInteractionPatterns: ["thorough-researcher", "validates-through-reviews", "price-conscious"],
            navigationPreferences: ["research-before-buying", "reads-specifications", "checks-shipping"]
          }
        }
      }
    }
  ];

  // 🎯 Generate journey-aware training data
  console.log('🎯 Generating journey-aware training data...');
  
  const journeyTrainingResult = await openaiService.generateTrainingData('journey-session-001', completeJourney);
  
  console.log('✅ Journey Training Data Generated:');
  console.log(`   Total Examples: ${journeyTrainingResult.examples.length}`);
  console.log(`   Journey Steps Covered: ${completeJourney.length}`);
  
  // Show journey-aware examples
  console.log('\n🛤️ JOURNEY-AWARE TRAINING EXAMPLES:');
  
  journeyTrainingResult.examples.slice(0, 3).forEach((example: any, i: number) => {
    console.log(`\n--- JOURNEY STEP ${i + 1} ---`);
    console.log('CONTEXT:', example.prompt.includes('discovery') ? 'Homepage Search' : 
                            example.prompt.includes('consideration') ? 'Product Comparison' :
                            example.prompt.includes('validation') ? 'Review Reading' : 'Add to Cart');
    console.log('PROMPT:', example.prompt.substring(0, 120) + '...');
    console.log('COMPLETION:', example.completion.substring(0, 120) + '...');
    console.log('QUALITY:', example.quality.score.toFixed(3));
  });

  // 🧠 Enhanced training with journey context
  console.log('\n🧠 JOURNEY INTELLIGENCE:');
  console.log('=====================================');
  console.log('The AI now learns:');
  console.log('✅ Complete user journey from discovery to conversion');
  console.log('✅ Decision factors at each step');
  console.log('✅ Context that leads to each interaction');
  console.log('✅ User research patterns and behavior');
  console.log('✅ Conversion triggers and validation points');
  console.log('✅ Time spent and scroll behavior at each stage');
  
  return journeyTrainingResult;
}

// 🎯 JOURNEY-AWARE MODEL OUTPUT
console.log('\n🎯 ENHANCED MODEL UNDERSTANDING:');
console.log('=====================================');
console.log('INPUT: "Help me buy wireless headphones"');
console.log('');
console.log('OUTPUT SEQUENCE:');
console.log('1. await page.fill(".search-input", "wireless headphones") // Discovery: user starts with search');
console.log('2. await page.click(".product-card:first-child .product-title") // Consideration: comparing options'); 
console.log('3. await page.click(".tab-btn[data-tab=\'reviews\']") // Validation: researching quality');
console.log('4. await page.click(".review-item:first-child .helpful-btn") // Validation: checking peer opinions');
console.log('5. await page.click("[data-testid=\'add-to-cart-btn\']") // Conversion: final purchase decision');
console.log('');
console.log('💡 The AI understands the COMPLETE journey, not just individual clicks!');

export { createJourneyBasedTraining };