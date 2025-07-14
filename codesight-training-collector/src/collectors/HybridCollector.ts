import { Page, ElementHandle } from 'playwright';
import { BaseCollector } from './BaseCollector.js';
import { SiteConfig } from '../models/SiteConfig.js';
import { HybridNavigationExample, HybridNavigationStep, HybridExtractionExample } from '../models/HybridTrainingExample.js';
import { SelectorExtractor } from '../utils/SelectorExtractor.js';
import { VisionAnalyzer } from '../utils/VisionAnalyzer.js';
import { Logger } from '../utils/Logger.js';

export interface HybridCollectionOptions {
  enableVisionAnalysis: boolean;
  screenshotQuality: 'low' | 'medium' | 'high';
  maxStepsPerNavigation: number;
  selectorValidationDepth: number;
  visionAnalysisTimeout: number;
}

export class HybridCollector extends BaseCollector {
  private selectorExtractor: SelectorExtractor;
  private visionAnalyzer: VisionAnalyzer;
  private hybridOptions: HybridCollectionOptions;
  private currentSessionId: string;
  private screenshots: Buffer[] = [];

  constructor(config: SiteConfig, options?: Partial<HybridCollectionOptions>) {
    super(config);
    
    this.hybridOptions = {
      enableVisionAnalysis: true,
      screenshotQuality: 'medium',
      maxStepsPerNavigation: 10,
      selectorValidationDepth: 3,
      visionAnalysisTimeout: 30000,
      ...options
    };

    this.selectorExtractor = new SelectorExtractor();
    this.visionAnalyzer = new VisionAnalyzer();
    this.currentSessionId = this.generateSessionId();
    
    this.logger = new Logger('HybridCollector');
  }

  async collectHybridNavigationExamples(): Promise<HybridNavigationExample[]> {
    const examples: HybridNavigationExample[] = [];
    
    this.logger.info(`Starting hybrid navigation collection for ${this.config.name}`);

    for (const goal of this.config.commonGoals.slice(0, 5)) {
      try {
        this.logger.info(`Collecting hybrid navigation for goal: "${goal}"`);
        
        const example = await this.retryOperation(() => 
          this.collectSingleHybridNavigation(goal)
        );
        
        if (example) {
          examples.push(example);
          this.logger.info(`Successfully collected hybrid navigation example for: ${goal}`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, this.config.rateLimit?.delayBetweenRequests || 3000));
        
      } catch (error) {
        this.logger.error(`Failed to collect hybrid navigation for ${goal}`, error as Error);
      }
    }

    return examples;
  }

  private async collectSingleHybridNavigation(query: string): Promise<HybridNavigationExample | null> {
    const page = await this.playwright.newPage();
    this.screenshots = [];
    
    try {
      // Initialize navigation session
      const sessionContext = {
        userAgent: await page.evaluate(() => navigator.userAgent),
        viewport: await page.viewportSize() || { width: 1920, height: 1080 },
        timestamp: new Date(),
        sessionId: this.currentSessionId
      };

      const steps: HybridNavigationStep[] = [];
      let stepNumber = 1;

      // Start navigation
      await page.goto(this.config.baseUrl, { waitUntil: 'networkidle' });
      
      // Take initial screenshot
      const initialScreenshot = await page.screenshot({ 
        fullPage: false,
        quality: this.getScreenshotQuality() 
      });
      this.screenshots.push(initialScreenshot);

      // Determine navigation strategy based on query
      const strategy = this.determineNavigationStrategy(query);
      
      this.logger.info(`Using strategy: ${strategy} for query: ${query}`);

      // Execute navigation steps with hybrid collection
      const navigationSteps = await this.executeHybridNavigation(page, query, strategy, stepNumber);
      steps.push(...navigationSteps);

      // Analyze overall navigation flow
      const flowAnalysis = await this.analyzeNavigationFlow(query);

      // Count final products
      const productsFound = await this.countProducts(page);

      // Calculate relevancy score
      const relevancyScore = await this.assessResultRelevancy(page, query);

      const example: HybridNavigationExample = {
        query,
        site: this.config.name,
        userStrategy: strategy,
        sessionContext,
        steps,
        navigationAnalysis: {
          totalSteps: steps.length,
          successRate: steps.filter(s => s.executionData.clickSuccess).length / steps.length,
          averageStepTime: steps.reduce((sum, s) => sum + s.executionData.pageLoadTime, 0) / steps.length,
          userExperience: flowAnalysis.userExperience,
          strategicEffectiveness: flowAnalysis.flowQuality
        },
        results: {
          productsFound,
          relevancyScore,
          priceRangeMatch: await this.assessPriceRangeMatch(page, query),
          expectedCategories: this.extractExpectedCategories(query),
          unexpectedResults: await this.identifyUnexpectedResults(page, query)
        }
      };

      return example;

    } catch (error) {
      this.logger.error(`Hybrid navigation collection failed for ${query}`, error as Error);
      return null;
    } finally {
      await page.close();
    }
  }

