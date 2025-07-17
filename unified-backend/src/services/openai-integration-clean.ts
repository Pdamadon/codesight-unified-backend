import OpenAI from 'openai';
import { Logger } from '../utils/logger';
import { prisma } from '../lib/database';

// Core interfaces for OpenAI integration
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

export class OpenAIIntegrationService {
  private openai: OpenAI;
  private logger: Logger;
  private prisma: PrismaClient;

  constructor() {
    this.logger = new Logger("OpenAIIntegration");
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.prisma = prisma;
  }

  // Vision API Integration - Core functionality
  async analyzeScreenshots(screenshots: any[]): Promise<VisionAnalysisResult[]> {
    const results: VisionAnalysisResult[] = [];

    for (const screenshot of screenshots) {
      try {
        const startTime = Date.now();
        
        // Check cache first
        const cached = await this.getCachedAnalysis(screenshot.id, 'comprehensive');
        if (cached) {
          results.push(cached);
          continue;
        }

        // Analyze with OpenAI Vision
        const analysis = await this.analyzeScreenshotWithVision(screenshot);
        
        // Extract psychology insights
        const userPsychology = this.extractPsychologyInsights(analysis);
        
        // Calculate quality score
        const qualityScore = this.calculateVisionQualityScore(analysis);
        
        const result: VisionAnalysisResult = {
          analysis,
          userPsychology,
          qualityScore,
          confidence: this.calculateConfidence(analysis),
          processingTime: Date.now() - startTime
        };

        // Cache the result
        await this.cacheAnalysis(screenshot.id, 'comprehensive', result);
        
        results.push(result);

      } catch (error) {
        this.logger.error("Screenshot analysis failed", { screenshotId: screenshot.id, error });
        
        // Return minimal result on error
        results.push({
          analysis: "Analysis failed",
          userPsychology: this.getDefaultPsychology(),
          qualityScore: 0,
          confidence: 0,
          processingTime: 0
        });
      }
    }

    return results;
  }

  // Single screenshot analysis method for compatibility
  async analyzeScreenshot(screenshot: any): Promise<VisionAnalysisResult> {
    const results = await this.analyzeScreenshots([screenshot]);
    return results[0];
  }

