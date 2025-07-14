import OpenAI from 'openai';
import { TrainingExample, NavigationExample, ExtractionExample } from '../models/TrainingExample.js';
import { Logger } from '../utils/Logger.js';
import { FileManager } from '../utils/FileManager.js';

export interface TrainingJob {
  id: string;
  site: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  modelId?: string;
  createdAt: Date;
  completedAt?: Date;
  metrics?: TrainingMetrics;
}

export interface TrainingMetrics {
  totalExamples: number;
  validationLoss: number;
  accuracy?: number;
  estimatedTokens: number;
  trainingDuration: number;
}

export class ModelTrainer {
  private openai: OpenAI;
  private logger: Logger;
  private fileManager: FileManager;
  private jobs: Map<string, TrainingJob> = new Map();

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID
    });

    this.logger = new Logger('ModelTrainer');
    this.fileManager = new FileManager();
  }

  async trainSiteModel(site: string, examples: TrainingExample[]): Promise<string> {
    this.logger.logTrainingStart(site, examples.length);

    try {
      const validatedData = await this.validateTrainingData(examples);
      const jsonlData = this.formatForOpenAI(validatedData, site);
      const fileId = await this.uploadTrainingFile(jsonlData, site);
      const jobId = await this.createFineTuningJob(fileId, site);
      
      const job: TrainingJob = {
        id: jobId,
        site,
        status: 'pending',
        createdAt: new Date()
      };
      this.jobs.set(jobId, job);

      const modelId = await this.monitorTraining(jobId);
      
      job.status = 'completed';
      job.modelId = modelId;
      job.completedAt = new Date();

      await this.saveJobMetadata(job);
      await this.testModel(modelId, site);

      this.logger.logTrainingComplete(site, modelId);
      return modelId;
    } catch (error) {
      this.logger.logError('Model training', error as Error, { site });
      throw error;
    }
  }

  private async validateTrainingData(examples: TrainingExample[]): Promise<TrainingExample[]> {
    const validExamples: TrainingExample[] = [];

    for (const example of examples) {
      if (this.isValidExample(example)) {
        validExamples.push(example);
      } else {
        this.logger.warn('Invalid training example found', { example });
      }
    }

    if (validExamples.length < 10) {
      throw new Error(`Insufficient training data: ${validExamples.length} valid examples (minimum 10 required)`);
    }

    this.logger.info(`Validated ${validExamples.length}/${examples.length} training examples`);
    return validExamples;
  }

  private isValidExample(example: TrainingExample): boolean {
    if (!example.site || !example.metadata) {
      return false;
    }

    if ('steps' in example) {
      const navExample = example as NavigationExample;
      return navExample.goal && 
             navExample.startUrl && 
             navExample.steps.length > 0 &&
             navExample.expectedProducts >= 0;
    }

    if ('extractionCode' in example) {
      const extExample = example as ExtractionExample;
      return extExample.url && 
             extExample.extractionCode && 
             extExample.expectedData.length > 0;
    }

    return false;
  }

  private formatForOpenAI(examples: TrainingExample[], site: string): string {
    const jsonlLines: string[] = [];

    for (const example of examples) {
      if ('steps' in example) {
        const navExample = example as NavigationExample;
        const trainingItem = {
          messages: [
            {
              role: "system",
              content: `You are a specialized web navigation assistant for ${site}. Your task is to provide step-by-step navigation instructions to find products.`
            },
            {
              role: "user", 
              content: `Navigate to find: ${navExample.goal}`
            },
            {
              role: "assistant",
              content: JSON.stringify({
                steps: navExample.steps.map(step => ({
                  action: step.action,
                  selector: step.selector,
                  value: step.value,
                  description: step.description
                })),
                expectedProducts: navExample.expectedProducts,
                category: navExample.metadata.category,
                difficulty: navExample.metadata.difficulty
              })
            }
          ]
        };
        jsonlLines.push(JSON.stringify(trainingItem));
      }

      if ('extractionCode' in example) {
        const extExample = example as ExtractionExample;
        const trainingItem = {
          messages: [
            {
              role: "system",
              content: `You are a specialized product data extraction assistant for ${site}. Generate extraction code for the given targets.`
            },
            {
              role: "user",
              content: `Extract data for targets: ${extExample.targets.join(', ')} from URL: ${extExample.url}`
            },
            {
              role: "assistant",
              content: JSON.stringify({
                extractionCode: extExample.extractionCode,
                expectedFields: extExample.targets,
                sampleData: extExample.expectedData.slice(0, 3),
                framework: extExample.metadata.framework
              })
            }
          ]
        };
        jsonlLines.push(JSON.stringify(trainingItem));
      }
    }

    return jsonlLines.join('\n');
  }

  private async uploadTrainingFile(content: string, site: string): Promise<string> {
    const filename = `${site}-training-${Date.now()}.jsonl`;
    const filepath = await this.fileManager.saveOpenAITrainingFile(site, content);

    const file = await this.openai.files.create({
      file: await fetch(`file://${filepath}`).then(r => r.blob()) as any,
      purpose: 'fine-tune'
    });

    this.logger.info(`Uploaded training file: ${file.id}`);
    return file.id;
  }

  private async createFineTuningJob(fileId: string, site: string): Promise<string> {
    const job = await this.openai.fineTuning.jobs.create({
      model: 'gpt-4o-mini-2024-07-18',
      training_file: fileId,
      suffix: `${site}-nav`,
      hyperparameters: {
        n_epochs: 3,
        batch_size: 1,
        learning_rate_multiplier: 0.1
      }
    });

    this.logger.info(`Created fine-tuning job: ${job.id} for ${site}`);
    return job.id;
  }

  private async monitorTraining(jobId: string): Promise<string> {
    this.logger.info(`Monitoring training job: ${jobId}`);
    
    let job = await this.openai.fineTuning.jobs.retrieve(jobId);
    
    while (job.status === 'validating_files' || job.status === 'queued' || job.status === 'running') {
      this.logger.info(`Training status: ${job.status}`);
      await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
      job = await this.openai.fineTuning.jobs.retrieve(jobId);
    }

    if (job.status === 'succeeded') {
      if (!job.fine_tuned_model) {
        throw new Error('Training succeeded but no model ID returned');
      }
      this.logger.info(`Training completed successfully: ${job.fine_tuned_model}`);
      return job.fine_tuned_model;
    } else {
      throw new Error(`Training failed with status: ${job.status}`);
    }
  }

  private async testModel(modelId: string, site: string): Promise<void> {
    try {
      const testPrompt = `Navigate to find: test product for ${site}`;
      
      const completion = await this.openai.chat.completions.create({
        model: modelId,
        messages: [
          {
            role: "system",
            content: `You are a specialized web navigation assistant for ${site}.`
          },
          {
            role: "user",
            content: testPrompt
          }
        ],
        max_tokens: 500
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        this.logger.info(`Model test successful for ${modelId}`);
        this.logger.debug(`Test response: ${response.substring(0, 100)}...`);
      } else {
        throw new Error('No response from model test');
      }
    } catch (error) {
      this.logger.warn(`Model test failed for ${modelId}: ${error}`);
    }
  }

  private async saveJobMetadata(job: TrainingJob): Promise<void> {
    const metadata = {
      jobs: [job],
      lastUpdated: new Date()
    };

    await this.fileManager.saveModelMetadata(job.site, metadata);
  }

  async getTrainingStatus(jobId: string): Promise<TrainingJob | null> {
    if (this.jobs.has(jobId)) {
      const job = this.jobs.get(jobId)!;
      
      try {
        const openaiJob = await this.openai.fineTuning.jobs.retrieve(jobId);
        job.status = this.mapOpenAIStatus(openaiJob.status);
        
        if (openaiJob.fine_tuned_model) {
          job.modelId = openaiJob.fine_tuned_model;
        }
        
        return job;
      } catch (error) {
        this.logger.error(`Failed to get job status: ${error}`);
        return job;
      }
    }
    
    return null;
  }

  private mapOpenAIStatus(status: string): TrainingJob['status'] {
    switch (status) {
      case 'validating_files':
      case 'queued':
        return 'pending';
      case 'running':
        return 'running';
      case 'succeeded':
        return 'completed';
      case 'failed':
      case 'cancelled':
        return 'failed';
      default:
        return 'pending';
    }
  }

  async listModels(site?: string): Promise<string[]> {
    try {
      const models = await this.openai.models.list();
      const fineTunedModels = models.data
        .filter(model => model.id.includes('ft:') && (!site || model.id.includes(site)))
        .map(model => model.id);
      
      return fineTunedModels;
    } catch (error) {
      this.logger.error(`Failed to list models: ${error}`);
      return [];
    }
  }

  async deleteModel(modelId: string): Promise<boolean> {
    try {
      await this.openai.models.del(modelId);
      this.logger.info(`Deleted model: ${modelId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete model ${modelId}: ${error}`);
      return false;
    }
  }
}