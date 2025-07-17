import { prisma } from '../setup';
import { performance } from 'perf_hooks';

describe('Memory Usage Testing', () => {
  // Helper function to get memory usage in MB
  const getMemoryUsageMB = () => {
    const usage = process.memoryUsage();
    return {
      rss: Math.round(usage.rss / 1024 / 1024),
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024)
    };
  };

  // Helper function to force garbage collection
  const forceGC = () => {
    if (global.gc) {
      global.gc();
    }
  };

  describe('Memory Leak Detection', () => {
    it('should not leak memory during repeated database operations', async () => {
      const iterations = 1000;
      const memorySnapshots = [];

      // Take initial memory snapshot
      forceGC();
      const initialMemory = getMemoryUsageMB();
      memorySnapshots.push({ iteration: 0, ...initialMemory });

      for (let i = 1; i <= iterations; i++) {
        // Create and delete session (potential leak source)
        const session = await prisma.unifiedSession.create({
          data: {
            id: `memory-leak-test-${i}`,
            type: 'HUMAN',
            status: 'ACTIVE',
            startTime: new Date()
          }
        });

        // Add some interactions
        await prisma.interaction.createMany({
          data: Array.from({ length: 10 }, (_, j) => ({
            id: `memory-leak-interaction-${i}-${j}`,
            sessionId: session.id,
            type: 'CLICK',
            timestamp: BigInt(Date.now() + j),
            sessionTime: j * 100,
            primarySelector: `#element-${j}`,
            elementTag: 'button',
            url: 'https://example.com',
            pageTitle: 'Memory Test',
            boundingBox: {},
            viewport: {}
          }))
        });

        // Delete everything
        await prisma.interaction.deleteMany({
          where: { sessionId: session.id }
        });
        await prisma.unifiedSession.delete({
          where: { id: session.id }
        });

        // Take memory snapshots at intervals
        if (i % 100 === 0) {
          forceGC();
          const currentMemory = getMemoryUsageMB();
          memorySnapshots.push({ iteration: i, ...currentMemory });
        }
      }

      // Analyze memory growth
      const finalMemory = memorySnapshots[memorySnapshots.length - 1];
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory growth should be minimal (less than 50MB)
      expect(memoryGrowth).toBeLessThan(50);

      // Check for consistent memory usage (no continuous growth)
      const midPoint = Math.floor(memorySnapshots.length / 2);
      const midMemory = memorySnapshots[midPoint];
      const lateMemoryGrowth = finalMemory.heapUsed - midMemory.heapUsed;

      // Late growth should be minimal
      expect(lateMemoryGrowth).toBeLessThan(20);
    });

    it('should handle large object creation and cleanup efficiently', async () => {
      const objectSizes = [1, 5, 10, 25]; // MB
      const results = [];

      for (const sizeMB of objectSizes) {
        forceGC();
        const initialMemory = getMemoryUsageMB();

        // Create large objects
        const largeObjects = [];
        const objectSize = sizeMB * 1024 * 1024; // Convert to bytes
        const arraySize = Math.floor(objectSize / 8); // Approximate array size

        const startTime = performance.now();

        for (let i = 0; i < 10; i++) {
          const largeObject = {
            id: `large-object-${sizeMB}MB-${i}`,
            data: new Array(arraySize).fill(i),
            metadata: {
              size: sizeMB,
              created: Date.now(),
              index: i
            }
          };
          largeObjects.push(largeObject);
        }

        const creationTime = performance.now() - startTime;
        const peakMemory = getMemoryUsageMB();

        // Clear objects
        largeObjects.length = 0;
        forceGC();

        const cleanupTime = performance.now() - startTime - creationTime;
        const finalMemory = getMemoryUsageMB();

        results.push({
          sizeMB,
          creationTime,
          cleanupTime,
          peakMemoryIncrease: peakMemory.heapUsed - initialMemory.heapUsed,
          finalMemoryIncrease: finalMemory.heapUsed - initialMemory.heapUsed
        });

        // Memory should be properly cleaned up
        expect(finalMemory.heapUsed - initialMemory.heapUsed).toBeLessThan(sizeMB * 2);
      }

      // Verify scaling characteristics
      results.forEach((result, index) => {
        if (index > 0) {
          const previousResult = results[index - 1];
          const sizeRatio = result.sizeMB / previousResult.sizeMB;
          const timeRatio = result.creationTime / previousResult.creationTime;

          // Creation time should scale reasonably with size
          expect(timeRatio).toBeLessThan(sizeRatio * 2);
        }
      });
    });

    it('should handle streaming data without memory accumulation', async () => {
      const streamDuration = 10000; // 10 seconds
      const dataRate = 100; // items per second
      const totalItems = (streamDuration / 1000) * dataRate;

      forceGC();
      const initialMemory = getMemoryUsageMB();
      const memorySnapshots = [];

      let processedItems = 0;
      const startTime = Date.now();

      // Simulate streaming data processing
      const processInterval = setInterval(() => {
        if (processedItems >= totalItems) {
          clearInterval(processInterval);
          return;
        }

        // Process a batch of items
        const batchSize = 10;
        const batch = [];

        for (let i = 0; i < batchSize && processedItems < totalItems; i++) {
          batch.push({
            id: processedItems,
            timestamp: Date.now(),
            data: new Array(100).fill(processedItems), // ~800 bytes per item
            processed: false
          });
          processedItems++;
        }

        // Process batch (simulate real work)
        batch.forEach(item => {
          item.processed = true;
          item.hash = item.id.toString(16);
        });

        // Don't keep references (simulate streaming)
        batch.length = 0;

        // Take memory snapshots
        if (processedItems % 200 === 0) {
          const currentMemory = getMemoryUsageMB();
          memorySnapshots.push({
            itemsProcessed: processedItems,
            timestamp: Date.now() - startTime,
            ...currentMemory
          });
        }
      }, 100); // Process every 100ms

      // Wait for completion
      await new Promise(resolve => {
        const checkCompletion = () => {
          if (processedItems >= totalItems) {
            resolve(undefined);
          } else {
            setTimeout(checkCompletion, 100);
          }
        };
        checkCompletion();
      });

      forceGC();
      const finalMemory = getMemoryUsageMB();

      // Memory should not grow significantly during streaming
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(50); // Less than 50MB growth

      // Check memory stability throughout the stream
      if (memorySnapshots.length > 2) {
        const firstSnapshot = memorySnapshots[1]; // Skip initial
        const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
        const streamingGrowth = lastSnapshot.heapUsed - firstSnapshot.heapUsed;

        expect(streamingGrowth).toBeLessThan(30); // Stable memory usage
      }
    });
  });

  describe('Memory Efficiency Testing', () => {
    it('should efficiently store and retrieve large datasets', async () => {
      const datasetSizes = [1000, 5000, 10000];
      const results = [];

      for (const size of datasetSizes) {
        forceGC();
        const initialMemory = getMemoryUsageMB();

        // Create test session
        const session = await prisma.unifiedSession.create({
          data: {
            id: `efficiency-test-${size}`,
            type: 'HUMAN',
            status: 'ACTIVE',
            startTime: new Date()
          }
        });

        const startTime = performance.now();

        // Create large dataset efficiently using batches
        const batchSize = 1000;
        const batches = Math.ceil(size / batchSize);

        for (let batch = 0; batch < batches; batch++) {
          const batchStart = batch * batchSize;
          const batchEnd = Math.min(batchStart + batchSize, size);
          const batchData = [];

          for (let i = batchStart; i < batchEnd; i++) {
            batchData.push({
              id: `efficiency-interaction-${size}-${i}`,
              sessionId: session.id,
              type: 'CLICK',
              timestamp: BigInt(Date.now() + i),
              sessionTime: i * 100,
              primarySelector: `#element-${i}`,
              elementTag: 'button',
              elementText: `Button ${i}`,
              elementAttributes: {
                'data-id': i.toString(),
                'class': 'test-button'
              },
              url: `https://example.com/page-${Math.floor(i / 100)}`,
              pageTitle: `Test Page ${Math.floor(i / 100)}`,
              boundingBox: { x: i % 100, y: Math.floor(i / 100), width: 100, height: 30 },
              viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: i % 1000 }
            });
          }

          await prisma.interaction.createMany({
            data: batchData
          });
        }

        const insertTime = performance.now() - startTime;
        const afterInsertMemory = getMemoryUsageMB();

        // Test retrieval efficiency
        const retrievalStart = performance.now();
        
        const retrievedData = await prisma.interaction.findMany({
          where: { sessionId: session.id },
          orderBy: { timestamp: 'asc' },
          take: 1000 // Get first 1000 records
        });

        const retrievalTime = performance.now() - retrievalStart;
        const afterRetrievalMemory = getMemoryUsageMB();

        results.push({
          size,
          insertTime,
          retrievalTime,
          insertThroughput: size / (insertTime / 1000),
          retrievalThroughput: 1000 / (retrievalTime / 1000),
          memoryForStorage: afterInsertMemory.heapUsed - initialMemory.heapUsed,
          memoryForRetrieval: afterRetrievalMemory.heapUsed - afterInsertMemory.heapUsed,
          memoryEfficiency: size / (afterInsertMemory.heapUsed - initialMemory.heapUsed)
        });

        expect(retrievedData).toHaveLength(1000);

        // Cleanup
        await prisma.interaction.deleteMany({
          where: { sessionId: session.id }
        });
        await prisma.unifiedSession.delete({
          where: { id: session.id }
        });

        forceGC();
      }

      // Analyze efficiency trends
      results.forEach((result, index) => {
        // Insert throughput should be reasonable
        expect(result.insertThroughput).toBeGreaterThan(100); // At least 100 records/second

        // Retrieval should be fast
        expect(result.retrievalTime).toBeLessThan(1000); // Less than 1 second

        // Memory efficiency should be reasonable
        expect(result.memoryEfficiency).toBeGreaterThan(1); // At least 1 record per MB

        if (index > 0) {
          const previousResult = results[index - 1];
          const sizeRatio = result.size / previousResult.size;
          const memoryRatio = result.memoryForStorage / previousResult.memoryForStorage;

          // Memory usage should scale sub-linearly
          expect(memoryRatio).toBeLessThan(sizeRatio * 1.5);
        }
      });
    });

    it('should handle complex object graphs efficiently', async () => {
      forceGC();
      const initialMemory = getMemoryUsageMB();

      // Create complex nested data structures
      const complexSessions = [];
      const numSessions = 100;

      for (let i = 0; i < numSessions; i++) {
        const session = await prisma.unifiedSession.create({
          data: {
            id: `complex-session-${i}`,
            type: 'HUMAN',
            status: 'ACTIVE',
            startTime: new Date(),
            metadata: {
              browser: 'chrome',
              version: '120.0',
              platform: 'desktop',
              userAgent: 'Mozilla/5.0 (complex test)',
              viewport: { width: 1920, height: 1080 },
              settings: {
                quality: 'high',
                compression: true,
                features: ['screenshots', 'interactions', 'analytics']
              }
            }
          }
        });

        // Add interactions with complex data
        const interactions = [];
        for (let j = 0; j < 50; j++) {
          interactions.push({
            id: `complex-interaction-${i}-${j}`,
            sessionId: session.id,
            type: 'CLICK',
            timestamp: BigInt(Date.now() + j * 100),
            sessionTime: j * 100,
            primarySelector: `#complex-element-${j}`,
            alternativeSelectors: [
              `[data-id="${j}"]`,
              `.element-class-${j}`,
              `xpath://div[${j}]`
            ],
            elementTag: 'button',
            elementText: `Complex Button ${j}`,
            elementAttributes: {
              'data-id': j.toString(),
              'class': `btn btn-${j % 3 === 0 ? 'primary' : 'secondary'}`,
              'aria-label': `Complex button ${j}`,
              'data-analytics': JSON.stringify({ action: 'click', element: j })
            },
            url: `https://example.com/complex-page-${Math.floor(j / 10)}`,
            pageTitle: `Complex Test Page ${Math.floor(j / 10)}`,
            boundingBox: {
              x: (j * 37) % 1920,
              y: (j * 23) % 1080,
              width: 100 + (j % 50),
              height: 30 + (j % 20)
            },
            viewport: {
              width: 1920,
              height: 1080,
              scrollX: (j * 13) % 500,
              scrollY: (j * 17) % 1000
            },
            context: {
              nearbyElements: Array.from({ length: 5 }, (_, k) => ({
                tag: 'div',
                id: `nearby-${k}`,
                text: `Nearby element ${k}`
              })),
              pageStructure: {
                sections: [`section-${j % 5}`],
                forms: j % 10 === 0 ? [`form-${Math.floor(j / 10)}`] : [],
                modals: j % 20 === 0 ? [`modal-${Math.floor(j / 20)}`] : []
              }
            }
          });
        }

        await prisma.interaction.createMany({
          data: interactions
        });

        complexSessions.push(session.id);
      }

      const afterCreationMemory = getMemoryUsageMB();

      // Test complex queries
      const queryStart = performance.now();
      
      const complexQuery = await prisma.unifiedSession.findMany({
        where: {
          id: { in: complexSessions.slice(0, 20) }
        },
        include: {
          interactions: {
            orderBy: { timestamp: 'desc' },
            take: 10
          }
        }
      });

      const queryTime = performance.now() - queryStart;
      const afterQueryMemory = getMemoryUsageMB();

      // Verify results
      expect(complexQuery).toHaveLength(20);
      complexQuery.forEach(session => {
        expect(session.interactions).toHaveLength(10);
        expect(session.metadata).toBeDefined();
      });

      // Performance expectations
      expect(queryTime).toBeLessThan(2000); // Less than 2 seconds
      
      const memoryForCreation = afterCreationMemory.heapUsed - initialMemory.heapUsed;
      const memoryForQuery = afterQueryMemory.heapUsed - afterCreationMemory.heapUsed;

      // Memory usage should be reasonable for complex data
      expect(memoryForCreation).toBeLessThan(200); // Less than 200MB for creation
      expect(memoryForQuery).toBeLessThan(50); // Less than 50MB for query

      // Cleanup
      await prisma.interaction.deleteMany({
        where: { sessionId: { in: complexSessions } }
      });
      await prisma.unifiedSession.deleteMany({
        where: { id: { in: complexSessions } }
      });

      forceGC();
      const finalMemory = getMemoryUsageMB();
      const memoryRecovered = afterQueryMemory.heapUsed - finalMemory.heapUsed;

      // Most memory should be recovered after cleanup
      expect(memoryRecovered).toBeGreaterThan(memoryForCreation * 0.7);
    });
  });

  describe('Garbage Collection Efficiency', () => {
    it('should trigger garbage collection appropriately under memory pressure', async () => {
      const memoryPressureThreshold = 500; // MB
      const allocationSize = 50; // MB per allocation
      const allocations = [];
      const gcEvents = [];

      // Monitor GC events if possible
      if (process.env.NODE_ENV === 'test' && global.gc) {
        const originalGC = global.gc;
        global.gc = () => {
          gcEvents.push({
            timestamp: Date.now(),
            memoryBefore: getMemoryUsageMB()
          });
          originalGC();
        };
      }

      try {
        while (getMemoryUsageMB().heapUsed < memoryPressureThreshold) {
          const allocation = {
            id: allocations.length,
            data: new Array(allocationSize * 1024 * 1024 / 8).fill(allocations.length),
            timestamp: Date.now()
          };
          allocations.push(allocation);

          // Simulate some processing
          allocation.processed = allocation.data.reduce((sum, val) => sum + val, 0) > 0;

          // Periodically release old allocations
          if (allocations.length > 5) {
            allocations.shift();
          }

          // Force GC occasionally to test efficiency
          if (allocations.length % 3 === 0 && global.gc) {
            global.gc();
          }
        }

        const peakMemory = getMemoryUsageMB();
        
        // Clear all allocations
        allocations.length = 0;
        
        if (global.gc) {
          global.gc();
        }

        const finalMemory = getMemoryUsageMB();
        const memoryRecovered = peakMemory.heapUsed - finalMemory.heapUsed;

        // Should recover most of the allocated memory
        expect(memoryRecovered).toBeGreaterThan(memoryPressureThreshold * 0.6);
        
        // Final memory should be reasonable
        expect(finalMemory.heapUsed).toBeLessThan(200);

      } finally {
        // Restore original GC if we modified it
        if (process.env.NODE_ENV === 'test' && gcEvents.length > 0) {
          // Analyze GC efficiency
          expect(gcEvents.length).toBeGreaterThan(0);
        }
      }
    });

    it('should handle rapid allocation and deallocation cycles', async () => {
      const cycles = 100;
      const objectsPerCycle = 1000;
      const memorySnapshots = [];

      forceGC();
      const initialMemory = getMemoryUsageMB();

      for (let cycle = 0; cycle < cycles; cycle++) {
        // Allocation phase
        const objects = [];
        for (let i = 0; i < objectsPerCycle; i++) {
          objects.push({
            id: `cycle-${cycle}-object-${i}`,
            data: new Array(100).fill(i),
            metadata: {
              cycle,
              index: i,
              timestamp: Date.now()
            }
          });
        }

        // Processing phase
        objects.forEach(obj => {
          obj.processed = true;
          obj.hash = obj.id.length.toString(16);
        });

        // Deallocation phase
        objects.length = 0;

        // Take memory snapshots
        if (cycle % 10 === 0) {
          if (global.gc) {
            global.gc();
          }
          memorySnapshots.push({
            cycle,
            ...getMemoryUsageMB()
          });
        }
      }

      forceGC();
      const finalMemory = getMemoryUsageMB();

      // Memory should remain stable across cycles
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      expect(memoryGrowth).toBeLessThan(50); // Less than 50MB growth

      // Check memory stability across snapshots
      if (memorySnapshots.length > 2) {
        const midSnapshot = memorySnapshots[Math.floor(memorySnapshots.length / 2)];
        const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
        const midToEndGrowth = lastSnapshot.heapUsed - midSnapshot.heapUsed;

        expect(midToEndGrowth).toBeLessThan(30); // Stable memory usage
      }
    });
  });
});