  private async executeHybridNavigation(
    page: Page, 
    query: string, 
    strategy: HybridNavigationExample['userStrategy'],
    startingStepNumber: number
  ): Promise<HybridNavigationStep[]> {
    const steps: HybridNavigationStep[] = [];
    let stepNumber = startingStepNumber;

    switch (strategy) {
      case 'category_browse':
        steps.push(...await this.hybridCategoryNavigation(page, query, stepNumber));
        break;
      case 'search_first':
        steps.push(...await this.hybridSearchNavigation(page, query, stepNumber));
        break;
      case 'filter_heavy':
        steps.push(...await this.hybridFilterNavigation(page, query, stepNumber));
        break;
      default:
        steps.push(...await this.hybridMixedNavigation(page, query, stepNumber));
    }

    return steps;
  }

  private async hybridCategoryNavigation(page: Page, query: string, stepNumber: number): Promise<HybridNavigationStep[]> {
    const steps: HybridNavigationStep[] = [];
    const category = this.extractCategory(query);

    // Step 1: Navigate to category
    const categoryStep = await this.recordHybridClick(
      page,
      `[href*="${category}"], [data-test*="${category}"]`,
      `Navigate to ${category} category`,
      stepNumber++
    );
    
    if (categoryStep) {
      steps.push(categoryStep);
      await page.waitForSelector(this.config.selectors.products[0], { timeout: 15000 });
    }

    // Step 2: Refine if needed
    if (query.includes(' ')) {
      const searchStep = await this.recordHybridClick(
        page,
        this.config.selectors.search,
        `Search within ${category} for: ${query}`,
        stepNumber++,
        { type: 'search', value: query }
      );
      
      if (searchStep) steps.push(searchStep);
    }

    return steps;
  }

  private async hybridSearchNavigation(page: Page, query: string, stepNumber: number): Promise<HybridNavigationStep[]> {
    const steps: HybridNavigationStep[] = [];

    // Step 1: Click search
    const searchClickStep = await this.recordHybridClick(
      page,
      this.config.selectors.search,
      'Click search input',
      stepNumber++
    );
    
    if (searchClickStep) steps.push(searchClickStep);

    // Step 2: Type search query
    const searchTypeStep = await this.recordHybridClick(
      page,
      this.config.selectors.search,
      `Search for: ${query}`,
      stepNumber++,
      { type: 'search', value: query }
    );
    
    if (searchTypeStep) steps.push(searchTypeStep);

    return steps;
  }

  private async hybridFilterNavigation(page: Page, query: string, stepNumber: number): Promise<HybridNavigationStep[]> {
    const steps: HybridNavigationStep[] = [];

    // Start with search
    steps.push(...await this.hybridSearchNavigation(page, query, stepNumber));
    stepNumber += steps.length;

    // Apply filters
    if (this.config.selectors.filters) {
      for (const filterSelector of this.config.selectors.filters.slice(0, 2)) {
        try {
          const filterStep = await this.recordHybridClick(
            page,
            filterSelector,
            'Apply filter to refine results',
            stepNumber++
          );
          
          if (filterStep) steps.push(filterStep);
        } catch (error) {
          this.logger.warn(`Filter not available: ${filterSelector}`);
        }
      }
    }

    return steps;
  }

  private async hybridMixedNavigation(page: Page, query: string, stepNumber: number): Promise<HybridNavigationStep[]> {
    // Combine multiple strategies
    const categorySteps = await this.hybridCategoryNavigation(page, query, stepNumber);
    return categorySteps;
  }

