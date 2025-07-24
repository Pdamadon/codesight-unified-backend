import { PrismaClient } from '@prisma/client';
import { Logger } from '../../utils/logger';

// Cache interfaces
export interface CacheEntry {
  id: string;
  key: string;
  value: any;
  type: string;
  expiresAt: Date;
  hitCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CacheManagerService {
  getCachedAnalysis(key: string, type: string): Promise<any>;
  cacheAnalysis(key: string, type: string, data: any, ttlHours?: number): Promise<void>;
  invalidateCache(key: string, type?: string): Promise<void>;
  clearExpiredEntries(): Promise<number>;
  getCacheStats(): Promise<CacheStats>;
}

export interface CacheStats {
  totalEntries: number;
  activeEntries: number;
  expiredEntries: number;
  totalHits: number;
  hitRatio: number;
  topKeys: Array<{ key: string; hits: number; type: string }>;
}

export class CacheManagerServiceImpl implements CacheManagerService {
  private logger: Logger;
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.logger = new Logger("CacheManager");
  }

  /**
   * Retrieve cached analysis data
   * @param key - The cache key (typically screenshot ID, session ID, etc.)
   * @param type - The analysis type ('comprehensive', 'vision', 'training', etc.)
   * @returns Cached data or null if not found/expired
   */
  async getCachedAnalysis(key: string, type: string): Promise<any> {
    try {
      const cached = await this.prisma.visionAnalysisCache.findFirst({
        where: {
          screenshotId: key, // Note: Using screenshotId as the key field for now
          analysisType: type,
          expiresAt: { gt: new Date() }
        }
      });

      if (cached) {
        // Increment hit count for analytics
        await this.prisma.visionAnalysisCache.update({
          where: { id: cached.id },
          data: { hitCount: { increment: 1 } }
        });

        this.logger.debug("Cache hit", { key, type, hitCount: cached.hitCount + 1 });
        return cached.analysisResult;
      }

      this.logger.debug("Cache miss", { key, type });
      return null;
    } catch (error) {
      this.logger.error("Cache retrieval failed", { key, type, error: error instanceof Error ? error.message : 'Unknown error' });
      return null;
    }
  }

