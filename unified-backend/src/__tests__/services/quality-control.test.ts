import { QualityControlService } from '../../services/quality-control-clean';
import { prisma } from '../setup';

describe('Quality Control Service', () => {
  let service: QualityControlService;

  beforeEach(() => {
    service = new QualityControlService();
  });

  describe('Session Quality Validation', () => {
    it('should validate session quality and return results', async () => {
      // Create test session
      const session = await prisma.unifiedSession.create({
        data: {
          id: 'test-session-quality',
          type: 'HUMAN',
          status: 'COMPLETED',
          startTime: new Date(),
          endTime: new Date(),
          duration: 300,
          qualityScore: 0,
          completeness: 0,
          reliability: 0
        }
      });

      // Add test interactions
      await prisma.interaction.create({
        data: {
          id: 'test-interaction-1',
          sessionId: session.id,
          type: 'CLICK',
          timestamp: BigInt(Date.now()),
          sessionTime: 1000,
          primarySelector: '#test-button',
          elementTag: 'button',
          elementText: 'Click Me',
          url: 'https://example.com',
          pageTitle: 'Test Page',
          boundingBox: {},
          viewport: {}
        }
      });

      const result = await service.validateSessionQuality(session.id);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('issues');
      expect(result).toHaveProperty('recommendations');
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.score).toBe('number');
      expect(Array.isArray(result.issues)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should handle non-existent session', async () => {
      const result = await service.validateSessionQuality('non-existent-session');
      
      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('error');
    });

    it('should calculate quality scores correctly', async () => {
      // Create high-quality session
      const session = await prisma.unifiedSession.create({
        data: {
          id: 'high-quality-session',
          type: 'HUMAN',
          status: 'COMPLETED',
          startTime: new Date(Date.now() - 300000),
          endTime: new Date(),
          duration: 300
        }
      });

      // Add multiple high-quality interactions
      for (let i = 0; i < 5; i++) {
        await prisma.interaction.create({
          data: {
            id: `interaction-${i}`,
            sessionId: session.id,
            type: 'CLICK',
            timestamp: BigInt(Date.now() + i * 1000),
            sessionTime: i * 1000,
            primarySelector: `[data-test="button-${i}"]`,
            elementTag: 'button',
            elementText: `Button ${i}`,
            url: 'https://example.com/page',
            pageTitle: 'Test Page',
            boundingBox: { x: 100, y: 100, width: 50, height: 30 },
            viewport: { width: 1920, height: 1080 },
            clientX: 125,
            clientY: 115
          }
        });
      }

      // Add screenshots
      for (let i = 0; i < 3; i++) {
        await prisma.screenshot.create({
          data: {
            id: `screenshot-${i}`,
            sessionId: session.id,
            timestamp: BigInt(Date.now() + i * 2000),
            eventType: 'click',
            quality: 85,
            viewport: { width: 1920, height: 1080 }
          }
        });
      }

      const result = await service.validateSessionQuality(session.id);
      
      expect(result.score).toBeGreaterThan(60); // Should be decent quality
      expect(result.isValid).toBe(true);
    });
  });

  describe('Quality Thresholds', () => {
    it('should update quality thresholds', async () => {
      const newThresholds = {
        minimum: 70,
        good: 80,
        excellent: 95
      };

      await service.updateQualityThresholds(newThresholds);
      const thresholds = await service.getQualityThresholds();

      expect(thresholds.minimum).toBe(70);
      expect(thresholds.good).toBe(80);
      expect(thresholds.excellent).toBe(95);
    });

    it('should get current quality thresholds', async () => {
      const thresholds = await service.getQualityThresholds();
      
      expect(thresholds).toHaveProperty('minimum');
      expect(thresholds).toHaveProperty('good');
      expect(thresholds).toHaveProperty('excellent');
      expect(typeof thresholds.minimum).toBe('number');
      expect(typeof thresholds.good).toBe('number');
      expect(typeof thresholds.excellent).toBe('number');
    });
  });

  describe('Quality Statistics', () => {
    it('should get quality statistics', async () => {
      const stats = await service.getQualityStats();
      
      expect(stats).toHaveProperty('totalReports');
      expect(stats).toHaveProperty('averageScore');
      expect(stats).toHaveProperty('gradeDistribution');
      expect(stats).toHaveProperty('recentReports');
      expect(stats).toHaveProperty('thresholds');
      expect(typeof stats.totalReports).toBe('number');
      expect(typeof stats.averageScore).toBe('number');
    });

    it('should monitor quality trends', async () => {
      const trends = await service.monitorQualityTrends();
      
      expect(trends).toHaveProperty('monthlyAverage');
      expect(trends).toHaveProperty('weeklyAverage');
      expect(trends).toHaveProperty('trend');
      expect(trends).toHaveProperty('alerts');
      expect(trends).toHaveProperty('status');
      expect(Array.isArray(trends.alerts)).toBe(true);
      expect(['healthy', 'warning', 'critical']).toContain(trends.status);
    });
  });

  describe('Health Check', () => {
    it('should return connection status', async () => {
      const status = await service.healthCheck();
      expect(['connected', 'disconnected']).toContain(status);
    });
  });
});