  private async recordHybridClick(
    page: Page,
    selector: string,
    intent: string,
    stepNumber: number,
    action?: { type: 'search'; value: string }
  ): Promise<HybridNavigationStep | null> {
    try {
      // Wait for element and take before screenshot
      await page.waitForSelector(selector, { timeout: 10000 });
      const element = await page.$(selector);
      
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      const beforeScreenshot = await page.screenshot({ 
        fullPage: false,
        quality: this.getScreenshotQuality()
      });

      // Get element information before click
      const elementInfo = await element.evaluate((el) => ({
        tagName: el.tagName.toLowerCase(),
        text: el.textContent?.trim() || '',
        position: el.getBoundingClientRect(),
        className: el.className,
        id: el.id
      }));

      // Get click coordinates
      const boundingBox = await element.boundingBox();
      const clickCoordinates = boundingBox ? {
        x: boundingBox.x + boundingBox.width / 2,
        y: boundingBox.y + boundingBox.height / 2
      } : { x: 0, y: 0 };

      // Extract multiple selector options
      const selectorSet = await this.selectorExtractor.extractAllSelectors(page, element);

      // Perform the action
      const startTime = Date.now();
      
      if (action?.type === 'search') {
        await element.fill(action.value);
        await page.press(selector, 'Enter');
      } else {
        await element.click();
      }
      
      const endTime = Date.now();

      // Take after screenshot
      await page.waitForTimeout(1000); // Allow page to update
      const afterScreenshot = await page.screenshot({ 
        fullPage: false,
        quality: this.getScreenshotQuality()
      });

      // Analyze with vision AI if enabled
      let visionAnalysis;
      if (this.hybridOptions.enableVisionAnalysis) {
        try {
          visionAnalysis = await this.visionAnalyzer.analyzeClickWithContext({
            beforeScreenshot,
            afterScreenshot,
            query: intent,
            site: this.config.name,
            clickCoordinates,
            elementInfo
          });
        } catch (error) {
          this.logger.warn('Vision analysis failed, using fallback', error as Error);
          visionAnalysis = {
            userReasoning: `Clicked ${elementInfo.tagName} for: ${intent}`,
            visualCues: ['Element was visible and clickable'],
            alternativesConsidered: ['Other elements on page'],
            confidenceLevel: 5.0,
            clickContext: {
              coordinates: clickCoordinates,
              elementBounds: {
                x: elementInfo.position.x,
                y: elementInfo.position.y,
                width: elementInfo.position.width,
                height: elementInfo.position.height
              },
              elementText: elementInfo.text,
              elementType: elementInfo.tagName,
              parentContext: '',
              pageSection: 'main',
              visualHierarchy: 3
            }
          };
        }
      }

      // Validate execution
      const currentUrl = page.url();
      const elementsFound = await page.$$eval('*', els => els.length);

      const step: HybridNavigationStep = {
        stepNumber,
        intent,
        visionAnalysis: visionAnalysis || {
          userReasoning: intent,
          visualCues: [],
          alternativesConsidered: [],
          confidenceLevel: 5.0,
          clickContext: {
            coordinates: clickCoordinates,
            elementBounds: {
              x: elementInfo.position.x,
              y: elementInfo.position.y,
              width: elementInfo.position.width,
              height: elementInfo.position.height
            },
            elementText: elementInfo.text,
            elementType: elementInfo.tagName,
            parentContext: '',
            pageSection: 'main',
            visualHierarchy: 3
          }
        },
        selectors: selectorSet,
        executionData: {
          clickSuccess: true,
          pageLoadTime: endTime - startTime,
          resultingUrl: currentUrl,
          elementsFound,
          nextStepOptions: await this.identifyNextStepOptions(page)
        },
        screenshots: {
          beforeClick: beforeScreenshot.toString('base64'),
          afterClick: afterScreenshot.toString('base64')
        }
      };

      this.screenshots.push(beforeScreenshot, afterScreenshot);
      return step;

    } catch (error) {
      this.logger.error(`Failed to record hybrid click: ${selector}`, error as Error);
      return null;
    }
  }

