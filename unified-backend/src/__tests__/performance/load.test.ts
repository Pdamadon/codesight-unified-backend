import request from 'supertest';
import app from '../../server';
import { prisma } from '../setup';
import { performance } from 'perf_hooks';
import { WebSocket } from 'ws';

describe('Performance and Load Testing', () => {
  describe('API Endpoint Performance', () => {
    it('should handle health check requests efficiently', async () => {
      const startTime = Date.now();
      const promises = [];

      // Make 50 concurrent health check requests
      for (let i = 0; i < 50; i++) {
        promises.push(request(app).get('/health'));
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status');
      });

      // Should complete within reasonable time (5 seconds for 50 requests)
      expect(totalTime).toBeLessThan(5000);
      
      // Average response time should be reasonable
      const avgResponseTime = totalTime / responses.length;
      expect(avgResponseTime).toBeLessThan(100); // 100ms average
    });

    it('should handle API health checks under load', async () => {
      const startTime = Date.now();
      const promises = [];

      // Make 100 concurrent API health requests
      for (let i = 0; i < 100; i++) {
        promises.push(request(app).get('/api/health'));
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(3000); // 3 seconds for 100 simple requests
    });
  });

  describe('Database Performance', () => {
    it('should handle concurrent session creation efficiently', async () => {
      const startTime = Date.now();
      const promises = [];

      // Create 20 sessions concurrently
      for (let i = 0; i < 20; i++) {
        promises.push(
          prisma.unifiedSession.create({
            data: {
              id: `perf-test-session-${i}`,
              type: 'HUMAN',
              status: 'ACTIVE',
              startTime: new Date(),
              workerId: `worker-${i}`
            }
          })
        );
      }

      const sessions = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(sessions).toHaveLength(20);
      expect(totalTime).toBeLessThan(2000); // Should complete within 2 seconds

      // Cleanup
      await prisma.unifiedSession.deleteMany({
        where: {
          id: { in: sessions.map(s => s.id) }
        }
      });
    });

    it('should handle bulk interaction creation efficiently', async () => {
      // Create a test session first
      const session = await prisma.unifiedSession.create({
        data: {
          id: 'bulk-interaction-session',
          type: 'HUMAN',
          status: 'ACTIVE',
          startTime: new Date()
        }
      });

      const startTime = Date.now();
      const interactions = [];

      // Prepare 100 interactions
      for (let i = 0; i < 100; i++) {
        interactions.push({
          id: `bulk-interaction-${i}`,
          sessionId: session.id,
          type: 'CLICK',
          timestamp: BigInt(Date.now() + i),
          sessionTime: i * 100,
          primarySelector: `#element-${i}`,
          elementTag: 'button',
          elementText: `Button ${i}`,
          url: 'https://example.com',
          pageTitle: 'Test Page',
          boundingBox: {},
          viewport: {}
        });
      }

      // Create all interactions using createMany for better performance
      await prisma.interaction.createMany({
        data: interactions
      });

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(1000); // Should complete within 1 second

      // Verify all interactions were created
      const count = await prisma.interaction.count({
        where: { sessionId: session.id }
      });
      expect(count).toBe(100);

      // Cleanup
      await prisma.interaction.deleteMany({
        where: { sessionId: session.id }
      });
      await prisma.unifiedSession.delete({
        where: { id: session.id }
      });
    });

    it('should handle complex queries efficiently', async () => {
      // Create test data
      const session = await prisma.unifiedSession.create({
        data: {
          id: 'complex-query-session',
          type: 'HUMAN',
          status: 'COMPLETED',
          startTime: new Date(Date.now() - 300000),
          endTime: new Date(),
          duration: 300,
          qualityScore: 85
        }
      });

      // Add interactions and screenshots
      await prisma.interaction.createMany({
        data: Array.from({ length: 50 }, (_, i) => ({
          id: `complex-interaction-${i}`,
          sessionId: session.id,
          type: 'CLICK',
          timestamp: BigInt(Date.now() + i * 1000),
          sessionTime: i * 1000,
          primarySelector: `#element-${i}`,
          elementTag: 'button',
          url: 'https://example.com',
          pageTitle: 'Test Page',
          boundingBox: {},
          viewport: {}
        }))
      });

      await prisma.screenshot.createMany({
        data: Array.from({ length: 10 }, (_, i) => ({
          id: `complex-screenshot-${i}`,
          sessionId: session.id,
          timestamp: BigInt(Date.now() + i * 5000),
          eventType: 'click',
          quality: 80,
          viewport: {}
        }))
      });

      // Test complex query performance
      const startTime = Date.now();

      const result = await prisma.unifiedSession.findUnique({
        where: { id: session.id },
        include: {
          interactions: {
            orderBy: { timestamp: 'asc' },
            take: 20
          },
          screenshots: {
            orderBy: { timestamp: 'asc' },
            take: 5
          }
        }
      });

      const endTime = Date.now();
      const queryTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(result!.interactions).toHaveLength(20);
      expect(result!.screenshots).toHaveLength(5);
      expect(queryTime).toBeLessThan(100); // Should complete within 100ms

      // Cleanup
      await prisma.screenshot.deleteMany({ where: { sessionId: session.id } });
      await prisma.interaction.deleteMany({ where: { sessionId: session.id } });
      await prisma.unifiedSession.delete({ where: { id: session.id } });
    });
  });

  describe('Memory Usage Testing', () => {
    it('should not leak memory during repeated operations', async () => {
      const initialMemory = process.memoryUsage();

      // Perform 1000 operations that could potentially leak memory
      for (let i = 0; i < 1000; i++) {
        const session = await prisma.unifiedSession.create({
          data: {
            id: `memory-test-${i}`,
            type: 'HUMAN',
            status: 'ACTIVE',
            startTime: new Date()
          }
        });

        await prisma.unifiedSession.delete({
          where: { id: session.id }
        });

        // Force garbage collection every 100 iterations
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Concurrent User Simulation', () => {
    it('should handle multiple concurrent user sessions', async () => {
      const startTime = Date.now();
      const userPromises = [];

      // Simulate 10 concurrent users each creating a session with interactions
      for (let userId = 0; userId < 10; userId++) {
        const userPromise = (async () => {
          // Create session
          const session = await prisma.unifiedSession.create({
            data: {
              id: `concurrent-user-${userId}`,
              type: 'HUMAN',
              status: 'ACTIVE',
              startTime: new Date(),
              workerId: `user-${userId}`
            }
          });

          // Add interactions
          const interactions = [];
          for (let i = 0; i < 10; i++) {
            interactions.push({
              id: `concurrent-interaction-${userId}-${i}`,
              sessionId: session.id,
              type: 'CLICK',
              timestamp: BigInt(Date.now() + i * 100),
              sessionTime: i * 100,
              primarySelector: `#element-${i}`,
              elementTag: 'button',
              url: 'https://example.com',
              pageTitle: 'Test Page',
              boundingBox: {},
              viewport: {}
            });
          }

          await prisma.interaction.createMany({
            data: interactions
          });

          // Complete session
          await prisma.unifiedSession.update({
            where: { id: session.id },
            data: {
              status: 'COMPLETED',
              endTime: new Date(),
              duration: 60
            }
          });

          return session.id;
        })();

        userPromises.push(userPromise);
      }

      const sessionIds = await Promise.all(userPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(sessionIds).toHaveLength(10);
      expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds

      // Verify all sessions were created correctly
      const sessions = await prisma.unifiedSession.findMany({
        where: {
          id: { in: sessionIds }
        },
        include: {
          interactions: true
        }
      });

      expect(sessions).toHaveLength(10);
      sessions.forEach(session => {
        expect(session.interactions).toHaveLength(10);
        expect(session.status).toBe('COMPLETED');
      });

      // Cleanup
      await prisma.interaction.deleteMany({
        where: {
          sessionId: { in: sessionIds }
        }
      });
      await prisma.unifiedSession.deleteMany({
        where: {
          id: { in: sessionIds }
        }
      });
    });
  });

  describe('Resource Usage Monitoring', () => {
    it('should monitor CPU and memory usage during operations', async () => {
      const startMemory = process.memoryUsage();
      const startTime = process.hrtime();

      // Perform CPU and memory intensive operations
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push((async () => {
          const session = await prisma.unifiedSession.create({
            data: {
              id: `resource-test-${i}`,
              type: 'HUMAN',
              status: 'ACTIVE',
              startTime: new Date()
            }
          });

          // Create interactions with complex data
          await prisma.interaction.createMany({
            data: Array.from({ length: 20 }, (_, j) => ({
              id: `resource-interaction-${i}-${j}`,
              sessionId: session.id,
              type: 'CLICK',
              timestamp: BigInt(Date.now() + j * 100),
              sessionTime: j * 100,
              primarySelector: `#complex-element-${j}`,
              elementTag: 'button',
              elementText: `Complex Button ${j}`,
              elementAttributes: { 
                'data-test': `button-${j}`,
                'class': 'btn btn-primary',
                'aria-label': `Button ${j}`
              },
              url: `https://example.com/page-${j}`,
              pageTitle: `Complex Test Page ${j}`,
              boundingBox: { x: j * 10, y: j * 10, width: 100, height: 50 },
              viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: j * 100 }
            }))
          });

          return session.id;
        })());
      }

      const sessionIds = await Promise.all(promises);
      
      const endTime = process.hrtime(startTime);
      const endMemory = process.memoryUsage();

      // Calculate metrics
      const executionTimeMs = endTime[0] * 1000 + endTime[1] / 1000000;
      const memoryIncrease = endMemory.heapUsed - startMemory.heapUsed;

      // Performance assertions
      expect(executionTimeMs).toBeLessThan(10000); // Should complete within 10 seconds
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase

      // Cleanup
      await prisma.interaction.deleteMany({
        where: {
          sessionId: { in: sessionIds }
        }
      });
      await prisma.unifiedSession.deleteMany({
        where: {
          id: { in: sessionIds }
        }
      });
    });
  });

  describe('WebSocket Performance Testing', () => {
    it('should handle concurrent WebSocket connections efficiently', async () => {
      const numConnections = 50;
      const connections: WebSocket[] = [];
      const messagePromises: Promise<any>[] = [];

      try {
        // Create multiple WebSocket connections
        for (let i = 0; i < numConnections; i++) {
          const ws = new WebSocket('ws://localhost:3000/ws');
          connections.push(ws);

          const messagePromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error(`Connection ${i} timeout`));
            }, 5000);

            ws.on('open', () => {
              ws.send(JSON.stringify({
                type: 'test_message',
                connectionId: i,
                timestamp: Date.now()
              }));
            });

            ws.on('message', (data) => {
              clearTimeout(timeout);
              const message = JSON.parse(data.toString());
              resolve({ connectionId: i, message });
            });

            ws.on('error', (error) => {
              clearTimeout(timeout);
              reject(error);
            });
          });

          messagePromises.push(messagePromise);
        }

        const startTime = performance.now();
        const responses = await Promise.all(messagePromises);
        const endTime = performance.now();

        expect(responses).toHaveLength(numConnections);
        expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

      } finally {
        // Close all connections
        connections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        });
      }
    });

    it('should handle rapid message sending', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');
      const messageCount = 100;
      const messages = [];

      return new Promise((resolve, reject) => {
        let messagesReceived = 0;
        const startTime = performance.now();

        ws.on('open', () => {
          // Send messages rapidly
          for (let i = 0; i < messageCount; i++) {
            const message = {
              type: 'rapid_test',
              messageId: i,
              timestamp: Date.now()
            };
            ws.send(JSON.stringify(message));
            messages.push(message);
          }
        });

        ws.on('message', (data) => {
          messagesReceived++;
          
          if (messagesReceived >= messageCount) {
            const endTime = performance.now();
            const totalTime = endTime - startTime;
            
            ws.close();
            
            expect(messagesReceived).toBe(messageCount);
            expect(totalTime).toBeLessThan(3000); // Should complete within 3 seconds
            
            resolve({
              messagesSent: messageCount,
              messagesReceived,
              totalTime
            });
          }
        });

        ws.on('error', reject);

        // Timeout after 10 seconds
        setTimeout(() => {
          ws.close();
          reject(new Error('Rapid message test timeout'));
        }, 10000);
      });
    });
  });

  describe('API Throughput Testing', () => {
    it('should maintain high throughput for session operations', async () => {
      const operationsPerSecond = 50;
      const testDuration = 10000; // 10 seconds
      const totalOperations = (operationsPerSecond * testDuration) / 1000;
      
      const results = [];
      const startTime = performance.now();
      let completedOperations = 0;

      // Create operations at target rate
      const operationInterval = 1000 / operationsPerSecond;
      const operations = [];

      for (let i = 0; i < totalOperations; i++) {
        const operationPromise = (async () => {
          const operationStart = performance.now();
          
          try {
            // Create session
            const sessionResponse = await request(app)
              .post('/api/sessions')
              .send({
                type: 'human',
                workerId: `throughput-worker-${i}`
              });

            if (sessionResponse.status !== 201) {
              throw new Error(`Session creation failed: ${sessionResponse.status}`);
            }

            const sessionId = sessionResponse.body.id;

            // Add interaction
            await request(app)
              .post(`/api/sessions/${sessionId}/interactions`)
              .send({
                type: 'click',
                timestamp: Date.now(),
                primarySelector: '#test-element',
                elementTag: 'button',
                url: 'https://example.com',
                pageTitle: 'Throughput Test'
              });

            // Complete session
            await request(app)
              .patch(`/api/sessions/${sessionId}`)
              .send({
                status: 'completed',
                endTime: new Date().toISOString()
              });

            const operationEnd = performance.now();
            completedOperations++;

            return {
              operationId: i,
              duration: operationEnd - operationStart,
              sessionId,
              success: true
            };

          } catch (error) {
            const operationEnd = performance.now();
            return {
              operationId: i,
              duration: operationEnd - operationStart,
              success: false,
              error: error.message
            };
          }
        })();

        operations.push(operationPromise);

        // Add delay to maintain target rate
        if (i < totalOperations - 1) {
          await new Promise(resolve => setTimeout(resolve, operationInterval));
        }
      }

      const operationResults = await Promise.all(operations);
      const endTime = performance.now();
      const actualDuration = endTime - startTime;

      // Analyze results
      const successfulOperations = operationResults.filter(r => r.success);
      const successRate = (successfulOperations.length / operationResults.length) * 100;
      const actualThroughput = (successfulOperations.length / actualDuration) * 1000;
      const avgResponseTime = successfulOperations.reduce((sum, r) => sum + r.duration, 0) / successfulOperations.length;

      expect(successRate).toBeGreaterThan(90); // At least 90% success rate
      expect(actualThroughput).toBeGreaterThan(operationsPerSecond * 0.8); // At least 80% of target throughput
      expect(avgResponseTime).toBeLessThan(2000); // Average response time under 2 seconds

      // Cleanup successful sessions
      const sessionIds = successfulOperations.map(r => r.sessionId).filter(Boolean);
      if (sessionIds.length > 0) {
        await prisma.interaction.deleteMany({
          where: { sessionId: { in: sessionIds } }
        });
        await prisma.unifiedSession.deleteMany({
          where: { id: { in: sessionIds } }
        });
      }
    });

    it('should handle burst traffic patterns efficiently', async () => {
      const burstSizes = [10, 25, 50, 100];
      const results = [];

      for (const burstSize of burstSizes) {
        const burstStart = performance.now();
        const promises = [];

        // Create burst of concurrent requests
        for (let i = 0; i < burstSize; i++) {
          promises.push(
            request(app)
              .get('/api/health')
              .timeout(3000)
          );
        }

        try {
          const responses = await Promise.all(promises);
          const burstEnd = performance.now();
          const burstDuration = burstEnd - burstStart;

          const successfulResponses = responses.filter(r => r.status === 200);
          const successRate = (successfulResponses.length / responses.length) * 100;

          results.push({
            burstSize,
            duration: burstDuration,
            successRate,
            throughput: successfulResponses.length / (burstDuration / 1000)
          });

          expect(successRate).toBeGreaterThan(95); // At least 95% success rate
          expect(burstDuration).toBeLessThan(5000); // Should complete within 5 seconds

        } catch (error) {
          results.push({
            burstSize,
            duration: performance.now() - burstStart,
            successRate: 0,
            throughput: 0,
            error: error.message
          });
        }

        // Wait between bursts
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Verify scaling characteristics
      results.forEach((result, index) => {
        if (index > 0 && result.successRate > 0) {
          const previousResult = results[index - 1];
          if (previousResult.successRate > 0) {
            const sizeRatio = result.burstSize / previousResult.burstSize;
            const durationRatio = result.duration / previousResult.duration;

            // Duration should scale sub-linearly with burst size
            expect(durationRatio).toBeLessThan(sizeRatio * 1.5);
          }
        }
      });
    });
  });

  describe('Database Connection Pool Testing', () => {
    it('should efficiently manage database connections under load', async () => {
      const concurrentQueries = 100;
      const queriesPerConnection = 5;
      const promises = [];

      for (let i = 0; i < concurrentQueries; i++) {
        promises.push((async () => {
          const connectionStart = performance.now();
          const queryResults = [];

          // Perform multiple queries on the same logical connection
          for (let j = 0; j < queriesPerConnection; j++) {
            const queryStart = performance.now();
            
            const result = await prisma.unifiedSession.findMany({
              take: 10,
              orderBy: { startTime: 'desc' }
            });

            const queryEnd = performance.now();
            queryResults.push({
              queryIndex: j,
              duration: queryEnd - queryStart,
              resultCount: result.length
            });
          }

          const connectionEnd = performance.now();
          return {
            connectionId: i,
            totalDuration: connectionEnd - connectionStart,
            queries: queryResults,
            avgQueryTime: queryResults.reduce((sum, q) => sum + q.duration, 0) / queryResults.length
          };
        })());
      }

      const startTime = performance.now();
      const connectionResults = await Promise.all(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(connectionResults).toHaveLength(concurrentQueries);
      expect(totalTime).toBeLessThan(15000); // Should complete within 15 seconds

      // Analyze connection efficiency
      const avgConnectionTime = connectionResults.reduce((sum, c) => sum + c.totalDuration, 0) / connectionResults.length;
      const avgQueryTime = connectionResults.reduce((sum, c) => sum + c.avgQueryTime, 0) / connectionResults.length;

      expect(avgConnectionTime).toBeLessThan(5000); // Average connection time under 5 seconds
      expect(avgQueryTime).toBeLessThan(100); // Average query time under 100ms

      // Verify no connection timeouts or errors
      connectionResults.forEach(result => {
        expect(result.queries).toHaveLength(queriesPerConnection);
        result.queries.forEach(query => {
          expect(query.duration).toBeLessThan(1000); // Each query under 1 second
        });
      });
    });
  });
});