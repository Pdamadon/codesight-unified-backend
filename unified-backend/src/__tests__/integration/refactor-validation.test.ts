/**
 * COMPREHENSIVE REFACTOR VALIDATION TEST
 * 
 * This test validates that the entire 4-module refactor works correctly
 * and maintains backward compatibility while providing enhanced functionality.
 */

import { OpenAIIntegrationService } from '../../services/openai-integration-clean';

// Mock OpenAI for testing
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: {
                content: 'Mock analysis shows user exhibits analytical behavior with high trust levels and social influence.'
              }
            }]
          })
        }
      },
      fineTuning: {
        jobs: {
          create: jest.fn().mockResolvedValue({ id: 'job-123' }),
          retrieve: jest.fn().mockResolvedValue({ 
            status: 'running', 
            trained_tokens: 5000,
            created_at: Date.now() / 1000
          }),
          list: jest.fn().mockResolvedValue({ 
            data: [{ id: 'job-123', status: 'running', model: 'gpt-4o-mini' }] 
          }),
          cancel: jest.fn().mockResolvedValue({})
        }
      },
      files: {
        create: jest.fn().mockResolvedValue({ id: 'file-123' })
      }
    }))
  };
});

// Mock Prisma
jest.mock('../../lib/database', () => ({
  prisma: {
    visionAnalysisCache: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'cache-123' }),
      update: jest.fn().mockResolvedValue({ id: 'cache-123', hitCount: 1 }),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      count: jest.fn().mockResolvedValue(10),
      aggregate: jest.fn().mockResolvedValue({ _sum: { hitCount: 50 } }),
      findMany: jest.fn().mockResolvedValue([
        { screenshotId: 'test-1', analysisType: 'vision', hitCount: 25 }
      ]),
      createMany: jest.fn().mockResolvedValue({ count: 3 })
    }
  }
}));

