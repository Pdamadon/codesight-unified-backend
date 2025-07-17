import { PrismaClient } from '@prisma/client';
import { OpenAIIntegrationService } from '../../services/openai-integration-clean';
import { QualityControlService } from '../../services/quality-control-clean';
import { StorageManager } from '../../services/storage-manager-clean';
import { prisma } from '../setup';

describe('End-to-End Data Flow Integration', () => {
  let openaiService: OpenAIIntegrationService;
  let qualityService: QualityControlService;
  let storageService: StorageManager;

  beforeEach(() => {
    openaiService = new OpenAIIntegrationService();
    qualityService = new QualityControlService();
    storageService = new StorageManager(prisma);
  });

  describe('Complete Session Processing Pipeline', () => {
    it('should process a session from creation to training data', async () => {
      // 1. Create a session with interactions and screenshots
      const session = await prisma.unifiedSession.create({
        data: {
          id: 'integration-test-session',
          type: 'HUMAN',
          status: 'COMPLETED',
          startTime: new Date(Date.now() - 300000),
          endTime: new Date(),
          duration: 300,
          workerId: 'test-worker'
        }
      });

      // Add multiple interactions
      const interactions = [];
      for (let i = 0; i < 5; i++) {
        const interaction = await prisma.interaction.create({
          data: {
            id: `integration-interaction-${i}`,
            sessionId: session.id,
            type: 'CLICK',
            timestamp: BigInt(Date.now() + i * 10000),
            sessionTime: i * 10000,
            primarySelector: `[data-test="button-${i}"]`,
            elementTag: 'button',
            elementText: `Button ${i}`,
            elementValue: '',
            url: `https://example.com/page-${i}`,
            pageTitle: `Test Page ${i}`,
            boundingBox: { x: 100 + i * 10, y: 100 + i * 10, width: 50, height: 30 },
            viewport: { width: 1920, height: 1080 },
            clientX: 125 + i * 10,
            clientY: 115 + i * 10,
            confidence: 0.9
          }
        });
        interactions.push(interaction);
      }

      // Add screenshots
      const screenshots = [];
      for (let i = 0; i < 3; i++) {
        const screenshot = await prisma.screenshot.create({
          data: {
            id: `integration-screenshot-${i}`,
            sessionId: session.id,
            timestamp: BigInt(Date.now() + i * 20000),
            eventType: 'click',
            quality: 85,
            viewport: { width: 1920, height: 1080 },
            dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
          }
        });
        screenshots.push(screenshot);
      }

      // 2. Validate session quality
      const qualityResult = await qualityService.validateSessionQuality(session.id);
      expect(qualityResult.isValid).toBe(true);
      expect(qualityResult.score).toBeGreaterThan(60);

      // 3. Analyze screenshots with Vision API
      const visionResults = await openaiService.analyzeScreenshots(screenshots);
      expect(visionResults).toHaveLength(3);
      expect(visionResults[0]).toHaveProperty('userPsychology');

      // 4. Generate training data
      const sessionWithData = {
        id: session.id,
        interactions,
        screenshots,
        userPsychology: visionResults[0].userPsychology,
        qualityScore: qualityResult.score
      };

      const trainingData = await openaiService.generateTrainingData(sessionWithData);
      expect(trainingData).toHaveProperty('messages');
      expect(trainingData.messages.length).toBeGreaterThan(0);
      expect(trainingData.trainingValue).toBeGreaterThan(50);

      // 5. Create session archive
      const archiveResult = await storageService.createSessionArchive(session.id);
      expect(archiveResult).toHaveProperty('archiveId');
      expect(archiveResult.fileSize).toBeGreaterThan(0);
      expect(archiveResult.compressionRatio).toBeLessThan(1);

      // 6. Verify data integrity throughout pipeline
      const finalSession = await prisma.unifiedSession.findUnique({
        where: { id: session.id },
        include: {
          interactions: true,
          screenshots: true
        }
      });

      expect(finalSession).toBeDefined();
      expect(finalSession!.qualityScore).toBeGreaterThan(0);
      expect(finalSession!.interactions).toHaveLength(5);
      expect(finalSession!.screenshots).toHaveLength(3);

      // 7. Verify quality report was created
      const qualityReport = await qualityService.getQualityReport(session.id);
      expect(qualityReport).toBeDefined();
      expect(qualityReport!.overallScore).toBe(qualityResult.score);

      // 8. Verify archive was created
      const archiveInfo = await storageService.getArchiveInfo(session.id);
      expect(archiveInfo).toBeDefined();
      expect(archiveInfo!.sessionId).toBe(session.id);
    });

    it('should handle low-quality sessions appropriately', async () => {
      // Create a low-quality session (minimal data)
      const session = await prisma.unifiedSession.create({
        data: {
          id: 'low-quality-session',
          type: 'HUMAN',
          status: 'COMPLETED',
          startTime: new Date(),
          endTime: new Date(),
          duration: 10 // Very short session
        }
      });

      // Add minimal interaction
      await prisma.interaction.create({
        data: {
          id: 'low-quality-interaction',
          sessionId: session.id,
          type: 'CLICK',
          timestamp: BigInt(Date.now()),
          sessionTime: 1000,
          primarySelector: 'button', // Poor selector
          elementTag: 'button',
          url: 'https://example.com',
          pageTitle: 'Test',
          boundingBox: {},
          viewport: {}
        }
      });

      // Validate quality
      const qualityResult = await qualityService.validateSessionQuality(session.id);
      expect(qualityResult.score).toBeLessThan(60);
      expect(qualityResult.isValid).toBe(false);
      expect(qualityResult.issues.length).toBeGreaterThan(0);
      expect(qualityResult.recommendations.length).toBeGreaterThan(0);

      // Should still be able to create archive, but with lower training value
      const archiveResult = await storageService.createSessionArchive(session.id);
      expect(archiveResult).toHaveProperty('archiveId');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle missing session data gracefully', async () => {
      // Test quality validation with non-existent session
      const qualityResult = await qualityService.validateSessionQuality('non-existent');
      expect(qualityResult.isValid).toBe(false);
      expect(qualityResult.score).toBe(0);

      // Test archive creation with non-existent session
      await expect(storageService.createSessionArchive('non-existent'))
        .rejects.toThrow();
    });

    it('should handle corrupted data gracefully', async () => {
      // Create session with corrupted/invalid data
      const session = await prisma.unifiedSession.create({
        data: {
          id: 'corrupted-session',
          type: 'HUMAN',
          status: 'COMPLETED',
          startTime: new Date(),
          endTime: new Date(),
          duration: 300
        }
      });

      // Add interaction with invalid JSON data
      await prisma.interaction.create({
        data: {
          id: 'corrupted-interaction',
          sessionId: session.id,
          type: 'CLICK',
          timestamp: BigInt(Date.now()),
          sessionTime: 1000,
          primarySelector: '#test',
          elementTag: 'button',
          url: 'https://example.com',
          pageTitle: 'Test',
          boundingBox: {},
          viewport: {},
          selectorAlternatives: 'invalid-json-string' // This should be JSON
        }
      });

      // Quality validation should still work
      const qualityResult = await qualityService.validateSessionQuality(session.id);
      expect(qualityResult).toBeDefined();
      expect(typeof qualityResult.score).toBe('number');

      // Archive creation should still work
      const archiveResult = await storageService.createSessionArchive(session.id);
      expect(archiveResult).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent sessions', async () => {
      const sessionPromises = [];
      
      // Create 5 sessions concurrently
      for (let i = 0; i < 5; i++) {
        const promise = (async () => {
          const session = await prisma.unifiedSession.create({
            data: {
              id: `concurrent-session-${i}`,
              type: 'HUMAN',
              status: 'COMPLETED',
              startTime: new Date(),
              endTime: new Date(),
              duration: 300
            }
          });

          await prisma.interaction.create({
            data: {
              id: `concurrent-interaction-${i}`,
              sessionId: session.id,
              type: 'CLICK',
              timestamp: BigInt(Date.now()),
              sessionTime: 1000,
              primarySelector: `#button-${i}`,
              elementTag: 'button',
              url: 'https://example.com',
              pageTitle: 'Test',
              boundingBox: {},
              viewport: {}
            }
          });

          return session.id;
        })();
        
        sessionPromises.push(promise);
      }

      const sessionIds = await Promise.all(sessionPromises);
      expect(sessionIds).toHaveLength(5);

      // Validate all sessions concurrently
      const qualityPromises = sessionIds.map(id => 
        qualityService.validateSessionQuality(id)
      );
      
      const qualityResults = await Promise.all(qualityPromises);
      expect(qualityResults).toHaveLength(5);
      qualityResults.forEach(result => {
        expect(result).toHaveProperty('score');
        expect(typeof result.score).toBe('number');
      });
    });
  });
});