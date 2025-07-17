"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParallelProcessingManager = void 0;
const worker_threads_1 = require("worker_threads");
const events_1 = require("events");
const logger_1 = require("../utils/logger");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
class ParallelProcessingManager extends events_1.EventEmitter {
    workers = new Map();
    jobQueue = [];
    completedJobs = [];
    logger;
    prisma;
    // Configuration
    config = {
        minWorkers: 2,
        maxWorkers: Math.min(os.cpus().length, 12), // Don't exceed CPU cores or 12
        workerIdleTimeout: 300000, // 5 minutes
        jobTimeout: 600000, // 10 minutes default
        queueProcessInterval: 1000, // 1 second
        maxQueueSize: 1000,
        workerScriptPath: path.join(__dirname, '../workers/processing-worker.js')
    };
    processingInterval = null;
    isShuttingDown = false;
    totalJobsCompleted = 0;
    totalJobsFailed = 0;
    constructor(prisma) {
        super();
        this.prisma = prisma;
        this.logger = new logger_1.Logger('ParallelProcessingManager');
        this.initializeWorkerPool();
        this.startQueueProcessor();
        this.setupCleanupHandlers();
    }
    // Initialize worker pool with minimum workers
    async initializeWorkerPool() {
        this.logger.info('Initializing worker pool', {
            minWorkers: this.config.minWorkers,
            maxWorkers: this.config.maxWorkers,
            cpuCores: os.cpus().length
        });
        // Create minimum number of workers
        for (let i = 0; i < this.config.minWorkers; i++) {
            await this.createWorker();
        }
        this.logger.info('Worker pool initialized', {
            workerCount: this.workers.size
        });
    }
    // Create a new worker
    async createWorker() {
        const workerId = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
            const worker = new worker_threads_1.Worker(this.config.workerScriptPath, {
                workerData: {
                    workerId,
                    databaseUrl: process.env.DATABASE_URL,
                    openaiApiKey: process.env.OPENAI_API_KEY
                }
            });
            const processingWorker = {
                id: workerId,
                worker,
                isAvailable: true,
                createdAt: new Date(),
                lastUsed: new Date(),
                jobsCompleted: 0
            };
            // Set up worker event handlers
            worker.on('message', (message) => {
                this.handleWorkerMessage(workerId, message);
            });
            worker.on('error', (error) => {
                this.handleWorkerError(workerId, error);
            });
            worker.on('exit', (code) => {
                this.handleWorkerExit(workerId, code);
            });
            this.workers.set(workerId, processingWorker);
            this.logger.debug('Worker created', { workerId });
            this.emit('workerCreated', { workerId });
            return processingWorker;
        }
        catch (error) {
            this.logger.error('Failed to create worker', error);
            throw error;
        }
    }
    // Handle messages from workers
    handleWorkerMessage(workerId, message) {
        const worker = this.workers.get(workerId);
        if (!worker)
            return;
        switch (message.type) {
            case 'job_completed':
                this.handleJobCompleted(workerId, message);
                break;
            case 'job_failed':
                this.handleJobFailed(workerId, message);
                break;
            case 'job_progress':
                this.handleJobProgress(workerId, message);
                break;
            case 'worker_ready':
                worker.isAvailable = true;
                this.logger.debug('Worker ready', { workerId });
                break;
            default:
                this.logger.warn('Unknown worker message type', { workerId, type: message.type });
        }
    }
    // Handle job completion
    handleJobCompleted(workerId, message) {
        const worker = this.workers.get(workerId);
        if (!worker || !worker.currentJob)
            return;
        const job = worker.currentJob;
        const processingTime = Date.now() - (job.startedAt?.getTime() || Date.now());
        const result = {
            jobId: job.id,
            success: true,
            data: message.result,
            processingTime,
            workerId
        };
        this.completedJobs.push(result);
        this.totalJobsCompleted++;
        // Update worker state
        worker.isAvailable = true;
        worker.currentJob = undefined;
        worker.lastUsed = new Date();
        worker.jobsCompleted++;
        this.logger.info('Job completed', {
            jobId: job.id,
            workerId,
            processingTime,
            type: job.type
        });
        this.emit('jobCompleted', result);
    }
    // Handle job failure
    handleJobFailed(workerId, message) {
        const worker = this.workers.get(workerId);
        if (!worker || !worker.currentJob)
            return;
        const job = worker.currentJob;
        job.retryCount++;
        const result = {
            jobId: job.id,
            success: false,
            error: message.error,
            processingTime: Date.now() - (job.startedAt?.getTime() || Date.now()),
            workerId
        };
        // Update worker state
        worker.isAvailable = true;
        worker.currentJob = undefined;
        worker.lastUsed = new Date();
        // Retry if under limit
        if (job.retryCount < job.maxRetries) {
            this.logger.warn('Job failed, retrying', {
                jobId: job.id,
                workerId,
                retryCount: job.retryCount,
                error: message.error
            });
            // Add back to queue with lower priority
            job.priority = Math.min(job.priority + 1, 5);
            this.addJobToQueue(job);
        }
        else {
            this.logger.error('Job failed permanently', {
                jobId: job.id,
                workerId,
                retryCount: job.retryCount,
                error: message.error
            });
            this.completedJobs.push(result);
            this.totalJobsFailed++;
            this.emit('jobFailed', result);
        }
    }
    // Handle job progress updates
    handleJobProgress(workerId, message) {
        this.emit('jobProgress', {
            workerId,
            jobId: message.jobId,
            progress: message.progress,
            stage: message.stage
        });
    }
    // Handle worker errors
    handleWorkerError(workerId, error) {
        this.logger.error('Worker error', error, { workerId });
        const worker = this.workers.get(workerId);
        if (worker?.currentJob) {
            this.handleJobFailed(workerId, { error: error.message });
        }
        // Remove and replace the worker
        this.removeWorker(workerId);
        // Create replacement if not shutting down
        if (!this.isShuttingDown && this.workers.size < this.config.minWorkers) {
            this.createWorker().catch(err => {
                this.logger.error('Failed to create replacement worker', err);
            });
        }
    }
    // Handle worker exit
    handleWorkerExit(workerId, code) {
        this.logger.info('Worker exited', { workerId, code });
        const worker = this.workers.get(workerId);
        if (worker?.currentJob) {
            this.handleJobFailed(workerId, { error: `Worker exited with code ${code}` });
        }
        this.removeWorker(workerId);
    }
    // Remove worker from pool
    removeWorker(workerId) {
        const worker = this.workers.get(workerId);
        if (!worker)
            return;
        try {
            worker.worker.terminate();
        }
        catch (error) {
            this.logger.error('Error terminating worker', error, { workerId });
        }
        this.workers.delete(workerId);
        this.emit('workerRemoved', { workerId });
    }
    // Add job to queue
    addJobToQueue(job) {
        if (this.jobQueue.length >= this.config.maxQueueSize) {
            throw new Error('Job queue is full');
        }
        const fullJob = {
            ...job,
            id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
            retryCount: 0
        };
        // Insert job in priority order
        const insertIndex = this.jobQueue.findIndex(queuedJob => queuedJob.priority > fullJob.priority);
        if (insertIndex === -1) {
            this.jobQueue.push(fullJob);
        }
        else {
            this.jobQueue.splice(insertIndex, 0, fullJob);
        }
        this.logger.debug('Job added to queue', {
            jobId: fullJob.id,
            type: fullJob.type,
            priority: fullJob.priority,
            queueSize: this.jobQueue.length
        });
        this.emit('jobQueued', fullJob);
        return fullJob.id;
    }
    // Process session in parallel
    async processSession(sessionId, priority = 3) {
        return this.addJobToQueue({
            type: 'session_processing',
            priority,
            sessionId,
            data: { sessionId },
            maxRetries: 3,
            timeout: this.config.jobTimeout
        });
    }
    // Process multiple sessions in parallel
    async processSessions(sessionIds, priority = 3) {
        const jobIds = [];
        // Create individual jobs for each session to maximize parallelism
        for (const sessionId of sessionIds) {
            const jobId = this.addJobToQueue({
                type: 'session_processing',
                priority,
                sessionId,
                data: { sessionId },
                maxRetries: 3,
                timeout: this.config.jobTimeout
            });
            jobIds.push(jobId);
        }
        this.logger.info('Batch session processing queued', {
            sessionCount: sessionIds.length,
            jobIds: jobIds.length
        });
        return jobIds;
    }
    // Batch quality scoring
    async batchQualityScoring(sessionIds, priority = 4) {
        return this.addJobToQueue({
            type: 'quality_scoring',
            priority,
            sessionIds,
            data: { sessionIds },
            maxRetries: 2,
            timeout: this.config.jobTimeout * 2 // Longer timeout for batch jobs
        });
    }
    // Batch context enhancement
    async batchContextEnhancement(sessionIds, priority = 4) {
        return this.addJobToQueue({
            type: 'context_enhancement',
            priority,
            sessionIds,
            data: { sessionIds },
            maxRetries: 2,
            timeout: this.config.jobTimeout * 2
        });
    }
    // Start queue processor
    startQueueProcessor() {
        if (this.processingInterval)
            return;
        this.processingInterval = setInterval(() => {
            this.processQueue();
        }, this.config.queueProcessInterval);
        this.logger.info('Queue processor started');
    }
    // Process job queue
    async processQueue() {
        if (this.jobQueue.length === 0)
            return;
        // Scale workers based on queue size
        await this.scaleWorkers();
        // Assign jobs to available workers
        const availableWorkers = Array.from(this.workers.values()).filter(w => w.isAvailable);
        for (const worker of availableWorkers) {
            if (this.jobQueue.length === 0)
                break;
            const job = this.jobQueue.shift();
            if (!job)
                continue;
            await this.assignJobToWorker(worker, job);
        }
    }
    // Assign job to worker
    async assignJobToWorker(worker, job) {
        worker.isAvailable = false;
        worker.currentJob = job;
        job.startedAt = new Date();
        job.workerId = worker.id;
        this.logger.info('Job assigned to worker', {
            jobId: job.id,
            workerId: worker.id,
            type: job.type
        });
        // Send job to worker
        worker.worker.postMessage({
            type: 'process_job',
            job: {
                id: job.id,
                type: job.type,
                data: job.data,
                timeout: job.timeout
            }
        });
        // Set timeout for job
        setTimeout(() => {
            if (worker.currentJob?.id === job.id) {
                this.handleJobTimeout(worker.id, job.id);
            }
        }, job.timeout);
    }
    // Handle job timeout
    handleJobTimeout(workerId, jobId) {
        this.logger.warn('Job timed out', { workerId, jobId });
        const worker = this.workers.get(workerId);
        if (worker?.currentJob?.id === jobId) {
            this.handleJobFailed(workerId, { error: 'Job timed out' });
            // Terminate and replace the worker
            this.removeWorker(workerId);
            if (!this.isShuttingDown) {
                this.createWorker().catch(err => {
                    this.logger.error('Failed to create replacement worker after timeout', err);
                });
            }
        }
    }
    // Scale workers based on load
    async scaleWorkers() {
        const queueSize = this.jobQueue.length;
        const availableWorkers = Array.from(this.workers.values()).filter(w => w.isAvailable).length;
        const totalWorkers = this.workers.size;
        // Scale up if queue is building up and we have capacity
        if (queueSize > availableWorkers && totalWorkers < this.config.maxWorkers) {
            const workersToCreate = Math.min(queueSize - availableWorkers, this.config.maxWorkers - totalWorkers, 3 // Don't create more than 3 at once
            );
            for (let i = 0; i < workersToCreate; i++) {
                try {
                    await this.createWorker();
                }
                catch (error) {
                    this.logger.error('Failed to scale up workers', error);
                    break;
                }
            }
            this.logger.info('Scaled up workers', {
                created: workersToCreate,
                totalWorkers: this.workers.size,
                queueSize
            });
        }
        // Scale down if we have too many idle workers
        if (queueSize === 0 && totalWorkers > this.config.minWorkers) {
            const idleWorkers = Array.from(this.workers.values()).filter(w => w.isAvailable && Date.now() - w.lastUsed.getTime() > this.config.workerIdleTimeout);
            const workersToRemove = Math.min(idleWorkers.length, totalWorkers - this.config.minWorkers);
            for (let i = 0; i < workersToRemove; i++) {
                this.removeWorker(idleWorkers[i].id);
            }
            if (workersToRemove > 0) {
                this.logger.info('Scaled down workers', {
                    removed: workersToRemove,
                    totalWorkers: this.workers.size
                });
            }
        }
    }
    // Get worker pool statistics
    getStats() {
        const workers = Array.from(this.workers.values());
        const availableWorkers = workers.filter(w => w.isAvailable).length;
        const busyWorkers = workers.length - availableWorkers;
        const completedJobsLast100 = this.completedJobs.slice(-100);
        const averageProcessingTime = completedJobsLast100.length > 0 ?
            completedJobsLast100.reduce((sum, job) => sum + job.processingTime, 0) / completedJobsLast100.length : 0;
        return {
            totalWorkers: workers.length,
            availableWorkers,
            busyWorkers,
            queueSize: this.jobQueue.length,
            completedJobs: this.totalJobsCompleted,
            failedJobs: this.totalJobsFailed,
            averageProcessingTime: Math.round(averageProcessingTime),
            systemLoad: {
                cpu: process.cpuUsage().user / 1000000, // Convert to seconds
                memory: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100 // MB
            }
        };
    }
    // Wait for job completion
    async waitForJob(jobId, timeout = 300000) {
        return new Promise((resolve, reject) => {
            const timeoutHandle = setTimeout(() => {
                reject(new Error(`Job ${jobId} timed out after ${timeout}ms`));
            }, timeout);
            const checkCompletion = () => {
                const result = this.completedJobs.find(job => job.jobId === jobId);
                if (result) {
                    clearTimeout(timeoutHandle);
                    resolve(result);
                    return;
                }
                // Check again in 1 second
                setTimeout(checkCompletion, 1000);
            };
            checkCompletion();
        });
    }
    // Wait for multiple jobs
    async waitForJobs(jobIds, timeout = 300000) {
        const results = await Promise.all(jobIds.map(jobId => this.waitForJob(jobId, timeout)));
        return results;
    }
    // Setup cleanup handlers
    setupCleanupHandlers() {
        const cleanup = async () => {
            this.logger.info('Shutting down parallel processing manager');
            this.isShuttingDown = true;
            if (this.processingInterval) {
                clearInterval(this.processingInterval);
                this.processingInterval = null;
            }
            // Wait for current jobs to complete (with timeout)
            const shutdownTimeout = 30000; // 30 seconds
            const startTime = Date.now();
            while (this.workers.size > 0 && Date.now() - startTime < shutdownTimeout) {
                const busyWorkers = Array.from(this.workers.values()).filter(w => !w.isAvailable);
                if (busyWorkers.length === 0)
                    break;
                this.logger.info('Waiting for workers to complete jobs', { busyWorkers: busyWorkers.length });
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            // Terminate all workers
            for (const [workerId] of this.workers) {
                this.removeWorker(workerId);
            }
            this.logger.info('Parallel processing manager shutdown complete');
        };
        process.on('SIGINT', cleanup);
        process.on('SIGTERM', cleanup);
        process.on('beforeExit', cleanup);
    }
}
exports.ParallelProcessingManager = ParallelProcessingManager;
