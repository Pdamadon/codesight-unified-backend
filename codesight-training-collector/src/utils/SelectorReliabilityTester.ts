import { Page, Browser } from 'playwright';
import { SelectorSet, SelectorOption } from '../models/HybridTrainingExample.js';
import { PlaywrightManager } from './Playwright.js';
import { Logger } from './Logger.js';

export interface ReliabilityTestResult {
  selector: string;
  type: string;
  successRate: number;
  averageTime: number;
  consistency: number;
  crossSessionReliability: number;
  errorTypes: string[];
  recommendedUse: 'primary' | 'secondary' | 'fallback' | 'avoid';
}

export interface TestCondition {
  name: string;
  setup: (page: Page) => Promise<void>;
  description: string;
}

export class SelectorReliabilityTester {
  private playwright: PlaywrightManager;
  private logger: Logger;

  constructor() {
    this.playwright = new PlaywrightManager();
    this.logger = new Logger('SelectorReliabilityTester');
  }

  async testSelectorSet(
    selectorSet: SelectorSet,
    testUrl: string,
    testConditions?: TestCondition[]
  ): Promise<ReliabilityTestResult[]> {
    const selectors = [
      selectorSet.primary,
      selectorSet.secondary,
      selectorSet.fallback
    ];

    const results: ReliabilityTestResult[] = [];

    for (const selector of selectors) {
      this.logger.info(`Testing selector: ${selector.selector}`);
      const result = await this.testSingleSelector(selector, testUrl, testConditions);
      results.push(result);
    }

    return results;
  }

  private async testSingleSelector(
    selectorOption: SelectorOption,
    testUrl: string,
    testConditions?: TestCondition[]
  ): Promise<ReliabilityTestResult> {
    const { selector, type } = selectorOption;
    const testRuns: TestRun[] = [];
    const errorTypes: string[] = [];

    // Default test conditions
    const conditions = testConditions || this.getDefaultTestConditions();

    for (const condition of conditions) {
      this.logger.debug(`Testing selector under condition: ${condition.name}`);
      
      try {
        const run = await this.runSelectorTest(selector, testUrl, condition);
        testRuns.push(run);
        
        if (!run.success && run.error) {
          errorTypes.push(run.error);
        }
      } catch (error) {
        this.logger.warn(`Test condition ${condition.name} failed`, error as Error);
        testRuns.push({
          condition: condition.name,
          success: false,
          time: 10000,
          error: (error as Error).message
        });
      }
    }

    const analysis = this.analyzeTestRuns(testRuns);

    return {
      selector,
      type,
      successRate: analysis.successRate,
      averageTime: analysis.averageTime,
      consistency: analysis.consistency,
      crossSessionReliability: analysis.crossSessionReliability,
      errorTypes: [...new Set(errorTypes)],
      recommendedUse: this.determineRecommendedUse(analysis)
    };
  }

