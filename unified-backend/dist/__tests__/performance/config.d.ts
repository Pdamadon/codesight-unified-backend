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
export declare const DEFAULT_THRESHOLDS: PerformanceThresholds;
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
export declare class PerformanceProfiler {
    private startTime;
    private startMemory;
    private startCpu;
    start(): void;
    stop(): PerformanceMetrics;
    static profile<T>(operation: () => Promise<T>, customMetrics?: () => Record<string, any>): Promise<{
        result: T;
        metrics: PerformanceMetrics;
    }>;
}
export declare class BenchmarkRunner {
    private thresholds;
    constructor(thresholds?: PerformanceThresholds);
    runBenchmark<T>(name: string, operation: () => Promise<T>, iterations?: number, warmupIterations?: number): Promise<BenchmarkResult>;
    private calculateBenchmarkResult;
    validateThresholds(result: BenchmarkResult): {
        passed: boolean;
        violations: string[];
    };
    printResults(result: BenchmarkResult): void;
}
export declare class LoadTestRunner {
    runLoadTest(name: string, operation: () => Promise<any>, options: {
        duration: number;
        rampUpTime?: number;
        maxConcurrency: number;
        targetRPS?: number;
    }): Promise<{
        totalRequests: number;
        successfulRequests: number;
        failedRequests: number;
        averageResponseTime: number;
        actualRPS: number;
        errors: string[];
    }>;
}
export declare const forceGC: () => void;
export declare const getMemoryUsageMB: () => {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
};
export declare const sleep: (ms: number) => Promise<void>;
export declare const createTestData: {
    session: (id?: string) => {
        id: string;
        type: "HUMAN";
        status: "ACTIVE";
        startTime: Date;
    };
    interaction: (sessionId: string, index?: number) => {
        id: string;
        sessionId: string;
        type: "CLICK";
        timestamp: bigint;
        sessionTime: number;
        primarySelector: string;
        elementTag: string;
        elementText: string;
        url: string;
        pageTitle: string;
        boundingBox: {
            x: number;
            y: number;
            width: number;
            height: number;
        };
        viewport: {
            width: number;
            height: number;
            scrollX: number;
            scrollY: number;
        };
    };
    screenshot: (sessionId: string, index?: number) => {
        id: string;
        sessionId: string;
        timestamp: bigint;
        eventType: "click";
        quality: number;
        viewport: {
            width: number;
            height: number;
            scrollX: number;
            scrollY: number;
        };
    };
};
