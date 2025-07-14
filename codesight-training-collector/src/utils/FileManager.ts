import { promises as fs } from 'fs';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { TrainingExample, TrainingDataset, NavigationExample, ExtractionExample } from '../models/TrainingExample.js';
import { Logger } from './Logger.js';

export class FileManager {
  private logger: Logger;

  constructor() {
    this.logger = new Logger('FileManager');
  }

  async ensureDirectoryExists(path: string): Promise<void> {
    if (!existsSync(path)) {
      mkdirSync(path, { recursive: true });
      this.logger.debug(`Created directory: ${path}`);
    }
  }

  async saveTrainingDataset(site: string, dataset: TrainingDataset): Promise<string> {
    const basePath = join('./training-data', site);
    await this.ensureDirectoryExists(basePath);

    const filename = `dataset-${dataset.metadata.version}-${Date.now()}.json`;
    const filepath = join(basePath, filename);

    await fs.writeFile(filepath, JSON.stringify(dataset, null, 2));
    this.logger.info(`Saved training dataset: ${filepath}`);

    return filepath;
  }

  async saveNavigationExamples(site: string, examples: NavigationExample[]): Promise<string> {
    const basePath = join('./training-data', site, 'navigation');
    await this.ensureDirectoryExists(basePath);

    const filename = `navigation-${Date.now()}.json`;
    const filepath = join(basePath, filename);

    await fs.writeFile(filepath, JSON.stringify(examples, null, 2));
    this.logger.info(`Saved ${examples.length} navigation examples: ${filepath}`);

    return filepath;
  }

  async saveExtractionExamples(site: string, examples: ExtractionExample[]): Promise<string> {
    const basePath = join('./training-data', site, 'extraction');
    await this.ensureDirectoryExists(basePath);

    const filename = `extraction-${Date.now()}.json`;
    const filepath = join(basePath, filename);

    await fs.writeFile(filepath, JSON.stringify(examples, null, 2));
    this.logger.info(`Saved ${examples.length} extraction examples: ${filepath}`);

    return filepath;
  }

  async saveOpenAITrainingFile(site: string, jsonlContent: string): Promise<string> {
    const basePath = join('./training-data', site);
    await this.ensureDirectoryExists(basePath);

    const filename = `openai-training-${Date.now()}.jsonl`;
    const filepath = join(basePath, filename);

    await fs.writeFile(filepath, jsonlContent);
    this.logger.info(`Saved OpenAI training file: ${filepath}`);

    return filepath;
  }

  async loadTrainingExamples(site: string): Promise<TrainingExample[]> {
    const basePath = join('./training-data', site);
    const examples: TrainingExample[] = [];

    try {
      const navigationPath = join(basePath, 'navigation');
      const extractionPath = join(basePath, 'extraction');

      if (existsSync(navigationPath)) {
        const navFiles = await fs.readdir(navigationPath);
        for (const file of navFiles.filter(f => f.endsWith('.json'))) {
          const content = await fs.readFile(join(navigationPath, file), 'utf-8');
          const navExamples = JSON.parse(content) as NavigationExample[];
          examples.push(...navExamples);
        }
      }

      if (existsSync(extractionPath)) {
        const extFiles = await fs.readdir(extractionPath);
        for (const file of extFiles.filter(f => f.endsWith('.json'))) {
          const content = await fs.readFile(join(extractionPath, file), 'utf-8');
          const extExamples = JSON.parse(content) as ExtractionExample[];
          examples.push(...extExamples);
        }
      }

      this.logger.info(`Loaded ${examples.length} training examples for ${site}`);
      return examples;
    } catch (error) {
      this.logger.error(`Failed to load training examples for ${site}: ${error}`);
      return [];
    }
  }

  async saveModelMetadata(site: string, metadata: any): Promise<string> {
    const basePath = join('./models', site);
    await this.ensureDirectoryExists(basePath);

    const filename = 'metadata.json';
    const filepath = join(basePath, filename);

    await fs.writeFile(filepath, JSON.stringify(metadata, null, 2));
    this.logger.info(`Saved model metadata: ${filepath}`);

    return filepath;
  }

  async loadModelMetadata(site: string): Promise<any | null> {
    const filepath = join('./models', site, 'metadata.json');
    
    try {
      if (existsSync(filepath)) {
        const content = await fs.readFile(filepath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      this.logger.warn(`Failed to load model metadata for ${site}: ${error}`);
    }
    
    return null;
  }

  async saveScreenshot(data: Buffer, site: string, filename: string): Promise<string> {
    const basePath = join('./screenshots', site);
    await this.ensureDirectoryExists(basePath);

    const filepath = join(basePath, filename);
    await fs.writeFile(filepath, data);
    
    this.logger.debug(`Saved screenshot: ${filepath}`);
    return filepath;
  }

  async createCombinedTrainingFile(site: string): Promise<string> {
    const examples = await this.loadTrainingExamples(site);
    
    const dataset: TrainingDataset = {
      site,
      examples,
      metadata: {
        version: '1.0',
        createdAt: new Date(),
        totalExamples: examples.length,
        difficultyDistribution: this.calculateDifficultyDistribution(examples)
      }
    };

    return await this.saveTrainingDataset(site, dataset);
  }

  private calculateDifficultyDistribution(examples: TrainingExample[]): { easy: number; medium: number; hard: number } {
    const distribution = { easy: 0, medium: 0, hard: 0 };
    
    examples.forEach(example => {
      if ('metadata' in example && 'difficulty' in example.metadata) {
        const navExample = example as NavigationExample;
        distribution[navExample.metadata.difficulty]++;
      }
    });

    return distribution;
  }

  async cleanupOldFiles(site: string, maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const basePath = join('./training-data', site);
    const cutoffTime = Date.now() - maxAgeMs;

    try {
      await this.cleanupDirectory(basePath, cutoffTime);
      await this.cleanupDirectory(join('./screenshots', site), cutoffTime);
      this.logger.info(`Cleaned up old files for ${site}`);
    } catch (error) {
      this.logger.warn(`Failed to cleanup old files for ${site}: ${error}`);
    }
  }

  private async cleanupDirectory(dirPath: string, cutoffTime: number): Promise<void> {
    if (!existsSync(dirPath)) return;

    const files = await fs.readdir(dirPath);
    for (const file of files) {
      const filepath = join(dirPath, file);
      const stats = await fs.stat(filepath);
      
      if (stats.mtime.getTime() < cutoffTime) {
        await fs.unlink(filepath);
        this.logger.debug(`Deleted old file: ${filepath}`);
      }
    }
  }

  async exportTrainingData(site: string, format: 'json' | 'jsonl' = 'json'): Promise<string> {
    const examples = await this.loadTrainingExamples(site);
    const timestamp = Date.now();
    
    if (format === 'jsonl') {
      const jsonlContent = examples.map(example => JSON.stringify(example)).join('\n');
      const filepath = join('./exports', `${site}-${timestamp}.jsonl`);
      await this.ensureDirectoryExists(dirname(filepath));
      await fs.writeFile(filepath, jsonlContent);
      return filepath;
    } else {
      const filepath = join('./exports', `${site}-${timestamp}.json`);
      await this.ensureDirectoryExists(dirname(filepath));
      await fs.writeFile(filepath, JSON.stringify(examples, null, 2));
      return filepath;
    }
  }
}