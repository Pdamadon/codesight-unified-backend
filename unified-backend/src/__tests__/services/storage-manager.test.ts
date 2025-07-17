import { StorageManager } from '../../services/storage-manager-clean';
import { prisma } from '../setup';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Storage Manager Service', () => {
  let service: StorageManager;

  beforeEach(() => {
    service = new StorageManager(prisma);
  });

  describe('Session Archive Creation', () => {
    it('should create session archive successfully', async () => {
      // Create test session with data
      const session = await prisma.unifiedSession.create({
        data: {
          id: 'test-archive-session',
          type: 'HUMAN',
          status: 'COMPLETED',
          startTime: new Date(),
          endTime: new Date(),
          duration: 300
        }
      });

      // Add test interaction
      await prisma.interaction.create({
        data: {
          id: 'test-archive-interaction',
          sessionId: session.id,
          type: 'CLICK',
          timestamp: BigInt(Date.now()),
          sessionTime: 1000,
          primarySelector: '#test-button',
          elementTag: 'button',
          elementText: 'Test Button',
          url: 'https://example.com',
          pageTitle: 'Test Page',
          boundingBox: {},
          viewport: {}
        }
      });

      // Add test screenshot
      await prisma.screenshot.create({
        data: {
          id: 'test-archive-screenshot',
          sessionId: session.id,
          timestamp: BigInt(Date.now()),
          eventType: 'click',
          quality: 80,
          viewport: {}
        }
      });

      const result = await service.createSessionArchive(session.id);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('archiveId');
      expect(result).toHaveProperty('sessionId');
      expect(result).toHaveProperty('archivePath');
      expect(result).toHaveProperty('fileSize');
      expect(result).toHaveProperty('compressionRatio');
      expect(result).toHaveProperty('manifest');
      expect(result).toHaveProperty('checksum');
      expect(result.sessionId).toBe(session.id);
      expect(result.fileSize).toBeGreaterThan(0);
    });

    it('should handle non-existent session', async () => {
      await expect(service.createSessionArchive('non-existent-session'))
        .rejects.toThrow('Session non-existent-session not found');
    });
  });

  describe('Screenshot Compression', () => {
    it('should compress and upload screenshot', async () => {
      const testDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
      
      const result = await service.compressAndUploadScreenshot(
        testDataUrl,
        'test-session',
        'click'
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('s3Key');
      expect(result).toHaveProperty('originalSize');
      expect(result).toHaveProperty('compressedSize');
      expect(result).toHaveProperty('format');
      expect(result).toHaveProperty('compressionRatio');
      expect(result.format).toBe('webp');
      expect(result.compressionRatio).toBeLessThan(1);
    });

    it('should handle invalid data URL', async () => {
      await expect(service.compressAndUploadScreenshot(
        'invalid-data-url',
        'test-session',
        'click'
      )).rejects.toThrow('Invalid data URL format');
    });
  });

  describe('Archive Information', () => {
    it('should get archive info for existing session', async () => {
      // First create an archive
      const session = await prisma.unifiedSession.create({
        data: {
          id: 'test-info-session',
          type: 'HUMAN',
          status: 'COMPLETED',
          startTime: new Date(),
          endTime: new Date(),
          duration: 300
        }
      });

      await prisma.interaction.create({
        data: {
          id: 'test-info-interaction',
          sessionId: session.id,
          type: 'CLICK',
          timestamp: BigInt(Date.now()),
          sessionTime: 1000,
          primarySelector: '#test',
          elementTag: 'button',
          url: 'https://example.com',
          pageTitle: 'Test',
          boundingBox: {},
          viewport: {}
        }
      });

      const archiveResult = await service.createSessionArchive(session.id);
      const archiveInfo = await service.getArchiveInfo(session.id);

      expect(archiveInfo).toBeDefined();
      expect(archiveInfo.sessionId).toBe(session.id);
      expect(archiveInfo.id).toBe(archiveResult.archiveId);
    });

    it('should return null for non-existent archive', async () => {
      const archiveInfo = await service.getArchiveInfo('non-existent-session');
      expect(archiveInfo).toBeNull();
    });
  });

  describe('Storage Statistics', () => {
    it('should get storage statistics', async () => {
      const stats = await service.getStorageStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('totalArchives');
      expect(stats).toHaveProperty('totalSize');
      expect(stats).toHaveProperty('averageCompressionRatio');
      expect(stats).toHaveProperty('statusDistribution');
      expect(typeof stats.totalArchives).toBe('number');
      expect(typeof stats.totalSize).toBe('number');
      expect(typeof stats.averageCompressionRatio).toBe('number');
    });
  });

  describe('Cleanup Operations', () => {
    it('should cleanup temp files', async () => {
      // This test just ensures the method runs without error
      await expect(service.cleanupTempFiles()).resolves.not.toThrow();
    });
  });

  describe('Health Check', () => {
    it('should return connection status', async () => {
      const status = await service.healthCheck();
      expect(['connected', 'disconnected', 'degraded']).toContain(status);
    });
  });
});