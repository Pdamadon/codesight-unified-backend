#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { config } from 'dotenv';

config();

const program = new Command();

program
  .name('codesight-collector')
  .description('CodeSight Training Data Collector - Specialized web scraping model trainer')
  .version('1.0.0');

program
  .command('collect', 'Collect training data from e-commerce sites')
  .alias('c');

program
  .command('train', 'Train specialized models using collected data')
  .alias('t');

program
  .command('test', 'Test trained models against baseline')
  .alias('test');

program
  .command('validate', 'Validate training data quality')
  .alias('v');

program
  .command('export', 'Export models and training data')
  .alias('e');

program
  .option('-v, --verbose', 'Enable verbose logging')
  .option('--env <file>', 'Specify environment file', '.env')
  .hook('preAction', (thisCommand) => {
    const options = thisCommand.opts();
    
    if (options.env) {
      config({ path: options.env });
    }
    
    if (options.verbose) {
      process.env.LOG_LEVEL = 'debug';
    }
  });

program
  .action(() => {
    console.log(chalk.blue('🔍 CodeSight Training Collector'));
    console.log(chalk.gray('Specialized training data collection for web scraping models\n'));
    
    console.log(chalk.white('Available commands:'));
    console.log(chalk.cyan('  collect <site>     ') + chalk.gray('Collect training data from sites'));
    console.log(chalk.cyan('  train <site>       ') + chalk.gray('Train specialized models'));
    console.log(chalk.cyan('  test <modelId>     ') + chalk.gray('Test model performance'));
    console.log(chalk.cyan('  validate           ') + chalk.gray('Validate training data'));
    console.log(chalk.cyan('  export             ') + chalk.gray('Export models and data'));
    
    console.log(chalk.white('\nSupported sites:'));
    console.log(chalk.yellow('  • target.com       ') + chalk.gray('(fully implemented)'));
    console.log(chalk.yellow('  • amazon.com       ') + chalk.gray('(placeholder)'));
    console.log(chalk.yellow('  • bestbuy.com      ') + chalk.gray('(placeholder)'));
    console.log(chalk.yellow('  • walmart.com      ') + chalk.gray('(placeholder)'));
    
    console.log(chalk.white('\nQuick start:'));
    console.log(chalk.green('  npm run collect:target     ') + chalk.gray('# Collect Target.com data'));
    console.log(chalk.green('  npm run train:target       ') + chalk.gray('# Train Target model'));
    console.log(chalk.green('  npm run test:target <id>   ') + chalk.gray('# Test trained model'));
    
    console.log(chalk.white('\nFor help with a specific command:'));
    console.log(chalk.gray('  codesight-collector <command> --help'));
  });

if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}