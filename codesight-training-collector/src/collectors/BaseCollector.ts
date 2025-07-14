import { Page, Browser } from 'playwright';
import { NavigationExample, ExtractionExample, NavigationStep, ProductData } from '../models/TrainingExample.js';
import { SiteConfig, CollectorConfig } from '../models/SiteConfig.js';
import { PlaywrightManager } from '../utils/Playwright.js';
import { Logger } from '../utils/Logger.js';
import { FileManager } from '../utils/FileManager.js';

export abstract class BaseCollector {
  protected playwright: PlaywrightManager;
  protected logger: Logger;
  protected fileManager: FileManager;
  protected config: SiteConfig;
  protected collectorConfig: CollectorConfig;

  constructor(config: SiteConfig, collectorConfig?: Partial<CollectorConfig>) {
    this.config = config;
    this.collectorConfig = {
      maxExamplesPerDifficulty: 20,
      screenshotEnabled: true,
      validateExtraction: true,
      retryAttempts: 3,
      timeoutMs: 30000,
      ...collectorConfig
    };
    
    this.playwright = new PlaywrightManager();
    this.logger = new Logger(config.name);
    this.fileManager = new FileManager();
  }

  abstract collectNavigationExamples(): Promise<NavigationExample[]>;
  abstract collectExtractionExamples(): Promise<ExtractionExample[]>;
  abstract validateSiteStructure(): Promise<boolean>;

