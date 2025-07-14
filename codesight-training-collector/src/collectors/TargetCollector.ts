import { BaseCollector } from './BaseCollector.js';
import { NavigationExample, ExtractionExample, NavigationStep } from '../models/TrainingExample.js';
import { TARGET_CONFIG } from '../config/sites.js';
import { Page } from 'playwright';

export class TargetCollector extends BaseCollector {
  constructor() {
    super(TARGET_CONFIG, {
      maxExamplesPerDifficulty: 15,
      screenshotEnabled: true,
      validateExtraction: true,
      retryAttempts: 3,
      timeoutMs: 30000
    });
  }

  async validateSiteStructure(): Promise<boolean> {
    const page = await this.playwright.newPage();
    
    try {
      await page.goto(this.config.baseUrl, { waitUntil: 'networkidle' });
      
      const searchExists = await page.$(this.config.selectors.search);
      const navExists = await page.$(this.config.selectors.navigation[0]);
      
      if (!searchExists || !navExists) {
        this.logger.error('Target site structure validation failed');
        return false;
      }
      
      this.logger.info('Target site structure validation passed');
      return true;
    } catch (error) {
      this.logger.error(`Site validation error: ${error}`);
      return false;
    } finally {
      await page.close();
    }
  }

  async collectNavigationExamples(): Promise<NavigationExample[]> {
    const examples: NavigationExample[] = [];
    
    this.logger.info('Starting Target navigation collection...');

    for (const goal of this.config.commonGoals.slice(0, 8)) {
      try {
        const easyExample = await this.retryOperation(() => 
          this.collectCategoryNavigationExample(goal)
        );
        if (easyExample) examples.push(easyExample);

        const mediumExample = await this.retryOperation(() => 
          this.collectSearchNavigationExample(goal)
        );
        if (mediumExample) examples.push(mediumExample);

        const hardExample = await this.retryOperation(() => 
          this.collectComplexNavigationExample(goal)
        );
        if (hardExample) examples.push(hardExample);

        await new Promise(resolve => setTimeout(resolve, this.config.rateLimit?.delayBetweenRequests || 2000));
      } catch (error) {
        this.logger.warn(`Failed to collect examples for goal: ${goal}`, error);
      }
    }

    this.logger.info(`Collected ${examples.length} navigation examples`);
    return examples;
  }

  async collectExtractionExamples(): Promise<ExtractionExample[]> {
    const examples: ExtractionExample[] = [];
    
    this.logger.info('Starting Target extraction collection...');

    for (const goal of this.config.commonGoals.slice(0, 5)) {
      try {
        const extractionExample = await this.retryOperation(() => 
          this.collectProductExtractionExample(goal)
        );
        if (extractionExample) examples.push(extractionExample);

        await new Promise(resolve => setTimeout(resolve, this.config.rateLimit?.delayBetweenRequests || 2000));
      } catch (error) {
        this.logger.warn(`Failed to collect extraction example for goal: ${goal}`, error);
      }
    }

    this.logger.info(`Collected ${examples.length} extraction examples`);
    return examples;
  }

  private async collectCategoryNavigationExample(goal: string): Promise<NavigationExample | null> {
    const page = await this.playwright.newPage();
    
    try {
      await page.goto(this.config.baseUrl, { waitUntil: 'networkidle' });
      
      const steps: NavigationStep[] = [];
      const category = this.extractCategory(goal);

      await page.hover('[data-test="@web/GlobalHeader/CategoryCard"]');
      steps.push({
        action: 'click',
        selector: '[data-test="@web/GlobalHeader/CategoryCard"]',
        description: 'Hover over main category menu'
      });

      const categorySelector = `[href*="${category}"], [data-test*="${category}"]`;
      await page.click(categorySelector, { timeout: 10000 });
      steps.push({
        action: 'click',
        selector: categorySelector,
        description: `Navigate to ${category} category`,
        screenshot: this.collectorConfig.screenshotEnabled ? 
          await this.takeScreenshot(page, `category-${category}`) : undefined
      });

      await page.waitForSelector(this.config.selectors.products[0], { timeout: 15000 });
      const productCount = await this.countProducts(page);

      return {
        site: 'target',
        goal,
        startUrl: this.config.baseUrl,
        steps,
        expectedProducts: productCount,
        metadata: {
          category,
          difficulty: 'easy',
          timestamp: new Date(),
          collector: 'TargetCollector'
        }
      };
    } catch (error) {
      this.logger.warn(`Category navigation failed for ${goal}: ${error}`);
      return null;
    } finally {
      await page.close();
    }
  }

