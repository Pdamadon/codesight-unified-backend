import { OpenAIIntegrationService } from '../../services/openai-integration-clean';
import { prisma } from '../setup';

describe('OpenAI Integration Service', () => {
  let service: OpenAIIntegrationService;

  beforeEach(() => {
    service = new OpenAIIntegrationService();
  });

  describe('Vision Analysis', () => {
    it('should analyze screenshots and return vision results', async () => {
      const mockScreenshots = [
        {
          id: 'test-screenshot-1',
          dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          timestamp: Date.now(),
          eventType: 'click'
        }
      ];

      const results = await service.analyzeScreenshots(mockScreenshots);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(1);
      
      const result = results[0];
      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('userPsychology');
      expect(result).toHaveProperty('qualityScore');
      expect(result).toHaveProperty('confidence');
    });

    it('should handle empty screenshot array', async () => {
      const results = await service.analyzeScreenshots([]);
      expect(results).toEqual([]);
    });

    it('should handle invalid screenshot data gracefully', async () => {
      const invalidScreenshots = [
        {
          id: 'invalid-screenshot',
          dataUrl: 'invalid-data-url',
          timestamp: Date.now(),
          eventType: 'click'
        }
      ];

      const results = await service.analyzeScreenshots(invalidScreenshots);
      expect(results).toBeDefined();
      expect(results.length).toBe(1);
      expect(results[0].qualityScore).toBe(0);
    });
  });

  describe('Training Data Generation', () => {
    it('should generate training data from session data', async () => {
      const mockSessionData = {
        id: 'test-session',
        interactions: [
          {
            id: 'interaction-1',
            type: 'CLICK',
            elementText: 'Add to Cart',
            primarySelector: '#add-to-cart-btn',
            url: 'https://example.com/product/123',
            timestamp: Date.now()
          }
        ],
        screenshots: [],
        userPsychology: {
          dominantPersonality: 'ANALYTICAL',
          emotionalState: 'CONFIDENT',
          decisionMakingStyle: 'DELIBERATE',
          trustLevel: 75,
          priceSensitivity: 60
        }
      };

      const trainingData = await service.generateTrainingData(mockSessionData);

      expect(trainingData).toBeDefined();
      expect(trainingData).toHaveProperty('messages');
      expect(trainingData).toHaveProperty('trainingValue');
      expect(trainingData).toHaveProperty('complexity');
      expect(Array.isArray(trainingData.messages)).toBe(true);
      expect(trainingData.messages.length).toBeGreaterThan(0);
    });

    it('should calculate appropriate training value', async () => {
      const highQualitySession = {
        interactions: new Array(10).fill(null).map((_, i) => ({
          id: `interaction-${i}`,
          type: 'CLICK',
          elementText: `Element ${i}`,
          primarySelector: `#element-${i}`,
          url: 'https://example.com'
        })),
        screenshots: new Array(5).fill(null).map((_, i) => ({
          id: `screenshot-${i}`,
          quality: 85
        })),
        qualityScore: 90,
        userPsychology: { confidence: 80 }
      };

      const trainingData = await service.generateTrainingData(highQualitySession);
      expect(trainingData.trainingValue).toBeGreaterThan(70);
    });
  });

  describe('Health Check', () => {
    it('should return connection status', async () => {
      const status = await service.healthCheck();
      expect(['connected', 'disconnected', 'degraded']).toContain(status);
    });
  });
});