import Joi from 'joi';
import { TrainingExample, NavigationExample, ExtractionExample, NavigationStep } from '../models/TrainingExample.js';
import { Logger } from '../utils/Logger.js';

export interface ValidationReport {
  valid: boolean;
  totalExamples: number;
  validExamples: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  statistics: ValidationStatistics;
}

export interface ValidationError {
  index: number;
  field: string;
  message: string;
  example?: any;
}

export interface ValidationWarning {
  index: number;
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationStatistics {
  navigationExamples: number;
  extractionExamples: number;
  difficultyDistribution: { easy: number; medium: number; hard: number };
  averageStepsPerNavigation: number;
  averageProductsPerExtraction: number;
  siteDistribution: Record<string, number>;
}

export class DataValidator {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('DataValidator');
  }

  async validateTrainingData(examples: TrainingExample[]): Promise<ValidationReport> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let validCount = 0;

    this.logger.info(`Validating ${examples.length} training examples`);

    for (let i = 0; i < examples.length; i++) {
      const example = examples[i];
      const result = this.validateSingleExample(example, i);
      
      if (result.valid) {
        validCount++;
      } else {
        errors.push(...result.errors);
      }
      
      warnings.push(...result.warnings);
    }

    const statistics = this.calculateStatistics(examples);

    const report: ValidationReport = {
      valid: errors.length === 0 && validCount >= 10,
      totalExamples: examples.length,
      validExamples: validCount,
      errors,
      warnings,
      statistics
    };

    this.logger.info(`Validation complete: ${validCount}/${examples.length} valid examples`);
    if (errors.length > 0) {
      this.logger.warn(`Found ${errors.length} validation errors`);
    }
    if (warnings.length > 0) {
      this.logger.info(`Found ${warnings.length} warnings`);
    }