  private async collectSearchNavigationExample(goal: string): Promise<NavigationExample | null> {
    const page = await this.playwright.newPage();
    
    try {
      await page.goto(this.config.baseUrl, { waitUntil: 'networkidle' });
      
      const steps: NavigationStep[] = [];

      await page.click(this.config.selectors.search);
      steps.push({
        action: 'click',
        selector: this.config.selectors.search,
        description: 'Click search input'
      });

      await page.fill(this.config.selectors.search, goal);
      steps.push({
        action: 'type',
        selector: this.config.selectors.search,
        value: goal,
        description: `Search for: ${goal}`,
        screenshot: this.collectorConfig.screenshotEnabled ? 
          await this.takeScreenshot(page, `search-${goal.replace(/\s+/g, '-')}`) : undefined
      });

      await page.press(this.config.selectors.search, 'Enter');
      steps.push({
        action: 'click',
        selector: this.config.selectors.search,
        description: 'Submit search'
      });

      await page.waitForSelector(this.config.selectors.products[0], { timeout: 15000 });

      try {
        const filterSelector = '[data-test="facet-filter"]:first-child';
        await page.click(filterSelector, { timeout: 5000 });
        steps.push({
          action: 'click',
          selector: filterSelector,
          description: 'Apply filter to refine results'
        });
      } catch {
        // Filter not available, continue without it
      }

      const productCount = await this.countProducts(page);

      return {
        site: 'target',
        goal,
        startUrl: this.config.baseUrl,
        steps,
        expectedProducts: productCount,
        metadata: {
          category: this.extractCategory(goal),
          difficulty: 'medium',
          timestamp: new Date(),
          collector: 'TargetCollector'
        }
      };
    } catch (error) {
      this.logger.warn(`Search navigation failed for ${goal}: ${error}`);
      return null;
    } finally {
      await page.close();
    }
  }

  private async collectComplexNavigationExample(goal: string): Promise<NavigationExample | null> {
    const page = await this.playwright.newPage();
    
    try {
      await page.goto(this.config.baseUrl, { waitUntil: 'networkidle' });
      
      const steps: NavigationStep[] = [];
      const category = this.extractCategory(goal);

      await page.hover('[data-test="@web/GlobalHeader/CategoryCard"]');
      await page.click(`[href*="${category}"]`);
      steps.push({
        action: 'click',
        selector: `[href*="${category}"]`,
        description: `Navigate to ${category} department`
      });

      await page.waitForSelector('[data-test="@web/Search/SearchInput"]', { timeout: 10000 });
      await page.click('[data-test="@web/Search/SearchInput"]');
      await page.fill('[data-test="@web/Search/SearchInput"]', goal);
      await page.press('[data-test="@web/Search/SearchInput"]', 'Enter');
      steps.push({
        action: 'type',
        selector: '[data-test="@web/Search/SearchInput"]',
        value: goal,
        description: `Refine search within ${category}: ${goal}`
      });

      await page.waitForSelector(this.config.selectors.products[0], { timeout: 15000 });

      const filters = ['[data-test="facet-filter"]', '[data-test="@web/Facets"] button'];
      for (const filter of filters.slice(0, 2)) {
        try {
          await page.click(`${filter}:first-child`, { timeout: 3000 });
          steps.push({
            action: 'click',
            selector: filter,
            description: 'Apply additional filter'
          });
          await page.waitForTimeout(1000);
        } catch {
          continue;
        }
      }

      const productCount = await this.countProducts(page);

      return {
        site: 'target',
        goal,
        startUrl: this.config.baseUrl,
        steps,
        expectedProducts: productCount,
        metadata: {
          category,
          difficulty: 'hard',
          timestamp: new Date(),
          collector: 'TargetCollector'
        }
      };
    } catch (error) {
      this.logger.warn(`Complex navigation failed for ${goal}: ${error}`);
      return null;
    } finally {
      await page.close();
    }
  }

  private async collectProductExtractionExample(goal: string): Promise<ExtractionExample | null> {
    const page = await this.playwright.newPage();
    
    try {
      await page.goto(this.config.baseUrl, { waitUntil: 'networkidle' });
      
      await page.click(this.config.selectors.search);
      await page.fill(this.config.selectors.search, goal);
      await page.press(this.config.selectors.search, 'Enter');
      
      await page.waitForSelector(this.config.selectors.products[0], { timeout: 15000 });
      
      const extractionCode = this.generateTargetExtractionCode();
      const expectedData = await this.extractProductData(page);

      return {
        site: 'target',
        url: page.url(),
        targets: this.config.extractionTargets,
        extractionCode,
        expectedData,
        metadata: {
          framework: 'react',
          complexity: expectedData.length,
          timestamp: new Date()
        }
      };
    } catch (error) {
      this.logger.warn(`Product extraction failed for ${goal}: ${error}`);
      return null;
    } finally {
      await page.close();
    }
  }

  private generateTargetExtractionCode(): string {
    return `
// Target.com Product Extraction
const products = [];
const productCards = document.querySelectorAll('[data-test="@web/site-top-of-funnel/ProductCard"]');

productCards.forEach(card => {
  const product = {
    title: card.querySelector('[data-test="product-title"]')?.textContent?.trim(),
    price: card.querySelector('[data-test="product-price"]')?.textContent?.trim(),
    rating: card.querySelector('[data-test="product-rating"]')?.getAttribute('aria-label'),
    availability: card.querySelector('[data-test="product-availability"]')?.textContent?.trim(),
    imageUrl: card.querySelector('img')?.src,
    productUrl: card.querySelector('a')?.href
  };
  
  if (product.title) {
    products.push(product);
  }
});

return products;
    `.trim();
  }
}