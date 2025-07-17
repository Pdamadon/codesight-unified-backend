// Performance test configuration and utilities

export interface PerformanceThresholds {
  api: {
    maxResponseTime: number;
    minThroughput: number;
    maxErrorRate: number;
  };
  database: {
    maxQueryTime: number;
    maxBulkInsertTime: number;
    maxConnectionTime: number;
  };
  memory: {
    maxLeakPerOperation: number;
    maxTotalIncrease: number;
    maxGCPressure: number;
  };
  websocket: {
    maxConnectionTime: number;
    maxMessageLatency: number;
    minConcurrentConnections: number;
  };
}

export const DEFAULT_THRESHOLDS: PerformanceThresholds = {
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
    maxGCPressure: 50 * 1024 * 1024 // 50MB before GC
  },
  websocket: {
    maxConnectionTime: 3000, // 3 seconds
    maxMessageLatency: 100, // 100ms
    minConcurrentConnections: 100
  }
};

export interface PerformanceMetrics {
  duration: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    delta: number;
  };
  cpuUsage?: {
    before: NodeJS.CpuUsage;
    after: NodeJS.CpuUsage;
  };
  success: boolean;
  error?: string;
  customMetrics?: Record<string, any>;
}

export interface BenchmarkResult {
  name: string;
  iterations: number;
  successfulRuns: number;
  successRate: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p95Duration: number;
  p99Duration: number;
  avgMemoryDelta: number;
  totalMemoryDelta: number;
  throughput: number;
  metrics: PerformanceMetrics[];
}

export class PerformanceProfiler {
  private startTime: number = 0;
  private startMemory: NodeJS.MemoryUsage = process.memoryUsage();
  private startCpu: NodeJS.CpuUsage = process.cpuUsage();

  start(): void {
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage();
    this.startCpu = process.cpuUsage();
  }

  stop(): PerformanceMetrics {
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const endCpu = process.cpuUsage(this.startCpu);

    return {
      duration: endTime - this.startTime,
      memoryUsage: {
        before: this.startMemory,
        after: endMemory,
        delta: endMemory.heapUsed - this.startMemory.heapUsed
      },
      cpuUsage: {
        before: this.startCpu,
        after: endCpu
      },
      success: true
    };
  }

  static async profile<T>(
    operation: () => Promise<T>,
    customMetrics?: () => Record<string, any>
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const profiler = new PerformanceProfiler();
    profiler.start();

    try {
      const result = await operation();
      const metrics = profiler.stop();
      
      if (customMetrics) {
        metrics.customMetrics = customMetrics();
      }

      return { result, metrics };
    } catch (error) {
      const metrics = profiler.stop();
      metrics.success = false;
      metrics.error = error instanceof Error ? error.message : String(error);
      
      throw error;
    }
  }
}

export class BenchmarkRunner {
  private thresholds: PerformanceThresholds;

  constructor(thresholds: PerformanceThresholds = DEFAULT_THRESHOLDS) {
    this.thresholds = thresholds;
  }