    return report;
  }

  private validateSingleExample(example: TrainingExample, index: number): { valid: boolean; errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      const baseSchema = Joi.object({
        site: Joi.string().required().min(1),
        metadata: Joi.object().required()
      });

      const { error: baseError } = baseSchema.validate(example);
      if (baseError) {
        errors.push({
          index,
          field: 'base',
          message: baseError.details[0].message,
          example
        });
        return { valid: false, errors, warnings };
      }

      if ('steps' in example) {
        const result = this.validateNavigationExample(example as NavigationExample, index);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      } else if ('extractionCode' in example) {
        const result = this.validateExtractionExample(example as ExtractionExample, index);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      } else {
        errors.push({
          index,
          field: 'type',
          message: 'Example is neither navigation nor extraction type'
        });
      }

    } catch (error) {
      errors.push({
        index,
        field: 'general',
        message: `Unexpected validation error: ${error}`
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private validateNavigationExample(example: NavigationExample, index: number): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const schema = Joi.object({
      site: Joi.string().required(),
      goal: Joi.string().required().min(3),
      startUrl: Joi.string().uri().required(),
      steps: Joi.array().items(Joi.object({
        action: Joi.string().valid('click', 'type', 'wait', 'scroll').required(),
        selector: Joi.string().required().min(1),
        value: Joi.string().optional(),
        description: Joi.string().required().min(3),
        screenshot: Joi.string().optional()
      })).min(1).required(),
      expectedProducts: Joi.number().integer().min(0).required(),
      metadata: Joi.object({
        category: Joi.string().required(),
        difficulty: Joi.string().valid('easy', 'medium', 'hard').required(),
        timestamp: Joi.date().required(),
        collector: Joi.string().required()
      }).required()
    });

    const { error } = schema.validate(example);
    if (error) {
      errors.push({
        index,
        field: 'navigation',
        message: error.details[0].message
      });
    }

    if (example.steps.length > 10) {
      warnings.push({
        index,
        field: 'steps',
        message: 'Navigation has many steps, consider simplifying',
        suggestion: 'Break down into smaller navigation examples'
      });
    }

    if (example.expectedProducts === 0) {
      warnings.push({
        index,
        field: 'expectedProducts',
        message: 'Navigation resulted in no products'
      });
    }

    for (let i = 0; i < example.steps.length; i++) {
      const step = example.steps[i];
      if (step.action === 'type' && !step.value) {
        errors.push({
          index,
          field: `steps[${i}].value`,
          message: 'Type action requires a value'
        });
      }

      if (!this.isValidSelector(step.selector)) {
        warnings.push({
          index,
          field: `steps[${i}].selector`,
          message: 'Selector may be too generic or fragile',
          suggestion: 'Use data-test attributes or more specific selectors'
        });
      }
    }

    return { errors, warnings };
  }

  private validateExtractionExample(example: ExtractionExample, index: number): { errors: ValidationError[]; warnings: ValidationWarning[] } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const schema = Joi.object({
      site: Joi.string().required(),
      url: Joi.string().uri().required(),
      targets: Joi.array().items(Joi.string()).min(1).required(),
      extractionCode: Joi.string().required().min(10),
      expectedData: Joi.array().items(Joi.object()).min(1).required(),
      metadata: Joi.object({
        framework: Joi.string().required(),
        complexity: Joi.number().integer().min(1).required(),
        timestamp: Joi.date().required()
      }).required()
    });

    const { error } = schema.validate(example);
    if (error) {
      errors.push({
        index,
        field: 'extraction',
        message: error.details[0].message
      });
    }

    if (!this.isValidExtractionCode(example.extractionCode)) {
      errors.push({
        index,
        field: 'extractionCode',
        message: 'Extraction code appears invalid or unsafe'
      });
    }

    if (example.expectedData.length > 50) {
      warnings.push({
        index,
        field: 'expectedData',
        message: 'Large number of expected products, consider limiting sample size'
      });
    }

    const missingTargets = example.targets.filter(target => 
      !example.expectedData.some(product => target in product)
    );

    if (missingTargets.length > 0) {
      warnings.push({
        index,
        field: 'targets',
        message: `Some targets not found in expected data: ${missingTargets.join(', ')}`
      });
    }

    return { errors, warnings };
  }

  private isValidSelector(selector: string): boolean {
    const goodPatterns = [
      /\[data-test/, // Data test attributes
      /\[data-automation/, // Automation IDs
      /\[data-cy/, // Cypress selectors
      /\[aria-/, // ARIA attributes
      /^#\w+$/, // Simple IDs
    ];

    const badPatterns = [
      /\.\w{1,2}$/, // Very short class names
      /nth-child/, // Position-dependent selectors
      /contains\s*\(/, // Text-dependent selectors
    ];

    return goodPatterns.some(pattern => pattern.test(selector)) ||
           !badPatterns.some(pattern => pattern.test(selector));
  }

  private isValidExtractionCode(code: string): boolean {
    const dangerousPatterns = [
      /eval\s*\(/,
      /new\s+Function/,
      /document\.write/,
      /innerHTML\s*=/,
      /location\s*=/,
      /window\./,
      /fetch\s*\(/,
      /XMLHttpRequest/,
    ];

    const requiredPatterns = [
      /document\.querySelector/,
      /textContent|innerText/,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(code)) &&
           requiredPatterns.some(pattern => pattern.test(code));
  }

  private calculateStatistics(examples: TrainingExample[]): ValidationStatistics {
    const stats: ValidationStatistics = {
      navigationExamples: 0,
      extractionExamples: 0,
      difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
      averageStepsPerNavigation: 0,
      averageProductsPerExtraction: 0,
      siteDistribution: {}
    };

    let totalSteps = 0;
    let totalProducts = 0;

    for (const example of examples) {
      stats.siteDistribution[example.site] = (stats.siteDistribution[example.site] || 0) + 1;

      if ('steps' in example) {
        const navExample = example as NavigationExample;
        stats.navigationExamples++;
        totalSteps += navExample.steps.length;
        
        if (navExample.metadata.difficulty) {
          stats.difficultyDistribution[navExample.metadata.difficulty]++;
        }
      } else if ('extractionCode' in example) {
        const extExample = example as ExtractionExample;
        stats.extractionExamples++;
        totalProducts += extExample.expectedData.length;
      }
    }

    if (stats.navigationExamples > 0) {
      stats.averageStepsPerNavigation = totalSteps / stats.navigationExamples;
    }

    if (stats.extractionExamples > 0) {
      stats.averageProductsPerExtraction = totalProducts / stats.extractionExamples;
    }

    return stats;
  }

  generateValidationReport(report: ValidationReport): string {
    const lines: string[] = [];
    
    lines.push('=== Training Data Validation Report ===');
    lines.push(`Total Examples: ${report.totalExamples}`);
    lines.push(`Valid Examples: ${report.validExamples}`);
    lines.push(`Overall Status: ${report.valid ? 'PASS' : 'FAIL'}`);
    lines.push('');

    if (report.errors.length > 0) {
      lines.push('ERRORS:');
      for (const error of report.errors) {
        lines.push(`  [${error.index}] ${error.field}: ${error.message}`);
      }
      lines.push('');
    }

    if (report.warnings.length > 0) {
      lines.push('WARNINGS:');
      for (const warning of report.warnings) {
        lines.push(`  [${warning.index}] ${warning.field}: ${warning.message}`);
        if (warning.suggestion) {
          lines.push(`    Suggestion: ${warning.suggestion}`);
        }
      }
      lines.push('');
    }

    lines.push('STATISTICS:');
    lines.push(`  Navigation Examples: ${report.statistics.navigationExamples}`);
    lines.push(`  Extraction Examples: ${report.statistics.extractionExamples}`);
    lines.push(`  Difficulty Distribution:`);
    lines.push(`    Easy: ${report.statistics.difficultyDistribution.easy}`);
    lines.push(`    Medium: ${report.statistics.difficultyDistribution.medium}`);
    lines.push(`    Hard: ${report.statistics.difficultyDistribution.hard}`);
    lines.push(`  Average Steps per Navigation: ${report.statistics.averageStepsPerNavigation.toFixed(1)}`);
    lines.push(`  Average Products per Extraction: ${report.statistics.averageProductsPerExtraction.toFixed(1)}`);
    lines.push(`  Site Distribution:`);
    for (const [site, count] of Object.entries(report.statistics.siteDistribution)) {
      lines.push(`    ${site}: ${count}`);
    }

    return lines.join('\n');
  }
}