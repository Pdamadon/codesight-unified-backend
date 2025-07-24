/**
 * Vision Analysis Service Tests
 * 
 * Tests the extracted vision analysis functionality with OpenAI integration
 */

import { VisionAnalysisServiceImpl } from '../vision-analysis';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
} as any;

// Mock Prisma
const mockPrisma = {
  visionAnalysisCache: {
    findFirst: jest.fn(),
    update: jest.fn(),
    create: jest.fn()
  }
} as any;

describe('Vision Analysis Service', () => {
  let visionService: VisionAnalysisServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    visionService = new VisionAnalysisServiceImpl(mockOpenAI, mockPrisma);
  });

  describe('📸 Screenshot Analysis', () => {
    it('should analyze single screenshot successfully', async () => {
      // Mock OpenAI response
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{
          message: {
            content: 'User appears excited about shopping. Shows analytical behavior and compares products. High trust level indicated by reviews checking. Price sensitive customer likely to research deals.'
          }
        }]
      });

      // Mock no cache
      mockPrisma.visionAnalysisCache.findFirst.mockResolvedValue(null);

      const screenshot = {
        id: 'test-screenshot-1',
        dataUrl: 'data:image/jpeg;base64,test-image-data',
        timestamp: Date.now()
      };

      const result = await visionService.analyzeScreenshot(screenshot);

      console.log('📸 Screenshot Analysis Result:');
      console.log('Analysis:', result.analysis);
      console.log('Quality Score:', result.qualityScore);
      console.log('Confidence:', result.confidence);
      console.log('Psychology:', result.userPsychology);

      expect(result.analysis).toContain('User appears excited');
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.userPsychology.dominantPersonality).toBe('analytical');
      expect(result.userPsychology.emotionalState).toBe('excited');
      expect(result.userPsychology.trustLevel).toBeGreaterThan(0.5);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should analyze multiple screenshots', async () => {
      // Mock OpenAI responses
      mockOpenAI.chat.completions.create
        .mockResolvedValueOnce({
          choices: [{
            message: { content: 'User shows quick decision making and impulsive behavior. Limited time shopping pattern.' }
          }]
        })
        .mockResolvedValueOnce({
          choices: [{
            message: { content: 'Careful analytical approach. Reviews and ratings important for trust building.' }
          }]
        });

      // Mock no cache
      mockPrisma.visionAnalysisCache.findFirst.mockResolvedValue(null);

      const screenshots = [
        { id: 'screenshot-1', s3Url: 'https://s3.example.com/image1.jpg' },
        { id: 'screenshot-2', s3Url: 'https://s3.example.com/image2.jpg' }
      ];

      const results = await visionService.analyzeScreenshots(screenshots);

      console.log('\\n📸 Multiple Screenshots Analysis:');
      results.forEach((result, i) => {
        console.log(`Screenshot ${i + 1}:`, result.userPsychology.dominantPersonality);
      });

      expect(results).toHaveLength(2);
      expect(results[0].userPsychology.dominantPersonality).toBe('impulsive');
      expect(results[1].userPsychology.dominantPersonality).toBe('analytical');
    });
  });

  describe('🧠 Psychology Extraction', () => {
    it('should extract comprehensive psychology insights', async () => {
      const analysisText = `The user demonstrates highly analytical behavior, carefully comparing product specifications and prices. 
      Their excited emotional state is evident from quick navigation and multiple product views. 
      Reviews and ratings are being checked frequently, indicating high social influence and trust-seeking behavior.
      Price sensitivity is moderate with focus on value and deals.`;

      // We need to access the private method for testing - using bracket notation
      const psychology = (visionService as any).extractPsychologyInsights(analysisText);

      console.log('\\n🧠 Psychology Insights:');
      console.log('Personality:', psychology.dominantPersonality);
      console.log('Emotional State:', psychology.emotionalState);  
      console.log('Decision Style:', psychology.decisionMakingStyle);
      console.log('Trust Level:', psychology.trustLevel);
      console.log('Social Influence:', psychology.socialInfluence);
      console.log('Behavior Predictions:', psychology.behaviorPredictions);

      expect(psychology.dominantPersonality).toBe('analytical');
      expect(psychology.emotionalState).toBe('excited');
      expect(psychology.decisionMakingStyle).toBe('analytical');
      expect(psychology.trustLevel).toBeGreaterThan(0.7);
      expect(psychology.socialInfluence).toBeGreaterThan(0.5);
      expect(psychology.behaviorPredictions.length).toBeGreaterThan(0);
    });

    it('should handle different personality types', () => {
      const testCases = [
        {
          text: 'User shows quick immediate purchase behavior with instant decisions',
          expectedPersonality: 'impulsive'
        },
        {
          text: 'Customer focuses on social reviews and recommendations from friends',
          expectedPersonality: 'social'
        },
        {
          text: 'Shopping for practical useful items with good value and durability',
          expectedPersonality: 'practical'
        }
      ];

      testCases.forEach(testCase => {
        const psychology = (visionService as any).extractPsychologyInsights(testCase.text);
        expect(psychology.dominantPersonality).toBe(testCase.expectedPersonality);
      });
    });
  });

  describe('💾 Cache Integration', () => {
    it('should use cached analysis when available', async () => {
      const cachedResult = {
        analysis: 'Cached analysis result',
        userPsychology: { dominantPersonality: 'cached' },
        qualityScore: 0.8,
        confidence: 0.9,
        processingTime: 100
      };

      // Mock cache hit
      mockPrisma.visionAnalysisCache.findFirst.mockResolvedValue({
        id: 'cache-1',
        analysisResult: cachedResult
      });

      const screenshot = { id: 'test-screenshot', dataUrl: 'test-data' };
      const result = await visionService.analyzeScreenshot(screenshot);

      expect(result).toEqual(cachedResult);
      expect(mockOpenAI.chat.completions.create).not.toHaveBeenCalled();
      expect(mockPrisma.visionAnalysisCache.update).toHaveBeenCalledWith({
        where: { id: 'cache-1' },
        data: { hitCount: { increment: 1 } }
      });
    });

    it('should cache new analysis results', async () => {
      // Mock OpenAI response
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'New analysis' } }]
      });

      // Mock no cache initially
      mockPrisma.visionAnalysisCache.findFirst.mockResolvedValue(null);

      const screenshot = { id: 'new-screenshot', dataUrl: 'new-data' };
      await visionService.analyzeScreenshot(screenshot);

      expect(mockPrisma.visionAnalysisCache.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          screenshotId: 'new-screenshot',
          analysisType: 'comprehensive',
          qualityScore: expect.any(Number),
          expiresAt: expect.any(Date),
          hitCount: 0
        })
      });
    });
  });

  describe('📊 Quality Assessment', () => {
    it('should calculate quality scores based on analysis content', () => {
      const highQualityAnalysis = `Detailed psychological analysis shows analytical behavior patterns. 
      User demonstrates shopping psychology with specific product research and price comparison behaviors.
      Clear emotional state indicators and decision-making patterns visible.`;

      const lowQualityAnalysis = 'User is shopping.';

      const highScore = (visionService as any).calculateVisionQualityScore(highQualityAnalysis);
      const lowScore = (visionService as any).calculateVisionQualityScore(lowQualityAnalysis);

      console.log('\\n📊 Quality Scores:');
      console.log('High Quality:', highScore);
      console.log('Low Quality:', lowScore);

      expect(highScore).toBeGreaterThan(lowScore);
      expect(highScore).toBeGreaterThan(0.5);
      expect(lowScore).toBeLessThan(0.5);
    });

    it('should calculate confidence levels appropriately', () => {
      const certainAnalysis = 'The user clearly indicates specific analytical behavior patterns';
      const uncertainAnalysis = 'The user might possibly show some unclear behavior';

      const highConfidence = (visionService as any).calculateConfidence(certainAnalysis);
      const lowConfidence = (visionService as any).calculateConfidence(uncertainAnalysis);

      expect(highConfidence).toBeGreaterThan(lowConfidence);
      expect(highConfidence).toBeGreaterThan(0.6);
      expect(lowConfidence).toBeLessThan(0.4);
    });
  });

  describe('⚠️ Error Handling', () => {
    it('should handle OpenAI API errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));
      mockPrisma.visionAnalysisCache.findFirst.mockResolvedValue(null);

      const screenshot = { id: 'error-test', dataUrl: 'test-data' };
      const result = await visionService.analyzeScreenshot(screenshot);

      expect(result.analysis).toBe('Analysis failed due to error');
      expect(result.qualityScore).toBe(0);
      expect(result.confidence).toBe(0);
      expect(result.userPsychology.dominantPersonality).toBe('neutral');
    });

    it('should handle cache errors gracefully', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Test analysis' } }]
      });
      
      // Mock cache error
      mockPrisma.visionAnalysisCache.findFirst.mockRejectedValue(new Error('Cache Error'));
      
      const screenshot = { id: 'cache-error-test', dataUrl: 'test-data' };
      const result = await visionService.analyzeScreenshot(screenshot);

      // Should still work without cache
      expect(result.analysis).toBe('Test analysis');
      expect(result.qualityScore).toBeGreaterThan(0);
    });
  });

  describe('🚀 Advanced Analysis', () => {
    it('should support advanced analysis with options', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [{ message: { content: 'Advanced analysis result' } }]
      });
      mockPrisma.visionAnalysisCache.findFirst.mockResolvedValue(null);

      const screenshots = [{ id: 'advanced-test', dataUrl: 'test-data' }];
      const options = { depth: 'comprehensive', focus: 'psychology' };

      const results = await visionService.analyzeScreenshotsAdvanced(screenshots, options);

      expect(results).toHaveLength(1);
      expect(results[0].analysis).toBe('Advanced analysis result');
    });
  });
});