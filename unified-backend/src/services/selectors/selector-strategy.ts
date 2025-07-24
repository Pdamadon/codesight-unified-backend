/**
 * Selector Strategy Service - Fix Critical Reliability Bug
 * 
 * Per OPENAI_FOCUSED_REFACTOR.md: Fix "Ignores reliability scores completely" 
 * Per FOCUSED_TASKS.md: "Use reliability scores to pick best selector"
 * 
 * CRITICAL FIX: Use reliability scores from rich data (xpath: 0.7, css: 0.4, etc.)
 */

import { SelectorData, SelectorResult, ActionType, PlaywrightAction } from '../../types/selector-types';

export interface SelectorStrategyService {
  getBestSelector(selectors: SelectorData): string;
  getBestSelectorWithScore(selectors: SelectorData): SelectorResult;
  getBackupSelectors(selectors: SelectorData, exclude?: string): string[];
  getPlaywrightAction(actionType: ActionType, selector: string): PlaywrightAction;
}

export class SelectorStrategyServiceImpl implements SelectorStrategyService {

  /**
   * CRITICAL FIX: Use reliability scores instead of hardcoded priority
   * 
   * Before (BROKEN): Returned 'element' for empty selectors, ignored reliability
   * After (FIXED): Uses reliability scores from rich interaction data
   */
  getBestSelector(selectors: SelectorData): string {
    const result = this.getBestSelectorWithScore(selectors);
    return result.bestSelector;
  }

  /**
   * Get best selector with reliability score and backup options
   */
  getBestSelectorWithScore(selectors: SelectorData): SelectorResult {
    if (!selectors) {
      return {
        bestSelector: 'element',
        backupSelectors: [],
        reliability: 0
      };
    }

    // 🎯 CRITICAL FIX: Use reliability scores from rich data!
    const reliability = selectors.reliability || {};
    const availableSelectors = [
      selectors.xpath,
      selectors.cssPath, 
      selectors.primary,
      ...(selectors.alternatives || [])
    ].filter((selector): selector is string => Boolean(selector));

    if (availableSelectors.length === 0) {
      return {
        bestSelector: 'element',
        backupSelectors: [],
        reliability: 0
      };
    }

    // Find highest reliability score
    let bestScore = Math.max(...availableSelectors.map(s => reliability[s] || 0));
    
    // 🆕 ENHANCEMENT: If no reliability scores, use intelligent fallback priority
    if (bestScore === 0) {
      const fallbackSelector = this.getIntelligentFallback(availableSelectors);
      bestScore = this.estimateReliability(fallbackSelector);
      
      // Return the intelligent fallback as primary
      const remainingSelectors = availableSelectors
        .filter(s => s !== fallbackSelector)
        .sort((a, b) => this.estimateReliability(b) - this.estimateReliability(a))
        .slice(0, 3);
        
      return {
        bestSelector: fallbackSelector,
        backupSelectors: remainingSelectors,
        reliability: bestScore
      };
    }

    // 🎯 KEY ENHANCEMENT: Get ALL selectors with highest reliability
    const bestSelectors = availableSelectors.filter(s => 
      (reliability[s] || 0) === bestScore
    );
    
    const bestSelector = bestSelectors[0]; // Primary choice
    
    // Generate backup selectors: other high-reliability selectors first, then by reliability
    const otherBestSelectors = bestSelectors.slice(1); // Other 1.0 reliability selectors
    const lowerReliabilitySelectors = availableSelectors
      .filter(s => (reliability[s] || 0) < bestScore)
      .sort((a, b) => (reliability[b] || 0) - (reliability[a] || 0));
    
    const backupSelectors = [
      ...otherBestSelectors,           // Other selectors with same high reliability  
      ...lowerReliabilitySelectors     // Lower reliability selectors, sorted
    ].slice(0, 5); // Top 5 backups for better fallback coverage

    return {
      bestSelector,
      backupSelectors, 
      reliability: bestScore
    };
  }

  /**
   * Get backup selectors in reliability order
   */
  getBackupSelectors(selectors: SelectorData, exclude?: string): string[] {
    const result = this.getBestSelectorWithScore(selectors);
    
    if (exclude) {
      return result.backupSelectors.filter((s: string) => s !== exclude);
    }
    
    return result.backupSelectors;
  }

  /**
   * Generate Playwright action with reliability context
   */
  getPlaywrightAction(actionType: ActionType, selector: string): PlaywrightAction {
    let action: string;

    switch (actionType) {
      case 'click':
        action = `await page.click('${selector}')`;
        break;
      case 'hover':
      case 'focus':
        action = `await page.hover('${selector}')`;
        break;
      case 'input':
      case 'type':
        action = `await page.fill('${selector}', 'value')`;
        break;
      case 'select':
        action = `await page.selectOption('${selector}', 'option')`;
        break;
      case 'scroll':
        action = `await page.locator('${selector}').scrollIntoViewIfNeeded()`;
        break;
      case 'form_submit':
        action = `await page.locator('${selector}').press('Enter')`;
        break;
      case 'key_press':
        action = `await page.locator('${selector}').press('key')`;
        break;
      default:
        action = `await page.click('${selector}')`;
    }

    return {
      action,
      type: actionType,
      reliability: this.estimateReliability(selector)
    };
  }

  /**
   * Intelligent fallback when no reliability scores available
   * Per FOCUSED_TASKS.md: Priority order for fallback
   */
  private getIntelligentFallback(selectors: string[]): string {
    // Priority order: data-testid > xpath > id > css classes > tag
    
    const dataTestId = selectors.find(s => s.includes('data-testid'));
    if (dataTestId) return dataTestId;
    
    const xpath = selectors.find(s => s.startsWith('//') || s.startsWith('/'));
    if (xpath) return xpath;
    
    const idSelector = selectors.find(s => s.includes('#') && !s.includes(' '));
    if (idSelector) return idSelector;
    
    const classSelector = selectors.find(s => s.startsWith('.') || s.includes('[class'));
    if (classSelector) return classSelector;
    
    // Return first available as last resort
    return selectors[0];
  }

  /**
   * Estimate reliability score for selector types
   */
  private estimateReliability(selector: string): number {
    if (!selector || selector === 'element') return 0;
    
    if (selector.includes('data-testid')) return 0.9;
    if (selector.startsWith('//') || selector.startsWith('/')) return 0.8;
    if (selector.includes('#') && !selector.includes(' ')) return 0.7;
    if (selector.includes('[') && selector.includes('=')) return 0.6;
    if (selector.startsWith('.')) return 0.4;
    
    return 0.3; // Generic selectors
  }
}

// Export singleton instance for dependency injection
export const selectorStrategyService = new SelectorStrategyServiceImpl();