  protected async navigateToProduct(goal: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<NavigationStep[]> {
    const page = await this.playwright.newPage();
    const steps: NavigationStep[] = [];

    try {
      await page.goto(this.config.baseUrl, { waitUntil: 'networkidle' });
      
      switch (difficulty) {
        case 'easy':
          return await this.collectCategoryNavigation(page, goal, steps);
        case 'medium':
          return await this.collectSearchNavigation(page, goal, steps);
        case 'hard':
          return await this.collectComplexNavigation(page, goal, steps);
        default:
          throw new Error(`Unknown difficulty: ${difficulty}`);
      }
    } finally {
      await page.close();
    }
  }

  protected async collectCategoryNavigation(page: Page, goal: string, steps: NavigationStep[]): Promise<NavigationStep[]> {
    const category = this.extractCategory(goal);
    
    if (this.config.selectors.categoryMenu) {
      await page.click(this.config.selectors.categoryMenu);
      steps.push({
        action: 'click',
        selector: this.config.selectors.categoryMenu,
        description: 'Open category menu',
        screenshot: this.collectorConfig.screenshotEnabled ? await this.takeScreenshot(page, 'category-menu') : undefined
      });
    }

    const categorySelector = `[data-test*="${category}"], [href*="${category}"], text="${category}"`;
    await page.click(categorySelector);
    steps.push({
      action: 'click',
      selector: categorySelector,
      description: `Click ${category} category`,
      screenshot: this.collectorConfig.screenshotEnabled ? await this.takeScreenshot(page, `category-${category}`) : undefined
    });

    await page.waitForSelector(this.config.selectors.products[0], { timeout: this.collectorConfig.timeoutMs });
    
    return steps;
  }

  protected async collectSearchNavigation(page: Page, goal: string, steps: NavigationStep[]): Promise<NavigationStep[]> {
    await page.click(this.config.selectors.search);
    steps.push({
      action: 'click',
      selector: this.config.selectors.search,
      description: 'Click search input',
      screenshot: this.collectorConfig.screenshotEnabled ? await this.takeScreenshot(page, 'search-click') : undefined
    });

    await page.fill(this.config.selectors.search, goal);
    steps.push({
      action: 'type',
      selector: this.config.selectors.search,
      value: goal,
      description: `Type search term: ${goal}`,
      screenshot: this.collectorConfig.screenshotEnabled ? await this.takeScreenshot(page, 'search-type') : undefined
    });

    await page.press(this.config.selectors.search, 'Enter');
    steps.push({
      action: 'click',
      selector: this.config.selectors.search,
      description: 'Press Enter to search'
    });

    await page.waitForSelector(this.config.selectors.products[0], { timeout: this.collectorConfig.timeoutMs });

    if (this.config.selectors.filters && this.config.selectors.filters.length > 0) {
      const randomFilter = this.config.selectors.filters[Math.floor(Math.random() * this.config.selectors.filters.length)];
      try {
        await page.click(randomFilter, { timeout: 5000 });
        steps.push({
          action: 'click',
          selector: randomFilter,
          description: 'Apply filter',
          screenshot: this.collectorConfig.screenshotEnabled ? await this.takeScreenshot(page, 'filter-applied') : undefined
        });
      } catch (error) {
        this.logger.warn(`Filter not available: ${randomFilter}`);
      }
    }

    return steps;
  }

  protected async collectComplexNavigation(page: Page, goal: string, steps: NavigationStep[]): Promise<NavigationStep[]> {
    const category = this.extractCategory(goal);
    
    await page.hover(this.config.selectors.categoryMenu || this.config.selectors.navigation[0]);
    steps.push({
      action: 'click',
      selector: this.config.selectors.categoryMenu || this.config.selectors.navigation[0],
      description: 'Hover over navigation menu'
    });

    await page.click(`[href*="${category}"]`);
    steps.push({
      action: 'click',
      selector: `[href*="${category}"]`,
      description: `Navigate to ${category} section`
    });

    await page.click(this.config.selectors.search);
    await page.fill(this.config.selectors.search, goal);
    await page.press(this.config.selectors.search, 'Enter');
    steps.push({
      action: 'type',
      selector: this.config.selectors.search,
      value: goal,
      description: `Refine search within category: ${goal}`
    });

    if (this.config.selectors.filters) {
      for (const filter of this.config.selectors.filters.slice(0, 2)) {
        try {
          await page.click(filter, { timeout: 3000 });
          steps.push({
            action: 'click',
            selector: filter,
            description: 'Apply additional filter'
          });
        } catch (error) {
          continue;
        }
      }
    }

    await page.waitForSelector(this.config.selectors.products[0], { timeout: this.collectorConfig.timeoutMs });
    
    return steps;
  }

  protected async extractProductData(page: Page): Promise<ProductData[]> {
    const products: ProductData[] = [];
    const productElements = await page.$$(this.config.selectors.products[0]);

    for (const element of productElements.slice(0, 10)) {
      try {
        const product: ProductData = {
          title: await this.extractText(element, '[data-test*="title"], h2, h3, .product-title'),
          price: await this.extractText(element, '[data-test*="price"], .price, .cost'),
          rating: await this.extractRating(element),
          availability: await this.extractText(element, '[data-test*="availability"], .availability, .stock'),
          imageUrl: await this.extractAttribute(element, 'img', 'src'),
          productUrl: await this.extractAttribute(element, 'a', 'href')
        };

        if (product.title) {
          products.push(product);
        }
      } catch (error) {
        this.logger.warn(`Failed to extract product data: ${error}`);
      }
    }

    return products;
  }

  protected async extractText(element: any, selector: string): Promise<string | undefined> {
    try {
      const textElement = await element.$(selector);
      return textElement ? await textElement.textContent() : undefined;
    } catch {
      return undefined;
    }
  }

  protected async extractAttribute(element: any, selector: string, attribute: string): Promise<string | undefined> {
    try {
      const attrElement = await element.$(selector);
      return attrElement ? await attrElement.getAttribute(attribute) : undefined;
    } catch {
      return undefined;
    }
  }

  protected async extractRating(element: any): Promise<number | undefined> {
    try {
      const ratingText = await this.extractText(element, '[data-test*="rating"], .rating, .stars');
      if (ratingText) {
        const match = ratingText.match(/(\d+\.?\d*)/);
        return match ? parseFloat(match[1]) : undefined;
      }
    } catch {
      return undefined;
    }
  }

  protected async takeScreenshot(page: Page, name: string): Promise<string> {
    const filename = `screenshot-${this.config.name}-${name}-${Date.now()}.png`;
    const path = `./screenshots/${filename}`;
    await page.screenshot({ path, fullPage: false });
    return path;
  }

  protected async countProducts(page: Page): Promise<number> {
    try {
      await page.waitForSelector(this.config.selectors.products[0], { timeout: 10000 });
      const products = await page.$$(this.config.selectors.products[0]);
      return products.length;
    } catch {
      return 0;
    }
  }

  protected extractCategory(goal: string): string {
    const words = goal.toLowerCase().split(' ');
    
    for (const category of this.config.categories) {
      if (words.some(word => category.toLowerCase().includes(word) || word.includes(category.toLowerCase()))) {
        return category;
      }
    }
    
    return this.config.categories[0] || 'general';
  }

  protected async retryOperation<T>(operation: () => Promise<T>, maxRetries: number = this.collectorConfig.retryAttempts): Promise<T> {
    let lastError: Error;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (i < maxRetries) {
          this.logger.warn(`Operation failed, retrying... (${i + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }
    
    throw lastError!;
  }

  async close(): Promise<void> {
    await this.playwright.close();
  }
}