  private async analyzeNavigationFlow(query: string): Promise<{
    userExperience: 'smooth' | 'difficult' | 'confusing';
    flowQuality: number;
  }> {
    if (!this.hybridOptions.enableVisionAnalysis || this.screenshots.length < 2) {
      return { userExperience: 'smooth', flowQuality: 7.0 };
    }

    try {
      const analysis = await this.visionAnalyzer.batchAnalyzeNavigationFlow(
        this.screenshots,
        query,
        this.config.name
      );
      
      return {
        userExperience: analysis.userExperience,
        flowQuality: analysis.flowQuality
      };
    } catch (error) {
      this.logger.warn('Navigation flow analysis failed', error as Error);
      return { userExperience: 'smooth', flowQuality: 7.0 };
    }
  }

  private determineNavigationStrategy(query: string): HybridNavigationExample['userStrategy'] {
    // Simple heuristics to determine strategy
    if (query.includes('cheap') || query.includes('under') || query.includes('$')) {
      return 'price_conscious';
    }
    
    if (query.split(' ').length === 1) {
      return 'category_browse';
    }
    
    if (query.includes('brand') || /\b[A-Z][a-z]+\b/.test(query)) {
      return 'brand_focused';
    }
    
    return 'search_first';
  }

  private async identifyNextStepOptions(page: Page): Promise<string[]> {
    try {
      const options = await page.$$eval('a, button, [role="button"]', (elements) => 
        elements
          .slice(0, 10)
          .map(el => el.textContent?.trim())
          .filter((text): text is string => Boolean(text && text.length > 0))
      );
      
      return options;
    } catch {
      return [];
    }
  }

  private async assessResultRelevancy(page: Page, query: string): Promise<number> {
    try {
      const productTitles = await page.$$eval(
        this.config.selectors.products[0],
        (elements, searchQuery) => {
          return elements.map(el => el.textContent?.toLowerCase() || '');
        },
        query.toLowerCase()
      );

      const queryWords = query.toLowerCase().split(' ');
      let relevantCount = 0;

      productTitles.forEach(title => {
        const hasRelevantWords = queryWords.some(word => title.includes(word));
        if (hasRelevantWords) relevantCount++;
      });

      return productTitles.length > 0 ? relevantCount / productTitles.length : 0;
    } catch {
      return 0.5; // Default relevancy
    }
  }

  private async assessPriceRangeMatch(page: Page, query: string): Promise<boolean> {
    // Simple heuristic - if query mentions price, check if results match
    const priceMatch = query.match(/under\s*\$?(\d+)/i);
    if (!priceMatch) return true; // No price constraint mentioned

    try {
      const maxPrice = parseInt(priceMatch[1]);
      const prices = await page.$$eval(
        '[data-test*="price"], .price',
        (elements) => elements.map(el => {
          const text = el.textContent || '';
          const priceMatch = text.match(/\$?(\d+(?:\.\d{2})?)/);
          return priceMatch ? parseFloat(priceMatch[1]) : null;
        }).filter((price): price is number => price !== null)
      );

      return prices.length === 0 || prices.every(price => price <= maxPrice);
    } catch {
      return true;
    }
  }

  private extractExpectedCategories(query: string): string[] {
    const categories: string[] = [];
    
    for (const category of this.config.categories) {
      if (query.toLowerCase().includes(category.toLowerCase())) {
        categories.push(category);
      }
    }
    
    return categories.length > 0 ? categories : [this.extractCategory(query)];
  }

  private async identifyUnexpectedResults(page: Page, query: string): Promise<string[]> {
    // This is a placeholder - in practice, you'd implement logic to identify
    // products that don't match the search intent
    return [];
  }

  private getScreenshotQuality(): number {
    switch (this.hybridOptions.screenshotQuality) {
      case 'low': return 50;
      case 'medium': return 75;
      case 'high': return 90;
      default: return 75;
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Override base methods
  async collectNavigationExamples(): Promise<any[]> {
    // Return empty array - use collectHybridNavigationExamples instead
    return [];
  }

  async collectExtractionExamples(): Promise<any[]> {
    // Return empty array for now - could implement hybrid extraction
    return [];
  }

  async validateSiteStructure(): Promise<boolean> {
    return super.validateSiteStructure();
  }
}