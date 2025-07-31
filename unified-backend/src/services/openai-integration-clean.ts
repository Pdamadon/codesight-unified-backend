import OpenAI from 'openai';
import { Logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/database';

// Import our modular services
import { SelectorStrategyServiceImpl } from './selectors/selector-strategy';
import { TrainingDataTransformerImpl } from './training/training-data-transformer';
import { VisionAnalysisServiceImpl } from './vision/vision-analysis';
import { CacheManagerServiceImpl } from './cache/cache-manager';

// Re-export interfaces for backward compatibility
export interface VisionAnalysisResult {
  analysis: string;
  userPsychology: UserPsychology;
  qualityScore: number;
  confidence: number;
  processingTime: number;
}

export interface UserPsychology {
  dominantPersonality: string;
  emotionalState: string;
  decisionMakingStyle: string;
  trustLevel: number;
  urgencyLevel: number;
  priceSensitivity: number;
  socialInfluence: number;
  insights: string[];
  behaviorPredictions: string[];
}

export interface TrainingData {
  messages: any[];
  visionAnalysis?: VisionAnalysisResult;
  userPsychology?: UserPsychology;
  navigationStrategy?: any;
  selectorReliability?: any[];
  pageStructure?: any;
  trainingValue: number;
  complexity: number;
}

export interface TrainingConfig {
  model: string;
  hyperparameters: {
    n_epochs: number;
    batch_size: number;
    learning_rate_multiplier: number;
  };
  suffix?: string;
}

/**
 * Thin Facade for OpenAI Integration
 * 
 * This is now a lightweight delegation layer that orchestrates
 * the modular services while maintaining backward compatibility.
 * 
 * Architecture: 
 * - Delegates training data transformation to TrainingDataTransformerService
 * - Delegates vision analysis to VisionAnalysisService  
 * - Delegates caching to CacheManagerService
 * - Delegates selector logic to SelectorStrategyService
 * - Keeps fine-tuning methods directly (no delegation needed)
 */
export class OpenAIIntegrationService {
  private openai: OpenAI;
  private logger: Logger;
  private prisma: PrismaClient;
  
  // Modular services
  private selectorStrategy: SelectorStrategyServiceImpl;
  private trainingTransformer: TrainingDataTransformerImpl;
  private visionAnalysis: VisionAnalysisServiceImpl;
  private cacheManager: CacheManagerServiceImpl;

  constructor() {
    this.logger = new Logger("OpenAIIntegration");
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.prisma = prisma;
    
    // Initialize modular services
    this.selectorStrategy = new SelectorStrategyServiceImpl();
    this.trainingTransformer = new TrainingDataTransformerImpl(this.selectorStrategy);
    this.visionAnalysis = new VisionAnalysisServiceImpl(this.openai, this.prisma);
    this.cacheManager = new CacheManagerServiceImpl(this.prisma);
  }

  // =================================
  // DELEGATED METHODS - Training Data
  // =================================

  /**
   * Generate comprehensive training data from session interactions
   * @param sessionData - Session data object OR session ID string
   * @param interactions - Enhanced interaction data array (optional if sessionData is object)
   * @returns Training data result with examples and metadata
   */
  async generateTrainingData(sessionData: any, interactions: any[] = []): Promise<any> {
    // Handle both old API (session object) and new API (sessionId + interactions)
    if (typeof sessionData === 'string') {
      // New API: sessionId + interactions
      console.log(`\n🎯 [OPENAI INTEGRATION] Starting training data generation for session ${sessionData}`);
      console.log(`📊 [OPENAI INTEGRATION] Input: ${interactions.length} interactions`);
      
      this.logger.info("Generating training data via TrainingDataTransformer", { 
        sessionId: sessionData, 
        interactionCount: interactions.length 
      });
      
      const result = await this.trainingTransformer.generateTrainingData(sessionData, interactions, { id: sessionData, config: {} });
      console.log(`✅ [OPENAI INTEGRATION] Generated ${result.examples.length} training examples`);
      return result;
    } else {
      // Old API: session object with embedded interactions (backward compatibility)
      const sessionId = sessionData.id;
      const sessionInteractions = sessionData.enhancedInteractions || sessionData.interactions || [];
      
      console.log(`\n🎯 [OPENAI INTEGRATION] Starting legacy training data generation for session ${sessionId}`);
      console.log(`📊 [OPENAI INTEGRATION] Input: ${sessionInteractions.length} interactions`);
      
      this.logger.info("Generating training data via TrainingDataTransformer (legacy API)", { 
        sessionId, 
        interactionCount: sessionInteractions.length 
      });
      
      // Parse config if it's a JsonValue from Prisma
      const parsedConfig = sessionData?.config ? 
        (typeof sessionData.config === 'object' ? sessionData.config as any : JSON.parse(sessionData.config as string)) : null;
      
      console.log('🎯 [OPENAI DEBUG] About to pass sessionData to training transformer:', {
        sessionId: sessionId,
        hasSessionData: !!sessionData,
        sessionDataKeys: sessionData ? Object.keys(sessionData) : 'none',
        hasConfig: !!sessionData?.config,
        configKeys: parsedConfig ? Object.keys(parsedConfig) : 'none',
        hasGeneratedTask: !!parsedConfig?.generatedTask,
        generatedTaskTitle: parsedConfig?.generatedTask?.title || 'none'
      });
      
      // Fix sessionData config parsing for training transformer
      const fixedSessionData = sessionData ? {
        ...sessionData,
        config: parsedConfig || sessionData.config
      } : sessionData;
      
      const result = await this.trainingTransformer.generateTrainingData(sessionId, sessionInteractions, fixedSessionData);
      console.log(`✅ [OPENAI INTEGRATION] Generated ${result.examples.length} training examples`);
      return result;
    }
  }

  /**
   * Transform session data into training examples  
   * @param sessionData - Raw session data from database
   * @returns Structured training examples
   */
  async transformSessionToTraining(sessionData: any): Promise<TrainingData> {
    this.logger.info("Transforming session to training data", { 
      sessionId: sessionData.id 
    });

    const interactions = sessionData.enhancedInteractions || sessionData.interactions || [];
    const result = await this.trainingTransformer.generateTrainingData(sessionData.id, interactions);
    
    // Transform to legacy format for backward compatibility
    return {
      messages: result.examples,
      visionAnalysis: undefined, // Will be populated by vision analysis if needed
      userPsychology: undefined,
      navigationStrategy: sessionData.navigationStrategy,
      selectorReliability: sessionData.selectorReliability,
      pageStructure: sessionData.pageStructure,
      trainingValue: this.calculateTrainingValue(result),
      complexity: this.calculateComplexity(sessionData)
    };
  }

  // =================================
  // DELEGATED METHODS - Vision Analysis  
  // =================================

  /**
   * Analyze screenshots with OpenAI Vision API
   * @param screenshots - Array of screenshot objects
   * @returns Vision analysis results
   */
  async analyzeScreenshots(screenshots: any[]): Promise<VisionAnalysisResult[]> {
    this.logger.info("Analyzing screenshots via VisionAnalysisService", { 
      count: screenshots.length 
    });
    
    return this.visionAnalysis.analyzeScreenshots(screenshots);
  }

  /**
   * Analyze single screenshot
   * @param screenshot - Screenshot object
   * @returns Vision analysis result
   */
  async analyzeScreenshot(screenshot: any): Promise<VisionAnalysisResult> {
    return this.visionAnalysis.analyzeScreenshot(screenshot);
  }

  /**
   * Advanced screenshot analysis with options
   */
  async analyzeScreenshotsAdvanced(screenshots: any[], options?: any): Promise<VisionAnalysisResult[]> {
    return this.visionAnalysis.analyzeScreenshotsAdvanced(screenshots, options);
  }

  // =================================
  // DELEGATED METHODS - Cache Management
  // =================================

  /**
   * Get cached analysis
   */
  async getCachedAnalysis(key: string, type: string): Promise<any> {
    return this.cacheManager.getCachedAnalysis(key, type);
  }

  /**
   * Cache analysis result
   */
  async cacheAnalysis(key: string, type: string, data: any): Promise<void> {
    return this.cacheManager.cacheAnalysis(key, type, data);
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    return this.cacheManager.getCacheStats();
  }

  // =================================
  // DIRECT METHODS - Fine-tuning (No Delegation)
  // =================================

  /**
   * Upload training file to OpenAI
   * @param data - Training data to upload
   * @param metadata - File metadata
   * @returns File ID
   */
  async uploadTrainingFile(data: any, metadata: any): Promise<string> {
    try {
      // Handle array of examples, convert to proper OpenAI format
      const examples = Array.isArray(data) ? data : (data.messages || []);
      
      const systemMessage = {
        role: "system",
        content: "You are a helpful AI agent that writes Playwright code to navigate e-commerce websites based on user tasks and DOM context. You understand semantic journey context, shopping flows, product configuration states, and can generate reliable selectors for automated interactions."
      };
      
      const fineTuningExamples = examples.map((example: any) => {
        // If already in messages format, return as-is
        if (example.messages && Array.isArray(example.messages)) {
          return example;
        }
        
        // Convert prompt/completion format to messages format
        if (example.prompt && example.completion) {
          return {
            messages: [
              systemMessage,
              {
                role: "user",
                content: example.prompt
              },
              {
                role: "assistant", 
                content: example.completion
              }
            ]
          };
        }
        
        // Skip malformed examples
        this.logger.warn("Skipping malformed training example", { example: Object.keys(example) });
        return null;
      }).filter(Boolean); // Remove null entries
      
      const jsonlContent = fineTuningExamples.map((example: any) => JSON.stringify(example)).join('\n');
      
      // Validate format before upload
      this.logger.info("Training data conversion completed", { 
        originalCount: examples.length,
        convertedCount: fineTuningExamples.length,
        sampleKeys: examples[0] ? Object.keys(examples[0]) : [],
        hasMessages: fineTuningExamples[0]?.messages ? true : false
      });
      
      // Validate first example structure
      if (fineTuningExamples.length > 0) {
        const firstExample = fineTuningExamples[0];
        if (!firstExample.messages || !Array.isArray(firstExample.messages) || firstExample.messages.length < 2) {
          throw new Error(`Invalid training data format. First example: ${JSON.stringify(firstExample, null, 2)}`);
        }
        
        const hasSystemMsg = firstExample.messages.some((msg: any) => msg.role === 'system');
        const hasUserMsg = firstExample.messages.some((msg: any) => msg.role === 'user');
        const hasAssistantMsg = firstExample.messages.some((msg: any) => msg.role === 'assistant');
        
        if (!hasSystemMsg || !hasUserMsg || !hasAssistantMsg) {
          throw new Error(`Missing required message roles. System: ${hasSystemMsg}, User: ${hasUserMsg}, Assistant: ${hasAssistantMsg}`);
        }
      }
      
      const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
      const fileObject = Object.assign(blob, {
        name: 'training-data.jsonl',
        lastModified: Date.now()
      });
      
      const file = await this.openai.files.create({
        file: fileObject,
        purpose: 'fine-tune'
      });

      this.logger.info("Training file uploaded", { fileId: file.id, size: jsonlContent.length });
      return file.id;
    } catch (error) {
      this.logger.error("Training file upload failed", error);
      throw error;
    }
  }

  /**
   * Create fine-tuning job
   * @param fileId - Training file ID
   * @param config - Training configuration
   * @returns Job ID
   */
  async createFineTuningJob(fileId: string, config: TrainingConfig): Promise<string> {
    try {
      const job = await this.openai.fineTuning.jobs.create({
        training_file: fileId,
        model: config.model || 'gpt-4o-mini-2024-07-18',
        hyperparameters: config.hyperparameters,
        suffix: config.suffix
      });

      this.logger.info("Fine-tuning job created", { jobId: job.id, fileId });
      return job.id;
    } catch (error) {
      this.logger.error("Fine-tuning job creation failed", error);
      throw error;
    }
  }

  /**
   * Monitor fine-tuning job progress
   * @param jobId - Job ID to monitor
   * @returns Job status
   */
  async monitorTraining(jobId: string): Promise<any> {
    try {
      const job = await this.openai.fineTuning.jobs.retrieve(jobId);
      
      this.logger.info("Training job status", {
        jobId,
        status: job.status,
        trainedTokens: job.trained_tokens,
        createdAt: job.created_at
      });

      return {
        status: job.status,
        progress: this.calculateTrainingProgress(job),
        trainedTokens: job.trained_tokens,
        estimatedFinish: job.estimated_finish,
        error: job.error,
        hyperparameters: job.hyperparameters,
        resultFiles: job.result_files
      };
    } catch (error) {
      this.logger.error("Training monitoring failed", error);
      throw error;
    }
  }

  /**
   * List all fine-tuning jobs
   * @returns Array of job summaries
   */
  async listFineTuningJobs(): Promise<any[]> {
    try {
      const jobs = await this.openai.fineTuning.jobs.list();
      return jobs.data.map(job => ({
        id: job.id,
        status: job.status,
        model: job.model,
        createdAt: job.created_at,
        finishedAt: job.finished_at,
        trainedTokens: job.trained_tokens
      }));
    } catch (error) {
      this.logger.error("Failed to list fine-tuning jobs", error);
      throw error;
    }
  }

  /**
   * Cancel fine-tuning job
   * @param jobId - Job ID to cancel
   */
  async cancelFineTuningJob(jobId: string): Promise<void> {
    try {
      await this.openai.fineTuning.jobs.cancel(jobId);
      this.logger.info("Fine-tuning job cancelled", { jobId });
    } catch (error) {
      this.logger.error("Failed to cancel fine-tuning job", error);
      throw error;
    }
  }

  // =================================
  // HELPER METHODS
  // =================================

  private calculateTrainingValue(result: any): number {
    if (!result.examples || result.examples.length === 0) return 0;
    
    const avgQuality = result.examples.reduce((sum: number, ex: any) => sum + (ex.quality?.score || 0), 0) / result.examples.length;
    return Math.round(avgQuality * 100);
  }

  private calculateComplexity(sessionData: any): number {
    let complexity = 10; // Base complexity
    
    if (sessionData.interactions?.length > 5) complexity += 20;
    if (sessionData.screenshots?.length > 3) complexity += 15;
    if (sessionData.navigationStrategy?.efficiency < 0.5) complexity += 15;
    
    return Math.max(0, Math.min(100, complexity));
  }

  private calculateTrainingProgress(job: any): number {
    if (job.status === 'succeeded') return 100;
    if (job.status === 'failed' || job.status === 'cancelled') return 0;
    if (job.status === 'running' && job.trained_tokens) {
      // Rough estimate based on trained tokens
      return Math.min(90, (job.trained_tokens / 10000) * 100);
    }
    if (job.status === 'validating_files') return 10;
    if (job.status === 'queued') return 5;
    return 0;
  }

  // =================================
  // SERVICE ACCESS (For Advanced Use)
  // =================================

  /**
   * Get direct access to modular services for advanced usage
   */
  get services() {
    return {
      selectorStrategy: this.selectorStrategy,
      trainingTransformer: this.trainingTransformer,
      visionAnalysis: this.visionAnalysis,
      cacheManager: this.cacheManager
    };
  }

  /**
   * Health check for the OpenAI integration service
   */
  async healthCheck(): Promise<{ status: string; services: any }> {
    try {
      const cacheStats = await this.cacheManager.getCacheStats();
      
      return {
        status: 'healthy',
        services: {
          openai: 'connected',
          cache: `${cacheStats.activeEntries} active entries`,
          modules: {
            selectorStrategy: 'loaded',
            trainingTransformer: 'loaded',
            visionAnalysis: 'loaded',
            cacheManager: 'loaded'
          }
        }
      };
    } catch (error) {
      return {
        status: 'degraded',
        services: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}