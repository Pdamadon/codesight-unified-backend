import request from 'supertest';
import app from '../../server';
import { prisma } from '../setup';
import { performance } from 'perf_hooks';

describe('Scalability Testing', () => {
  describe('Horizontal Scaling Simulation', () => {
    it('should handle increasing user loads gracefully', async () => {
      const loadLevels = [10, 25, 50, 100, 200];
      const results = [];

      for (const userCount of loadLevels) {
        const startTime = performance.now();
        const promises = [];

        // Simulate concurrent users
        for (let i = 0; i < userCount; i++) {
          promises.push((async () => {
            // Each user creates a session and performs actions
            const sessionResponse = await request(app)
              .post('/api/sessions')
              .send({
                type: 'human',
                workerId: `scale-user-${userCount}-${i}`
              });

            if (sessionResponse.status !== 201) {
              throw new Error(`Session creation failed: ${sessionResponse.status}`);
            }

            const sessionId = sessionResponse.body.id;

            // Perform multiple actions
            const actions = [];
            for (let j = 0; j < 5; j++) {
              actions.push(
                request(app)
                  .post(`/api/sessions/${sessionId}/interactions`)
                  .send({
                    type: 'click',
                    timestamp: Date.now() + j * 100,
                    primarySelector: `#element-${j}`,
                    elementTag: 'button',
                    url: 'https://example.com',
                    pageTitle: 'Test Page'
                  })
              );
            }

            await Promise.all(actions);

            // Complete session
            await request(app)
              .patch(`/api/sessions/${sessionId}`)
              .send({
                status: 'completed',
                endTime: new Date().toISOString()
              });

            return sessionId;
          })());
        }

        try {
          const sessionIds = await Promise.all(promises);
          const endTime = performance.now();
          const duration = endTime - startTime;

          results.push({
            userCount,
            duration,
            throughput: userCount / (duration / 1000), // users per second
            avgResponseTime: duration / userCount,
            success: true,
            sessionIds
          });

          // Cleanup
          await prisma.interaction.deleteMany({
            where: { sessionId: { in: sessionIds } }
          });
          await prisma.unifiedSession.deleteMany({
            where: { id: { in: sessionIds } }
          });

        } catch (error) {
          results.push({
            userCount,
            duration: performance.now() - startTime,
            throughput: 0,
            avgResponseTime: 0,
            success: false,
            error: error.message
          });
        }

        // Wait between load levels
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Analyze scalability
      const successfulResults = results.filter(r => r.success);
      expect(successfulResults.length).toBeGreaterThan(0);

      // Check that system handles increasing load reasonably
      successfulResults.forEach((result, index) => {
        if (index > 0) {
          const previousResult = successfulResults[index - 1];
          const scalingFactor = result.userCount / previousResult.userCount;
          const performanceDegradation = result.avgResponseTime / previousResult.avgResponseTime;

          // Performance degradation should be reasonable (not more than 3x the scaling factor)
          expect(performanceDegradation).toBeLessThan(scalingFactor * 3);
        }
      });
    });

    it('should maintain data consistency under high concurrency', async () => {
      const concurrentOperations = 100;
      const operationsPerUser = 10;
      const promises = [];

      // Create a shared resource to test consistency
      const sharedSession = await prisma.unifiedSession.create({
        data: {
          id: 'shared-consistency-session',
          type: 'HUMAN',
          status: 'ACTIVE',
          startTime: new Date()
        }
      });

      // Multiple users trying to update the same session concurrently
      for (let i = 0; i < concurrentOperations; i++) {
        promises.push((async () => {
          const operations = [];
          
          for (let j = 0; j < operationsPerUser; j++) {
            operations.push(
              prisma.interaction.create({
                data: {
                  id: `consistency-interaction-${i}-${j}`,
                  sessionId: sharedSession.id,
                  type: 'CLICK',
                  timestamp: BigInt(Date.now() + i * 1000 + j * 100),
                  sessionTime: i * 1000 + j * 100,
                  primarySelector: `#element-${i}-${j}`,
                  elementTag: 'button',
                  url: 'https://example.com',
                  pageTitle: 'Consistency Test',
                  boundingBox: {},
                  viewport: {}
                }
              })
            );
          }

          return Promise.all(operations);
        })());
      }

      const startTime = performance.now();
      await Promise.all(promises);
      const endTime = performance.now();

      // Verify data consistency
      const totalInteractions = await prisma.interaction.count({
        where: { sessionId: sharedSession.id }
      });

      const expectedTotal = concurrentOperations * operationsPerUser;
      expect(totalInteractions).toBe(expectedTotal);
      expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Verify no duplicate IDs (data integrity)
      const interactions = await prisma.interaction.findMany({
        where: { sessionId: sharedSession.id },
        select: { id: true }
      });

      const uniqueIds = new Set(interactions.map(i => i.id));
      expect(uniqueIds.size).toBe(totalInteractions);

      // Cleanup
      await prisma.interaction.deleteMany({
        where: { sessionId: sharedSession.id }
      });
      await prisma.unifiedSession.delete({
        where: { id: sharedSession.id }
      });
    });
  });

  describe('Data Volume Scaling', () => {
    it('should handle exponentially increasing data volumes', async () => {
      const dataVolumes = [100, 500, 1000, 5000, 10000];
      const results = [];

      for (const volume of dataVolumes) {
        const session = await prisma.unifiedSession.create({
          data: {
            id: `volume-test-${volume}`,
            type: 'HUMAN',
            status: 'ACTIVE',
            startTime: new Date()
          }
        });

        // Test insertion performance
        const insertStart = performance.now();
        
        const batchSize = 1000;
        const batches = Math.ceil(volume / batchSize);

        for (let batch = 0; batch < batches; batch++) {
          const batchStart = batch * batchSize;
          const batchEnd = Math.min(batchStart + batchSize, volume);
          const batchData = [];

          for (let i = batchStart; i < batchEnd; i++) {
            batchData.push({
              id: `volume-interaction-${volume}-${i}`,
              sessionId: session.id,
              type: 'CLICK',
              timestamp: BigInt(Date.now() + i),
              sessionTime: i * 100,
              primarySelector: `#element-${i}`,
              elementTag: 'button',
              elementText: `Button ${i}`,
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

        const insertEnd = performance.now();
        const insertTime = insertEnd - insertStart;

        // Test query performance
        const queryStart = performance.now();
        
        const recentInteractions = await prisma.interaction.findMany({
          where: { sessionId: session.id },
          orderBy: { timestamp: 'desc' },
          take: 100
        });

        const totalCount = await prisma.interaction.count({
          where: { sessionId: session.id }
        });

        const queryEnd = performance.now();
        const queryTime = queryEnd - queryStart;

        results.push({
          volume,
          insertTime,
          queryTime,
          insertThroughput: volume / (insertTime / 1000), // records per second
          queryThroughput: 100 / (queryTime / 1000), // records per second
          totalRecords: totalCount
        });

        expect(totalCount).toBe(volume);
        expect(recentInteractions).toHaveLength(100);

        // Cleanup
        await prisma.interaction.deleteMany({
          where: { sessionId: session.id }
        });
        await prisma.unifiedSession.delete({
          where: { id: session.id }
        });
      }

      // Analyze scaling characteristics
      results.forEach((result, index) => {
        // Insert performance should remain reasonable
        expect(result.insertThroughput).toBeGreaterThan(100); // At least 100 records/second

        // Query performance should remain fast regardless of data volume
        expect(result.queryTime).toBeLessThan(1000); // Less than 1 second

        if (index > 0) {
          const previousResult = results[index - 1];
          const volumeRatio = result.volume / previousResult.volume;
          const timeRatio = result.insertTime / previousResult.insertTime;

          // Insert time should scale sub-linearly (better than O(n))
          expect(timeRatio).toBeLessThan(volumeRatio * 1.5);
        }
      });
    });

    it('should handle large session queries efficiently', async () => {
      const numSessions = 1000;
      const interactionsPerSession = 50;

      // Create many sessions with interactions
      const sessionPromises = [];
      for (let i = 0; i < numSessions; i++) {
        sessionPromises.push((async () => {
          const session = await prisma.unifiedSession.create({
            data: {
              id: `large-query-session-${i}`,
              type: 'HUMAN',
              status: i % 2 === 0 ? 'COMPLETED' : 'ACTIVE',
              startTime: new Date(Date.now() - i * 60000), // Spread over time
              endTime: i % 2 === 0 ? new Date(Date.now() - i * 60000 + 300000) : null,
              qualityScore: Math.random() * 100,
              completeness: Math.random() * 100
            }
          });

          // Add interactions
          const interactions = Array.from({ length: interactionsPerSession }, (_, j) => ({
            id: `large-query-interaction-${i}-${j}`,
            sessionId: session.id,
            type: 'CLICK',
            timestamp: BigInt(Date.now() - i * 60000 + j * 1000),
            sessionTime: j * 1000,
            primarySelector: `#element-${j}`,
            elementTag: 'button',
            url: 'https://example.com',
            pageTitle: 'Test Page',
            boundingBox: {},
            viewport: {}
          }));

          await prisma.interaction.createMany({
            data: interactions
          });

          return session.id;
        })());
      }

      const sessionIds = await Promise.all(sessionPromises);

      // Test various query patterns
      const queryTests = [
        {
          name: 'Recent sessions',
          query: () => prisma.unifiedSession.findMany({
            orderBy: { startTime: 'desc' },
            take: 50
          })
        },
        {
          name: 'High quality sessions',
          query: () => prisma.unifiedSession.findMany({
            where: { qualityScore: { gte: 80 } },
            take: 100
          })
        },
        {
          name: 'Sessions with interactions',
          query: () => prisma.unifiedSession.findMany({
            include: {
              interactions: { take: 10 }
            },
            take: 20
          })
        },
        {
          name: 'Complex aggregation',
          query: () => prisma.unifiedSession.groupBy({
            by: ['status'],
            _count: { id: true },
            _avg: { qualityScore: true }
          })
        }
      ];

      const queryResults = [];
      for (const test of queryTests) {
        const startTime = performance.now();
        const result = await test.query();
        const endTime = performance.now();
        const duration = endTime - startTime;

        queryResults.push({
          name: test.name,
          duration,
          resultCount: Array.isArray(result) ? result.length : Object.keys(result).length
        });

        // Each query should complete within reasonable time
        expect(duration).toBeLessThan(2000); // Less than 2 seconds
      }

      // Cleanup
      await prisma.interaction.deleteMany({
        where: { sessionId: { in: sessionIds } }
      });
      await prisma.unifiedSession.deleteMany({
        where: { id: { in: sessionIds } }
      });
    });
  });

  describe('Resource Scaling', () => {
    it('should efficiently utilize available CPU cores', async () => {
      const numCores = require('os').cpus().length;
      const tasksPerCore = 10;
      const totalTasks = numCores * tasksPerCore;

      const startTime = performance.now();
      const promises = [];

      // Create CPU-intensive tasks
      for (let i = 0; i < totalTasks; i++) {
        promises.push((async () => {
          // Simulate CPU-intensive work
          const session = await prisma.unifiedSession.create({
            data: {
              id: `cpu-test-${i}`,
              type: 'HUMAN',
              status: 'ACTIVE',
              startTime: new Date()
            }
          });

          // Create and process data
          const interactions = [];
          for (let j = 0; j < 100; j++) {
            interactions.push({
              id: `cpu-interaction-${i}-${j}`,
              sessionId: session.id,
              type: 'CLICK',
              timestamp: BigInt(Date.now() + j),
              sessionTime: j * 100,
              primarySelector: `#element-${j}`,
              elementTag: 'button',
              url: 'https://example.com',
              pageTitle: 'CPU Test',
              boundingBox: {},
              viewport: {}
            });
          }

          await prisma.interaction.createMany({
            data: interactions
          });

          // Simulate processing
          const processed = interactions.map(interaction => ({
            ...interaction,
            processed: true,
            hash: require('crypto').createHash('md5').update(interaction.id).digest('hex')
          }));

          return { sessionId: session.id, processedCount: processed.length };
        })());
      }

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(results).toHaveLength(totalTasks);
      
      // Should complete faster than sequential execution
      const estimatedSequentialTime = totalTime * numCores;
      expect(totalTime).toBeLessThan(estimatedSequentialTime * 0.8);

      // Cleanup
      const sessionIds = results.map(r => r.sessionId);
      await prisma.interaction.deleteMany({
        where: { sessionId: { in: sessionIds } }
      });
      await prisma.unifiedSession.deleteMany({
        where: { id: { in: sessionIds } }
      });
    });

    it('should handle memory scaling efficiently', async () => {
      const memoryLevels = [10, 50, 100, 200]; // MB
      const results = [];

      for (const targetMemoryMB of memoryLevels) {
        const initialMemory = process.memoryUsage();
        const targetBytes = targetMemoryMB * 1024 * 1024;
        const objectSize = 1024; // 1KB per object
        const numObjects = Math.floor(targetBytes / objectSize);

        const startTime = performance.now();
        const dataStore = [];

        // Allocate memory gradually
        for (let i = 0; i < numObjects; i++) {
          const obj = {
            id: i,
            data: new Array(objectSize / 8).fill(i), // Roughly 1KB
            timestamp: Date.now(),
            processed: false
          };
          dataStore.push(obj);

          // Process every 1000 objects
          if (i % 1000 === 0) {
            dataStore.slice(-1000).forEach(item => {
              item.processed = true;
              item.hash = item.id.toString(16);
            });
          }
        }

        const endTime = performance.now();
        const finalMemory = process.memoryUsage();
        const actualMemoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / (1024 * 1024);

        results.push({
          targetMemoryMB,
          actualMemoryMB: actualMemoryIncrease,
          processingTime: endTime - startTime,
          objectsCreated: numObjects,
          efficiency: targetMemoryMB / actualMemoryIncrease
        });

        // Memory usage should be close to target
        expect(actualMemoryIncrease).toBeGreaterThan(targetMemoryMB * 0.5);
        expect(actualMemoryIncrease).toBeLessThan(targetMemoryMB * 2);

        // Processing should be efficient
        expect(endTime - startTime).toBeLessThan(targetMemoryMB * 100); // 100ms per MB

        // Clear memory
        dataStore.length = 0;
        if (global.gc) {
          global.gc();
        }
      }

      // Memory efficiency should remain consistent across levels
      results.forEach((result, index) => {
        if (index > 0) {
          const previousResult = results[index - 1];
          const efficiencyRatio = result.efficiency / previousResult.efficiency;
          
          // Efficiency should not degrade significantly
          expect(efficiencyRatio).toBeGreaterThan(0.7);
          expect(efficiencyRatio).toBeLessThan(1.5);
        }
      });
    });
  });
});