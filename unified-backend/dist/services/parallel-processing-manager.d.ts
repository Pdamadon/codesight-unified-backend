import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';
interface ProcessingJob {
    id: string;
    type: 'session_processing' | 'batch_validation' | 'quality_scoring' | 'context_enhancement' | 'training_generation';
    priority: number;
    sessionId?: string;
    sessionIds?: string[];
    data: any;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    workerId?: string;
    retryCount: number;
    maxRetries: number;
    timeout: number;
}
interface ProcessingResult {
    jobId: string;
    success: boolean;
    data?: any;
    error?: string;
    processingTime: number;
    workerId: string;
}
interface WorkerPoolStats {
    totalWorkers: number;
    availableWorkers: number;
    busyWorkers: number;
    queueSize: number;
    completedJobs: number;
    failedJobs: number;
    averageProcessingTime: number;
    systemLoad: {
        cpu: number;
        memory: number;
    };
}
export declare class ParallelProcessingManager extends EventEmitter {
    private workers;
    private jobQueue;
    private completedJobs;
    private logger;
    private prisma;
    private readonly config;
    private processingInterval;
    private isShuttingDown;
    private totalJobsCompleted;
    private totalJobsFailed;
    constructor(prisma: PrismaClient);
    private initializeWorkerPool;
    private createWorker;
    private handleWorkerMessage;
    private handleJobCompleted;
    private handleJobFailed;
    private handleJobProgress;
    private handleWorkerError;
    private handleWorkerExit;
    private removeWorker;
    addJobToQueue(job: Omit<ProcessingJob, 'id' | 'createdAt' | 'retryCount'>): string;
    processSession(sessionId: string, priority?: number): Promise<string>;
    processSessions(sessionIds: string[], priority?: number): Promise<string[]>;
    batchQualityScoring(sessionIds: string[], priority?: number): Promise<string>;
    batchContextEnhancement(sessionIds: string[], priority?: number): Promise<string>;
    private startQueueProcessor;
    private processQueue;
    private assignJobToWorker;
    private handleJobTimeout;
    private scaleWorkers;
    getStats(): WorkerPoolStats;
    waitForJob(jobId: string, timeout?: number): Promise<ProcessingResult>;
    waitForJobs(jobIds: string[], timeout?: number): Promise<ProcessingResult[]>;
    private setupCleanupHandlers;
}
export {};
