import { performance } from 'perf_hooks';
import { prisma } from '../setup';

describe('Performance Test Runner', () => {
  // Performance thresholds configuration
  const PERFORMANCE_THRESHOLDS = {
    api: {
      maxResponseTime: 2000, // 2 seconds
      minThroughput: 50, // requests per second
      maxErrorRate: 5 // 5%
    },
    database: {
      maxQueryTime: 500, // 500ms
      maxBulkInsertTime: 5000, // 5 seconds for 1000 records
      maxConnectionTime: 1000 // 1 second
    },
    memory: {
      maxLeakPerOperation: 1024 * 1024, // 1MB per operation
      maxTotalIncrease: 100 * 1024 * 1024, // 100MB total
      maxGCPressure: 50 // 50MB before GC
    },
    websocket: {
      maxConnectionTime: 3000, // 3 seconds
      maxMessageLatency: 100, // 100ms
      minConcurrentConnections: 100
    }
  };

  // Helper function to run performance benchmarks
  const runBenchmark = async (name: string, testFunction: () => Promise<any>, iterations: number = 1) => {
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const startMemory = process.memoryUsage();
      
      try {
        const result = await testFunction();
        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        
        results.push({
          iteration: i + 1,
          duration: endTime - startTime,
          memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
          success: true,
          result
        });
      } catch (error) {
        const endTime = performance.now();
        const endMemory = process.memoryUsage();
        
        results.push({
          iteration: i + 1,
          duration: endTime - startTime,
          memoryDelta: endMemory.heapUsed - startMemory.heapUsed,
          success: false,
          error: error.message
        });
      }
    }

    // Calculate statistics
    const successfulRuns = results.filter(r => r.success);
    const stats = {
      name,
      totalRuns: results.length,
      successfulRuns: successfulRuns.length,
      successRate: (successfulRuns.length / results.length) * 100,
      avgDuration: successfulRuns.reduce((sum, r) => sum + r.duration, 0) / successfulRuns.length,
      minDuration: Math.min(...successfulRuns.map(r => r.duration)),
      maxDuration: Math.max(...successfulRuns.map(r => r.duration)),
      avgMemoryDelta: successfulRuns.reduce((sum, r) => sum + r.memoryDelta, 0) / successfulRuns.length,
      totalMemoryDelta: successfulRuns.reduce((sum, r) => sum + r.memoryDelta, 0)
    };

    return { stats, results };
  };

  describe('Comprehensive Performance Benchmarks', () => {
    it('should run database performance benchmarks', async () => {
      const benchmarks = [
        {
          name: 'Session Creation',
          test: async () => {
            const session = await prisma.unifiedSession.create({
              data: {
                id: `benchmark-session-${Date.now()}`,
                type: 'HUMAN',
                status: 'ACTIVE',
                startTime: new Date()
              }
            });
            await prisma.unifiedSession.delete({ where: { id: session.id } });
            return session.id;
          },
          iterations: 100
        },
        {
          name: 'Bulk Interaction Insert',
          test: async () => {
            const session = await prisma.unifiedSession.create({
              data: {
                id: `bulk-benchmark-${Date.now()}`,
                type: 'HUMAN',
                status: 'ACTIVE',
                startTime: new Date()
              }
            });

            const interactions = Array.from({ length: 100 }, (_, i) => ({
              id: `bulk-interaction-${Date.now()}-${i}`,
              sessionId: session.id,
              type: 'CLICK',
              timestamp: BigInt(Date.now() + i),
              sessionTime: i * 100,
              primarySelector: `#element-${i}`,
              elementTag: 'button',
              url: 'https://example.com',
              pageTitle: 'Benchmark Test',
              boundingBox: {},
              viewport: {}
            }));

            await prisma.interaction.createMany({ data: interactions });
            
            const count = await prisma.interaction.count({
              where: { sessionId: session.id }
            });

            // Cleanup
            await prisma.interaction.deleteMany({
              where: { sessionId: session.id }
            });
            await prisma.unifiedSession.delete({ where: { id: session.id } });

            return count;
          },
          iterations: 10
        },
        {
          name: 'Complex Query',
          test: async () => {
            const sessions = await prisma.unifiedSession.findMany({
              include: {
                interactions: { take: 5 },
                screenshots: { take: 3 }
              },
              take: 10,
              orderBy: { startTime: 'desc' }
            });
            return sessions.length;
          },
          iterations: 50
        }
      ];

      const benchmarkResults = [];

      for (const benchmark of benchmarks) {
        const { stats } = await runBenchmark(
          benchmark.name,
          benchmark.test,
          benchmark.iterations
        );

        benchmarkResults.push(stats);

        // Verify performance thresholds
        expect(stats.successRate).toBeGreaterThan(95);
        expect(stats.avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.database.maxQueryTime);
      }

      // Log benchmark results for analysis
      console.log('\n=== Database Performance Benchmarks ===');
      benchmarkResults.forEach(stats => {
        console.log(`${stats.name}:`);
        console.log(`  Success Rate: ${stats.successRate.toFixed(2)}%`);
        console.log(`  Avg Duration: ${stats.avgDuration.toFixed(2)}ms`);
        console.log(`  Min/Max: ${stats.minDuration.toFixed(2)}ms / ${stats.maxDuration.toFixed(2)}ms`);
        console.log(`  Avg Memory Delta: ${(stats.avgMemoryDelta / 1024 / 1024).toFixed(2)}MB`);
        console.log('');
      });
    });

    it('should run memory performance benchmarks', async () => {
      const memoryBenchmarks = [
        {
          name: 'Memory Allocation/Deallocation',
          test: async () => {
            const largeArray = new Array(100000).fill(0).map((_, i) => ({
              id: i,
              data: `data-${i}`,
              timestamp: Date.now()
            }));

            // Process the array
            const processed = largeArray
              .filter(item => item.id % 2 === 0)
              .map(item => ({ ...item, processed: true }));

            return processed.length;
          },
          iterations: 50
        },
        {
          name: 'Database Memory Usage',
          test: async () => {
            const sessions = [];
            
            // Create multiple sessions
            for (let i = 0; i < 20; i++) {
              const session = await prisma.unifiedSession.create({
                data: {
                  id: `memory-test-${Date.now()}-${i}`,
                  type: 'HUMAN',
                  status: 'ACTIVE',
                  startTime: new Date()
                }
              });
              sessions.push(session.id);
            }

            // Query all sessions
            const results = await prisma.unifiedSession.findMany({
              where: { id: { in: sessions } }
            });

            // Cleanup
            await prisma.unifiedSession.deleteMany({
              where: { id: { in: sessions } }
            });

            return results.length;
          },
          iterations: 25
        }
      ];

      const memoryResults = [];

      for (const benchmark of memoryBenchmarks) {
        const { stats } = await runBenchmark(
          benchmark.name,
          benchmark.test,
          benchmark.iterations
        );

        memoryResults.push(stats);

        // Verify memory thresholds
        expect(stats.avgMemoryDelta).toBeLessThan(PERFORMANCE_THRESHOLDS.memory.maxLeakPerOperation);
      }

      console.log('\n=== Memory Performance Benchmarks ===');
      memoryResults.forEach(stats => {
        console.log(`${stats.name}:`);
        console.log(`  Success Rate: ${stats.successRate.toFixed(2)}%`);
        console.log(`  Avg Duration: ${stats.avgDuration.toFixed(2)}ms`);
        console.log(`  Avg Memory Delta: ${(stats.avgMemoryDelta / 1024 / 1024).toFixed(2)}MB`);
        console.log(`  Total Memory Delta: ${(stats.totalMemoryDelta / 1024 / 1024).toFixed(2)}MB`);
        console.log('');
      });
    });

    it('should run concurrent operation benchmarks', async () => {
      const concurrencyLevels = [10, 25, 50, 100];
      const results = [];

      for (const concurrency of concurrencyLevels) {
        const { stats } = await runBenchmark(
          `Concurrent Operations (${concurrency})`,
          async () => {
            const promises = [];
            
            for (let i = 0; i < concurrency; i++) {
              promises.push((async () => {
                const session = await prisma.unifiedSession.create({
                  data: {
                    id: `concurrent-${Date.now()}-${i}`,
                    type: 'HUMAN',
                    status: 'ACTIVE',
                    startTime: new Date()
                  }
                });

                await prisma.interaction.create({
                  data: {
                    id: `concurrent-interaction-${Date.now()}-${i}`,
                    sessionId: session.id,
                    type: 'CLICK',
                    timestamp: BigInt(Date.now()),
                    sessionTime: 0,
                    primarySelector: '#test-element',
                    elementTag: 'button',
                    url: 'https://example.com',
                    pageTitle: 'Concurrent Test',
                    boundingBox: {},
                    viewport: {}
                  }
                });

                await prisma.interaction.deleteMany({
                  where: { sessionId: session.id }
                });
                await prisma.unifiedSession.delete({
                  where: { id: session.id }
                });

                return session.id;
              })());
            }

            const sessionIds = await Promise.all(promises);
            return sessionIds.length;
          },
          5 // Run 5 times for each concurrency level
        );

        results.push({ concurrency, stats });

        // Verify performance scales reasonably
        expect(stats.successRate).toBeGreaterThan(90);
        expect(stats.avgDuration).toBeLessThan(concurrency * 100); // Should scale sub-linearly
      }

      console.log('\n=== Concurrency Performance Benchmarks ===');
      results.forEach(({ concurrency, stats }) => {
        console.log(`Concurrency Level ${concurrency}:`);
        console.log(`  Success Rate: ${stats.successRate.toFixed(2)}%`);
        console.log(`  Avg Duration: ${stats.avgDuration.toFixed(2)}ms`);
        console.log(`  Throughput: ${(concurrency / (stats.avgDuration / 1000)).toFixed(2)} ops/sec`);
        console.log('');
      });
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions', async () => {
      // Baseline performance test
      const baselineTest = async () => {
        const session = await prisma.unifiedSession.create({
          data: {
            id: `regression-test-${Date.now()}`,
            type: 'HUMAN',
            status: 'ACTIVE',
            startTime: new Date()
          }
        });

        const interactions = Array.from({ length: 50 }, (_, i) => ({
          id: `regression-interaction-${Date.now()}-${i}`,
          sessionId: session.id,
          type: 'CLICK',
          timestamp: BigInt(Date.now() + i),
          sessionTime: i * 100,
          primarySelector: `#element-${i}`,
          elementTag: 'button',
          url: 'https://example.com',
          pageTitle: 'Regression Test',
          boundingBox: {},
          viewport: {}
        }));

        await prisma.interaction.createMany({ data: interactions });

        const result = await prisma.unifiedSession.findUnique({
          where: { id: session.id },
          include: {
            interactions: { take: 10 }
          }
        });

        // Cleanup
        await prisma.interaction.deleteMany({
          where: { sessionId: session.id }
        });
        await prisma.unifiedSession.delete({
          where: { id: session.id }
        });

        return result;
      };

      // Run baseline multiple times
      const { stats: baselineStats } = await runBenchmark(
        'Regression Baseline',
        baselineTest,
        20
      );

      // Performance should be consistent
      expect(baselineStats.successRate).toBe(100);
      expect(baselineStats.maxDuration - baselineStats.minDuration).toBeLessThan(baselineStats.avgDuration * 2);

      // Store baseline for future comparisons
      const performanceBaseline = {
        avgDuration: baselineStats.avgDuration,
        maxAcceptableDuration: baselineStats.avgDuration * 1.5, // 50% tolerance
        avgMemoryDelta: baselineStats.avgMemoryDelta,
        maxAcceptableMemoryDelta: baselineStats.avgMemoryDelta * 2 // 100% tolerance
      };

      console.log('\n=== Performance Baseline Established ===');
      console.log(`Avg Duration: ${performanceBaseline.avgDuration.toFixed(2)}ms`);
      console.log(`Max Acceptable Duration: ${performanceBaseline.maxAcceptableDuration.toFixed(2)}ms`);
      console.log(`Avg Memory Delta: ${(performanceBaseline.avgMemoryDelta / 1024 / 1024).toFixed(2)}MB`);
      console.log(`Max Acceptable Memory Delta: ${(performanceBaseline.maxAcceptableMemoryDelta / 1024 / 1024).toFixed(2)}MB`);

      // Future test runs should compare against this baseline
      expect(performanceBaseline.avgDuration).toBeLessThan(PERFORMANCE_THRESHOLDS.database.maxQueryTime);
    });
  });

  describe('System Resource Monitoring', () => {
    it('should monitor system resources during load', async () => {
      const monitoringDuration = 30000; // 30 seconds
      const sampleInterval = 1000; // 1 second
      const resourceSamples = [];

      const startTime = Date.now();
      let sampleCount = 0;

      // Start background load
      const loadPromises = [];
      const loadOperations = 100;

      for (let i = 0; i < loadOperations; i++) {
        loadPromises.push((async () => {
          const session = await prisma.unifiedSession.create({
            data: {
              id: `resource-monitor-${Date.now()}-${i}`,
              type: 'HUMAN',
              status: 'ACTIVE',
              startTime: new Date()
            }
          });

          // Add some interactions
          await prisma.interaction.createMany({
            data: Array.from({ length: 10 }, (_, j) => ({
              id: `resource-interaction-${Date.now()}-${i}-${j}`,
              sessionId: session.id,
              type: 'CLICK',
              timestamp: BigInt(Date.now() + j),
              sessionTime: j * 100,
              primarySelector: `#element-${j}`,
              elementTag: 'button',
              url: 'https://example.com',
              pageTitle: 'Resource Monitor Test',
              boundingBox: {},
              viewport: {}
            }))
          });

          // Simulate processing time
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

          // Cleanup
          await prisma.interaction.deleteMany({
            where: { sessionId: session.id }
          });
          await prisma.unifiedSession.delete({
            where: { id: session.id }
          });

          return session.id;
        })());
      }

      // Monitor resources while load is running
      const monitoringInterval = setInterval(() => {
        const currentTime = Date.now();
        if (currentTime - startTime >= monitoringDuration) {
          clearInterval(monitoringInterval);
          return;
        }

        const memoryUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        resourceSamples.push({
          timestamp: currentTime - startTime,
          memory: {
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            external: Math.round(memoryUsage.external / 1024 / 1024)
          },
          cpu: {
            user: cpuUsage.user,
            system: cpuUsage.system
          }
        });

        sampleCount++;
      }, sampleInterval);

      // Wait for load operations to complete
      await Promise.all(loadPromises);

      // Wait for monitoring to complete
      await new Promise(resolve => {
        const checkComplete = () => {
          if (Date.now() - startTime >= monitoringDuration) {
            resolve(undefined);
          } else {
            setTimeout(checkComplete, 100);
          }
        };
        checkComplete();
      });

      // Analyze resource usage
      expect(resourceSamples.length).toBeGreaterThan(10);

      const avgMemoryUsage = resourceSamples.reduce((sum, sample) => sum + sample.memory.heapUsed, 0) / resourceSamples.length;
      const maxMemoryUsage = Math.max(...resourceSamples.map(s => s.memory.heapUsed));
      const memoryGrowth = resourceSamples[resourceSamples.length - 1].memory.heapUsed - resourceSamples[0].memory.heapUsed;

      console.log('\n=== Resource Monitoring Results ===');
      console.log(`Monitoring Duration: ${monitoringDuration / 1000}s`);
      console.log(`Samples Collected: ${resourceSamples.length}`);
      console.log(`Avg Memory Usage: ${avgMemoryUsage.toFixed(2)}MB`);
      console.log(`Max Memory Usage: ${maxMemoryUsage.toFixed(2)}MB`);
      console.log(`Memory Growth: ${memoryGrowth.toFixed(2)}MB`);

      // Verify resource usage is within acceptable limits
      expect(maxMemoryUsage).toBeLessThan(500); // Less than 500MB
      expect(Math.abs(memoryGrowth)).toBeLessThan(100); // Memory growth/shrinkage less than 100MB
    });
  });
});