/**
 * Cache Manager Service Tests
 * 
 * Tests the extracted cache management functionality with Prisma integration
 */

import { CacheManagerServiceImpl } from '../cache-manager';
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client
const mockPrisma = {
  visionAnalysisCache: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    findMany: jest.fn(),
    createMany: jest.fn()
  }
} as any;

describe('Cache Manager Service', () => {
  let cacheManager: CacheManagerServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheManager = new CacheManagerServiceImpl(mockPrisma);
  });

  describe('💾 Cache Storage and Retrieval', () => {
    it('should cache and retrieve analysis data successfully', async () => {
      const testData = {
        analysis: 'Test analysis result',
        qualityScore: 0.85,
        confidence: 0.9,
        userPsychology: { dominantPersonality: 'analytical' }
      };

      // Mock successful cache storage
      mockPrisma.visionAnalysisCache.create.mockResolvedValue({
        id: 'cache-1',
        screenshotId: 'test-key',
        analysisType: 'vision',
        analysisResult: testData
      });

      // Store in cache
      await cacheManager.cacheAnalysis('test-key', 'vision', testData, 12);

      expect(mockPrisma.visionAnalysisCache.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          screenshotId: 'test-key',
          analysisType: 'vision',
          analysisResult: testData,
          qualityScore: 0.85,
          hitCount: 0
        })
      });

      console.log('💾 Cache Storage: Successfully stored analysis data');
    });

    it('should retrieve cached data and increment hit count', async () => {
      const cachedData = {
        analysis: 'Cached analysis',
        qualityScore: 0.75
      };

      // Mock cache hit
      mockPrisma.visionAnalysisCache.findFirst.mockResolvedValue({
        id: 'cache-1',
        analysisResult: cachedData,
        hitCount: 5
      });

      mockPrisma.visionAnalysisCache.update.mockResolvedValue({
        id: 'cache-1',
        hitCount: 6
      });

      const result = await cacheManager.getCachedAnalysis('test-key', 'vision');

      expect(result).toEqual(cachedData);
      expect(mockPrisma.visionAnalysisCache.update).toHaveBeenCalledWith({
        where: { id: 'cache-1' },
        data: { hitCount: { increment: 1 } }
      });

      console.log('💾 Cache Retrieval: Successfully retrieved and incremented hit count');
    });

    it('should return null for cache miss', async () => {
      // Mock cache miss
      mockPrisma.visionAnalysisCache.findFirst.mockResolvedValue(null);

      const result = await cacheManager.getCachedAnalysis('missing-key', 'vision');

      expect(result).toBeNull();
      console.log('💾 Cache Miss: Correctly returned null for missing data');
    });

    it('should handle expired cache entries', async () => {
      // Mock expired entry (would be filtered out by expiresAt condition)
      mockPrisma.visionAnalysisCache.findFirst.mockResolvedValue(null);

      const result = await cacheManager.getCachedAnalysis('expired-key', 'vision');

      expect(result).toBeNull();
      expect(mockPrisma.visionAnalysisCache.findFirst).toHaveBeenCalledWith({
        where: {
          screenshotId: 'expired-key',
          analysisType: 'vision',
          expiresAt: { gt: expect.any(Date) }
        }
      });
    });
  });

  describe('🗑️ Cache Management', () => {
    it('should invalidate specific cache entries', async () => {
      mockPrisma.visionAnalysisCache.deleteMany.mockResolvedValue({ count: 2 });

      await cacheManager.invalidateCache('test-key', 'vision');

      expect(mockPrisma.visionAnalysisCache.deleteMany).toHaveBeenCalledWith({
        where: {
          screenshotId: 'test-key',
          analysisType: 'vision'
        }
      });

      console.log('🗑️ Cache Invalidation: Successfully removed specific entries');
    });

    it('should invalidate all entries for a key when type not specified', async () => {
      mockPrisma.visionAnalysisCache.deleteMany.mockResolvedValue({ count: 5 });

      await cacheManager.invalidateCache('test-key');

      expect(mockPrisma.visionAnalysisCache.deleteMany).toHaveBeenCalledWith({
        where: { screenshotId: 'test-key' }
      });
    });

    it('should clear expired entries', async () => {
      mockPrisma.visionAnalysisCache.deleteMany.mockResolvedValue({ count: 3 });

      const deletedCount = await cacheManager.clearExpiredEntries();

      expect(deletedCount).toBe(3);
      expect(mockPrisma.visionAnalysisCache.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) }
        }
      });

      console.log('🗑️ Expired Cleanup: Successfully removed 3 expired entries');
    });
  });

  describe('📊 Cache Statistics', () => {
    it('should generate comprehensive cache statistics', async () => {
      // Mock database responses for statistics
      mockPrisma.visionAnalysisCache.count
        .mockResolvedValueOnce(100) // Total entries
        .mockResolvedValueOnce(80);  // Active entries

      mockPrisma.visionAnalysisCache.aggregate.mockResolvedValue({
        _sum: { hitCount: 250 }
      });

      mockPrisma.visionAnalysisCache.findMany.mockResolvedValue([
        { screenshotId: 'popular-1', analysisType: 'vision', hitCount: 50 },
        { screenshotId: 'popular-2', analysisType: 'comprehensive', hitCount: 35 },
        { screenshotId: 'popular-3', analysisType: 'vision', hitCount: 20 }
      ]);

      const stats = await cacheManager.getCacheStats();

      console.log('\\n📊 Cache Statistics:');
      console.log('Total Entries:', stats.totalEntries);
      console.log('Active Entries:', stats.activeEntries);
      console.log('Expired Entries:', stats.expiredEntries);
      console.log('Total Hits:', stats.totalHits);
      console.log('Hit Ratio:', stats.hitRatio.toFixed(2));
      console.log('Top Keys:', stats.topKeys);

      expect(stats.totalEntries).toBe(100);
      expect(stats.activeEntries).toBe(80);
      expect(stats.expiredEntries).toBe(20);
      expect(stats.totalHits).toBe(250);
      expect(stats.hitRatio).toBe(3.125); // 250/80
      expect(stats.topKeys).toHaveLength(3);
      expect(stats.topKeys[0].hits).toBe(50);
    });

    it('should calculate performance metrics', async () => {
      // Mock stats for performance calculation
      mockPrisma.visionAnalysisCache.count
        .mockResolvedValueOnce(50)  // Total
        .mockResolvedValueOnce(40); // Active

      mockPrisma.visionAnalysisCache.aggregate.mockResolvedValue({
        _sum: { hitCount: 120 }
      });

      mockPrisma.visionAnalysisCache.findMany.mockResolvedValue([]);

      const metrics = await cacheManager.getPerformanceMetrics();

      console.log('\\n🚀 Performance Metrics:');
      console.log('Hit Rate:', (metrics.hitRate * 100).toFixed(1) + '%');
      console.log('Miss Rate:', (metrics.missRate * 100).toFixed(1) + '%');
      console.log('Average Hits per Entry:', metrics.averageHits.toFixed(1));

      expect(metrics.averageHits).toBe(3); // 120/40
      expect(metrics.hitRate).toBeGreaterThan(0);
    });
  });

  describe('🔄 Batch Operations', () => {
    it('should perform batch cache operations', async () => {
      const batchEntries = [
        { key: 'batch-1', type: 'vision', data: { analysis: 'Result 1' } },
        { key: 'batch-2', type: 'comprehensive', data: { analysis: 'Result 2' } },
        { key: 'batch-3', type: 'vision', data: { analysis: 'Result 3' } }
      ];

      mockPrisma.visionAnalysisCache.createMany.mockResolvedValue({ count: 3 });

      await cacheManager.batchCacheAnalysis(batchEntries);

      expect(mockPrisma.visionAnalysisCache.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            screenshotId: 'batch-1',
            analysisType: 'vision',
            analysisResult: { analysis: 'Result 1' }
          }),
          expect.objectContaining({
            screenshotId: 'batch-2',
            analysisType: 'comprehensive'
          }),
          expect.objectContaining({
            screenshotId: 'batch-3',
            analysisType: 'vision'
          })
        ]),
        skipDuplicates: true
      });

      console.log('🔄 Batch Operations: Successfully cached 3 entries in batch');
    });
  });

  describe('⚠️ Error Handling', () => {
    it('should handle cache storage errors gracefully', async () => {
      mockPrisma.visionAnalysisCache.create.mockRejectedValue(new Error('Database error'));

      // Should not throw error
      await expect(cacheManager.cacheAnalysis('error-key', 'vision', { data: 'test' }))
        .resolves.not.toThrow();

      console.log('⚠️ Error Handling: Cache storage errors handled gracefully');
    });

    it('should handle cache retrieval errors gracefully', async () => {
      mockPrisma.visionAnalysisCache.findFirst.mockRejectedValue(new Error('Database error'));

      const result = await cacheManager.getCachedAnalysis('error-key', 'vision');

      expect(result).toBeNull();
      console.log('⚠️ Error Handling: Cache retrieval errors return null gracefully');
    });

    it('should handle statistics generation errors', async () => {
      mockPrisma.visionAnalysisCache.count.mockRejectedValue(new Error('Database error'));

      const stats = await cacheManager.getCacheStats();

      // Should return default stats
      expect(stats.totalEntries).toBe(0);
      expect(stats.activeEntries).toBe(0);
      expect(stats.topKeys).toEqual([]);
      console.log('⚠️ Error Handling: Statistics errors return default values');
    });
  });

  describe('🔧 Advanced Features', () => {
    it('should support custom TTL values', async () => {
      const customTTL = 48; // 48 hours
      mockPrisma.visionAnalysisCache.create.mockResolvedValue({ id: 'custom-ttl' });

      await cacheManager.cacheAnalysis('custom-key', 'vision', { data: 'test' }, customTTL);

      expect(mockPrisma.visionAnalysisCache.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: expect.any(Date)
        })
      });

      // Verify TTL was applied (approximately)
      const call = mockPrisma.visionAnalysisCache.create.mock.calls[0][0];
      const expiresAt = call.data.expiresAt;
      const now = new Date();
      const hoursDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      expect(hoursDiff).toBeCloseTo(customTTL, 0); // Within 1 hour tolerance
      console.log('🔧 Custom TTL: Successfully applied 48-hour cache expiry');
    });

    it('should support cache warm-up operations', async () => {
      const keysToWarm = ['warm-1', 'warm-2', 'warm-3'];
      
      // Mock some cache misses
      mockPrisma.visionAnalysisCache.findFirst
        .mockResolvedValueOnce(null)  // warm-1: miss
        .mockResolvedValueOnce({ id: 'existing' })  // warm-2: hit  
        .mockResolvedValueOnce(null); // warm-3: miss

      await cacheManager.warmUpCache(keysToWarm, 'vision');

      // Should check each key
      expect(mockPrisma.visionAnalysisCache.findFirst).toHaveBeenCalledTimes(3);
      console.log('🔧 Cache Warm-up: Checked 3 keys for pre-loading');
    });
  });
});