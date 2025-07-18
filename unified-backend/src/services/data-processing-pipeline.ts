import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/database';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/logger';
import { getErrorMessage } from '../utils/type-helpers';
import { StorageManager } from './storage-manager-clean';
import { OpenAIIntegrationService } from './openai-integration-clean';
import { QualityControlService } from './quality-control-clean';
import { DataValidationService } from './data-validation';
import { ContextEnhancementService } from './context-enhancement';
import { PsychologyInsightsService } from './psychology-insights';
import { NavigationStrategyService } from './navigation-strategy';
import { ParallelProcessingManager } from './parallel-processing-manager';

interface ProcessingJob {
  id: string;
  sessionId: string;
  type: 'interaction' | 'screenshot' | 'session_complete' | 'quality_check' | 'training_data';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  data: any;
  priority: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

interface ProcessingResult {
  id: string;
  status: 'success' | 'error';
  data?: any;
  error?: string;
  qualityScore?: number;
  processingTime?: number;
}

interface SessionCreationData {
  id: string;
  type: 'HUMAN' | 'AUTOMATED' | 'HYBRID';
  config: any;
  workerId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export class DataProcessingPipeline extends EventEmitter {
  private prisma: PrismaClient;
  private storageManager: StorageManager;
  private openaiService: OpenAIIntegrationService;
  private qualityControl: QualityControlService;
  private dataValidation: DataValidationService;
  private contextEnhancement: ContextEnhancementService;
  private psychologyInsights: PsychologyInsightsService;
  private navigationStrategy: NavigationStrategyService;
  private parallelProcessing: ParallelProcessingManager | null = null;
  private logger: Logger;
  
  private jobQueue: ProcessingJob[] = [];
  private activeJobs: Map<string, ProcessingJob> = new Map();
  private processingUpdateCallbacks: Map<string, (update: any) => void> = new Map();
  
  private isProcessing = false;
  private maxConcurrentJobs = 5;
  private processingInterval: NodeJS.Timeout | null = null;

  // Database connection pool throttling - align with actual pool size
  private readonly MAX_CONCURRENT_DB_OPERATIONS = 18; // Stay under pool limit of 20
  private activeDatabaseOperations = 0;
  private databaseQueue: Array<() => Promise<void>> = [];

  // Database operation batching
  private readonly BATCH_SIZE = 5; // Batch operations together
  private readonly BATCH_TIMEOUT = 2000; // 2 seconds max wait for batch
  private batchQueue: Array<{
    operation: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
    type: string;
  }> = [];
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(
    prisma: PrismaClient,
    storageManager: StorageManager,
    openaiService: OpenAIIntegrationService,
    qualityControl: QualityControlService
  ) {
    super();
    
    this.prisma = prisma;
    this.storageManager = storageManager;
    this.openaiService = openaiService;
    this.qualityControl = qualityControl;
    this.dataValidation = new DataValidationService(prisma);
    this.contextEnhancement = new ContextEnhancementService(prisma, openaiService);
    this.psychologyInsights = new PsychologyInsightsService(prisma, openaiService);
    this.navigationStrategy = new NavigationStrategyService(prisma, openaiService);
    // Disable parallel processing for now to avoid worker thread issues in deployment
    // this.parallelProcessing = new ParallelProcessingManager(prisma);
    this.logger = new Logger('DataProcessingPipeline');
    
    this.startProcessing();
    // this.setupParallelProcessingEvents();
    
    // Start batch processing
    this.startBatchProcessing();
  }

  // Database connection pool throttling methods
  private async executeWithThrottling<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const execute = async () => {
        if (this.activeDatabaseOperations >= this.MAX_CONCURRENT_DB_OPERATIONS) {
          // Queue the operation
          this.databaseQueue.push(async () => {
            try {
              this.activeDatabaseOperations++;
              const result = await operation();
              resolve(result);
            } catch (error) {
              reject(error);
            } finally {
              this.activeDatabaseOperations--;
              this.processNextInQueue();
            }
          });
        } else {
          // Execute immediately
          this.activeDatabaseOperations++;
          try {
            const result = await operation();
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            this.activeDatabaseOperations--;
            this.processNextInQueue();
          }
        }
      };
      
      execute();
    });
  }

  private processNextInQueue(): void {
    if (this.databaseQueue.length > 0 && this.activeDatabaseOperations < this.MAX_CONCURRENT_DB_OPERATIONS) {
      const nextOperation = this.databaseQueue.shift();
      if (nextOperation) {
        nextOperation();
      }
    }
  }

  // Database operation batching methods
  private async executeWithBatching<T>(operation: () => Promise<T>, operationType: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.batchQueue.push({
        operation,
        resolve,
        reject,
        type: operationType
      });

      // If batch is full, process immediately
      if (this.batchQueue.length >= this.BATCH_SIZE) {
        this.processBatch();
      } else {
        // Set timeout to process batch if not full
        if (!this.batchTimeout) {
          this.batchTimeout = setTimeout(() => {
            this.processBatch();
          }, this.BATCH_TIMEOUT);
        }
      }
    });
  }

  private async processBatch(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.batchQueue.length === 0) return;

    const currentBatch = this.batchQueue.splice(0, this.BATCH_SIZE);
    
    this.logger.info('🔄 Processing database operation batch', {
      batchSize: currentBatch.length,
      operations: currentBatch.map(b => b.type),
      activeDatabaseOperations: this.activeDatabaseOperations,
      queueSize: this.databaseQueue.length
    });

    // Execute each operation with individual throttling to prevent concurrency spikes
    const promises = currentBatch.map(async (batchItem) => {
      return this.executeWithThrottling(async () => {
        try {
          const result = await batchItem.operation();
          batchItem.resolve(result);
        } catch (error) {
          batchItem.reject(error);
        }
      });
    });

    await Promise.all(promises);
  }

  // Session Management
  async createSession(data: SessionCreationData): Promise<any> {
    try {
      // Use upsert to handle duplicate session IDs gracefully
      const session = await this.executeWithThrottling(() => 
        this.prisma.unifiedSession.upsert({
          where: { id: data.id },
          create: {
            id: data.id,
            type: data.type,
            config: data.config,
            workerId: data.workerId,
            userAgent: data.userAgent,
            ipAddress: data.ipAddress,
            status: 'ACTIVE',
            processingStatus: 'PENDING'
          },
          update: {
            // Update session if it already exists (in case of duplicate start messages)
            status: 'ACTIVE',
            config: data.config,
            userAgent: data.userAgent,
            ipAddress: data.ipAddress
          }
        })
      );

      this.logger.info('Session created/updated', {
        sessionId: session.id,
        type: session.type,
        isNew: session.startTime.getTime() > (Date.now() - 5000) // New if created in last 5 seconds
      });

      return session;
    } catch (error) {
      this.logger.error('Failed to create/update session', {
        sessionId: data.id,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  async stopSession(sessionId: string): Promise<void> {
    try {
      // Check if session exists first
      const existingSession = await this.executeWithThrottling(() => 
        this.prisma.unifiedSession.findUnique({
          where: { id: sessionId }
        })
      );

      if (!existingSession) {
        this.logger.warn('Cannot stop session - session not found in database', { sessionId });
        return; // Don't throw error for missing sessions
      }

      await this.executeWithThrottling(() => 
        this.prisma.unifiedSession.update({
          where: { id: sessionId },
          data: {
            status: 'COMPLETED',
            endTime: new Date()
          }
        })
      );

      this.logger.info('Session stopped successfully', { sessionId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to stop session', { 
        sessionId, 
        error: errorMessage 
      });
      throw error;
    }
  }

  // Stream Data Validation (Real-time)
  async validateStreamData(data: any, dataType: 'interaction' | 'screenshot' | 'session_metadata'): Promise<any> {
    this.logger.info('📥 DataProcessingPipeline.validateStreamData() called', {
      dataType,
      dataId: data?.id || 'unknown',
      sessionId: data?.sessionId || 'unknown',
      dataKeys: data ? Object.keys(data) : [],
      timestamp: new Date().toISOString()
    });

    try {
      const validation = await this.dataValidation.validateStreamData(data, dataType);
      
      this.logger.info('✅ Stream data validated successfully', {
        sessionId: validation.sessionId,
        dataType,
        isValid: validation.isValid,
        errorCount: validation.errors.length
      });

      // Emit validation event for real-time monitoring
      this.emit('dataValidation', validation);

      return validation;
    } catch (error) {
      this.logger.error('Stream data validation failed', error, { dataType });
      throw error;
    }
  }

  // Interaction Processing
  async processInteraction(interactionData: any): Promise<ProcessingResult> {
    const jobId = uuidv4();
    
    this.logger.info('🎯 DataProcessingPipeline.processInteraction() called', {
      jobId,
      sessionId: interactionData?.sessionId || 'unknown',
      interactionType: interactionData?.type || 'unknown',
      interactionId: interactionData?.id || 'unknown',
      dataKeys: interactionData ? Object.keys(interactionData) : [],
      timestamp: new Date().toISOString()
    });
    
    try {
      // Step 1: Validate incoming interaction data
      const validation = await this.validateStreamData(interactionData, 'interaction');
      
      if (!validation.isValid) {
        this.logger.warn('Invalid interaction data received', {
          sessionId: interactionData.sessionId,
          errors: validation.errors,
          warnings: validation.warnings
        });
        
        // Still process but mark as low quality
        interactionData.confidence = 0.2;
        interactionData.validationErrors = validation.errors;
      }

      // Step 2: Create interaction record
      this.logger.info('💾 Storing interaction in database', {
        jobId,
        sessionId: interactionData.sessionId,
        interactionType: interactionData.type,
        timestamp: interactionData.timestamp
      });
      
      const interaction = await this.executeWithBatching(() => 
        this.prisma.interaction.create({
          data: {
            sessionId: interactionData.sessionId,
            type: interactionData.type,
            timestamp: BigInt(interactionData.timestamp),
            sessionTime: interactionData.sessionTime || 0,
            primarySelector: interactionData.primarySelector || interactionData.selector || 'unknown',
            selectorAlternatives: JSON.stringify(interactionData.selectorAlternatives || []),
            xpath: interactionData.xpath,
            cssPath: interactionData.cssPath,
            elementTag: interactionData.elementTag || interactionData.element || 'unknown',
            elementText: interactionData.elementText || interactionData.text,
            elementValue: interactionData.elementValue || interactionData.value,
            elementAttributes: JSON.stringify(interactionData.elementAttributes || {}),
            clientX: interactionData.clientX || interactionData.coordinates?.clientX,
            clientY: interactionData.clientY || interactionData.coordinates?.clientY,
            pageX: interactionData.pageX || interactionData.coordinates?.pageX,
            pageY: interactionData.pageY || interactionData.coordinates?.pageY,
            boundingBox: JSON.stringify(interactionData.boundingBox || {}),
            viewport: JSON.stringify(interactionData.viewport || {}),
            isInViewport: interactionData.isInViewport || false,
            percentVisible: interactionData.percentVisible || 0,
            url: interactionData.url || 'unknown',
            pageTitle: interactionData.pageTitle || '',
            pageStructure: JSON.stringify(interactionData.pageStructure || {}),
            parentElements: JSON.stringify(interactionData.parentElements || []),
            siblingElements: JSON.stringify(interactionData.siblingElements || []),
            nearbyElements: JSON.stringify(interactionData.nearbyElements || []),
            stateBefore: JSON.stringify(interactionData.stateBefore || {}),
            stateAfter: JSON.stringify(interactionData.stateAfter || {}),
            stateChanges: JSON.stringify(interactionData.stateChanges || {}),
            confidence: interactionData.confidence || 0.5,
            selectorReliability: JSON.stringify(interactionData.selectorReliability || {}),
            userIntent: interactionData.userIntent,
            userReasoning: interactionData.userReasoning,
            visualCues: JSON.stringify(interactionData.visualCues || [])
          }
        }), 'interaction_create'
      );

      this.logger.info('✅ Interaction stored in database successfully', {
        jobId,
        interactionId: interaction.id,
        sessionId: interaction.sessionId,
        interactionType: interaction.type
      });

      // Calculate quality score
      const qualityScore = await this.qualityControl.scoreInteraction(interaction);

      // Update interaction with quality score
      await this.executeWithBatching(() => 
        this.prisma.interaction.update({
          where: { id: interaction.id },
          data: { confidence: qualityScore }
        }), 'interaction_update'
      );

      // Queue for enhanced processing if high quality
      if (qualityScore > 0.7) {
        this.queueJob({
          id: uuidv4(),
          sessionId: interactionData.sessionId,
          type: 'interaction',
          status: 'pending',
          data: { interactionId: interaction.id },
          priority: 2,
          createdAt: new Date(),
          retryCount: 0,
          maxRetries: 3
        });
      }

      this.logger.info('Interaction processed', {
        interactionId: interaction.id,
        sessionId: interactionData.sessionId,
        qualityScore
      });

      return {
        id: interaction.id,
        status: 'success',
        qualityScore,
        processingTime: Date.now() - interactionData.timestamp
      };

    } catch (error) {
      this.logger.error('Failed to process interaction', error, {
        sessionId: interactionData.sessionId,
        jobId
      });

      return {
        id: jobId,
        status: 'error',
        error: getErrorMessage(error)
      };
    }
  }

  // Screenshot Processing
  async processScreenshot(screenshotData: any): Promise<ProcessingResult> {
    const jobId = uuidv4();
    
    this.logger.info('📷 DataProcessingPipeline.processScreenshot() called', {
      jobId,
      sessionId: screenshotData?.sessionId || 'unknown',
      screenshotId: screenshotData?.id || 'unknown',
      dataKeys: screenshotData ? Object.keys(screenshotData) : [],
      timestamp: new Date().toISOString()
    });
    
    try {
      // Step 1: Validate incoming screenshot data
      const validation = await this.validateStreamData(screenshotData, 'screenshot');
      
      if (!validation.isValid) {
        this.logger.warn('Invalid screenshot data received', {
          sessionId: screenshotData.sessionId,
          errors: validation.errors,
          warnings: validation.warnings
        });
        
        // Still process but mark as low quality
        screenshotData.quality = 0.3;
        screenshotData.validationErrors = validation.errors;
      }

      // Step 2: Compress and upload screenshot
      const compressionResult = await this.storageManager.compressAndUploadScreenshot(
        screenshotData.dataUrl,
        screenshotData.sessionId,
        screenshotData.eventType
      );

      // Create screenshot record
      const screenshot = await this.executeWithBatching(() => 
        this.prisma.screenshot.create({
          data: {
            sessionId: screenshotData.sessionId,
            interactionId: screenshotData.interactionId,
            timestamp: BigInt(screenshotData.timestamp),
            eventType: screenshotData.eventType,
            s3Key: compressionResult.s3Key,
            compressed: true,
            format: compressionResult.format,
            fileSize: compressionResult.fileSize,
            viewport: JSON.stringify(screenshotData.viewport || {}),
            quality: compressionResult.quality || 0
          }
        }), 'screenshot_create'
      );

      // Queue for vision analysis if high quality
      if (compressionResult.quality > 0.8) {
        this.queueJob({
          id: uuidv4(),
          sessionId: screenshotData.sessionId,
          type: 'screenshot',
          status: 'pending',
          data: { screenshotId: screenshot.id },
          priority: 3,
          createdAt: new Date(),
          retryCount: 0,
          maxRetries: 2
        });
      }

      this.logger.info('Screenshot processed', {
        screenshotId: screenshot.id,
        sessionId: screenshotData.sessionId,
        s3Key: compressionResult.s3Key
      });

      return {
        id: screenshot.id,
        status: 'success',
        data: {
          s3Key: compressionResult.s3Key,
          compressed: true,
          fileSize: compressionResult.fileSize
        }
      };

    } catch (error) {
      this.logger.error('Failed to process screenshot', error, {
        sessionId: screenshotData.sessionId,
        jobId
      });

      return {
        id: jobId,
        status: 'error',
        error: getErrorMessage(error)
      };
    }
  }

  // Complete Session Processing
  async completeSession(sessionId: string, completionData: any): Promise<any> {
    const processingId = uuidv4();
    
    this.logger.info('🏁 DataProcessingPipeline.completeSession() called', {
      processingId,
      sessionId,
      completionDataKeys: completionData ? Object.keys(completionData) : [],
      timestamp: new Date().toISOString()
    });
    
    try {
      // Update session status
      await this.executeWithThrottling(() => 
        this.prisma.unifiedSession.update({
          where: { id: sessionId },
          data: {
            status: 'PROCESSING',
            processingStatus: 'VALIDATING',
            endTime: new Date()
          }
        })
      );

      // Queue comprehensive processing job
      this.queueJob({
        id: processingId,
        sessionId,
        type: 'session_complete',
        status: 'pending',
        data: completionData,
        priority: 1, // High priority
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3
      });

      const estimatedSteps = [
        'Data Validation',
        'Quality Assessment',
        'Context Enhancement',
        'Vision Analysis',
        'Training Data Generation',
        'Archive Creation'
      ];

      this.logger.info('Session completion processing queued', {
        sessionId,
        processingId,
        steps: estimatedSteps.length
      });

      return {
        processingId,
        estimatedDuration: 300000, // 5 minutes
        steps: estimatedSteps
      };

    } catch (error) {
      this.logger.error('Failed to queue session completion', error, { sessionId });
      throw error;
    }
  }

  // Job Queue Management
  private queueJob(job: ProcessingJob): void {
    this.jobQueue.push(job);
    this.jobQueue.sort((a, b) => a.priority - b.priority); // Higher priority first
    
    this.logger.debug('Job queued', {
      jobId: job.id,
      type: job.type,
      priority: job.priority,
      queueSize: this.jobQueue.length
    });
  }

  private startProcessing(): void {
    if (this.processingInterval) return;
    
    this.processingInterval = setInterval(() => {
      this.processJobs();
    }, 1000); // Check every second

    this.logger.info('Processing pipeline started');
  }

  private startBatchProcessing(): void {
    // Process batches every 500ms if there are pending operations
    setInterval(() => {
      if (this.batchQueue.length > 0) {
        this.processBatch();
      }
    }, 500);
    
    this.logger.info('Database batch processing started');
  }

  private async processJobs(): Promise<void> {
    if (this.activeJobs.size >= this.maxConcurrentJobs) return;
    
    const availableSlots = this.maxConcurrentJobs - this.activeJobs.size;
    const jobsToProcess = this.jobQueue.splice(0, availableSlots);
    
    for (const job of jobsToProcess) {
      this.processJob(job);
    }
  }

  private async processJob(job: ProcessingJob): Promise<void> {
    job.status = 'processing';
    job.startedAt = new Date();
    this.activeJobs.set(job.id, job);

    this.logger.info('Processing job started', {
      jobId: job.id,
      type: job.type,
      sessionId: job.sessionId
    });

    try {
      let result: any;

      switch (job.type) {
        case 'interaction':
          result = await this.enhanceInteraction(job.data.interactionId);
          break;
        case 'screenshot':
          result = await this.analyzeScreenshot(job.data.screenshotId);
          break;
        case 'session_complete':
          result = await this.processCompleteSession(job.sessionId, job.data);
          break;
        case 'quality_check':
          result = await this.performQualityCheck(job.sessionId);
          break;
        case 'training_data':
          result = await this.generateTrainingData(job.sessionId);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      job.status = 'completed';
      job.completedAt = new Date();

      this.logger.info('Processing job completed', {
        jobId: job.id,
        type: job.type,
        sessionId: job.sessionId,
        duration: job.completedAt.getTime() - job.startedAt!.getTime()
      });

      // Notify subscribers
      this.notifyProcessingUpdate(job.id, {
        status: 'completed',
        result
      });

    } catch (error) {
      job.status = 'failed';
      job.error = getErrorMessage(error);
      job.retryCount++;

      this.logger.error('Processing job failed', error, {
        jobId: job.id,
        type: job.type,
        sessionId: job.sessionId,
        retryCount: job.retryCount
      });

      // Retry if under limit
      if (job.retryCount < job.maxRetries) {
        job.status = 'pending';
        setTimeout(() => {
          this.queueJob(job);
        }, Math.pow(2, job.retryCount) * 1000); // Exponential backoff
      } else {
        this.notifyProcessingUpdate(job.id, {
          status: 'failed',
          error: getErrorMessage(error)
        });
      }
    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  // Processing Methods
  private async enhanceInteraction(interactionId: string): Promise<any> {
    const interaction = await this.executeWithThrottling(() => 
      this.prisma.interaction.findUnique({
        where: { id: interactionId },
        include: { relatedScreenshots: true }
      })
    );

    if (!interaction) {
      throw new Error('Interaction not found');
    }

    // Enhance with vision analysis if screenshots available
    if (interaction.relatedScreenshots.length > 0) {
      const visionAnalysis = await this.openaiService.analyzeScreenshots(
        interaction.relatedScreenshots
      );

      // Get the first analysis result
      const firstAnalysis = visionAnalysis[0];
      if (firstAnalysis) {
        await this.executeWithThrottling(() => 
          this.prisma.interaction.update({
            where: { id: interactionId },
            data: {
              userIntent: firstAnalysis.userPsychology?.insights?.[0] || 'Unknown intent',
              userReasoning: firstAnalysis.analysis || 'No reasoning available',
              visualCues: JSON.stringify(firstAnalysis.userPsychology?.behaviorPredictions || [])
            }
          })
        );
      }
    }

    return { enhanced: true };
  }

  private async analyzeScreenshot(screenshotId: string): Promise<any> {
    const screenshot = await this.executeWithThrottling(() => 
      this.prisma.screenshot.findUnique({
        where: { id: screenshotId }
      })
    );

    if (!screenshot) {
      throw new Error('Screenshot not found');
    }

    // Perform vision analysis
    const visionAnalysis = await this.openaiService.analyzeScreenshot(screenshot);

    // Update screenshot with analysis
    await this.executeWithThrottling(() => 
      this.prisma.screenshot.update({
        where: { id: screenshotId },
        data: {
          visionAnalysis: JSON.stringify(visionAnalysis.analysis),
          userPsychology: JSON.stringify(visionAnalysis.userPsychology),
          quality: visionAnalysis.qualityScore
        }
      })
    );

    return visionAnalysis;
  }

  private async processCompleteSession(sessionId: string, data: any): Promise<any> {
    // Step 1: Comprehensive Data Validation
    await this.updateProcessingStatus(sessionId, 'VALIDATING');
    const validationResult = await this.dataValidation.validateSession(sessionId);
    
    if (!validationResult.isValid) {
      this.logger.warn('Session validation failed', {
        sessionId,
        score: validationResult.overallScore,
        errors: validationResult.errors.length,
        warnings: validationResult.warnings.length
      });
      
      // Update session with validation results
      await this.executeWithThrottling(() => 
        this.prisma.unifiedSession.update({
          where: { id: sessionId },
          data: {
            qualityScore: validationResult.overallScore,
            completeness: validationResult.metrics.completenessScore,
            reliability: validationResult.metrics.reliabilityScore
          }
        })
      );
      
      // If validation score is too low, mark as failed
      if (validationResult.overallScore < 30) {
        await this.updateProcessingStatus(sessionId, 'FAILED');
        throw new Error(`Session validation failed with score ${validationResult.overallScore}`);
      }
    }

    // Step 2: Quality Assessment
    const qualityReport = await this.qualityControl.assessSession(sessionId);

    // Step 2: Context Enhancement
    await this.updateProcessingStatus(sessionId, 'ENHANCING');
    await this.enhanceSessionContext(sessionId);

    // Step 3: Psychology Insights Extraction
    await this.updateProcessingStatus(sessionId, 'PSYCHOLOGY_ANALYSIS');
    await this.extractPsychologyInsights(sessionId);

    // Step 4: Training Data Generation
    await this.updateProcessingStatus(sessionId, 'TRAINING');
    const trainingData = await this.generateTrainingData(sessionId);

    // Step 4: Archive Creation
    await this.updateProcessingStatus(sessionId, 'ARCHIVING');
    const archive = await this.storageManager.createSessionArchive(sessionId);

    // Step 5: Complete
    await this.updateProcessingStatus(sessionId, 'COMPLETED');
    await this.executeWithThrottling(() => 
      this.prisma.unifiedSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          qualityScore: qualityReport.overallScore,
          completeness: qualityReport.completenessScore,
          reliability: qualityReport.reliabilityScore,
          archiveUrl: archive.s3Key,
          trainingFileId: trainingData.openaiFileId
        }
      })
    );

    return {
      qualityReport,
      trainingData,
      archive
    };
  }

  private async performQualityCheck(sessionId: string): Promise<any> {
    return await this.qualityControl.assessSession(sessionId);
  }

  private async generateTrainingData(sessionId: string): Promise<any> {
    const session = await this.executeWithThrottling(() => 
      this.prisma.unifiedSession.findUnique({
        where: { id: sessionId },
        include: {
          interactions: true,
          screenshots: true
        }
      })
    );

    if (!session) {
      throw new Error('Session not found');
    }

    // Generate training data
    const trainingData = await this.openaiService.generateTrainingData(session);

    // Save training data
    const jsonlContent = trainingData.messages.map((msg: any) => JSON.stringify(msg)).join('\n');
    const trainingRecord = await this.executeWithThrottling(() => 
      this.prisma.trainingData.create({
        data: {
          sessionId,
          jsonlData: jsonlContent,
          fileSize: jsonlContent.length,
          trainingQuality: trainingData.trainingValue,
          status: 'PENDING'
        }
      })
    );

    return trainingRecord;
  }

  private async enhanceSessionContext(sessionId: string): Promise<void> {
    try {
      // Use the context enhancement service to analyze and enhance session context
      const enhancedContext = await this.contextEnhancement.enhanceSessionContext(sessionId);
      
      this.logger.info('Session context enhanced', {
        sessionId,
        trainingValue: enhancedContext.trainingValue,
        primaryIntent: enhancedContext.userIntent.primaryIntent,
        behaviorType: enhancedContext.shoppingBehavior.behaviorType,
        navigationEfficiency: enhancedContext.navigationPattern.efficiency
      });

      // Emit context enhancement event for monitoring
      this.emit('contextEnhanced', {
        sessionId,
        context: enhancedContext
      });

    } catch (error) {
      this.logger.error('Failed to enhance session context', error, { sessionId });
      throw error;
    }
  }

  private async extractPsychologyInsights(sessionId: string): Promise<void> {
    try {
      // Use the psychology insights service to extract user psychology from session data
      const psychologyProfile = await this.psychologyInsights.extractUserPsychologyInsights(sessionId);
      
      this.logger.info('Psychology insights extracted', {
        sessionId,
        dominantPersonality: psychologyProfile.dominantPersonality,
        emotionalState: psychologyProfile.emotionalState,
        decisionMakingStyle: psychologyProfile.decisionMakingStyle,
        confidence: psychologyProfile.confidence,
        trustLevel: psychologyProfile.trustLevel,
        urgencyLevel: psychologyProfile.urgencyLevel
      });

      // Emit psychology insights event for monitoring
      this.emit('psychologyInsightsExtracted', {
        sessionId,
        profile: psychologyProfile
      });

    } catch (error) {
      this.logger.error('Failed to extract psychology insights', error, { sessionId });
      throw error;
    }
  }

  private async updateProcessingStatus(sessionId: string, status: string): Promise<void> {
    await this.executeWithThrottling(() => 
      this.prisma.unifiedSession.update({
        where: { id: sessionId },
        data: { processingStatus: status as any }
      })
    );
  }

  // Event Handling
  onProcessingUpdate(processingId: string, callback: (update: any) => void): void {
    this.processingUpdateCallbacks.set(processingId, callback);
  }

  private notifyProcessingUpdate(processingId: string, update: any): void {
    const callback = this.processingUpdateCallbacks.get(processingId);
    if (callback) {
      callback(update);
    }
    
    this.emit('processingUpdate', { processingId, update });
  }

  // Status Methods
  getStatus(): any {
    return {
      isProcessing: this.isProcessing,
      queueSize: this.jobQueue.length,
      activeJobs: this.activeJobs.size,
      maxConcurrentJobs: this.maxConcurrentJobs
    };
  }

  getQueueSize(): number {
    return this.jobQueue.length;
  }

  getActiveJobs(): number {
    return this.activeJobs.size;
  }

  async getCompletedToday(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await this.executeWithThrottling(() => 
      this.prisma.unifiedSession.count({
        where: {
          status: 'COMPLETED',
          updatedAt: {
            gte: today
          }
        }
      })
    );
  }

  // Parallel Processing Methods
  private setupParallelProcessingEvents(): void {
    if (!this.parallelProcessing) return;
    
    // Listen for parallel processing events
    this.parallelProcessing.on('jobCompleted', (result) => {
      this.logger.info('Parallel job completed', {
        jobId: result.jobId,
        workerId: result.workerId,
        processingTime: result.processingTime
      });
      
      this.emit('parallelJobCompleted', result);
    });

    this.parallelProcessing.on('jobFailed', (result) => {
      this.logger.error('Parallel job failed', {
        jobId: result.jobId,
        workerId: result.workerId,
        error: result.error
      });
      
      this.emit('parallelJobFailed', result);
    });

    this.parallelProcessing.on('workerCreated', (event) => {
      this.logger.debug('Worker created', event);
    });

    this.parallelProcessing.on('workerRemoved', (event) => {
      this.logger.debug('Worker removed', event);
    });
  }

  // Process multiple sessions in parallel
  async processSessionsInParallel(sessionIds: string[], priority: number = 3): Promise<string[]> {
    this.logger.info('Starting parallel session processing', {
      sessionCount: sessionIds.length,
      priority
    });

    if (!this.parallelProcessing) {
      this.logger.warn('Parallel processing disabled, falling back to sequential processing');
      return [];
    }

    const jobIds = await this.parallelProcessing.processSessions(sessionIds, priority);
    
    this.emit('parallelProcessingStarted', {
      sessionIds,
      jobIds,
      estimatedDuration: sessionIds.length * 60000 // Rough estimate: 1 minute per session
    });

    return jobIds;
  }

  // Batch quality scoring with parallel processing
  async batchQualityScoring(sessionIds: string[], priority: number = 4): Promise<string> {
    this.logger.info('Starting batch quality scoring', {
      sessionCount: sessionIds.length
    });

    if (!this.parallelProcessing) {
      this.logger.warn('Parallel processing disabled, skipping batch quality scoring');
      return '';
    }

    const jobId = await this.parallelProcessing.batchQualityScoring(sessionIds, priority);
    
    this.emit('batchQualityScoringStarted', {
      sessionIds,
      jobId
    });

    return jobId;
  }

  // Batch context enhancement with parallel processing
  async batchContextEnhancement(sessionIds: string[], priority: number = 4): Promise<string> {
    this.logger.info('Starting batch context enhancement', {
      sessionCount: sessionIds.length
    });

    if (!this.parallelProcessing) {
      this.logger.warn('Parallel processing disabled, skipping batch context enhancement');
      return '';
    }

    const jobId = await this.parallelProcessing.batchContextEnhancement(sessionIds, priority);
    
    this.emit('batchContextEnhancementStarted', {
      sessionIds,
      jobId
    });

    return jobId;
  }

  // Wait for parallel processing jobs to complete
  async waitForParallelJobs(jobIds: string[], timeout: number = 600000): Promise<any[]> {
    this.logger.info('Waiting for parallel jobs to complete', {
      jobCount: jobIds.length,
      timeout
    });

    if (!this.parallelProcessing) {
      this.logger.warn('Parallel processing disabled, returning empty results');
      return [];
    }

    try {
      const results = await this.parallelProcessing.waitForJobs(jobIds, timeout);
      
      this.logger.info('Parallel jobs completed', {
        jobCount: results.length,
        successfulJobs: results.filter(r => r.success).length,
        failedJobs: results.filter(r => !r.success).length
      });

      return results;
    } catch (error) {
      this.logger.error('Parallel job waiting failed', error, { jobIds });
      throw error;
    }
  }

  // Get parallel processing statistics
  getParallelProcessingStats(): any {
    if (!this.parallelProcessing) {
      return {
        totalWorkers: 0,
        availableWorkers: 0,
        busyWorkers: 0,
        queueSize: 0,
        completedJobs: 0,
        failedJobs: 0,
        averageProcessingTime: 0,
        systemLoad: { cpu: 0, memory: 0 },
        traditionalQueue: {
          size: this.jobQueue.length,
          activeJobs: this.activeJobs.size,
          maxConcurrentJobs: this.maxConcurrentJobs
        }
      };
    }
    
    const stats = this.parallelProcessing.getStats();
    
    return {
      ...stats,
      traditionalQueue: {
        size: this.jobQueue.length,
        activeJobs: this.activeJobs.size,
        maxConcurrentJobs: this.maxConcurrentJobs
      }
    };
  }

  // Process high-priority session immediately with parallel processing
  async processSessionHighPriority(sessionId: string): Promise<string> {
    this.logger.info('Processing high-priority session', { sessionId });
    
    if (!this.parallelProcessing) {
      this.logger.warn('Parallel processing disabled, falling back to traditional processing');
      const job: ProcessingJob = {
        id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sessionId,
        type: 'session_complete',
        status: 'pending',
        data: { sessionId },
        priority: 1,
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 3
      };
      this.queueJob(job);
      return job.id;
    }
    
    const jobId = await this.parallelProcessing.processSession(sessionId, 1); // Highest priority
    
    this.emit('highPrioritySessionQueued', {
      sessionId,
      jobId
    });

    return jobId;
  }

  // Batch process multiple operations in parallel
  async batchProcessOperations(operations: Array<{
    type: 'validation' | 'quality_scoring' | 'context_enhancement';
    sessionIds: string[];
    priority?: number;
  }>): Promise<string[]> {
    const jobIds: string[] = [];

    if (!this.parallelProcessing) {
      this.logger.warn('Parallel processing disabled, skipping batch operations');
      return jobIds;
    }

    for (const operation of operations) {
      let jobId: string;
      
      switch (operation.type) {
        case 'validation':
          // For validation, we'll process each session individually for better parallelism
          const validationJobs = await this.parallelProcessing.processSessions(
            operation.sessionIds, 
            operation.priority || 4
          );
          jobIds.push(...validationJobs);
          break;
          
        case 'quality_scoring':
          jobId = await this.parallelProcessing.batchQualityScoring(
            operation.sessionIds, 
            operation.priority || 4
          );
          jobIds.push(jobId);
          break;
          
        case 'context_enhancement':
          jobId = await this.parallelProcessing.batchContextEnhancement(
            operation.sessionIds, 
            operation.priority || 4
          );
          jobIds.push(jobId);
          break;
      }
    }

    this.logger.info('Batch operations queued', {
      operationCount: operations.length,
      totalJobs: jobIds.length
    });

    return jobIds;
  }

  // Enhanced status method that includes parallel processing info
  getEnhancedStatus(): any {
    const traditionalStatus = this.getStatus();
    const parallelStats = this.getParallelProcessingStats();
    
    return {
      traditional: traditionalStatus,
      parallel: parallelStats,
      combined: {
        totalActiveJobs: traditionalStatus.activeJobs + parallelStats.busyWorkers,
        totalQueueSize: traditionalStatus.queueSize + parallelStats.queueSize,
        processingCapacity: traditionalStatus.maxConcurrentJobs + parallelStats.totalWorkers,
        utilizationRate: Math.round(
          ((traditionalStatus.activeJobs + parallelStats.busyWorkers) / 
           (traditionalStatus.maxConcurrentJobs + parallelStats.totalWorkers)) * 100
        )
      }
    };
  }

  private parallelProcessingStats(): any {
    return this.getParallelProcessingStats();
  }

  // Shutdown
  async stop(): Promise<void> {
    this.logger.info('Shutting down data processing pipeline');
    
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Wait for traditional jobs to complete
    while (this.activeJobs.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Stop parallel processing manager
    // Note: ParallelProcessingManager handles its own shutdown via process events
    
    // Process any remaining batches
    if (this.batchQueue.length > 0) {
      this.logger.info('Processing remaining database batches before shutdown');
      await this.processBatch();
    }
    
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    this.logger.info('Processing pipeline stopped');
  }
}