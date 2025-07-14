import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { Logger } from './Logger.js';

export class PlaywrightManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private logger: Logger;

  constructor() {
    this.logger = new Logger('PlaywrightManager');
  }

  async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: process.env.HEADLESS !== 'false',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      this.logger.info('Browser launched');
    }
    return this.browser;
  }

  async getContext(): Promise<BrowserContext> {
    if (!this.context) {
      const browser = await this.getBrowser();
      this.context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        hasTouch: false,
        javaScriptEnabled: true,
        acceptDownloads: true,
        ignoreHTTPSErrors: true,
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        }
      });

      this.context.setDefaultTimeout(parseInt(process.env.BROWSER_TIMEOUT || '30000'));
      this.context.setDefaultNavigationTimeout(parseInt(process.env.BROWSER_TIMEOUT || '30000'));
    }
    return this.context;
  }

  async newPage(): Promise<Page> {
    const context = await this.getContext();
    const page = await context.newPage();
    
    await page.route('**/*', (route) => {
      const url = route.request().url();
      
      if (url.includes('analytics') || 
          url.includes('tracking') || 
          url.includes('gtm') ||
          url.includes('facebook') ||
          url.includes('doubleclick') ||
          url.includes('googlesyndication')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        this.logger.warn(`Browser console error: ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      this.logger.warn(`Page error: ${error.message}`);
    });

    return page;
  }

  async close(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
      this.logger.info('Browser context closed');
    }
    
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.info('Browser closed');
    }
  }

  async screenshot(page: Page, path: string, fullPage: boolean = false): Promise<void> {
    try {
      await page.screenshot({ path, fullPage });
      this.logger.debug(`Screenshot saved: ${path}`);
    } catch (error) {
      this.logger.error(`Failed to take screenshot: ${error}`);
    }
  }

  async waitForLoadState(page: Page, state: 'load' | 'domcontentloaded' | 'networkidle' = 'networkidle'): Promise<void> {
    try {
      await page.waitForLoadState(state, { timeout: 30000 });
    } catch (error) {
      this.logger.warn(`Wait for load state '${state}' timed out: ${error}`);
    }
  }

  async safeClick(page: Page, selector: string, timeout: number = 10000): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { timeout, state: 'visible' });
      await page.click(selector);
      return true;
    } catch (error) {
      this.logger.warn(`Safe click failed for selector '${selector}': ${error}`);
      return false;
    }
  }

  async safeType(page: Page, selector: string, text: string, timeout: number = 10000): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { timeout, state: 'visible' });
      await page.fill(selector, text);
      return true;
    } catch (error) {
      this.logger.warn(`Safe type failed for selector '${selector}': ${error}`);
      return false;
    }
  }

  async elementExists(page: Page, selector: string, timeout: number = 5000): Promise<boolean> {
    try {
      await page.waitForSelector(selector, { timeout, state: 'attached' });
      return true;
    } catch {
      return false;
    }
  }

  async getElementText(page: Page, selector: string): Promise<string | null> {
    try {
      const element = await page.$(selector);
      return element ? await element.textContent() : null;
    } catch (error) {
      this.logger.warn(`Failed to get text for selector '${selector}': ${error}`);
      return null;
    }
  }

  async getElementAttribute(page: Page, selector: string, attribute: string): Promise<string | null> {
    try {
      const element = await page.$(selector);
      return element ? await element.getAttribute(attribute) : null;
    } catch (error) {
      this.logger.warn(`Failed to get attribute '${attribute}' for selector '${selector}': ${error}`);
      return null;
    }
  }
}