describe('🚀 COMPREHENSIVE REFACTOR VALIDATION', () => {
  let openaiService: OpenAIIntegrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    openaiService = new OpenAIIntegrationService();
  });

  describe('✅ ARCHITECTURE VALIDATION', () => {
    it('should initialize all 4 modular services correctly', () => {
      console.log('🏗️ Architecture Validation:');
      
      const services = openaiService.services;
      
      expect(services.selectorStrategy).toBeDefined();
      expect(services.trainingTransformer).toBeDefined();
      expect(services.visionAnalysis).toBeDefined();
      expect(services.cacheManager).toBeDefined();
      
      console.log('✅ SelectorStrategy:', typeof services.selectorStrategy);
      console.log('✅ TrainingTransformer:', typeof services.trainingTransformer);
      console.log('✅ VisionAnalysis:', typeof services.visionAnalysis);
      console.log('✅ CacheManager:', typeof services.cacheManager);
    });

    it('should provide health check functionality', async () => {
      const health = await openaiService.healthCheck();
      
      console.log('\\n🔍 Health Check Results:');
      console.log('Status:', health.status);
      console.log('Services:', health.services);
      
      expect(health.status).toBe('healthy');
      expect(health.services.modules.selectorStrategy).toBe('loaded');
      expect(health.services.modules.trainingTransformer).toBe('loaded');
      expect(health.services.modules.visionAnalysis).toBe('loaded');
      expect(health.services.modules.cacheManager).toBe('loaded');
    });
  });

  describe('🔄 BACKWARD COMPATIBILITY VALIDATION', () => {
    it('should support legacy training data generation API', async () => {
      // Legacy API: Pass session object WITH COMPREHENSIVE DATA
      const legacySessionData = {
        id: 'legacy-session-123',
        interactions: [
          {
            selectors: { 
              xpath: "//button[@class='legacy-btn']",
              primary: '.legacy-btn', 
              reliability: { '.legacy-btn': 0.8, "//button[@class='legacy-btn']": 0.9 } 
            },
            element: { 
              text: 'Legacy Button',
              nearbyElements: [{ selector: '.price', text: '$19.99', relationship: 'above', distance: 10 }]
            },
            interaction: { type: 'click', timestamp: Date.now() },
            visual: { 
              boundingBox: { x: 100, y: 100, width: 80, height: 30 },
              colors: { background: '#ffffff', text: '#000000' }
            },
            context: { 
              pageUrl: 'https://test.com', 
              pageType: 'test',
              performance: { loadTime: 800 }
            },
            state: { before: { focused: '.input' } },
            business: { ecommerce: { productName: 'Test Product', productPrice: 19.99, productCategory: 'test' } }
          }
        ],
        enhancedInteractions: []
      };

      const result = await openaiService.generateTrainingData(legacySessionData);
      
      console.log('\\n🔄 Legacy API Compatibility:');
      console.log('Session ID:', legacySessionData.id);
      console.log('Examples Generated:', result.examples.length);
      console.log('Processing Time:', result.processing.duration + 'ms');
      
      expect(result.examples.length).toBeGreaterThan(0);
      expect(result.metadata.totalExamples).toBe(result.examples.length);
    });

    it('should support new training data generation API', async () => {
      // New API: Pass sessionId + interactions separately WITH COMPREHENSIVE DATA
      const sessionId = 'new-session-456';
      const interactions = [
        {
          selectors: { 
            xpath: "//button[@id='new-btn']",
            primary: '#new-btn', 
            reliability: { "//button[@id='new-btn']": 0.9, '#new-btn': 0.7 } 
          },
          element: { 
            text: 'New Button', 
            tag: 'button',
            nearbyElements: [{ selector: '.description', text: 'Click here to proceed', relationship: 'below', distance: 15 }]
          },
          interaction: { type: 'click', timestamp: Date.now() },
          visual: { 
            boundingBox: { x: 200, y: 150, width: 100, height: 40 },
            colors: { background: '#0066cc', text: '#ffffff' }
          },
          context: { 
            pageUrl: 'https://newtest.com', 
            pageType: 'newtest',
            performance: { loadTime: 600 }
          },
          state: { before: { focused: '.new-input' } },
          business: { ecommerce: { productName: 'New Product', productPrice: 29.99, productCategory: 'new' } }
        }
      ];

      const result = await openaiService.generateTrainingData(sessionId, interactions);
      
      console.log('\\n🆕 New API Usage:');
      console.log('Session ID:', sessionId);
      console.log('Examples Generated:', result.examples.length);
      console.log('Quality Distribution:', result.metadata.qualityDistribution);
      
      expect(result.examples.length).toBeGreaterThan(0);
      expect(result.metadata.totalExamples).toBe(result.examples.length);
    });
  });

  describe('📊 QUALITY IMPROVEMENT VALIDATION', () => {
    it('should demonstrate dramatic training data quality improvement with ALL enhanced data', async () => {
      // COMPREHENSIVE interaction with ALL enhanced data categories
      const comprehensiveInteraction = {
        selectors: {
          xpath: "//button[@class='premium-action-btn']",
          cssPath: ".premium-action-btn",
          primary: "[data-testid='premium-action']",
          alternatives: ["button[aria-label='Premium Action']", ".premium-btn"],
          reliability: { 
            "//button[@class='premium-action-btn']": 0.95, 
            ".premium-action-btn": 0.85,
            "[data-testid='premium-action']": 0.90 
          },
          dataTestIds: ['premium-action'],
          ariaLabels: ['Premium Action'],
          selectorPerformance: {
            ".premium-action-btn": { speed: 45, stability: 0.98 }
          }
        },
        visual: {
          boundingBox: { x: 350, y: 220, width: 140, height: 48 },
          positioning: { zIndex: 15, visibility: "visible", opacity: 1 },
          colors: { background: "#0066cc", text: "#ffffff", border: "#004499" },
          typography: { fontSize: "16px", fontFamily: "Inter", fontWeight: "600" },
          layout: { display: "flex", position: "relative", flexDirection: "row" },
          animations: { hasAnimations: true, animationType: "hover-scale", duration: 200 },
          deviceType: "desktop" as const,
          // 🆕 DESIGN SYSTEM CONTEXT
          designSystem: {
            componentLibrary: "custom-enterprise",
            brandColors: {
              primary: "#0066cc",
              secondary: "#333333", 
              accent: "#ff6600",
              background: "#ffffff"
            },
            designTokens: {
              "--spacing-md": "16px",
              "--border-radius": "8px",
              "--font-family": "Inter"
            },
            designPatterns: ["button", "card", "modal", "tooltip"],
            uiFramework: "React",
            cssFramework: "styled-components"
          }
        },
        element: {
          tag: "button",
          text: "Upgrade to Premium",
          attributes: {
            "class": "premium-action-btn",
            "data-testid": "premium-action",
            "aria-label": "Upgrade to Premium Plan"
          },
          // 🆕 COMPLETE NEARBY ELEMENTS
          nearbyElements: [
            {
              selector: ".pricing-amount",
              text: "$99/month",
              relationship: "above",
              distance: 25,
              boundingBox: { x: 350, y: 180, width: 100, height: 32 },
              zIndex: 1,
              isVisible: true,
              isClickable: false,
              elementType: "text",
              ariaRole: "text",
              attributes: { "class": "pricing-amount", "data-testid": "price" }
            },
            {
              selector: ".feature-list",
              text: "✓ Advanced Analytics ✓ Priority Support",
              relationship: "left",
              distance: 180,
              boundingBox: { x: 150, y: 220, width: 180, height: 120 },
              zIndex: 1,
              isVisible: true,
              isClickable: false,
              elementType: "list",
              ariaRole: "list"
            },
            {
              selector: ".cancel-link",
              text: "Maybe later",
              relationship: "below",
              distance: 30,
              boundingBox: { x: 380, y: 280, width: 80, height: 20 },
              zIndex: 10,
              isVisible: true,
              isClickable: true,
              elementType: "link",
              ariaRole: "button"
            },
            {
              selector: ".testimonial-quote",
              text: "This plan transformed our workflow!",
              relationship: "right",
              distance: 200,
              boundingBox: { x: 550, y: 200, width: 200, height: 80 },
              zIndex: 1,
              isVisible: true,
              isClickable: false,
              elementType: "blockquote",
              ariaRole: "complementary"
            }
          ],
          computedStyles: {
            "background-color": "rgb(0, 102, 204)",
            "border": "2px solid rgb(0, 68, 153)",
            "cursor": "pointer",
            "font-weight": "600"
          },
          classList: ["premium-action-btn", "cta-button"],
          ariaAttributes: {
            "aria-label": "Upgrade to Premium Plan",
            "role": "button"
          },
          isVisible: true,
          isInteractable: true
        },
        context: {
          pageTitle: "Premium Plans - Enterprise Dashboard",
          pageUrl: "https://app.enterprise.com/pricing/premium",
          pageType: "pricing",
          userJourney: "upgrade-consideration",
          ancestors: [
            {
              tag: "div",
              classes: ["pricing-card"],
              role: "article",
              semanticMeaning: "premium-plan-container"
            },
            {
              tag: "section", 
              classes: ["pricing-section"],
              role: "main",
              semanticMeaning: "pricing-comparison"
            }
          ],
          performance: {
            loadTime: 950,
            domContentLoaded: 600,
            firstContentfulPaint: 420,
            largestContentfulPaint: 880
          },
          seo: {
            h1Tags: ["Choose Your Plan"],
            h2Tags: ["Premium Features", "Enterprise Support"],
            canonicalUrl: "https://app.enterprise.com/pricing"
          },
          accessibility: {
            wcagLevel: "AA" as const,
            ariaLandmarks: ["navigation", "main", "complementary"],
            colorContrast: { "button-background": 4.8 },
            keyboardNavigation: true
          },
          analytics: {
            gtmEvents: ["page_view", "pricing_view"],
            customEvents: { "plan_comparison": "premium-vs-basic" }
          }
        },
        state: {
          before: {
            focused: ".email-input",
            scrollPosition: { x: 0, y: 400 },
            formData: { "email": "user@company.com" },
            activeModal: undefined,
            selectedTab: "premium",
            loadingStates: []
          },
          after: {
            focused: ".premium-action-btn",
            scrollPosition: { x: 0, y: 400 },
            activeModal: "payment-modal"
          },
          changes: {
            urlChanged: false,
            domMutations: [
              {
                type: "added" as const,
                selector: ".payment-modal",
                change: "payment modal opened"
              }
            ],
            networkRequests: [
              {
                url: "/api/checkout/premium",
                method: "POST",
                status: 200,
                duration: 180
              }
            ]
          }
        },
        interaction: {
          type: "click",
          timestamp: Date.now(),
          coordinates: { x: 420, y: 244 },
          timing: {
            startTime: 1200,
            endTime: 1380,
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
          confidence: 0.98
        },
        business: {
          ecommerce: {
            productId: "premium-plan",
            productName: "Premium Plan",
            productPrice: 99.00,
            productCategory: "subscription",
            cartValue: 0,
            inventoryStatus: "available"
          },
          conversion: {
            funnelStage: "consideration",
            funnelPosition: 3,
            conversionGoal: "subscription-upgrade",
            abTestVariant: "premium-highlight"
          },
          user: {
            sessionId: "sess-premium-123",
            customerSegment: "business-user",
            previousInteractions: 8,
            timeOnSite: 420,
            referrerSource: "email-campaign",
            // 🆕 SIMPLIFIED BEHAVIOR PATTERNS - web automation focused
            behaviorPatterns: {
              devicePreferences: ["desktop", "tablet"],
              commonInteractionPatterns: ["hover-before-click", "scroll-into-view", "reads-thoroughly"],
              navigationPreferences: ["uses-search", "browses-categories", "bookmarks-frequently"]
            }
          }
        }
      };

      const result = await openaiService.generateTrainingData('comprehensive-test', [comprehensiveInteraction]);
      
      console.log('\\n📊 COMPREHENSIVE QUALITY VALIDATION:');
      console.log('Total Examples Generated:', result.examples.length);
      console.log('Quality Distribution:', result.metadata.qualityDistribution);
      console.log('Context Types:', result.metadata.contextTypes);
      console.log('Processing Time:', result.processing.duration + 'ms');
      
      // Validate comprehensive quality improvements
      expect(result.examples.length).toBeGreaterThanOrEqual(3);
      
      // Check for NO generic 'element' selectors  
      const hasGenericElement = result.examples.some((ex: any) => 
        ex.completion.includes("'element'") || ex.completion.includes('"element"')
      );
      expect(hasGenericElement).toBe(false);
      
      // Validate enhanced data categories in examples
      const exampleContent = result.examples.map((ex: any) => ex.completion).join(' ');
      
      // Should contain design system context
      const hasDesignSystem = exampleContent.includes('custom-enterprise') || 
                             exampleContent.includes('styled-components') ||
                             exampleContent.includes('Inter');
      
      // Should contain complete nearby elements
      const hasCompleteNearby = exampleContent.includes('$99/month') ||
                                exampleContent.includes('feature-list') ||
                                exampleContent.includes('Maybe later');
                                
      // Should contain behavior patterns  
      const hasBehaviorPatterns = exampleContent.includes('hover-before-click') ||
                                 exampleContent.includes('desktop') ||
                                 exampleContent.includes('reads-thoroughly');
      
      console.log('\\n🆕 ENHANCED DATA VALIDATION:');
      console.log('✅ No Generic Elements:', !hasGenericElement);
      console.log('✅ Design System Context:', hasDesignSystem);
      console.log('✅ Complete Nearby Elements:', hasCompleteNearby); 
      console.log('✅ Behavior Patterns:', hasBehaviorPatterns);
      
      expect(hasDesignSystem).toBe(true);
      expect(hasCompleteNearby).toBe(true);
      expect(hasBehaviorPatterns).toBe(true);
      
      // Quality should be high with comprehensive data
      const highQualityExamples = result.examples.filter((ex: any) => ex.quality?.score >= 0.8);
      expect(highQualityExamples.length).toBeGreaterThan(0);
      
      console.log('✅ High Quality Examples:', highQualityExamples.length + '/' + result.examples.length);
    });
  });

  describe('🎨 VISION ANALYSIS VALIDATION', () => {
    it('should delegate vision analysis to VisionAnalysisService', async () => {
      const screenshots = [
        { id: 'screenshot-1', dataUrl: 'data:image/jpeg;base64,test1' },
        { id: 'screenshot-2', s3Url: 'https://s3.test.com/image2.jpg' }
      ];

      const results = await openaiService.analyzeScreenshots(screenshots);
      
      console.log('\\n🎨 Vision Analysis Results:');
      console.log('Screenshots Analyzed:', results.length);
      results.forEach((result, i) => {
        console.log(`Screenshot ${i + 1}:`, {
          qualityScore: result.qualityScore,
          confidence: result.confidence,
          personality: result.userPsychology.dominantPersonality
        });
      });
      
      expect(results).toHaveLength(2);
      expect(results[0].analysis).toContain('analytical behavior');
      expect(results[0].userPsychology).toBeDefined();
    });
  });

  describe('💾 CACHE MANAGEMENT VALIDATION', () => {
    it('should delegate cache operations to CacheManagerService', async () => {
      const testData = { analysis: 'Test cache data', qualityScore: 0.85 };
      
      // Test caching
      await openaiService.cacheAnalysis('test-key', 'test-type', testData);
      
      // Test retrieval
      const cached = await openaiService.getCachedAnalysis('test-key', 'test-type');
      
      // Test statistics
      const stats = await openaiService.getCacheStats();
      
      console.log('\\n💾 Cache Management Results:');
      console.log('Cache Stats:', {
        totalEntries: stats.totalEntries,
        activeEntries: stats.activeEntries,
        hitRatio: stats.hitRatio.toFixed(2)
      });
      
      expect(stats.totalEntries).toBeGreaterThanOrEqual(0);
      expect(stats.activeEntries).toBeGreaterThanOrEqual(0);
    });
  });

  describe('🚀 FINE-TUNING VALIDATION', () => {
    it('should maintain direct fine-tuning functionality', async () => {
      const trainingData = {
        messages: [
          { role: 'user', content: 'Test training message' },
          { role: 'assistant', content: 'Test response' }
        ]
      };
      
      // Test file upload
      const fileId = await openaiService.uploadTrainingFile(trainingData, {});
      
      // Test job creation
      const jobId = await openaiService.createFineTuningJob(fileId, {
        model: 'gpt-4o-mini-2024-07-18',
        hyperparameters: { n_epochs: 3, batch_size: 1, learning_rate_multiplier: 0.1 }
      });
      
      // Test job monitoring
      const jobStatus = await openaiService.monitorTraining(jobId);
      
      // Test job listing
      const jobs = await openaiService.listFineTuningJobs();
      
      console.log('\\n🚀 Fine-tuning Validation:');
      console.log('File ID:', fileId);
      console.log('Job ID:', jobId);
      console.log('Job Status:', jobStatus.status);
      console.log('Jobs Listed:', jobs.length);
      
      expect(fileId).toBe('file-123');
      expect(jobId).toBe('job-123');
      expect(jobStatus.status).toBe('running');
      expect(jobs.length).toBeGreaterThan(0);
    });
  });

  describe('📏 PERFORMANCE VALIDATION', () => {
    it('should maintain performance within acceptable limits', async () => {
      const startTime = Date.now();
      
      // Run a comprehensive operation WITH SUFFICIENT DATA FOR QUALITY THRESHOLD
      const interaction = {
        selectors: { 
          xpath: "//button[@class='perf-test']",
          primary: '.perf-test', 
          reliability: { '.perf-test': 0.8, "//button[@class='perf-test']": 0.9 } 
        },
        element: { 
          text: 'Performance Test',
          nearbyElements: [{ selector: '.timer', text: '0ms', relationship: 'above', distance: 10 }]
        },
        interaction: { type: 'click', timestamp: Date.now() },
        visual: { 
          boundingBox: { x: 0, y: 0, width: 100, height: 30 },
          colors: { background: '#00ff00', text: '#000000' }
        },
        context: { 
          pageUrl: 'https://perf.test.com',
          performance: { loadTime: 300 }
        },
        state: { before: { focused: '.input' } },
        business: { ecommerce: { productName: 'Performance Test', productPrice: 0, productCategory: 'test' } }
      };
      
      const result = await openaiService.generateTrainingData('perf-test', [interaction]);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      console.log('\\n📏 Performance Results:');
      console.log('Processing Time:', processingTime + 'ms');
      console.log('Examples Generated:', result.examples.length);
      console.log('Performance Rating:', processingTime < 1000 ? '✅ Excellent' : processingTime < 2000 ? '⚠️ Good' : '❌ Needs Improvement');
      
      // Should complete within reasonable time (2 seconds for test environment)
      expect(processingTime).toBeLessThan(2000);
      expect(result.examples.length).toBeGreaterThan(0);
    });
  });
});