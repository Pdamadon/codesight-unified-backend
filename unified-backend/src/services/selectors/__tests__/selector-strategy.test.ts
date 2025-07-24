/**
 * Selector Strategy Service Tests
 * 
 * Per FOCUSED_TASKS.md Testing Tasks:
 * - Test reliability score-based selection with Nordstrom data
 * - Test fallback selector generation  
 * - Test edge cases (empty selectors, missing reliability)
 * - Validation: Verify xpath with 0.7 reliability beats generic selectors
 */

import { SelectorStrategyServiceImpl } from '../selector-strategy';
import { SelectorData, ActionType } from '../../../types/selector-types';

describe('SelectorStrategyService', () => {
  let service: SelectorStrategyServiceImpl;

  beforeEach(() => {
    service = new SelectorStrategyServiceImpl();
  });

  describe('getBestSelector - Critical Bug Fix', () => {
    it('should use reliability scores instead of defaulting to element', () => {
      // Test case from FOCUSED_TASKS.md: xpath 0.7 > css 0.4
      const selectors: SelectorData = {
        xpath: "//div[@id='unified-task-overlay']/div/div[1]/button",
        cssPath: "#unified-task-overlay > div > div:nth-of-type(1) > button", 
        primary: "button[type=\"submit\"]",
        reliability: {
          "button[type=\"submit\"]": 0.0, // null in real data becomes 0
          "//div[@id='unified-task-overlay']/div/div[1]/button": 0.7,
          "#unified-task-overlay > div > div:nth-of-type(1) > button": 0.4
        }
      };

      const result = service.getBestSelector(selectors);
      
      // Should pick xpath because 0.7 > 0.4 > 0.0
      expect(result).toBe("//div[@id='unified-task-overlay']/div/div[1]/button");
    });

    it('should handle real Nordstrom search input data with multiple high-reliability selectors', () => {
      // Real data from user's Nordstrom session
      const selectors: SelectorData = {
        xpath: "//input[@id='keyword-search-input']",
        cssPath: "#keyword-search-input",
        primary: "#keyword-search-input",
        alternatives: [
          "[name=\"keyword\"]",
          ".RTf5v.e5Vov", 
          "input[type=\"search\"]",
          "#keyword-search-input"
        ],
        reliability: {
          ".RTf5v.e5Vov": 1.0,
          "[name=\"keyword\"]": 1.0,
          "input[type=\"search\"]": 1.0,
          "#keyword-search-input": 0.4,
          "//input[@id='keyword-search-input']": 0.7
        }
      };

      const result = service.getBestSelectorWithScore(selectors);
      
      // Should pick first 1.0 reliability selector
      expect(result.bestSelector).toBe("[name=\"keyword\"]");
      expect(result.reliability).toBe(1.0);
      
      // 🎯 KEY: Should include OTHER 1.0 reliability selectors as immediate backups
      expect(result.backupSelectors).toContain(".RTf5v.e5Vov");
      expect(result.backupSelectors).toContain("input[type=\"search\"]");
      
      // Lower reliability selectors should come after
      expect(result.backupSelectors.indexOf(".RTf5v.e5Vov")).toBeLessThan(
        result.backupSelectors.indexOf("//input[@id='keyword-search-input']")
      );
    });

    it('should not return "element" when valid selectors exist', () => {
      const selectors: SelectorData = {
        primary: "button",
        reliability: { "button": 0.5 }
      };

      const result = service.getBestSelector(selectors);
      expect(result).not.toBe('element');
      expect(result).toBe('button');
    });

    it('should only return "element" when no selectors available', () => {
      const result1 = service.getBestSelector(null as any);
      const result2 = service.getBestSelector({});
      
      expect(result1).toBe('element');
      expect(result2).toBe('element');
    });
  });

  describe('getBackupSelectors', () => {
    it('should provide fallback selectors in reliability order', () => {
      const selectors: SelectorData = {
        xpath: "//button",
        cssPath: "#btn", 
        primary: ".btn",
        alternatives: ["button[type='submit']"],
        reliability: {
          "//button": 0.8,
          "#btn": 0.6,
          ".btn": 0.4,
          "button[type='submit']": 0.2
        }
      };

      const backups = service.getBackupSelectors(selectors);
      
      // Should be ordered by reliability (excluding the best one)
      expect(backups).toEqual(["#btn", ".btn", "button[type='submit']"]);
    });
  });

  describe('getPlaywrightAction', () => {
    it('should generate correct actions for each type', () => {
      const selector = "#test-button";

      const clickAction = service.getPlaywrightAction('click', selector);
      expect(clickAction.action).toBe("await page.click('#test-button')");
      expect(clickAction.type).toBe('click');

      const fillAction = service.getPlaywrightAction('input', selector);
      expect(fillAction.action).toBe("await page.fill('#test-button', 'value')");

      const hoverAction = service.getPlaywrightAction('hover', selector);  
      expect(hoverAction.action).toBe("await page.hover('#test-button')");
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing reliability scores with intelligent fallback', () => {
      const selectors: SelectorData = {
        xpath: "//button[@data-testid='submit']",
        cssPath: "#submit-btn",
        primary: ".btn-primary"
        // No reliability scores
      };

      const result = service.getBestSelectorWithScore(selectors);
      
      // Should pick data-testid xpath due to intelligent fallback
      expect(result.bestSelector).toBe("//button[@data-testid='submit']");
      expect(result.reliability).toBeGreaterThan(0);
    });

    it('should handle null/undefined reliability values', () => {
      const selectors: SelectorData = {
        primary: "button",
        reliability: {
          "button": null as any,
          "other": undefined as any
        }
      };

      // Should not crash and should handle null values as 0
      expect(() => service.getBestSelector(selectors)).not.toThrow();
    });
  });

  describe('Real Nordstrom Data Integration Test', () => {
    it('should properly handle Quick View button from user data', () => {
      // Data structure from user's actual Nordstrom interaction
      const selectors: SelectorData = {
        primary: ".tmRsy.psaSN",
        xpath: "//button[@class='tmRsy psaSN']", // hypothetical
        alternatives: [".tmRsy.psaSN"],
        reliability: {
          ".tmRsy.psaSN": 0.8, // hypothetical reliability
          "//button[@class='tmRsy psaSN']": 0.9
        }
      };

      const result = service.getBestSelectorWithScore(selectors);
      
      expect(result.bestSelector).toBe("//button[@class='tmRsy psaSN']"); // Higher reliability
      expect(result.backupSelectors).toContain(".tmRsy.psaSN");
      expect(result.reliability).toBe(0.9);
    });
  });
});