  private async runSelectorTest(
    selector: string,
    url: string,
    condition: TestCondition
  ): Promise<TestRun> {
    const page = await this.playwright.newPage();
    
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await condition.setup(page);

      const startTime = Date.now();
      
      // Test if selector finds element
      const element = await page.$(selector);
      const endTime = Date.now();
      
      if (!element) {
        return {
          condition: condition.name,
          success: false,
          time: endTime - startTime,
          error: 'Element not found'
        };
      }

      // Test if element is interactable
      const isVisible = await element.isVisible();
      const isEnabled = await element.isEnabled();
      
      if (!isVisible) {
        return {
          condition: condition.name,
          success: false,
          time: endTime - startTime,
          error: 'Element not visible'
        };
      }

      if (!isEnabled) {
        return {
          condition: condition.name,
          success: false,
          time: endTime - startTime,
          error: 'Element not enabled'
        };
      }

      // Test actual interaction
      try {
        await element.hover();
        return {
          condition: condition.name,
          success: true,
          time: endTime - startTime,
          error: null
        };
      } catch (error) {
        return {
          condition: condition.name,
          success: false,
          time: endTime - startTime,
          error: `Interaction failed: ${error}`
        };
      }

    } finally {
      await page.close();
    }
  }

  private getDefaultTestConditions(): TestCondition[] {
    return [
      {
        name: 'fresh_page_load',
        description: 'Standard page load condition',
        setup: async (page: Page) => {
          // No additional setup needed
        }
      },
      {
        name: 'after_wait',
        description: 'After waiting for dynamic content',
        setup: async (page: Page) => {
          await page.waitForTimeout(3000);
        }
      },
      {
        name: 'mobile_viewport',
        description: 'Mobile viewport simulation',
        setup: async (page: Page) => {
          await page.setViewportSize({ width: 375, height: 667 });
        }
      },
      {
        name: 'slow_network',
        description: 'Slow network simulation',
        setup: async (page: Page) => {
          await page.route('**/*', route => {
            setTimeout(() => route.continue(), 500);
          });
        }
      },
      {
        name: 'javascript_disabled',
        description: 'JavaScript disabled',
        setup: async (page: Page) => {
          await page.setJavaScriptEnabled(false);
        }
      }
    ];
  }

  private analyzeTestRuns(runs: TestRun[]): TestAnalysis {
    const successfulRuns = runs.filter(r => r.success);
    const successRate = successfulRuns.length / runs.length;
    
    const averageTime = runs.reduce((sum, run) => sum + run.time, 0) / runs.length;
    
    // Consistency: How similar are the response times
    const times = successfulRuns.map(r => r.time);
    const meanTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    const variance = times.reduce((sum, time) => sum + Math.pow(time - meanTime, 2), 0) / times.length;
    const consistency = Math.max(0, 1 - (Math.sqrt(variance) / meanTime));
    
    // Cross-session reliability: Success rate across different conditions
    const conditionGroups = this.groupRunsByConditionType(runs);
    const crossSessionReliability = Object.values(conditionGroups)
      .map(group => group.filter(r => r.success).length / group.length)
      .reduce((sum, rate) => sum + rate, 0) / Object.keys(conditionGroups).length;

    return {
      successRate,
      averageTime,
      consistency: isNaN(consistency) ? 0 : consistency,
      crossSessionReliability
    };
  }

  private groupRunsByConditionType(runs: TestRun[]): Record<string, TestRun[]> {
    const groups: Record<string, TestRun[]> = {};
    
    runs.forEach(run => {
      const conditionType = run.condition.split('_')[0]; // Group by first word
      if (!groups[conditionType]) {
        groups[conditionType] = [];
      }
      groups[conditionType].push(run);
    });
    
    return groups;
  }

  private determineRecommendedUse(analysis: TestAnalysis): ReliabilityTestResult['recommendedUse'] {
    if (analysis.successRate >= 0.9 && analysis.consistency >= 0.8) {
      return 'primary';
    } else if (analysis.successRate >= 0.7 && analysis.crossSessionReliability >= 0.7) {
      return 'secondary';
    } else if (analysis.successRate >= 0.5) {
      return 'fallback';
    } else {
      return 'avoid';
    }
  }

  async benchmarkSelectorPerformance(
    selectors: string[],
    testUrl: string,
    iterations: number = 10
  ): Promise<SelectorPerformanceBenchmark> {
    const results: Record<string, number[]> = {};
    
    for (const selector of selectors) {
      results[selector] = [];
      
      for (let i = 0; i < iterations; i++) {
        const page = await this.playwright.newPage();
        
        try {
          await page.goto(testUrl, { waitUntil: 'networkidle' });
          
          const startTime = Date.now();
          const element = await page.$(selector);
          const endTime = Date.now();
          
          if (element) {
            results[selector].push(endTime - startTime);
          } else {
            results[selector].push(-1); // Indicate failure
          }
          
        } catch (error) {
          results[selector].push(-1);
        } finally {
          await page.close();
        }
      }
    }

    return this.analyzeBenchmarkResults(results);
  }

  private analyzeBenchmarkResults(results: Record<string, number[]>): SelectorPerformanceBenchmark {
    const benchmark: SelectorPerformanceBenchmark = {
      totalTests: 0,
      selectorResults: {}
    };

    for (const [selector, times] of Object.entries(results)) {
      const successfulTimes = times.filter(t => t > 0);
      const successRate = successfulTimes.length / times.length;
      const averageTime = successfulTimes.length > 0 
        ? successfulTimes.reduce((sum, t) => sum + t, 0) / successfulTimes.length
        : -1;

      benchmark.selectorResults[selector] = {
        successRate,
        averageTime,
        fastestTime: successfulTimes.length > 0 ? Math.min(...successfulTimes) : -1,
        slowestTime: successfulTimes.length > 0 ? Math.max(...successfulTimes) : -1,
        reliability: successRate >= 0.9 ? 'high' : successRate >= 0.7 ? 'medium' : 'low'
      };
    }

    benchmark.totalTests = Object.values(results)[0]?.length || 0;
    return benchmark;
  }

  async generateReliabilityReport(results: ReliabilityTestResult[]): Promise<string> {
    const lines: string[] = [];
    
    lines.push('=== Selector Reliability Report ===\n');
    
    for (const result of results) {
      lines.push(`Selector: ${result.selector}`);
      lines.push(`Type: ${result.type}`);
      lines.push(`Success Rate: ${(result.successRate * 100).toFixed(1)}%`);
      lines.push(`Average Time: ${result.averageTime.toFixed(0)}ms`);
      lines.push(`Consistency: ${(result.consistency * 100).toFixed(1)}%`);
      lines.push(`Cross-Session Reliability: ${(result.crossSessionReliability * 100).toFixed(1)}%`);
      lines.push(`Recommended Use: ${result.recommendedUse.toUpperCase()}`);
      
      if (result.errorTypes.length > 0) {
        lines.push(`Common Errors: ${result.errorTypes.join(', ')}`);
      }
      
      lines.push(''); // Empty line between results
    }

    // Summary
    const primarySelectors = results.filter(r => r.recommendedUse === 'primary').length;
    const secondarySelectors = results.filter(r => r.recommendedUse === 'secondary').length;
    const fallbackSelectors = results.filter(r => r.recommendedUse === 'fallback').length;
    const avoidSelectors = results.filter(r => r.recommendedUse === 'avoid').length;

    lines.push('=== Summary ===');
    lines.push(`Primary-grade selectors: ${primarySelectors}`);
    lines.push(`Secondary-grade selectors: ${secondarySelectors}`);
    lines.push(`Fallback-grade selectors: ${fallbackSelectors}`);
    lines.push(`Selectors to avoid: ${avoidSelectors}`);

    return lines.join('\n');
  }

  async close(): Promise<void> {
    await this.playwright.close();
  }
}

interface TestRun {
  condition: string;
  success: boolean;
  time: number;
  error: string | null;
}

interface TestAnalysis {
  successRate: number;
  averageTime: number;
  consistency: number;
  crossSessionReliability: number;
}

interface SelectorPerformanceBenchmark {
  totalTests: number;
  selectorResults: Record<string, {
    successRate: number;
    averageTime: number;
    fastestTime: number;
    slowestTime: number;
    reliability: 'high' | 'medium' | 'low';
  }>;
}