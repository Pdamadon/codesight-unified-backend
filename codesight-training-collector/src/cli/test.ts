#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { config } from 'dotenv';
import OpenAI from 'openai';
import { SITE_CONFIGS, SiteName } from '../config/sites.js';
import { Logger } from '../utils/Logger.js';
import { FileManager } from '../utils/FileManager.js';

config();

const program = new Command();
const logger = new Logger('TestCLI');
const fileManager = new FileManager();

interface TestOptions {
  goal: string;
  iterations: number;
  compare: boolean;
  verbose: boolean;
}

program
  .name('test')
  .description('Test trained models against baseline')
  .version('1.0.0');

program
  .argument('<modelId>', 'Model ID to test (e.g., ft:gpt-4o-mini:org:target-nav:abc123)')
  .option('-g, --goal <goal>', 'Test goal/query', 'mens jeans')
  .option('-i, --iterations <number>', 'Number of test iterations', '5')
  .option('-c, --compare', 'Compare against base model', false)
  .option('-v, --verbose', 'Verbose output', false)
  .action(async (modelId: string, options: TestOptions) => {
    try {
      console.log(chalk.blue('🧪 CodeSight Model Tester'));
      console.log(chalk.gray('Testing trained model performance...\n'));

      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }

      const site = extractSiteFromModelId(modelId);
      await testModel(modelId, site, options);

      console.log(chalk.green('\n✅ Testing completed!'));
    } catch (error) {
      console.error(chalk.red('\n❌ Testing failed:'), error);
      process.exit(1);
    }
  });

program
  .command('benchmark')
  .description('Run comprehensive benchmark tests')
  .argument('<site>', 'Site to benchmark (target|amazon|bestbuy|walmart)')
  .option('-m, --model <modelId>', 'Specific model to test')
  .action(async (site: string, options: { model?: string }) => {
    try {
      console.log(chalk.blue('📊 CodeSight Model Benchmark'));
      console.log(chalk.gray(`Running comprehensive tests for ${site}...\n`));

      await runBenchmark(site as SiteName, options.model);

      console.log(chalk.green('\n🏆 Benchmark completed!'));
    } catch (error) {
      console.error(chalk.red('\n❌ Benchmark failed:'), error);
      process.exit(1);
    }
  });

