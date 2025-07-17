import request from 'supertest';
import app from '../../server';
import { prisma } from '../setup';
import { WebSocket } from 'ws';

describe('Stress Testing', () => {
  describe('High Load API Testing', () => {
    it('should handle 500 concurrent session creation requests', async () => {
      const startTime = Date.now();
      const promises = [];

      // Create 500 concurrent session creation requests
      for (let i = 0; i < 500; i++) {
        promises.push(
          request(app)
            .post('/api/sessions')
            .send({
              type: 'human',
              workerId: `stress-worker-${i}`,
              metadata: {
                browser: 'chrome',
                version: '120.0',
                platform: 'desktop'
              }
            })
        );
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Check success rate
      const successfulResponses = responses.filter(r => r.status === 201);
      const successRate = (successfulResponses.length / responses.length) * 100;

      expect(successRate).toBeGreaterThan(95); // At least 95% success rate
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Cleanup created sessions
      const sessionIds = successfulResponses.map(r => r.body.id);
      if (sessionIds.length > 0) {
        await prisma.unifiedSession.deleteMany({
          where: { id: { in: sessionIds } }
        });
      }
    });

    it('should handle burst traffic patterns', async () => {
      const results = [];

      // Simulate 3 waves of traffic with 2-second intervals
      for (let wave = 0; wave < 3; wave++) {
        const waveStart = Date.now();
        const promises = [];

        // Each wave has 100 concurrent requests
        for (let i = 0; i < 100; i++) {
          promises.push(
            request(app)
              .get('/api/health')
              .timeout(5000)
          );
        }

        const responses = await Promise.all(promises);
        const waveEnd = Date.now();

        results.push({
          wave: wave + 1,
          duration: waveEnd - waveStart,
          successCount: responses.filter(r => r.status === 200).length,
          totalRequests: responses.length
        });

        // Wait 2 seconds before next wave
        if (wave < 2) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      // Verify each wave performed well
      results.forEach((result, index) => {
        expect(result.successCount).toBe(result.totalRequests);
        expect(result.duration).toBeLessThan(5000); // Each wave within 5 seconds
      });
    });

    it('should maintain performance under sustained load', async () => {
      const duration = 30000; // 30 seconds
      const requestInterval = 100; // Request every 100ms
      const startTime = Date.now();
      const results = [];

      while (Date.now() - startTime < duration) {
        const requestStart = Date.now();
        
        try {
          const response = await request(app)
            .get('/api/health')
            .timeout(2000);
          
          const requestEnd = Date.now();
          results.push({
            timestamp: requestStart,
            duration: requestEnd - requestStart,
            status: response.status,
            success: response.status === 200
          });
        } catch (error) {
          results.push({
            timestamp: requestStart,
            duration: Date.now() - requestStart,
            status: 0,
            success: false,
            error: error.message
          });
        }

        // Wait for next request
        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }

      // Analyze results
      const successfulRequests = results.filter(r => r.success);
      const successRate = (successfulRequests.length / results.length) * 100;
      const avgResponseTime = successfulRequests.reduce((sum, r) => sum + r.duration, 0) / successfulRequests.length;
      const maxResponseTime = Math.max(...successfulRequests.map(r => r.duration));

      expect(successRate).toBeGreaterThan(98); // At least 98% success rate
      expect(avgResponseTime).toBeLessThan(200); // Average response time under 200ms
      expect(maxResponseTime).toBeLessThan(1000); // Max response time under 1 second
    });
  });

  describe('Database Stress Testing', () => {
    it('should handle massive data insertion', async () => {
      const batchSize = 1000;
      const numBatches = 10;
      const startTime = Date.now();

      // Create a test session
      const session = await prisma.unifiedSession.create({
        data: {
          id: 'massive-data-session',
          type: 'HUMAN',
          status: 'ACTIVE',
          startTime: new Date()
        }
      });

      // Insert data in batches
      for (let batch = 0; batch < numBatches; batch++) {
        const interactions = Array.from({ length: batchSize }, (_, i) => ({
          id: `massive-interaction-${batch}-${i}`,
          sessionId: session.id,
          type: 'CLICK',
          timestamp: BigInt(Date.now() + batch * batchSize + i),
          sessionTime: (batch * batchSize + i) * 100,
          primarySelector: `#element-${batch}-${i}`,
          elementTag: 'button',
          elementText: `Button ${batch}-${i}`,
          url: `https://example.com/page-${batch}`,
          pageTitle: `Test Page ${batch}`,
          boundingBox: { x: i % 100, y: batch * 10, width: 100, height: 30 },
          viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: batch * 100 }
        }));

        await prisma.interaction.createMany({
          data: interactions
        });
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Verify all data was inserted
      const count = await prisma.interaction.count({
        where: { sessionId: session.id }
      });

      expect(count).toBe(batchSize * numBatches);
      expect(totalTime).toBeLessThan(60000); // Should complete within 60 seconds

      // Test query performance on large dataset
      const queryStart = Date.now();
      const recentInteractions = await prisma.interaction.findMany({
        where: { sessionId: session.id },
        orderBy: { timestamp: 'desc' },
        take: 100
      });
      const queryEnd = Date.now();

      expect(recentInteractions).toHaveLength(100);
      expect(queryEnd - queryStart).toBeLessThan(500); // Query should be fast

      // Cleanup
      await prisma.interaction.deleteMany({
        where: { sessionId: session.id }
      });
      await prisma.unifiedSession.delete({
        where: { id: session.id }
      });
    });

    it('should handle concurrent database operations', async () => {
      const numConcurrentOperations = 50;
      const promises = [];

      for (let i = 0; i < numConcurrentOperations; i++) {
        promises.push((async () => {
          // Create session
          const session = await prisma.unifiedSession.create({
            data: {
              id: `concurrent-db-${i}`,
              type: 'HUMAN',
              status: 'ACTIVE',
              startTime: new Date()
            }
          });

          // Add interactions
          await prisma.interaction.createMany({
            data: Array.from({ length: 50 }, (_, j) => ({
              id: `concurrent-db-interaction-${i}-${j}`,
              sessionId: session.id,
              type: 'CLICK',
              timestamp: BigInt(Date.now() + j * 100),
              sessionTime: j * 100,
              primarySelector: `#element-${j}`,
              elementTag: 'button',
              url: 'https://example.com',
              pageTitle: 'Test Page',
              boundingBox: {},
              viewport: {}
            }))
          });

          // Update session
          await prisma.unifiedSession.update({
            where: { id: session.id },
            data: {
              status: 'COMPLETED',
              endTime: new Date(),
              duration: 300
            }
          });

          // Query data
          const result = await prisma.unifiedSession.findUnique({
            where: { id: session.id },
            include: {
              interactions: { take: 10 }
            }
          });

          return result;
        })());
      }

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(numConcurrentOperations);
      expect(endTime - startTime).toBeLessThan(15000); // Should complete within 15 seconds

      // Verify data integrity
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result!.status).toBe('COMPLETED');
        expect(result!.interactions).toHaveLength(10);
      });

      // Cleanup
      const sessionIds = results.map(r => r!.id);
      await prisma.interaction.deleteMany({
        where: { sessionId: { in: sessionIds } }
      });
      await prisma.unifiedSession.deleteMany({
        where: { id: { in: sessionIds } }
      });
    });
  });

  describe('WebSocket Stress Testing', () => {
    it('should handle multiple concurrent WebSocket connections', async () => {
      const numConnections = 100;
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
            }, 10000);

            ws.on('open', () => {
              // Send a test message
              ws.send(JSON.stringify({
                type: 'ping',
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

        // Wait for all connections to respond
        const startTime = Date.now();
        const responses = await Promise.all(messagePromises);
        const endTime = Date.now();

        expect(responses).toHaveLength(numConnections);
        expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds

      } finally {
        // Close all connections
        connections.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        });
      }
    });

    it('should handle high-frequency message sending', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');
      const messagesPerSecond = 100;
      const testDuration = 10000; // 10 seconds
      const totalMessages = (messagesPerSecond * testDuration) / 1000;

      return new Promise((resolve, reject) => {
        let messagesSent = 0;
        let messagesReceived = 0;
        const startTime = Date.now();

        ws.on('open', () => {
          // Send messages at high frequency
          const interval = setInterval(() => {
            if (messagesSent >= totalMessages) {
              clearInterval(interval);
              return;
            }

            ws.send(JSON.stringify({
              type: 'high_frequency_test',
              messageId: messagesSent,
              timestamp: Date.now()
            }));
            messagesSent++;
          }, 1000 / messagesPerSecond);
        });

        ws.on('message', (data) => {
          messagesReceived++;
          
          if (messagesReceived >= totalMessages) {
            const endTime = Date.now();
            const actualDuration = endTime - startTime;
            const actualRate = (messagesReceived / actualDuration) * 1000;

            ws.close();

            // Verify performance
            expect(messagesReceived).toBe(totalMessages);
            expect(actualRate).toBeGreaterThan(messagesPerSecond * 0.8); // At least 80% of target rate
            
            resolve({
              messagesSent,
              messagesReceived,
              duration: actualDuration,
              rate: actualRate
            });
          }
        });

        ws.on('error', reject);

        // Timeout after 15 seconds
        setTimeout(() => {
          ws.close();
          reject(new Error('High frequency test timeout'));
        }, 15000);
      });
    });
  });

  describe('Memory Stress Testing', () => {
    it('should handle memory-intensive operations without leaks', async () => {
      const initialMemory = process.memoryUsage();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        // Create large objects that could cause memory issues
        const largeData = {
          sessionId: `memory-stress-${i}`,
          interactions: Array.from({ length: 100 }, (_, j) => ({
            id: `interaction-${i}-${j}`,
            type: 'click',
            timestamp: Date.now() + j,
            data: new Array(1000).fill(`data-${i}-${j}`)
          })),
          screenshots: Array.from({ length: 10 }, (_, k) => ({
            id: `screenshot-${i}-${k}`,
            data: new Array(5000).fill(`pixel-${i}-${k}`)
          }))
        };

        // Process the data (simulate real operations)
        const processed = JSON.parse(JSON.stringify(largeData));
        processed.interactions.forEach(interaction => {
          interaction.processed = true;
        });

        // Force garbage collection periodically
        if (i % 100 === 0 && global.gc) {
          global.gc();
        }
      }

      // Final garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable (less than 200MB)
      expect(memoryIncrease).toBeLessThan(200 * 1024 * 1024);
    });

    it('should handle large file processing without memory issues', async () => {
      const initialMemory = process.memoryUsage();
      
      // Simulate processing large files
      for (let fileIndex = 0; fileIndex < 50; fileIndex++) {
        // Create a large "file" in memory
        const largeFile = {
          name: `large-file-${fileIndex}.json`,
          size: 10 * 1024 * 1024, // 10MB
          content: new Array(10 * 1024 * 1024).fill(0).map((_, i) => ({
            id: i,
            data: `content-${fileIndex}-${i}`,
            timestamp: Date.now() + i
          }))
        };

        // Process the file (simulate compression, validation, etc.)
        const processed = largeFile.content
          .filter(item => item.id % 2 === 0) // Filter
          .map(item => ({ ...item, processed: true })) // Transform
          .slice(0, 1000); // Limit

        // Simulate saving processed data
        const result = {
          originalSize: largeFile.size,
          processedSize: processed.length,
          compressionRatio: processed.length / largeFile.content.length
        };

        expect(result.processedSize).toBeGreaterThan(0);

        // Force garbage collection every 10 files
        if (fileIndex % 10 === 0 && global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory should not increase significantly
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Less than 100MB
    });
  });
});