  /**
   * Cache analysis data
   * @param key - The cache key
   * @param type - The analysis type  
   * @param data - The data to cache
   * @param ttlHours - Time to live in hours (default: 24)
   */
  async cacheAnalysis(key: string, type: string, data: any, ttlHours: number = 24): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + ttlHours);

      await this.prisma.visionAnalysisCache.create({
        data: {
          screenshotId: key, // Note: Using screenshotId as the key field for now
          analysisType: type,
          analysisResult: data,
          qualityScore: this.extractQualityScore(data),
          expiresAt,
          hitCount: 0
        }
      });

      this.logger.debug("Data cached successfully", { key, type, ttlHours });
    } catch (error) {
      this.logger.error("Cache storage failed", { 
        key, 
        type, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      // Don't throw - caching is optional, shouldn't break the main flow
    }
  }

  /**
   * Invalidate cache entries
   * @param key - The cache key to invalidate
   * @param type - Optional: specific type to invalidate, otherwise all types for the key
   */
  async invalidateCache(key: string, type?: string): Promise<void> {
    try {
      const whereClause: any = { screenshotId: key };
      if (type) {
        whereClause.analysisType = type;
      }

      const result = await this.prisma.visionAnalysisCache.deleteMany({
        where: whereClause
      });

      this.logger.info("Cache invalidated", { key, type, deletedCount: result.count });
    } catch (error) {
      this.logger.error("Cache invalidation failed", { 
        key, 
        type, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Clear all expired cache entries
   * @returns Number of entries removed
   */
  async clearExpiredEntries(): Promise<number> {
    try {
      const result = await this.prisma.visionAnalysisCache.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });

      this.logger.info("Expired cache entries cleared", { deletedCount: result.count });
      return result.count;
    } catch (error) {
      this.logger.error("Cache cleanup failed", { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return 0;
    }
  }

  /**
   * Get comprehensive cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    try {
      const now = new Date();

      // Get basic counts
      const totalEntries = await this.prisma.visionAnalysisCache.count();
      const activeEntries = await this.prisma.visionAnalysisCache.count({
        where: { expiresAt: { gt: now } }
      });
      const expiredEntries = totalEntries - activeEntries;

      // Get hit statistics
      const hitStats = await this.prisma.visionAnalysisCache.aggregate({
        _sum: { hitCount: true }
      });
      const totalHits = hitStats._sum.hitCount || 0;

      // Calculate hit ratio (hits per active entry)
      const hitRatio = activeEntries > 0 ? totalHits / activeEntries : 0;

      // Get top performing cache keys
      const topKeys = await this.prisma.visionAnalysisCache.findMany({
        select: {
          screenshotId: true,
          analysisType: true,
          hitCount: true
        },
        where: { expiresAt: { gt: now } },
        orderBy: { hitCount: 'desc' },
        take: 10
      });

      const stats: CacheStats = {
        totalEntries,
        activeEntries,
        expiredEntries,
        totalHits,
        hitRatio,
        topKeys: topKeys.map(entry => ({
          key: entry.screenshotId,
          hits: entry.hitCount,
          type: entry.analysisType
        }))
      };

      this.logger.debug("Cache statistics generated", stats);
      return stats;
    } catch (error) {
      this.logger.error("Cache statistics generation failed", { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      
      // Return default stats on error
      return {
        totalEntries: 0,
        activeEntries: 0,
        expiredEntries: 0,
        totalHits: 0,
        hitRatio: 0,
        topKeys: []
      };
    }
  }

  /**
   * Warm up cache with frequently accessed data
   * @param keys - Array of keys to pre-load
   * @param type - Analysis type to warm up
   */
  async warmUpCache(keys: string[], type: string): Promise<void> {
    this.logger.info("Cache warm-up initiated", { keyCount: keys.length, type });
    
    // Implementation would depend on how you want to pre-populate the cache
    // This is a placeholder for future enhancement
    for (const key of keys) {
      // Check if already cached
      const cached = await this.getCachedAnalysis(key, type);
      if (!cached) {
        this.logger.debug("Cache warm-up: missing entry", { key, type });
        // Could trigger background analysis here
      }
    }
  }

  /**
   * Get cache performance metrics for monitoring
   */
  async getPerformanceMetrics(): Promise<{ hitRate: number; missRate: number; averageHits: number }> {
    try {
      const stats = await this.getCacheStats();
      const totalRequests = stats.totalHits + stats.activeEntries; // Approximate
      
      return {
        hitRate: totalRequests > 0 ? stats.totalHits / totalRequests : 0,
        missRate: totalRequests > 0 ? stats.activeEntries / totalRequests : 0,
        averageHits: stats.activeEntries > 0 ? stats.totalHits / stats.activeEntries : 0
      };
    } catch (error) {
      this.logger.error("Performance metrics calculation failed", { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return { hitRate: 0, missRate: 0, averageHits: 0 };
    }
  }

  // Helper methods
  private extractQualityScore(data: any): number {
    // Extract quality score from cached data
    if (typeof data === 'object' && data !== null) {
      return data.qualityScore || data.quality?.score || 0;
    }
    return 0;
  }

  /**
   * Batch cache operations for efficiency
   */
  async batchCacheAnalysis(entries: Array<{ key: string; type: string; data: any; ttlHours?: number }>): Promise<void> {
    try {
      const cacheEntries = entries.map(entry => {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + (entry.ttlHours || 24));

        return {
          screenshotId: entry.key,
          analysisType: entry.type,
          analysisResult: entry.data,
          qualityScore: this.extractQualityScore(entry.data),
          expiresAt,
          hitCount: 0
        };
      });

      await this.prisma.visionAnalysisCache.createMany({
        data: cacheEntries,
        skipDuplicates: true
      });

      this.logger.info("Batch cache operation completed", { entriesCount: entries.length });
    } catch (error) {
      this.logger.error("Batch cache operation failed", { 
        entriesCount: entries.length,
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }
}