  private async analyzeScreenshotWithVision(screenshot: any): Promise<string> {
    const prompt = `Analyze this e-commerce screenshot and provide insights about:
1. User's shopping behavior and intent
2. Emotional state and decision-making style
3. Page structure and navigation patterns
4. Trust indicators and social proof elements
5. Price sensitivity and urgency signals

Focus on psychological insights that would help understand the user's shopping mindset.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: screenshot.dataUrl || screenshot.s3Url,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });

    return response.choices[0]?.message?.content || "No analysis available";
  }

  private extractPsychologyInsights(analysis: string): UserPsychology {
    const lowerAnalysis = analysis.toLowerCase();
    
    // Simple keyword-based psychology extraction
    const psychology: UserPsychology = {
      dominantPersonality: this.detectPersonality(lowerAnalysis),
      emotionalState: this.detectEmotionalState(lowerAnalysis),
      decisionMakingStyle: this.detectDecisionStyle(lowerAnalysis),
      trustLevel: this.extractTrustLevel(lowerAnalysis),
      urgencyLevel: this.extractUrgencyLevel(lowerAnalysis),
      priceSensitivity: this.extractPriceSensitivity(lowerAnalysis),
      socialInfluence: this.extractSocialInfluence(lowerAnalysis),
      insights: this.extractInsights(analysis),
      behaviorPredictions: this.generateBehaviorPredictions(analysis)
    };

    return psychology;
  }

  private detectPersonality(analysis: string): string {
    if (analysis.includes('research') || analysis.includes('compare') || analysis.includes('detail')) {
      return 'ANALYTICAL';
    }
    if (analysis.includes('quick') || analysis.includes('impulse') || analysis.includes('immediate')) {
      return 'IMPULSIVE';
    }
    if (analysis.includes('careful') || analysis.includes('cautious') || analysis.includes('hesitant')) {
      return 'CAUTIOUS';
    }
    if (analysis.includes('review') || analysis.includes('social') || analysis.includes('community')) {
      return 'SOCIAL';
    }
    return 'PRACTICAL';
  }

  private detectEmotionalState(analysis: string): string {
    if (analysis.includes('excited') || analysis.includes('enthusiastic') || analysis.includes('eager')) {
      return 'EXCITED';
    }
    if (analysis.includes('frustrated') || analysis.includes('confused') || analysis.includes('difficult')) {
      return 'FRUSTRATED';
    }
    if (analysis.includes('confident') || analysis.includes('decisive') || analysis.includes('sure')) {
      return 'CONFIDENT';
    }
    if (analysis.includes('uncertain') || analysis.includes('unsure') || analysis.includes('hesitant')) {
      return 'UNCERTAIN';
    }
    return 'NEUTRAL';
  }

  private detectDecisionStyle(analysis: string): string {
    if (analysis.includes('quick') || analysis.includes('fast') || analysis.includes('immediate')) {
      return 'QUICK';
    }
    if (analysis.includes('compare') || analysis.includes('comparison') || analysis.includes('versus')) {
      return 'COMPARISON_HEAVY';
    }
    if (analysis.includes('research') || analysis.includes('study') || analysis.includes('investigate')) {
      return 'RESEARCH_DRIVEN';
    }
    return 'DELIBERATE';
  }

  private extractTrustLevel(analysis: string): number {
    let score = 50; // baseline
    if (analysis.includes('trust') || analysis.includes('secure') || analysis.includes('verified')) score += 20;
    if (analysis.includes('suspicious') || analysis.includes('doubt') || analysis.includes('uncertain')) score -= 20;
    if (analysis.includes('review') || analysis.includes('rating') || analysis.includes('testimonial')) score += 15;
    return Math.max(0, Math.min(100, score));
  }

  private extractUrgencyLevel(analysis: string): number {
    let score = 30; // baseline
    if (analysis.includes('urgent') || analysis.includes('limited') || analysis.includes('hurry')) score += 30;
    if (analysis.includes('sale') || analysis.includes('discount') || analysis.includes('offer')) score += 20;
    if (analysis.includes('relaxed') || analysis.includes('browsing') || analysis.includes('casual')) score -= 15;
    return Math.max(0, Math.min(100, score));
  }

  private extractPriceSensitivity(analysis: string): number {
    let score = 40; // baseline
    if (analysis.includes('price') || analysis.includes('cost') || analysis.includes('cheap')) score += 25;
    if (analysis.includes('expensive') || analysis.includes('budget') || analysis.includes('afford')) score += 20;
    if (analysis.includes('premium') || analysis.includes('luxury') || analysis.includes('quality')) score -= 15;
    return Math.max(0, Math.min(100, score));
  }

  private extractSocialInfluence(analysis: string): number {
    let score = 35; // baseline
    if (analysis.includes('review') || analysis.includes('rating') || analysis.includes('social')) score += 25;
    if (analysis.includes('popular') || analysis.includes('trending') || analysis.includes('recommend')) score += 20;
    if (analysis.includes('independent') || analysis.includes('personal') || analysis.includes('own')) score -= 15;
    return Math.max(0, Math.min(100, score));
  }

  private extractInsights(analysis: string): string[] {
    const insights: string[] = [];
    const sentences = analysis.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Extract key insights from analysis
    sentences.forEach(sentence => {
      if (sentence.includes('user') || sentence.includes('customer') || sentence.includes('shopper')) {
        insights.push(sentence.trim());
      }
    });

    return insights.slice(0, 5); // Limit to top 5 insights
  }

  private generateBehaviorPredictions(analysis: string): string[] {
    const predictions: string[] = [];
    
    if (analysis.toLowerCase().includes('compare')) {
      predictions.push('Likely to compare multiple products before purchasing');
    }
    if (analysis.toLowerCase().includes('review')) {
      predictions.push('Will read reviews before making a decision');
    }
    if (analysis.toLowerCase().includes('price')) {
      predictions.push('Price-conscious and will look for deals');
    }
    if (analysis.toLowerCase().includes('quick') || analysis.toLowerCase().includes('fast')) {
      predictions.push('Prefers quick checkout and fast delivery');
    }
    
    return predictions;
  }

  private calculateVisionQualityScore(analysis: string): number {
    if (!analysis || analysis.length < 50) return 0;
    
    let score = 50; // baseline
    
    // Content quality indicators
    if (analysis.length > 200) score += 15;
    if (analysis.includes('user') || analysis.includes('customer')) score += 10;
    if (analysis.includes('psychology') || analysis.includes('behavior')) score += 15;
    if (analysis.includes('trust') || analysis.includes('emotion')) score += 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateConfidence(analysis: string): number {
    if (!analysis) return 0;
    
    let confidence = 60; // baseline
    
    // Confidence indicators
    if (analysis.includes('clearly') || analysis.includes('obviously')) confidence += 15;
    if (analysis.includes('appears') || analysis.includes('seems')) confidence -= 10;
    if (analysis.includes('uncertain') || analysis.includes('unclear')) confidence -= 20;
    if (analysis.length > 500) confidence += 10;
    
    return Math.max(0, Math.min(100, confidence));
  }

  private getDefaultPsychology(): UserPsychology {
    return {
      dominantPersonality: 'PRACTICAL',
      emotionalState: 'NEUTRAL',
      decisionMakingStyle: 'DELIBERATE',
      trustLevel: 50,
      urgencyLevel: 30,
      priceSensitivity: 40,
      socialInfluence: 35,
      insights: [],
      behaviorPredictions: []
    };
  }

  // Training Data Generation
  async generateTrainingData(sessionData: any): Promise<TrainingData> {
    try {
      const messages = await this.formatForOpenAI(sessionData);
      
      return {
        messages,
        visionAnalysis: sessionData.visionAnalysis,
        userPsychology: sessionData.userPsychology,
        navigationStrategy: sessionData.navigationStrategy,
        selectorReliability: sessionData.selectorReliability,
        pageStructure: sessionData.pageStructure,
        trainingValue: this.calculateTrainingValue(sessionData),
        complexity: this.calculateComplexity(sessionData)
      };
    } catch (error) {
      this.logger.error("Training data generation failed", error);
      throw error;
    }
  }

  private async formatForOpenAI(sessionData: any): Promise<any[]> {
    const messages = [];
    
    // System message with context
    messages.push({
      role: "system",
      content: `You are an AI assistant that helps users navigate e-commerce websites. 
      Based on the user's behavior and psychology profile, provide helpful guidance for finding and purchasing products.
      
      User Psychology Profile:
      - Personality: ${sessionData.userPsychology?.dominantPersonality || 'Unknown'}
      - Emotional State: ${sessionData.userPsychology?.emotionalState || 'Unknown'}
      - Decision Style: ${sessionData.userPsychology?.decisionMakingStyle || 'Unknown'}
      - Trust Level: ${sessionData.userPsychology?.trustLevel || 50}/100
      - Price Sensitivity: ${sessionData.userPsychology?.priceSensitivity || 50}/100`
    });

    // Add interaction-based messages
    if (sessionData.interactions) {
      for (const interaction of sessionData.interactions.slice(0, 10)) { // Limit for token efficiency
        messages.push({
          role: "user",
          content: `I ${interaction.type} on "${interaction.elementText || interaction.primarySelector}" at ${interaction.url}`
        });
        
        messages.push({
          role: "assistant",
          content: this.generateContextualResponse(interaction, sessionData.userPsychology)
        });
      }
    }

    return messages;
  }

  private generateContextualResponse(interaction: any, psychology: any): string {
    const responses = [
      `I can help you with that. Based on your ${psychology?.decisionMakingStyle || 'browsing'} style, here's what I recommend...`,
      `Great choice! Given your ${psychology?.emotionalState || 'current'} state, this seems like a good fit.`,
      `I notice you're looking at this carefully. That aligns with your ${psychology?.dominantPersonality || 'thoughtful'} approach.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private calculateTrainingValue(sessionData: any): number {
    let value = 50; // baseline
    
    if (sessionData.interactions?.length > 5) value += 20;
    if (sessionData.screenshots?.length > 3) value += 15;
    if (sessionData.userPsychology?.confidence > 70) value += 15;
    if (sessionData.qualityScore > 80) value += 20;
    
    return Math.max(0, Math.min(100, value));
  }

  private calculateComplexity(sessionData: any): number {
    let complexity = 30; // baseline
    
    if (sessionData.interactions?.length > 10) complexity += 25;
    if (sessionData.pageStructure?.complexity > 0.7) complexity += 20;
    if (sessionData.navigationStrategy?.efficiency < 0.5) complexity += 15;
    
    return Math.max(0, Math.min(100, complexity));
  }

  // File Management
  async uploadTrainingFile(data: any, metadata: any): Promise<string> {
    try {
      const jsonlContent = data.messages.map((msg: any) => JSON.stringify(msg)).join('\n');
      
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

  // Fine-tuning Job Management
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

  async monitorTraining(jobId: string): Promise<any> {
    try {
      const job = await this.openai.fineTuning.jobs.retrieve(jobId);
      return {
        id: job.id,
        status: job.status,
        model: job.fine_tuned_model,
        createdAt: job.created_at,
        finishedAt: job.finished_at,
        error: job.error
      };
    } catch (error) {
      this.logger.error("Training monitoring failed", error);
      throw error;
    }
  }

  // Cache Management
  private async getCachedAnalysis(screenshotId: string, analysisType: string): Promise<any> {
    try {
      const cached = await this.prisma.visionAnalysisCache.findFirst({
        where: {
          screenshotId,
          analysisType,
          expiresAt: { gt: new Date() }
        }
      });

      if (cached) {
        await this.prisma.visionAnalysisCache.update({
          where: { id: cached.id },
          data: { hitCount: { increment: 1 } }
        });
        return cached.analysisResult;
      }

      return null;
    } catch (error) {
      this.logger.error("Cache retrieval failed", error);
      return null;
    }
  }

  private async cacheAnalysis(screenshotId: string, analysisType: string, analysis: any): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour cache

      await this.prisma.visionAnalysisCache.create({
        data: {
          screenshotId,
          analysisType,
          analysisResult: analysis,
          qualityScore: analysis.qualityScore || 0,
          expiresAt,
          hitCount: 0
        }
      });
    } catch (error) {
      this.logger.error("Cache storage failed", error);
      // Don't throw - caching is optional
    }
  }

  // Advanced screenshot analysis method for psychology insights
  async analyzeScreenshotsAdvanced(screenshots: any[], options?: any): Promise<VisionAnalysisResult[]> {
    this.logger.info("Advanced screenshot analysis requested", { 
      count: screenshots.length, 
      type: options?.analysisType || 'standard' 
    });
    
    // For now, delegate to the standard analyzeScreenshots method
    // This maintains compatibility while using the existing implementation
    return await this.analyzeScreenshots(screenshots);
  }

  // Health check method for server monitoring
  async healthCheck(): Promise<string> {
    try {
      // Test OpenAI API connection with a simple request
      const models = await this.openai.models.list();
      return models.data.length > 0 ? 'connected' : 'degraded';
    } catch (error) {
      this.logger.error("OpenAI health check failed", error);
      return 'disconnected';
    }
  }
}