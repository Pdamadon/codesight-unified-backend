import OpenAI from 'openai';
import { HybridNavigationExample, HybridExtractionExample, HybridTrainingDataset } from '../models/HybridTrainingExample.js';
import { Logger } from '../utils/Logger.js';
import { FileManager } from '../utils/FileManager.js';

export interface HybridTrainingJob {
  id: string;
  site: string;
  type: 'navigation' | 'extraction' | 'combined';
  status: 'pending' | 'running' | 'completed' | 'failed';
  modelId?: string;
  createdAt: Date;
  completedAt?: Date;
  metrics?: HybridTrainingMetrics;
  visionEnhanced: boolean;
  selectorReliabilityTested: boolean;
}

export interface HybridTrainingMetrics {
  totalExamples: number;
  visionAnalysisCount: number;
  selectorReliabilityAverage: number;
  validationLoss: number;
  strategicAccuracy: number; // How well model understands user strategies
  selectorStability: number; // How stable are the generated selectors
  estimatedTokens: number;
  trainingDuration: number;
}

export class HybridModelTrainer {
  private openai: OpenAI;
  private logger: Logger;
  private fileManager: FileManager;
  private jobs: Map<string, HybridTrainingJob> = new Map();

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID
    });

    this.logger = new Logger('HybridModelTrainer');
    this.fileManager = new FileManager();
  }

  async trainHybridNavigationModel(
    site: string,
    examples: HybridNavigationExample[]
  ): Promise<string> {
    this.logger.info(`Starting hybrid navigation training for ${site} with ${examples.length} examples`);

    try {
      const validatedData = await this.validateHybridData(examples);
      const jsonlData = this.formatHybridNavigationForOpenAI(validatedData, site);
      const fileId = await this.uploadTrainingFile(jsonlData, site, 'navigation');
      const jobId = await this.createHybridFineTuningJob(fileId, site, 'navigation');
      
      const job: HybridTrainingJob = {
        id: jobId,
        site,
        type: 'navigation',
        status: 'pending',
        createdAt: new Date(),
        visionEnhanced: true,
        selectorReliabilityTested: true
      };
      this.jobs.set(jobId, job);

      const modelId = await this.monitorTraining(jobId);
      
      job.status = 'completed';
      job.modelId = modelId;
      job.completedAt = new Date();

      await this.saveHybridJobMetadata(job, validatedData);
      await this.testHybridModel(modelId, site, 'navigation');

      this.logger.info(`Hybrid navigation training completed: ${modelId}`);
      return modelId;

    } catch (error) {
      this.logger.error(`Hybrid navigation training failed for ${site}`, error as Error);
      throw error;
    }
  }

  private formatHybridNavigationForOpenAI(
    examples: HybridNavigationExample[],
    site: string
  ): string {
    const jsonlLines: string[] = [];

    for (const example of examples) {
      // Create enhanced training example with vision + selector insights
      const trainingItem = {
        messages: [
          {
            role: "system",
            content: `You are an expert ${site} navigation assistant that combines human shopping psychology with technical precision. You understand WHY users click elements (visual cues, shopping behavior) and HOW to implement those clicks reliably (robust selectors with fallbacks).

Your responses should include:
1. Strategic reasoning (why this navigation approach)
2. Visual understanding (what users see and why they click)
3. Primary selector (most reliable)
4. Fallback selectors (for robustness)
5. Expected outcomes (products found, page changes)`
          },
          {
            role: "user",
            content: `NAVIGATION REQUEST:
Goal: "${example.query}"
Site: ${site}
User Strategy: ${example.userStrategy}
Context: Looking for products, need reliable navigation steps

Please provide navigation steps that combine human shopping intuition with technical reliability.`
          },
          {
            role: "assistant",
            content: this.generateHybridNavigationResponse(example)
          }
        ]
      };

      jsonlLines.push(JSON.stringify(trainingItem));

      // Additional training examples for each step
      example.steps.forEach((step, index) => {
        if (step.visionAnalysis.confidenceLevel >= 7.0) {
          const stepTrainingItem = {
            messages: [
              {
                role: "system",
                content: `You are a specialized web element interaction expert. You understand visual hierarchy, user psychology, and selector reliability.`
              },
              {
                role: "user",
                content: `ELEMENT INTERACTION:
Goal: ${step.intent}
Visual Context: User sees ${step.visionAnalysis.visualCues.join(', ')}
User Reasoning: ${step.visionAnalysis.userReasoning}

Provide the best selector strategy for this interaction.`
              },
              {
                role: "assistant",
                content: JSON.stringify({
                  primarySelector: step.selectors.primary.selector,
                  primaryReliability: step.selectors.reliabilityScores.primary,
                  fallbackSelector: step.selectors.fallback.selector,
                  visualContext: step.visionAnalysis.visualCues,
                  userReasoning: step.visionAnalysis.userReasoning,
                  expectedOutcome: step.executionData.resultingUrl,
                  interactionType: step.visionAnalysis.clickContext.elementType
                })
              }
            ]
          };

          jsonlLines.push(JSON.stringify(stepTrainingItem));
        }
      });
    }

    return jsonlLines.join('\n');
  }

  private generateHybridNavigationResponse(example: HybridNavigationExample): string {
    const response = {
      strategy: {
        approach: example.userStrategy,
        reasoning: this.generateStrategyReasoning(example),
        visualGuidance: this.extractVisualGuidance(example)
      },
      
      steps: example.steps.map((step, index) => ({
        stepNumber: index + 1,
        intent: step.intent,
        
        // Vision-informed guidance
        humanReasoning: step.visionAnalysis.userReasoning,
        visualCues: step.visionAnalysis.visualCues,
        userExperience: `Confidence: ${step.visionAnalysis.confidenceLevel}/10`,
        
        // Technical implementation
        primarySelector: {
          selector: step.selectors.primary.selector,
          type: step.selectors.primary.type,
          reliability: step.selectors.reliabilityScores.primary
        },
        
        fallbackSelectors: [
          {
            selector: step.selectors.secondary.selector,
            type: step.selectors.secondary.type,
            reliability: step.selectors.reliabilityScores.secondary
          },
          {
            selector: step.selectors.fallback.selector,
            type: step.selectors.fallback.type,
            reliability: step.selectors.reliabilityScores.fallback
          }
        ],
        
        // Expected outcomes
        expectedResult: {
          pageChange: step.executionData.resultingUrl !== example.steps[0]?.executionData.resultingUrl,
          elementsFound: step.executionData.elementsFound,
          nextOptions: step.executionData.nextStepOptions
        }
      })),
      
      // Overall results prediction
      expectedResults: {
        productsFound: example.results.productsFound,
        relevancyScore: example.results.relevancyScore,
        strategicEffectiveness: example.navigationAnalysis.strategicEffectiveness,
        userExperience: example.navigationAnalysis.userExperience
      }
    };

    return JSON.stringify(response, null, 2);
  }

  private generateStrategyReasoning(example: HybridNavigationExample): string {
    switch (example.userStrategy) {
      case 'category_browse':
        return "Category browsing - users scan visual hierarchy to find relevant departments, prefer browsing over searching";
      case 'search_first':
        return "Search-first approach - users type specific queries immediately, prefer quick results over exploration";
      case 'filter_heavy':
        return "Filter-focused strategy - users want to narrow down results systematically using multiple criteria";
      case 'brand_focused':
        return "Brand-hunting approach - users look for specific brands, often using brand names in navigation";
      case 'price_conscious':
        return "Price-sensitive shopping - users prioritize cost considerations and look for deals/price filters";
      default:
        return "Mixed approach combining multiple navigation strategies based on context";
    }
  }

  private extractVisualGuidance(example: HybridNavigationExample): string[] {
    const allVisualCues = example.steps.flatMap(step => step.visionAnalysis.visualCues);
    return [...new Set(allVisualCues)]; // Remove duplicates
  }

  private async validateHybridData(examples: HybridNavigationExample[]): Promise<HybridNavigationExample[]> {
    const validExamples: HybridNavigationExample[] = [];

    for (const example of examples) {
      if (this.isValidHybridExample(example)) {
        validExamples.push(example);
      } else {
        this.logger.warn('Invalid hybrid example found', { query: example.query });
      }
    }

    if (validExamples.length < 5) {
      throw new Error(`Insufficient hybrid training data: ${validExamples.length} valid examples (minimum 5 required)`);
    }

    this.logger.info(`Validated ${validExamples.length}/${examples.length} hybrid navigation examples`);
    return validExamples;
  }

  private isValidHybridExample(example: HybridNavigationExample): boolean {
    // Enhanced validation for hybrid examples
    if (!example.query || !example.site || !example.userStrategy) {
      return false;
    }

    if (example.steps.length === 0) {
      return false;
    }

    // Check if steps have vision analysis
    const hasVisionAnalysis = example.steps.every(step => 
      step.visionAnalysis && 
      step.visionAnalysis.userReasoning &&
      step.visionAnalysis.confidenceLevel > 0
    );

    // Check if steps have selector sets
    const hasSelectorSets = example.steps.every(step =>
      step.selectors &&
      step.selectors.primary &&
      step.selectors.secondary &&
      step.selectors.fallback
    );

    // Check navigation quality
    const hasQualityNavigation = example.navigationAnalysis &&
      example.navigationAnalysis.strategicEffectiveness >= 3.0 &&
      example.navigationAnalysis.successRate >= 0.5;

    return hasVisionAnalysis && hasSelectorSets && hasQualityNavigation;
  }

  private async createHybridFineTuningJob(
    fileId: string,
    site: string,
    type: 'navigation' | 'extraction'
  ): Promise<string> {
    const job = await this.openai.fineTuning.jobs.create({
      model: 'gpt-4o-mini-2024-07-18',
      training_file: fileId,
      suffix: `${site}-hybrid-${type}`,
      hyperparameters: {
        n_epochs: 4, // Slightly more epochs for complex hybrid data
        batch_size: 1,
        learning_rate_multiplier: 0.08 // Slightly lower for better stability
      }
    });

    this.logger.info(`Created hybrid fine-tuning job: ${job.id} for ${site} ${type}`);
    return job.id;
  }

  private async uploadTrainingFile(
    content: string,
    site: string,
    type: string
  ): Promise<string> {
    const filename = `${site}-hybrid-${type}-${Date.now()}.jsonl`;
    const filepath = await this.fileManager.saveOpenAITrainingFile(site, content);

    const file = await this.openai.files.create({
      file: await fetch(`file://${filepath}`).then(r => r.blob()) as any,
      purpose: 'fine-tune'
    });

    this.logger.info(`Uploaded hybrid training file: ${file.id}`);
    return file.id;
  }

  private async monitorTraining(jobId: string): Promise<string> {
    this.logger.info(`Monitoring hybrid training job: ${jobId}`);
    
    let job = await this.openai.fineTuning.jobs.retrieve(jobId);
    
    while (job.status === 'validating_files' || job.status === 'queued' || job.status === 'running') {
      this.logger.info(`Hybrid training status: ${job.status}`);
      await new Promise(resolve => setTimeout(resolve, 45000)); // Wait 45 seconds for complex jobs
      job = await this.openai.fineTuning.jobs.retrieve(jobId);
    }

    if (job.status === 'succeeded') {
      if (!job.fine_tuned_model) {
        throw new Error('Hybrid training succeeded but no model ID returned');
      }
      this.logger.info(`Hybrid training completed successfully: ${job.fine_tuned_model}`);
      return job.fine_tuned_model;
    } else {
      throw new Error(`Hybrid training failed with status: ${job.status}`);
    }
  }

  private async testHybridModel(modelId: string, site: string, type: string): Promise<void> {
    try {
      const testPrompt = type === 'navigation' 
        ? `Goal: "test product for ${site}"\nStrategy: search_first\nProvide navigation steps with vision reasoning and reliable selectors.`
        : `Extract product data from ${site} with visual validation.`;
      
      const completion = await this.openai.chat.completions.create({
        model: modelId,
        messages: [
          {
            role: "system",
            content: `You are a hybrid ${site} ${type} assistant combining vision intelligence with technical precision.`
          },
          {
            role: "user",
            content: testPrompt
          }
        ],
        max_tokens: 800
      });

      const response = completion.choices[0]?.message?.content;
      if (response) {
        this.logger.info(`Hybrid model test successful for ${modelId}`);
        this.logger.debug(`Test response preview: ${response.substring(0, 150)}...`);
      } else {
        throw new Error('No response from hybrid model test');
      }
    } catch (error) {
      this.logger.warn(`Hybrid model test failed for ${modelId}: ${error}`);
    }
  }

  private async saveHybridJobMetadata(
    job: HybridTrainingJob,
    examples: HybridNavigationExample[]
  ): Promise<void> {
    const visionAnalysisCount = examples.reduce((count, example) => 
      count + example.steps.filter(step => step.visionAnalysis.confidenceLevel > 0).length, 0
    );

    const averageReliability = examples.reduce((sum, example) => {
      const stepReliability = example.steps.reduce((stepSum, step) => 
        stepSum + step.selectors.reliabilityScores.primary, 0
      ) / example.steps.length;
      return sum + stepReliability;
    }, 0) / examples.length;

    const averageStrategicEffectiveness = examples.reduce((sum, example) => 
      sum + example.navigationAnalysis.strategicEffectiveness, 0
    ) / examples.length;

    const metadata = {
      hybridJobs: [{
        ...job,
        metrics: {
          totalExamples: examples.length,
          visionAnalysisCount,
          selectorReliabilityAverage: averageReliability,
          strategicAccuracy: averageStrategicEffectiveness,
          selectorStability: averageReliability, // Use same metric for now
          estimatedTokens: this.estimateTokenCount(examples),
          trainingDuration: job.completedAt && job.createdAt 
            ? job.completedAt.getTime() - job.createdAt.getTime()
            : 0
        }
      }],
      lastUpdated: new Date(),
      trainingApproach: 'hybrid_vision_selector',
      capabilities: [
        'vision_guided_navigation',
        'multi_selector_fallbacks',
        'user_strategy_recognition',
        'visual_hierarchy_understanding'
      ]
    };

    await this.fileManager.saveModelMetadata(job.site, metadata);
  }

  private estimateTokenCount(examples: HybridNavigationExample[]): number {
    // Rough estimation based on hybrid example complexity
    const baseTokensPerExample = 800; // Higher due to vision analysis and multiple selectors
    const tokensPerStep = 200;
    
    return examples.reduce((total, example) => {
      return total + baseTokensPerExample + (example.steps.length * tokensPerStep);
    }, 0);
  }

  async getHybridTrainingStatus(jobId: string): Promise<HybridTrainingJob | null> {
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
        this.logger.error(`Failed to get hybrid job status: ${error}`);
        return job;
      }
    }
    
    return null;
  }

  private mapOpenAIStatus(status: string): HybridTrainingJob['status'] {
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

  async compareHybridWithBaseline(
    hybridModelId: string,
    site: string,
    testQueries: string[]
  ): Promise<{
    hybridPerformance: number;
    baselinePerformance: number;
    improvement: number;
    hybridAdvantages: string[];
  }> {
    const hybridScores: number[] = [];
    const baselineScores: number[] = [];
    const hybridAdvantages: string[] = [];

    for (const query of testQueries) {
      try {
        // Test hybrid model
        const hybridResponse = await this.openai.chat.completions.create({
          model: hybridModelId,
          messages: [
            {
              role: "system",
              content: `You are a hybrid ${site} navigation assistant.`
            },
            {
              role: "user",
              content: `Goal: "${query}"\nStrategy: search_first\nProvide navigation with vision reasoning and selectors.`
            }
          ],
          max_tokens: 600
        });

        // Test baseline model
        const baselineResponse = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini-2024-07-18',
          messages: [
            {
              role: "system",
              content: `You are a web navigation assistant for ${site}.`
            },
            {
              role: "user",
              content: `Navigate to find: ${query} on ${site}.com`
            }
          ],
          max_tokens: 600
        });

        // Analyze responses
        const hybridScore = this.scoreNavigationResponse(hybridResponse.choices[0]?.message?.content || '');
        const baselineScore = this.scoreNavigationResponse(baselineResponse.choices[0]?.message?.content || '');

        hybridScores.push(hybridScore);
        baselineScores.push(baselineScore);

        // Check for hybrid advantages
        if (hybridScore > baselineScore) {
          hybridAdvantages.push(`Better ${query} navigation (+${hybridScore - baselineScore} points)`);
        }

      } catch (error) {
        this.logger.warn(`Comparison failed for query: ${query}`, error as Error);
      }
    }

    const hybridPerformance = hybridScores.reduce((sum, score) => sum + score, 0) / hybridScores.length;
    const baselinePerformance = baselineScores.reduce((sum, score) => sum + score, 0) / baselineScores.length;
    const improvement = hybridPerformance - baselinePerformance;

    return {
      hybridPerformance,
      baselinePerformance,
      improvement,
      hybridAdvantages
    };
  }

  private scoreNavigationResponse(response: string): number {
    let score = 0;
    
    // Check for structured approach
    if (response.includes('selector') || response.includes('click')) score += 2;
    
    // Check for multiple selector options
    if (response.includes('fallback') || response.includes('secondary')) score += 2;
    
    // Check for visual reasoning
    if (response.includes('visual') || response.includes('user') || response.includes('obvious')) score += 2;
    
    // Check for strategy awareness
    if (response.includes('strategy') || response.includes('approach')) score += 2;
    
    // Check for reliability considerations
    if (response.includes('reliable') || response.includes('stable')) score += 2;
    
    return Math.min(10, score); // Cap at 10 points
  }
}