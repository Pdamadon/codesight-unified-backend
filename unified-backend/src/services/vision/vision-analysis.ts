import OpenAI from 'openai';
import { Logger } from '../../utils/logger';
import { PrismaClient } from '@prisma/client';

// Vision Analysis interfaces
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

export interface VisionAnalysisService {
  analyzeScreenshots(screenshots: any[]): Promise<VisionAnalysisResult[]>;
  analyzeScreenshot(screenshot: any): Promise<VisionAnalysisResult>;
  analyzeScreenshotsAdvanced(screenshots: any[], options?: any): Promise<VisionAnalysisResult[]>;
}

export class VisionAnalysisServiceImpl implements VisionAnalysisService {
  private openai: OpenAI;
  private logger: Logger;
  private prisma: PrismaClient;

  constructor(openai: OpenAI, prisma: PrismaClient) {
    this.openai = openai;
    this.prisma = prisma;
    this.logger = new Logger("VisionAnalysis");
  }

  // Core vision analysis method
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
        this.logger.error("Screenshot analysis failed", { 
          screenshotId: screenshot.id, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        
        // Add error result for consistency
        results.push({
          analysis: "Analysis failed due to error",
          userPsychology: this.getDefaultPsychology(),
          qualityScore: 0,
          confidence: 0,
          processingTime: 0
        });
      }
    }