  async runBenchmark<T>(
    name: string,
    operation: () => Promise<T>,
    iterations: number = 10,
    warmupIterations: number = 2
  ): Promise<BenchmarkResult> {
    const allMetrics: PerformanceMetrics[] = [];

    // Warmup runs
    for (let i = 0; i < warmupIterations; i++) {
      try {
        await operation();
      } catch (error) {
        // Ignore warmup errors
      }
    }

    // Force garbage collection before benchmark
    if (global.gc) {
      global.gc();
    }

    // Actual benchmark runs
    for (let i = 0; i < iterations; i++) {
      try {
        const { metrics } = await PerformanceProfiler.profile(operation);
        allMetrics.push(metrics);
      } catch (error) {
        allMetrics.push({
          duration: 0,
          memoryUsage: {
            before: process.memoryUsage(),
            after: process.memoryUsage(),
            delta: 0
          },
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return this.calculateBenchmarkResult(name, allMetrics);
  }

  private calculateBenchmarkResult(name: string, metrics: PerformanceMetrics[]): BenchmarkResult {
    const successfulMetrics = metrics.filter(m => m.success);
    const durations = successfulMetrics.map(m => m.duration).sort((a, b) => a - b);
    const memoryDeltas = successfulMetrics.map(m => m.memoryUsage.delta);

    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);

    return {
      name,
      iterations: metrics.length,
      successfulRuns: successfulMetrics.length,
      successRate: (successfulMetrics.length / metrics.length) * 100,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length || 0,
      minDuration: durations[0] || 0,
      maxDuration: durations[durations.length - 1] || 0,
      p95Duration: durations[p95Index] || 0,
      p99Duration: durations[p99Index] || 0,
      avgMemoryDelta: memoryDeltas.reduce((sum, d) => sum + d, 0) / memoryDeltas.length || 0,
      totalMemoryDelta: memoryDeltas.reduce((sum, d) => sum + d, 0),
      throughput: successfulMetrics.length / (durations.reduce((sum, d) => sum + d, 0) / 1000) || 0,
      metrics
    };
  }

  validateThresholds(result: BenchmarkResult): { passed: boolean; violations: string[] } {
    const violations: string[] = [];

    if (result.successRate < 95) {
      violations.push(`Success rate ${result.successRate.toFixed(2)}% is below 95%`);
    }

    if (result.avgDuration > this.thresholds.database.maxQueryTime) {
      violations.push(`Average duration ${result.avgDuration.toFixed(2)}ms exceeds threshold ${this.thresholds.database.maxQueryTime}ms`);
    }

    if (result.p95Duration > this.thresholds.database.maxQueryTime * 2) {
      violations.push(`P95 duration ${result.p95Duration.toFixed(2)}ms exceeds threshold ${this.thresholds.database.maxQueryTime * 2}ms`);
    }

    if (result.avgMemoryDelta > this.thresholds.memory.maxLeakPerOperation) {
      violations.push(`Average memory delta ${(result.avgMemoryDelta / 1024 / 1024).toFixed(2)}MB exceeds threshold ${this.thresholds.memory.maxLeakPerOperation / 1024 / 1024}MB`);
    }

    return {
      passed: violations.length === 0,
      violations
    };
  }

  printResults(result: BenchmarkResult): void {
    console.log(`\n=== ${result.name} Benchmark Results ===`);
    console.log(`Iterations: ${result.iterations}`);
    console.log(`Success Rate: ${result.successRate.toFixed(2)}%`);
    console.log(`Duration (ms):`);
    console.log(`  Average: ${result.avgDuration.toFixed(2)}`);
    console.log(`  Min: ${result.minDuration.toFixed(2)}`);
    console.log(`  Max: ${result.maxDuration.toFixed(2)}`);
    console.log(`  P95: ${result.p95Duration.toFixed(2)}`);
    console.log(`  P99: ${result.p99Duration.toFixed(2)}`);
    console.log(`Memory (MB):`);
    console.log(`  Average Delta: ${(result.avgMemoryDelta / 1024 / 1024).toFixed(2)}`);
    console.log(`  Total Delta: ${(result.totalMemoryDelta / 1024 / 1024).toFixed(2)}`);
    console.log(`Throughput: ${result.throughput.toFixed(2)} ops/sec`);

    const validation = this.validateThresholds(result);
    if (!validation.passed) {
      console.log(`\n⚠️  Threshold Violations:`);
      validation.violations.forEach(violation => {
        console.log(`  - ${violation}`);
      });
    } else {
      console.log(`\n✅ All thresholds passed`);
    }
  }
}

export class LoadTestRunner {
  async runLoadTest(
    name: string,
    operation: () => Promise<any>,
    options: {
      duration: number; // milliseconds
      rampUpTime?: number; // milliseconds
      maxConcurrency: number;
      targetRPS?: number; // requests per second
    }
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    actualRPS: number;
    errors: string[];
  }> {
    const { duration, rampUpTime = 0, maxConcurrency, targetRPS } = options;
    const results: Array<{ success: boolean; duration: number; error?: string }> = [];
    const errors: string[] = [];
    
    const startTime = Date.now();
    let activeRequests = 0;
    let requestCount = 0;

    const executeRequest = async (): Promise<void> => {
      if (activeRequests >= maxConcurrency) {
        return;
      }

      activeRequests++;
      requestCount++;
      const requestStart = performance.now();

      try {
        await operation();
        const requestEnd = performance.now();
        results.push({
          success: true,
          duration: requestEnd - requestStart
        });
      } catch (error) {
        const requestEnd = performance.now();
        const errorMessage = error instanceof Error ? error.message : String(error);
        results.push({
          success: false,
          duration: requestEnd - requestStart,
          error: errorMessage
        });
        errors.push(errorMessage);
      } finally {
        activeRequests--;
      }
    };

    // Calculate request interval based on target RPS
    const requestInterval = targetRPS ? 1000 / targetRPS : 10; // Default 100 RPS

    return new Promise((resolve) => {
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        
        if (elapsed >= duration) {
          clearInterval(interval);
          
          // Wait for active requests to complete
          const waitForCompletion = () => {
            if (activeRequests === 0) {
              const successfulRequests = results.filter(r => r.success).length;
              const failedRequests = results.filter(r => !r.success).length;
              const averageResponseTime = results
                .filter(r => r.success)
                .reduce((sum, r) => sum + r.duration, 0) / successfulRequests || 0;
              const actualRPS = (results.length / duration) * 1000;

              resolve({
                totalRequests: results.length,
                successfulRequests,
                failedRequests,
                averageResponseTime,
                actualRPS,
                errors: [...new Set(errors)] // Remove duplicates
              });
            } else {
              setTimeout(waitForCompletion, 100);
            }
          };
          
          waitForCompletion();
          return;
        }

        // Ramp up logic
        const rampUpProgress = rampUpTime > 0 ? Math.min(elapsed / rampUpTime, 1) : 1;
        const currentMaxConcurrency = Math.floor(maxConcurrency * rampUpProgress);

        // Execute requests up to current concurrency limit
        for (let i = activeRequests; i < currentMaxConcurrency; i++) {
          executeRequest();
        }
      }, requestInterval);
    });
  }
}

// Utility functions
export const forceGC = (): void => {
  if (global.gc) {
    global.gc();
  }
};

export const getMemoryUsageMB = (): {
  rss: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
} => {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024),
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
    external: Math.round(usage.external / 1024 / 1024)
  };
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const createTestData = {
  session: (id?: string) => ({
    id: id || `test-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: 'HUMAN' as const,
    status: 'ACTIVE' as const,
    startTime: new Date()
  }),

  interaction: (sessionId: string, index: number = 0) => ({
    id: `test-interaction-${sessionId}-${index}-${Date.now()}`,
    sessionId,
    type: 'CLICK' as const,
    timestamp: BigInt(Date.now() + index),
    sessionTime: index * 100,
    primarySelector: `#element-${index}`,
    elementTag: 'button',
    elementText: `Button ${index}`,
    url: 'https://example.com',
    pageTitle: 'Test Page',
    boundingBox: { x: index % 100, y: Math.floor(index / 100), width: 100, height: 30 },
    viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: index % 1000 }
  }),

  screenshot: (sessionId: string, index: number = 0) => ({
    id: `test-screenshot-${sessionId}-${index}-${Date.now()}`,
    sessionId,
    timestamp: BigInt(Date.now() + index * 1000),
    eventType: 'click' as const,
    quality: 80,
    viewport: { width: 1920, height: 1080, scrollX: 0, scrollY: index * 100 }
  })
};