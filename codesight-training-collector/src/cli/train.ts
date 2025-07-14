#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { config } from 'dotenv';
import { ModelTrainer } from '../trainers/ModelTrainer.js';
import { DataValidator } from '../trainers/DataValidator.js';
import { FileManager } from '../utils/FileManager.js';
import { Logger } from '../utils/Logger.js';
import { SITE_CONFIGS, SiteName } from '../config/sites.js';

config();

const program = new Command();
const logger = new Logger('TrainCLI');
const fileManager = new FileManager();

interface TrainingOptions {
  validate: boolean;
  epochs: number;
  batchSize: number;
  learningRate: number;
  force: boolean;
}

program
  .name('train')
  .description('Train specialized models using collected data')
  .version('1.0.0');

program
  .argument('<site>', 'Site to train model for (target|amazon|bestbuy|walmart|all)')
  .option('--no-validate', 'Skip data validation before training')
  .option('-e, --epochs <number>', 'Number of training epochs', '3')
  .option('-b, --batch-size <number>', 'Training batch size', '1')
  .option('-l, --learning-rate <number>', 'Learning rate multiplier', '0.1')
  .option('-f, --force', 'Force training even with validation warnings', false)
  .action(async (site: string, options: TrainingOptions) => {
    try {
      console.log(chalk.blue('🤖 CodeSight Model Trainer'));
      console.log(chalk.gray('Training specialized web scraping models...\n'));

      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }

      if (site === 'all') {
        await trainAllSites(options);
      } else {
        await trainSiteModel(site as SiteName, options);
      }

      console.log(chalk.green('\n🎉 Training completed successfully!'));
    } catch (error) {
      console.error(chalk.red('\n❌ Training failed:'), error);
      process.exit(1);
    }
  });

program
  .command('status')
  .description('Check training job status')
  .argument('<jobId>', 'Training job ID to check')
  .action(async (jobId: string) => {
    try {
      const trainer = new ModelTrainer();
      const status = await trainer.getTrainingStatus(jobId);
      
      if (status) {
        console.log(chalk.blue('\n📊 Training Job Status:'));
        console.log(chalk.white(`Job ID: ${status.id}`));
        console.log(chalk.white(`Site: ${status.site}`));
        console.log(chalk.white(`Status: ${getStatusColor(status.status)}`));
        console.log(chalk.white(`Created: ${status.createdAt.toISOString()}`));
        
        if (status.modelId) {
          console.log(chalk.white(`Model ID: ${status.modelId}`));
        }
        
        if (status.completedAt) {
          console.log(chalk.white(`Completed: ${status.completedAt.toISOString()}`));
        }
      } else {
        console.log(chalk.yellow(`❓ No job found with ID: ${jobId}`));
      }
    } catch (error) {
      console.error(chalk.red('❌ Failed to get job status:'), error);
      process.exit(1);
    }
  });

program
  .command('list-models')
  .description('List available trained models')
  .option('-s, --site <site>', 'Filter by site')
  .action(async (options: { site?: string }) => {
    try {
      const trainer = new ModelTrainer();
      const models = await trainer.listModels(options.site);
      
      if (models.length === 0) {
        console.log(chalk.yellow('📭 No trained models found'));
        return;
      }

      console.log(chalk.blue('\n🤖 Available Models:'));
      models.forEach((model, index) => {
        console.log(chalk.white(`${index + 1}. ${model}`));
      });
    } catch (error) {
      console.error(chalk.red('❌ Failed to list models:'), error);
      process.exit(1);
    }
  });

async function trainAllSites(options: TrainingOptions): Promise<void> {
  const sites: SiteName[] = ['target', 'amazon', 'bestbuy', 'walmart'];
  
  for (const site of sites) {
    console.log(chalk.yellow(`\n🏗️  Training model for ${site.toUpperCase()}...`));
    try {
      await trainSiteModel(site, options);
      console.log(chalk.green(`✅ ${site.toUpperCase()} model training complete`));
    } catch (error) {
      console.error(chalk.red(`❌ ${site.toUpperCase()} training failed:`), error);
      logger.logError(`Training for ${site}`, error as Error);
    }
  }
}

async function trainSiteModel(site: SiteName, options: TrainingOptions): Promise<void> {
  if (!SITE_CONFIGS[site]) {
    throw new Error(`Unknown site: ${site}`);
  }

  console.log(chalk.blue(`📚 Loading training data for ${site}...`));
  const examples = await fileManager.loadTrainingExamples(site);
  
  if (examples.length === 0) {
    throw new Error(`No training examples found for ${site}. Run 'collect ${site}' first.`);
  }

  console.log(chalk.green(`✅ Loaded ${examples.length} training examples`));

  if (options.validate) {
    console.log(chalk.blue(`🔍 Validating training data...`));
    const validator = new DataValidator();
    const report = await validator.validateTrainingData(examples);
    
    console.log(chalk.blue('\n📋 Validation Report:'));
    console.log(validator.generateValidationReport(report));
    
    if (!report.valid && !options.force) {
      throw new Error('Training data validation failed. Use --force to override or fix the issues.');
    }
    
    if (report.warnings.length > 0 && !options.force) {
      console.log(chalk.yellow('\n⚠️  Validation warnings found. Use --force to proceed anyway.'));
      return;
    }
  }

  console.log(chalk.blue(`🚀 Starting model training for ${site}...`));
  console.log(chalk.gray(`Configuration:`));
  console.log(chalk.gray(`  Examples: ${examples.length}`));
  console.log(chalk.gray(`  Epochs: ${options.epochs}`));
  console.log(chalk.gray(`  Batch Size: ${options.batchSize}`));
  console.log(chalk.gray(`  Learning Rate: ${options.learningRate}`));

  const trainer = new ModelTrainer();
  
  try {
    const modelId = await trainer.trainSiteModel(site, examples);
    
    console.log(chalk.green(`\n🎯 Training successful!`));
    console.log(chalk.white(`Model ID: ${modelId}`));
    
    await fileManager.saveModelMetadata(site, {
      modelId,
      site,
      trainingDate: new Date(),
      exampleCount: examples.length,
      configuration: {
        epochs: options.epochs,
        batchSize: options.batchSize,
        learningRate: options.learningRate
      }
    });
    
    console.log(chalk.blue(`💾 Model metadata saved`));
    
  } catch (error) {
    logger.logError(`Model training for ${site}`, error as Error);
    throw error;
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed':
      return chalk.green(status);
    case 'running':
      return chalk.blue(status);
    case 'pending':
      return chalk.yellow(status);
    case 'failed':
      return chalk.red(status);
    default:
      return chalk.gray(status);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}