    return results;
  }

  // Single screenshot analysis
  async analyzeScreenshot(screenshot: any): Promise<VisionAnalysisResult> {
    const results = await this.analyzeScreenshots([screenshot]);
    return results[0];
  }

  // Advanced screenshot analysis with options
  async analyzeScreenshotsAdvanced(screenshots: any[], options?: any): Promise<VisionAnalysisResult[]> {
    this.logger.info("Advanced screenshot analysis requested", { 
      count: screenshots.length, 
      options 
    });
    
    // For now, use the standard analysis - can be enhanced later
    return this.analyzeScreenshots(screenshots);
  }

  // Core OpenAI Vision API call
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

  // Extract psychology insights from analysis text
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

  // Cache management methods
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

  // Psychology extraction helpers
  private detectPersonality(analysis: string): string {
    const personalities = [
      { type: 'analytical', keywords: ['analyze', 'compare', 'research', 'detail', 'specification'] },
      { type: 'impulsive', keywords: ['quick', 'immediate', 'now', 'instant', 'fast'] },
      { type: 'social', keywords: ['review', 'rating', 'recommend', 'share', 'social'] },
      { type: 'practical', keywords: ['value', 'quality', 'durable', 'practical', 'useful'] }
    ];

    for (const personality of personalities) {
      if (personality.keywords.some(keyword => analysis.includes(keyword))) {
        return personality.type;
      }
    }
    
    return 'neutral';
  }

  private detectEmotionalState(analysis: string): string {
    const emotions = [
      { state: 'excited', keywords: ['excited', 'thrilled', 'enthusiastic', 'love', 'amazing'] },
      { state: 'anxious', keywords: ['worried', 'concerned', 'anxious', 'uncertain', 'hesitant'] },
      { state: 'confident', keywords: ['confident', 'sure', 'certain', 'decided', 'convinced'] },
      { state: 'frustrated', keywords: ['frustrated', 'annoyed', 'difficult', 'confusing', 'problems'] }
    ];

    for (const emotion of emotions) {
      if (emotion.keywords.some(keyword => analysis.includes(keyword))) {
        return emotion.state;
      }
    }
    
    return 'neutral';
  }

  private detectDecisionStyle(analysis: string): string {
    if (analysis.includes('research') || analysis.includes('compare')) return 'analytical';
    if (analysis.includes('quick') || analysis.includes('immediate')) return 'impulsive';
    if (analysis.includes('social') || analysis.includes('review')) return 'social';
    return 'balanced';
  }

  private extractTrustLevel(analysis: string): number {
    let score = 0.5; // Base trust level
    
    if (analysis.includes('trust') || analysis.includes('secure')) score += 0.2;
    if (analysis.includes('review') || analysis.includes('rating')) score += 0.1;
    if (analysis.includes('brand') || analysis.includes('reputation')) score += 0.1;
    if (analysis.includes('suspicious') || analysis.includes('doubt')) score -= 0.3;
    
    return Math.max(0, Math.min(1, score));
  }

  private extractUrgencyLevel(analysis: string): number {
    let score = 0.3; // Base urgency level
    
    if (analysis.includes('urgent') || analysis.includes('limited')) score += 0.4;
    if (analysis.includes('sale') || analysis.includes('discount')) score += 0.2;
    if (analysis.includes('now') || analysis.includes('immediately')) score += 0.3;
    if (analysis.includes('later') || analysis.includes('maybe')) score -= 0.2;
    
    return Math.max(0, Math.min(1, score));
  }

  private extractPriceSensitivity(analysis: string): number {
    let score = 0.5; // Base price sensitivity
    
    if (analysis.includes('cheap') || analysis.includes('budget')) score += 0.3;
    if (analysis.includes('expensive') || analysis.includes('cost')) score += 0.2;
    if (analysis.includes('value') || analysis.includes('deal')) score += 0.1;
    if (analysis.includes('luxury') || analysis.includes('premium')) score -= 0.2;
    
    return Math.max(0, Math.min(1, score));
  }

  private extractSocialInfluence(analysis: string): number {
    let score = 0.3; // Base social influence
    
    if (analysis.includes('review') || analysis.includes('rating')) score += 0.3;
    if (analysis.includes('recommend') || analysis.includes('friend')) score += 0.2;
    if (analysis.includes('social') || analysis.includes('share')) score += 0.2;
    if (analysis.includes('independent') || analysis.includes('personal')) score -= 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  private extractInsights(analysis: string): string[] {
    // Extract key insights from the analysis
    const sentences = analysis.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences
      .filter(sentence => 
        sentence.includes('insight') || 
        sentence.includes('behavior') || 
        sentence.includes('psychology') ||
        sentence.includes('likely') ||
        sentence.includes('suggests')
      )
      .map(sentence => sentence.trim())
      .slice(0, 5); // Top 5 insights
  }

  private generateBehaviorPredictions(analysis: string): string[] {
    const predictions: string[] = [];
    
    if (analysis.includes('compare') || analysis.includes('research')) {
      predictions.push('Will likely compare multiple options before deciding');
    }
    if (analysis.includes('review') || analysis.includes('rating')) {
      predictions.push('Will check reviews and ratings before purchasing');
    }
    if (analysis.includes('price') || analysis.includes('deal')) {
      predictions.push('Will look for better prices or deals');
    }
    if (analysis.includes('cart') || analysis.includes('wishlist')) {
      predictions.push('May save items for later consideration');
    }
    
    return predictions.slice(0, 3); // Top 3 predictions
  }

  // Quality scoring methods
  private calculateVisionQualityScore(analysis: string): number {
    let score = 0;
    const maxScore = 1;
    
    // Length and detail
    if (analysis.length > 200) score += 0.2;
    if (analysis.length > 500) score += 0.2;
    
    // Specific insights
    const insightKeywords = ['behavior', 'psychology', 'emotion', 'decision', 'pattern'];
    const foundInsights = insightKeywords.filter(keyword => 
      analysis.toLowerCase().includes(keyword)
    ).length;
    score += (foundInsights / insightKeywords.length) * 0.3;
    
    // Commerce context
    const commerceKeywords = ['shopping', 'purchase', 'product', 'price', 'cart'];
    const foundCommerce = commerceKeywords.filter(keyword => 
      analysis.toLowerCase().includes(keyword)
    ).length;
    score += (foundCommerce / commerceKeywords.length) * 0.3;
    
    return Math.min(score, maxScore);
  }

  private calculateConfidence(analysis: string): number {
    let confidence = 0.5; // Base confidence
    
    // Specific details increase confidence
    if (analysis.includes('specifically') || analysis.includes('clearly')) confidence += 0.2;
    if (analysis.includes('indicates') || analysis.includes('suggests')) confidence += 0.1;
    if (analysis.includes('likely') || analysis.includes('probably')) confidence += 0.1;
    
    // Uncertainty decreases confidence
    if (analysis.includes('unclear') || analysis.includes('uncertain')) confidence -= 0.2;
    if (analysis.includes('might') || analysis.includes('possibly')) confidence -= 0.1;
    
    return Math.max(0.1, Math.min(1, confidence));
  }

  private getDefaultPsychology(): UserPsychology {
    return {
      dominantPersonality: 'neutral',
      emotionalState: 'neutral',
      decisionMakingStyle: 'balanced',
      trustLevel: 0.5,
      urgencyLevel: 0.3,
      priceSensitivity: 0.5,
      socialInfluence: 0.3,
      insights: [],
      behaviorPredictions: []
    };
  }
}