async function testModel(modelId: string, site: SiteName, options: TestOptions): Promise<void> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    organization: process.env.OPENAI_ORG_ID
  });

  const siteConfig = SITE_CONFIGS[site];
  
  console.log(chalk.blue(`🎯 Testing model: ${modelId}`));
  console.log(chalk.blue(`🏪 Site: ${site}`));
  console.log(chalk.blue(`🎯 Goal: ${options.goal}`));
  console.log(chalk.blue(`🔄 Iterations: ${options.iterations}\n`));

  const results: TestResult[] = [];

  for (let i = 1; i <= options.iterations; i++) {
    console.log(chalk.yellow(`📝 Test ${i}/${options.iterations}...`));
    
    try {
      const startTime = Date.now();
      
      const completion = await openai.chat.completions.create({
        model: modelId,
        messages: [
          {
            role: "system",
            content: `You are a specialized web navigation assistant for ${site}. Your task is to provide step-by-step navigation instructions to find products.`
          },
          {
            role: "user",
            content: `Navigate to find: ${options.goal}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      });

      const endTime = Date.now();
      const response = completion.choices[0]?.message?.content;
      
      if (!response) {
        throw new Error('No response from model');
      }

      const result = analyzeResponse(response, siteConfig, options.goal);
      result.responseTime = endTime - startTime;
      result.iteration = i;
      
      results.push(result);
      
      if (options.verbose) {
        console.log(chalk.white(`Response: ${response.substring(0, 200)}...`));
      }
      
      console.log(chalk.green(`✅ Test ${i} completed (${result.responseTime}ms)`));
      
    } catch (error) {
      console.error(chalk.red(`❌ Test ${i} failed:`), error);
      results.push({
        iteration: i,
        success: false,
        responseTime: 0,
        steps: 0,
        validSelectors: 0,
        hasExpectedActions: false,
        error: (error as Error).message
      });
    }
  }

  printTestResults(results, options);

  if (options.compare) {
    console.log(chalk.blue('\n🆚 Running baseline comparison...'));
    await compareWithBaseline(openai, site, options.goal, results);
  }
}

interface TestResult {
  iteration: number;
  success: boolean;
  responseTime: number;
  steps: number;
  validSelectors: number;
  hasExpectedActions: boolean;
  error?: string;
}

function analyzeResponse(response: string, siteConfig: any, goal: string): TestResult {
  try {
    let parsed;
    
    try {
      parsed = JSON.parse(response);
    } catch {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in response');
      }
    }

    const steps = parsed.steps || [];
    const validSelectors = steps.filter((step: any) => 
      step.selector && (
        step.selector.includes('data-test') ||
        step.selector.includes(siteConfig.name)
      )
    ).length;

    const expectedActions = ['click', 'type', 'wait'];
    const hasExpectedActions = steps.some((step: any) => 
      expectedActions.includes(step.action)
    );

    return {
      iteration: 0,
      success: true,
      responseTime: 0,
      steps: steps.length,
      validSelectors,
      hasExpectedActions
    };

  } catch (error) {
    return {
      iteration: 0,
      success: false,
      responseTime: 0,
      steps: 0,
      validSelectors: 0,
      hasExpectedActions: false,
      error: (error as Error).message
    };
  }
}

function printTestResults(results: TestResult[], options: TestOptions): void {
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(chalk.blue('\n📊 Test Results Summary:'));
  console.log(chalk.white(`Total tests: ${results.length}`));
  console.log(chalk.green(`Successful: ${successful.length}`));
  console.log(chalk.red(`Failed: ${failed.length}`));
  console.log(chalk.white(`Success rate: ${((successful.length / results.length) * 100).toFixed(1)}%`));

  if (successful.length > 0) {
    const avgResponseTime = successful.reduce((sum, r) => sum + r.responseTime, 0) / successful.length;
    const avgSteps = successful.reduce((sum, r) => sum + r.steps, 0) / successful.length;
    const avgValidSelectors = successful.reduce((sum, r) => sum + r.validSelectors, 0) / successful.length;

    console.log(chalk.blue('\n⚡ Performance Metrics:'));
    console.log(chalk.white(`Average response time: ${avgResponseTime.toFixed(0)}ms`));
    console.log(chalk.white(`Average steps per navigation: ${avgSteps.toFixed(1)}`));
    console.log(chalk.white(`Average valid selectors: ${avgValidSelectors.toFixed(1)}`));
    console.log(chalk.white(`Navigation completeness: ${(avgSteps >= 3 ? 'Good' : 'Needs improvement')}`));
  }

  if (failed.length > 0 && options.verbose) {
    console.log(chalk.red('\n❌ Failed Test Details:'));
    failed.forEach(result => {
      console.log(chalk.red(`Test ${result.iteration}: ${result.error}`));
    });
  }
}

async function compareWithBaseline(openai: OpenAI, site: SiteName, goal: string, trainedResults: TestResult[]): Promise<void> {
  try {
    const baselineCompletion = await openai.chat.completions.create({
      model: 'gpt-4o-mini-2024-07-18',
      messages: [
        {
          role: "system",
          content: `You are a web navigation assistant. Provide step-by-step instructions to find products on ${site}.`
        },
        {
          role: "user",
          content: `Navigate to find: ${goal} on ${site}.com`
        }
      ],
      max_tokens: 1000,
      temperature: 0.1
    });

    const baselineResponse = baselineCompletion.choices[0]?.message?.content || '';
    const baselineResult = analyzeResponse(baselineResponse, SITE_CONFIGS[site], goal);

    const trainedSuccess = trainedResults.filter(r => r.success).length / trainedResults.length;
    const baselineSuccess = baselineResult.success ? 1 : 0;

    console.log(chalk.blue('\n🆚 Baseline Comparison:'));
    console.log(chalk.white(`Trained model success rate: ${(trainedSuccess * 100).toFixed(1)}%`));
    console.log(chalk.white(`Baseline model success rate: ${(baselineSuccess * 100).toFixed(1)}%`));
    
    if (trainedSuccess > baselineSuccess) {
      console.log(chalk.green(`🏆 Trained model outperforms baseline by ${((trainedSuccess - baselineSuccess) * 100).toFixed(1)}%`));
    } else if (trainedSuccess < baselineSuccess) {
      console.log(chalk.red(`📉 Trained model underperforms baseline by ${((baselineSuccess - trainedSuccess) * 100).toFixed(1)}%`));
    } else {
      console.log(chalk.yellow(`🤝 Models perform equally`));
    }

  } catch (error) {
    console.error(chalk.red('❌ Baseline comparison failed:'), error);
  }
}

async function runBenchmark(site: SiteName, modelId?: string): Promise<void> {
  if (!SITE_CONFIGS[site]) {
    throw new Error(`Unknown site: ${site}`);
  }

  const siteConfig = SITE_CONFIGS[site];
  const testGoals = siteConfig.commonGoals.slice(0, 5);

  if (!modelId) {
    const metadata = await fileManager.loadModelMetadata(site);
    if (!metadata || !metadata.modelId) {
      throw new Error(`No trained model found for ${site}. Train a model first.`);
    }
    modelId = metadata.modelId;
  }

  console.log(chalk.blue(`🎯 Benchmarking model: ${modelId}`));
  console.log(chalk.blue(`📝 Test goals: ${testGoals.join(', ')}\n`));

  const allResults: TestResult[] = [];

  for (const goal of testGoals) {
    console.log(chalk.yellow(`\n🎯 Testing goal: "${goal}"`));
    
    try {
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
        organization: process.env.OPENAI_ORG_ID
      });

      const completion = await openai.chat.completions.create({
        model: modelId,
        messages: [
          {
            role: "system",
            content: `You are a specialized web navigation assistant for ${site}.`
          },
          {
            role: "user",
            content: `Navigate to find: ${goal}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      });

      const response = completion.choices[0]?.message?.content || '';
      const result = analyzeResponse(response, siteConfig, goal);
      allResults.push(result);
      
      console.log(result.success ? chalk.green('✅ Success') : chalk.red('❌ Failed'));
      
    } catch (error) {
      console.error(chalk.red(`❌ Failed for goal "${goal}":`, error));
      allResults.push({
        iteration: 0,
        success: false,
        responseTime: 0,
        steps: 0,
        validSelectors: 0,
        hasExpectedActions: false,
        error: (error as Error).message
      });
    }
  }

  printBenchmarkSummary(allResults, site);
}

function printBenchmarkSummary(results: TestResult[], site: SiteName): void {
  const successful = results.filter(r => r.success);
  
  console.log(chalk.blue('\n🏆 Benchmark Summary:'));
  console.log(chalk.white(`Site: ${site.toUpperCase()}`));
  console.log(chalk.white(`Success rate: ${((successful.length / results.length) * 100).toFixed(1)}%`));
  console.log(chalk.white(`Total tests: ${results.length}`));
  
  if (successful.length > 0) {
    const avgSteps = successful.reduce((sum, r) => sum + r.steps, 0) / successful.length;
    console.log(chalk.white(`Average navigation steps: ${avgSteps.toFixed(1)}`));
    
    const grade = getPerformanceGrade(successful.length / results.length, avgSteps);
    console.log(chalk.white(`Performance grade: ${grade}`));
  }
}

function getPerformanceGrade(successRate: number, avgSteps: number): string {
  if (successRate >= 0.9 && avgSteps >= 3 && avgSteps <= 8) {
    return chalk.green('A (Excellent)');
  } else if (successRate >= 0.8 && avgSteps >= 2) {
    return chalk.blue('B (Good)');
  } else if (successRate >= 0.6) {
    return chalk.yellow('C (Fair)');
  } else {
    return chalk.red('D (Needs Improvement)');
  }
}

function extractSiteFromModelId(modelId: string): SiteName {
  const sites: SiteName[] = ['target', 'amazon', 'bestbuy', 'walmart'];
  
  for (const site of sites) {
    if (modelId.includes(site)) {
      return site;
    }
  }
  
  throw new Error(`Could not determine site from model ID: ${modelId}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}