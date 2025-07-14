#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { config } from 'dotenv';
import { TargetCollector } from '../collectors/TargetCollector.js';
import { AmazonCollector } from '../collectors/AmazonCollector.js';
import { BestBuyCollector } from '../collectors/BestBuyCollector.js';
import { WalmartCollector } from '../collectors/WalmartCollector.js';
import { BaseCollector } from '../collectors/BaseCollector.js';
import { SITE_CONFIGS, SiteName } from '../config/sites.js';
import { FileManager } from '../utils/FileManager.js';
import { Logger } from '../utils/Logger.js';

config();

const program = new Command();
const logger = new Logger('CollectCLI');
const fileManager = new FileManager();

interface CollectionOptions {
  type: 'navigation' | 'extraction' | 'both';
  maxExamples: number;
  validate: boolean;
  screenshots: boolean;
}

program
  .name('collect')
  .description('Collect training data from e-commerce sites')
  .version('1.0.0');

program
  .argument('<site>', 'Site to collect from (target|amazon|bestbuy|walmart|all)')
  .option('-t, --type <type>', 'Type of data to collect', 'both')
  .option('-m, --max-examples <number>', 'Maximum examples per type', '25')
  .option('--no-validate', 'Skip validation of collected data')
  .option('--no-screenshots', 'Disable screenshot capture')
  .action(async (site: string, options: CollectionOptions) => {
    try {
      console.log(chalk.blue('🔍 CodeSight Training Data Collector'));
      console.log(chalk.gray('Collecting high-quality training examples...\n'));

      if (site === 'all') {
        await collectFromAllSites(options);
      } else {
        await collectFromSite(site as SiteName, options);
      }

      console.log(chalk.green('\n✅ Collection completed successfully!'));
    } catch (error) {
      console.error(chalk.red('\n❌ Collection failed:'), error);
      process.exit(1);
    }
  });

async function collectFromAllSites(options: CollectionOptions): Promise<void> {
  const sites: SiteName[] = ['target', 'amazon', 'bestbuy', 'walmart'];
  
  for (const site of sites) {
    console.log(chalk.yellow(`\n📦 Collecting from ${site.toUpperCase()}...`));
    try {
      await collectFromSite(site, options);
      console.log(chalk.green(`✅ ${site.toUpperCase()} collection complete`));
    } catch (error) {
      console.error(chalk.red(`❌ ${site.toUpperCase()} collection failed:`), error);
      logger.logError(`Collection from ${site}`, error as Error);
    }
  }
}

async function collectFromSite(site: SiteName, options: CollectionOptions): Promise<void> {
  if (!SITE_CONFIGS[site]) {
    throw new Error(`Unknown site: ${site}`);
  }

  const collector = createCollector(site);
  
  try {
    console.log(chalk.blue(`🔍 Validating ${site} site structure...`));
    const isValid = await collector.validateSiteStructure();
    
    if (!isValid) {
      throw new Error(`Site structure validation failed for ${site}`);
    }
    
    console.log(chalk.green(`✅ Site structure validated`));

    if (options.type === 'navigation' || options.type === 'both') {
      console.log(chalk.blue(`📍 Collecting navigation examples...`));
      const navigationExamples = await collector.collectNavigationExamples();
      
      if (navigationExamples.length > 0) {
        const filepath = await fileManager.saveNavigationExamples(site, navigationExamples);
        console.log(chalk.green(`✅ Saved ${navigationExamples.length} navigation examples to ${filepath}`));
      } else {
        console.log(chalk.yellow(`⚠️  No navigation examples collected`));
      }
    }

    if (options.type === 'extraction' || options.type === 'both') {
      console.log(chalk.blue(`🔬 Collecting extraction examples...`));
      const extractionExamples = await collector.collectExtractionExamples();
      
      if (extractionExamples.length > 0) {
        const filepath = await fileManager.saveExtractionExamples(site, extractionExamples);
        console.log(chalk.green(`✅ Saved ${extractionExamples.length} extraction examples to ${filepath}`));
      } else {
        console.log(chalk.yellow(`⚠️  No extraction examples collected`));
      }
    }

    if (options.validate) {
      console.log(chalk.blue(`🔍 Validating collected data...`));
      await validateCollectedData(site);
    }

  } finally {
    await collector.close();
  }
}

function createCollector(site: SiteName): BaseCollector {
  switch (site) {
    case 'target':
      return new TargetCollector();
    case 'amazon':
      return new AmazonCollector();
    case 'bestbuy':
      return new BestBuyCollector();
    case 'walmart':
      return new WalmartCollector();
    default:
      throw new Error(`No collector implemented for site: ${site}`);
  }
}

async function validateCollectedData(site: SiteName): Promise<void> {
  try {
    const examples = await fileManager.loadTrainingExamples(site);
    
    if (examples.length === 0) {
      console.log(chalk.yellow(`⚠️  No training examples found for ${site}`));
      return;
    }

    console.log(chalk.green(`✅ Found ${examples.length} training examples for validation`));
    
    // Basic validation
    const navigationCount = examples.filter(ex => 'steps' in ex).length;
    const extractionCount = examples.filter(ex => 'extractionCode' in ex).length;
    
    console.log(chalk.blue(`📊 Data Summary:`));
    console.log(chalk.white(`   Navigation examples: ${navigationCount}`));
    console.log(chalk.white(`   Extraction examples: ${extractionCount}`));
    
    if (examples.length >= 10) {
      console.log(chalk.green(`✅ Sufficient examples for training (${examples.length}/10 minimum)`));
    } else {
      console.log(chalk.yellow(`⚠️  May need more examples for effective training (${examples.length}/10 minimum)`));
    }

  } catch (error) {
    console.error(chalk.red(`❌ Validation failed:`), error);
    logger.logError('Data validation', error as Error, { site });
  }
}

// Placeholder collectors for other sites
class AmazonCollector extends BaseCollector {
  constructor() {
    super(SITE_CONFIGS.amazon);
  }

  async validateSiteStructure(): Promise<boolean> {
    console.log(chalk.yellow('⚠️  Amazon collector not yet implemented'));
    return false;
  }

  async collectNavigationExamples() {
    return [];
  }

  async collectExtractionExamples() {
    return [];
  }
}

class BestBuyCollector extends BaseCollector {
  constructor() {
    super(SITE_CONFIGS.bestbuy);
  }

  async validateSiteStructure(): Promise<boolean> {
    console.log(chalk.yellow('⚠️  BestBuy collector not yet implemented'));
    return false;
  }

  async collectNavigationExamples() {
    return [];
  }

  async collectExtractionExamples() {
    return [];
  }
}

class WalmartCollector extends BaseCollector {
  constructor() {
    super(SITE_CONFIGS.walmart);
  }

  async validateSiteStructure(): Promise<boolean> {
    console.log(chalk.yellow('⚠️  Walmart collector not yet implemented'));
    return false;
  }

  async collectNavigationExamples() {
    return [];
  }

  async collectExtractionExamples() {
    return [];
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}