import { Page, ElementHandle } from 'playwright';
import { SelectorSet, SelectorOption, VisualSelector } from '../models/HybridTrainingExample.js';
import { Logger } from './Logger.js';

export class SelectorExtractor {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('SelectorExtractor');
  }

  async extractAllSelectors(page: Page, element: ElementHandle): Promise<SelectorSet> {
    const selectors = await element.evaluate((el) => {
      // Helper functions for selector generation
      const getXPath = (element: Element): string => {
        if (element.id) {
          return `//*[@id="${element.id}"]`;
        }
        
        const parts: string[] = [];
        let current: Element | null = element;
        
        while (current && current.nodeType === Node.ELEMENT_NODE) {
          let part = current.tagName.toLowerCase();
          
          if (current.className) {
            const classes = current.className.split(' ').filter(c => c.trim());
            if (classes.length > 0) {
              part += `[contains(@class, "${classes[0]}")]`;
            }
          }
          
          parts.unshift(part);
          current = current.parentElement;
          
          if (parts.length > 5) break; // Prevent overly long XPaths
        }
        
        return `//${parts.join('//')}`;
      };

      const getCSSSelector = (element: Element): string => {
        const parts: string[] = [];
        let current: Element | null = element;
        
        while (current && current.nodeType === Node.ELEMENT_NODE) {
          let part = current.tagName.toLowerCase();
          
          if (current.id) {
            return `#${current.id}`;
          }
          
          if (current.className) {
            const classes = current.className.split(' ')
              .filter(c => c.trim() && !c.match(/\d+/)) // Avoid generated classes
              .slice(0, 2); // Max 2 classes for stability
            
            if (classes.length > 0) {
              part += '.' + classes.join('.');
            }
          }
          
          parts.unshift(part);
          current = current.parentElement;
          
          if (parts.length > 3) break; // Prevent overly specific selectors
        }
        
        return parts.join(' > ');
      };

      const getTextSelector = (element: Element): string | null => {
        const text = element.textContent?.trim();
        if (text && text.length > 0 && text.length < 50) {
          // Escape quotes and handle special characters
          const escapedText = text.replace(/"/g, '\\"').replace(/'/g, "\\'");
          return `text="${escapedText}"`;
        }
        return null;
      };

      const getParentContext = (element: Element): string[] => {
        const context: string[] = [];
        let parent = element.parentElement;
        let depth = 0;
        
        while (parent && depth < 3) {
          let contextInfo = parent.tagName.toLowerCase();
          
          if (parent.getAttribute('data-test')) {
            contextInfo += `[data-test="${parent.getAttribute('data-test')}"]`;
          } else if (parent.id) {
            contextInfo += `#${parent.id}`;
          } else if (parent.className) {
            const firstClass = parent.className.split(' ')[0];
            if (firstClass) contextInfo += `.${firstClass}`;
          }
          
          context.push(contextInfo);
          parent = parent.parentElement;
          depth++;
        }
        
        return context;
      };

      // Extract all possible selectors
      const rect = el.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(el);
      
      return {
        // Data attributes (most reliable)
        dataTest: el.getAttribute('data-test') || el.getAttribute('data-testid'),
        dataAutomation: el.getAttribute('data-automation-id'),
        dataCy: el.getAttribute('data-cy'),
        
        // Standard attributes
        id: el.id,
        className: el.className,
        name: el.getAttribute('name'),
        type: el.getAttribute('type'),
        role: el.getAttribute('role'),
        ariaLabel: el.getAttribute('aria-label'),
        
        // Text content
        text: el.textContent?.trim(),
        value: (el as HTMLInputElement).value,
        placeholder: el.getAttribute('placeholder'),
        title: el.getAttribute('title'),
        alt: el.getAttribute('alt'),
        
        // Link/form specifics
        href: el.getAttribute('href'),
        action: el.getAttribute('action'),
        target: el.getAttribute('target'),
        
        // Generated selectors
        xpath: getXPath(el),
        cssSelector: getCSSSelector(el),
        textSelector: getTextSelector(el),
        
        // Context information
        tagName: el.tagName.toLowerCase(),
        parentContext: getParentContext(el),
        
        // Visual properties
        position: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          top: rect.top,
          left: rect.left
        },
        
        // Style information
        styles: {
          display: computedStyle.display,
          visibility: computedStyle.visibility,
          color: computedStyle.color,
          backgroundColor: computedStyle.backgroundColor,
          fontSize: computedStyle.fontSize,
          fontWeight: computedStyle.fontWeight,
          zIndex: computedStyle.zIndex
        },
        
        // Element state
        visible: rect.width > 0 && rect.height > 0 && computedStyle.visibility !== 'hidden',
        clickable: el.tagName === 'BUTTON' || el.tagName === 'A' || el.onclick !== null || el.getAttribute('role') === 'button'
      };
    });

    // Generate primary, secondary, and fallback selector options
    const primary = this.generatePrimarySelector(selectors);
    const secondary = this.generateSecondarySelector(selectors);
    const fallback = this.generateFallbackSelector(selectors);
    const visual = this.generateVisualSelector(selectors);

    // Test reliability of each selector
    const reliabilityScores = await this.testSelectorReliability(page, [primary, secondary, fallback]);

    return {
      primary,
      secondary,
      fallback,
      visual,
      reliabilityScores: {
        primary: reliabilityScores[0],
        secondary: reliabilityScores[1],
        fallback: reliabilityScores[2],
        averageSpeed: reliabilityScores.reduce((sum, score) => sum + score, 0) / 3
      }
    };
  }

  private generatePrimarySelector(data: any): SelectorOption {
    // Prefer data-test attributes for reliability
    if (data.dataTest) {
      return {
        selector: `[data-test="${data.dataTest}"]`,
        type: 'data-test',
        stability: 10,
        speed: 9,
        specificity: 9
      };
    }
    
    if (data.dataAutomation) {
      return {
        selector: `[data-automation-id="${data.dataAutomation}"]`,
        type: 'data-test',
        stability: 9,
        speed: 9,
        specificity: 9
      };
    }
    
    if (data.id) {
      return {
        selector: `#${data.id}`,
        type: 'id',
        stability: 8,
        speed: 10,
        specificity: 10
      };
    }
    
    // Fall back to role + aria-label combination
    if (data.role && data.ariaLabel) {
      return {
        selector: `[role="${data.role}"][aria-label="${data.ariaLabel}"]`,
        type: 'aria',
        stability: 7,
        speed: 8,
        specificity: 8
      };
    }
    
    // Use CSS selector as last resort for primary
    return {
      selector: data.cssSelector,
      type: 'css',
      stability: 6,
      speed: 7,
      specificity: 7
    };
  }

  private generateSecondarySelector(data: any): SelectorOption {
    // Try href patterns for links
    if (data.href && !data.href.startsWith('javascript:')) {
      const hrefPattern = this.extractHrefPattern(data.href);
      return {
        selector: `a[href*="${hrefPattern}"]`,
        type: 'css',
        stability: 7,
        speed: 8,
        specificity: 8
      };
    }
    
    // Try text content for buttons/links
    if (data.text && data.text.length < 30 && data.clickable) {
      return {
        selector: data.textSelector || `text="${data.text}"`,
        type: 'text',
        stability: 6,
        speed: 7,
        specificity: 9
      };
    }
    
    // Try class-based selector with parent context
    if (data.className && data.parentContext.length > 0) {
      const parentSelector = data.parentContext[0];
      const firstClass = data.className.split(' ')[0];
      return {
        selector: `${parentSelector} .${firstClass}`,
        type: 'css',
        stability: 5,
        speed: 6,
        specificity: 7
      };
    }
    
    // Generic CSS selector
    return {
      selector: data.cssSelector,
      type: 'css',
      stability: 5,
      speed: 6,
      specificity: 6
    };
  }

  private generateFallbackSelector(data: any): SelectorOption {
    // XPath is our most robust fallback
    if (data.xpath) {
      return {
        selector: data.xpath,
        type: 'xpath',
        stability: 8,
        speed: 5,
        specificity: 8
      };
    }
    
    // Position-based selector as last resort
    const positionSelector = this.generatePositionSelector(data);
    return {
      selector: positionSelector,
      type: 'css',
      stability: 3,
      speed: 4,
      specificity: 5
    };
  }

  private generateVisualSelector(data: any): VisualSelector {
    const position = this.determineVisualPosition(data.position);
    
    return {
      text: data.text,
      position,
      color: data.styles.color,
      size: this.categorizeSize(data.position.width, data.position.height),
      style: this.categorizeElementStyle(data),
      nearbyElements: this.extractNearbyElements(data.parentContext)
    };
  }

  private extractHrefPattern(href: string): string {
    try {
      const url = new URL(href);
      // Extract meaningful part of path
      const pathParts = url.pathname.split('/').filter(p => p.length > 0);
      return pathParts.length > 0 ? pathParts[0] : url.pathname;
    } catch {
      return href.substring(0, 20);
    }
  }

  private determineVisualPosition(rect: any): VisualSelector['position'] {
    const viewportWidth = 1920; // Assume standard viewport
    const viewportHeight = 1080;
    
    if (rect.y < viewportHeight * 0.2) {
      if (rect.x < viewportWidth * 0.33) return 'top-left';
      if (rect.x < viewportWidth * 0.66) return 'top-center';
      return 'top-right';
    }
    
    if (rect.y > viewportHeight * 0.8) {
      return 'bottom';
    }
    
    return 'center';
  }

  private categorizeSize(width: number, height: number): 'small' | 'medium' | 'large' {
    const area = width * height;
    if (area < 2000) return 'small';
    if (area < 10000) return 'medium';
    return 'large';
  }

  private categorizeElementStyle(data: any): string {
    if (data.tagName === 'button') return 'button';
    if (data.tagName === 'a') return 'link';
    if (data.tagName === 'input') return 'input';
    if (data.role === 'button') return 'button';
    if (data.clickable) return 'clickable';
    return 'element';
  }

  private extractNearbyElements(parentContext: string[]): string[] {
    return parentContext.slice(0, 2); // Top 2 parent context elements
  }

  private generatePositionSelector(data: any): string {
    // Generate a selector based on position and tag
    const tag = data.tagName;
    const rect = data.position;
    
    if (data.className) {
      const firstClass = data.className.split(' ')[0];
      return `${tag}.${firstClass}`;
    }
    
    return `${tag}:nth-of-type(1)`; // Very fragile, but better than nothing
  }

  async testSelectorReliability(page: Page, selectors: SelectorOption[]): Promise<number[]> {
    const results: number[] = [];
    
    for (const selectorOption of selectors) {
      const startTime = Date.now();
      let success = false;
      
      try {
        // Test if selector finds element
        const element = await page.$(selectorOption.selector);
        success = element !== null;
        
        if (element) {
          // Test if element is clickable
          await element.isVisible();
          await element.isEnabled();
        }
      } catch (error) {
        this.logger.warn(`Selector test failed: ${selectorOption.selector}`, error);
        success = false;
      }
      
      const endTime = Date.now();
      const speed = Math.max(0, 1 - (endTime - startTime) / 1000); // Normalize to 0-1
      
      results.push(success ? speed : 0);
    }
    
    return results;
  }

  async validateSelectorAcrossSessions(
    page: Page, 
    selector: string, 
    testCount: number = 3
  ): Promise<{ reliability: number; averageTime: number }> {
    const results: boolean[] = [];
    const times: number[] = [];
    
    for (let i = 0; i < testCount; i++) {
      try {
        // Refresh page to simulate new session
        await page.reload({ waitUntil: 'networkidle' });
        
        const startTime = Date.now();
        const element = await page.$(selector);
        const endTime = Date.now();
        
        results.push(element !== null);
        times.push(endTime - startTime);
        
        // Wait between tests
        await page.waitForTimeout(1000);
      } catch (error) {
        results.push(false);
        times.push(10000); // Penalty for failure
      }
    }
    
    const reliability = results.filter(r => r).length / results.length;
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    
    return { reliability, averageTime };
  }
}