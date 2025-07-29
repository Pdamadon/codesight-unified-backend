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
  generatedTask?: any;
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
            config: {
              ...data.config,
              generatedTask: data.generatedTask
            },
            workerId: data.workerId,
            userAgent: data.userAgent,
            ipAddress: data.ipAddress,
            status: 'ACTIVE',
            processingStatus: 'PENDING',
            // Initialize enhanced interaction storage
            enhancedInteractions: [],
            interactionCount: 0,
            version: 1
          },
          update: {
            // Update session if it already exists (in case of duplicate start messages)
            status: 'ACTIVE',
            config: {
              ...data.config,
              generatedTask: data.generatedTask
            },
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
  // Helper method to detect enhanced 6-group data structure
  private isEnhanced6GroupData(interactionData: any): boolean {
    const enhancedFields = ['metadata', 'elementDetails', 'contextData', 'overlays', 'action'];
    const hasEnhancedFields = enhancedFields.some(field => 
      interactionData[field] && typeof interactionData[field] === 'object'
    );
    
    this.logger.debug('Enhanced data detection', {
      sessionId: interactionData?.sessionId,
      hasEnhancedFields,
      enhancedFieldsPresent: enhancedFields.filter(field => 
        interactionData[field] && typeof interactionData[field] === 'object'
      )
    });
    
    return hasEnhancedFields;
  }

  // Enhanced interaction processing with optimistic locking
  private async processEnhancedInteraction(interactionData: any, jobId: string): Promise<ProcessingResult> {
    console.log(`\n📥 [DATA PIPELINE] Processing enhanced interaction for session ${interactionData.sessionId}`);
    console.log(`🔧 [DATA PIPELINE] Job ID: ${jobId}, Interaction type: ${interactionData.type}`);
    
    const maxRetries = 3;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        // Get current session with version for optimistic locking
        const currentSession = await this.executeWithThrottling(() =>
          this.prisma.unifiedSession.findUnique({
            where: { id: interactionData.sessionId },
            select: { 
              version: true, 
              enhancedInteractions: true, 
              interactionCount: true 
            }
          })
        );

        if (!currentSession) {
          throw new Error(`Session ${interactionData.sessionId} not found`);
        }

        // Create enhanced interaction object for JSON storage
        const enhancedInteraction = {
          id: uuidv4(),
          type: interactionData.type,
          timestamp: interactionData.timestamp,
          sessionTime: interactionData.sessionTime,
          sequence: interactionData.sequence,
          
          // 6-group enhanced data structure
          selectors: {
            primary: interactionData.primarySelector,
            alternatives: interactionData.selectorAlternatives,
            xpath: interactionData.xpath,
            cssPath: interactionData.cssPath,
            reliability: interactionData.selectorReliability
          },
          visual: {
            coordinates: interactionData.coordinates,
            boundingBox: interactionData.boundingBox,
            isInViewport: interactionData.isInViewport,
            percentVisible: interactionData.percentVisible,
            viewport: interactionData.viewport
          },
          element: {
            tag: interactionData.elementTag,
            text: interactionData.elementText,
            value: interactionData.elementValue,
            attributes: interactionData.elementAttributes,
            parentElements: interactionData.parentElements,
            siblingElements: interactionData.siblingElements,
            nearbyElements: interactionData.nearbyElements
          },
          context: {
            url: interactionData.url,
            pageTitle: interactionData.pageTitle,
            pageContext: interactionData.pageContext,
            pageStructure: interactionData.pageStructure
          },
          state: {
            before: interactionData.stateBefore,
            after: interactionData.stateAfter,
            changes: interactionData.stateChanges
          },
          interaction: {
            modifiers: interactionData.modifiers,
            confidence: interactionData.confidence || 0.5,
            userIntent: interactionData.userIntent,
            userReasoning: interactionData.userReasoning,
            visualCues: interactionData.visualCues,
            screenshotId: interactionData.screenshotId
          },
          
          // Enhanced training data fields
          metadata: interactionData.metadata,
          elementDetails: interactionData.elementDetails,
          contextData: interactionData.contextData,
          overlays: interactionData.overlays,
          action: interactionData.action
        };

        // Prepare updated interactions array
        const currentInteractions = Array.isArray(currentSession.enhancedInteractions) 
          ? currentSession.enhancedInteractions as any[] 
          : [];
        const updatedInteractions = [...currentInteractions, enhancedInteraction];

        // Update session with optimistic locking
        const updatedSession = await this.executeWithThrottling(() =>
          this.prisma.unifiedSession.update({
            where: { 
              id: interactionData.sessionId,
              version: currentSession.version // Optimistic lock
            },
            data: {
              enhancedInteractions: updatedInteractions,
              lastInteractionTime: new Date(interactionData.timestamp),
              interactionCount: currentSession.interactionCount + 1,
              version: currentSession.version + 1
            }
          })
        );

        this.logger.info('✅ Enhanced interaction stored in unified session', {
          jobId,
          interactionId: enhancedInteraction.id,
          sessionId: interactionData.sessionId,
          interactionCount: updatedSession.interactionCount,
          version: updatedSession.version
        });

        // Calculate quality score for the enhanced interaction
        const qualityScore = await this.qualityControl.scoreInteraction({
          ...enhancedInteraction,
          id: enhancedInteraction.id,
          sessionId: interactionData.sessionId
        });

        return {
          id: enhancedInteraction.id,
          status: 'success',
          qualityScore,
          data: {
            stored: 'unified_session',
            interactionCount: updatedSession.interactionCount,
            version: updatedSession.version
          }
        };

      } catch (error: any) {
        // Check for optimistic locking conflict (Prisma error P2025)
        if (error.code === 'P2025' && retryCount < maxRetries - 1) {
          retryCount++;
          this.logger.warn('Optimistic lock conflict, retrying', {
            jobId,
            sessionId: interactionData.sessionId,
            retryCount,
            maxRetries
          });
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 50 * retryCount));
          continue;
        }

        this.logger.error('Failed to process enhanced interaction', {
          jobId,
          sessionId: interactionData.sessionId,
          retryCount,
          error: error.message
        });
        throw error;
      }
    }

    throw new Error(`Failed to process enhanced interaction after ${maxRetries} retries`);
  }

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

    // 🔍 LOG: Detailed payload analysis
    console.log('📊 RECEIVED INTERACTION PAYLOAD:', {
      type: interactionData?.type,
      hasFlattened: {
        primarySelector: !!interactionData?.primarySelector,
        selectorAlternatives: !!interactionData?.selectorAlternatives,
        xpath: !!interactionData?.xpath,
        cssPath: !!interactionData?.cssPath,
        elementTag: !!interactionData?.elementTag,
        elementText: !!interactionData?.elementText,
        coordinates: !!interactionData?.coordinates,
        modifiers: !!interactionData?.modifiers
      },
      hasEnhanced: {
        metadata: !!interactionData?.metadata && typeof interactionData.metadata === 'object',
        pageContext: !!interactionData?.pageContext && typeof interactionData.pageContext === 'object',
        elementDetails: !!interactionData?.elementDetails && typeof interactionData.elementDetails === 'object',
        contextData: !!interactionData?.contextData && typeof interactionData.contextData === 'object',
        overlays: !!interactionData?.overlays && Array.isArray(interactionData.overlays),
        action: !!interactionData?.action && typeof interactionData.action === 'object'
      },
      sampleData: {
        selector: interactionData?.primarySelector,
        element: interactionData?.elementTag,
        coordinates: interactionData?.coordinates,
        metadata: interactionData?.metadata ? Object.keys(interactionData.metadata) : null,
        overlayCount: Array.isArray(interactionData?.overlays) ? interactionData.overlays.length : 'not array'
      }
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

      // All interaction data is now enhanced 6-group data - process through unified session path only
      this.logger.info('🔄 Processing enhanced 6-group interaction data', {
        jobId,
        sessionId: interactionData.sessionId,
        interactionType: interactionData.type
      });
      
      return await this.processEnhancedInteraction(interactionData, jobId);

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
      const safeEventType = screenshotData.eventType || screenshotData.trigger || 'auto-capture';
      const compressionResult = await this.storageManager.compressAndUploadScreenshot(
        screenshotData.dataUrl,
        screenshotData.sessionId,
        safeEventType
      );

      // Create screenshot record with proper defaults for missing fields
      const screenshot = await this.executeWithBatching(() => 
        this.prisma.screenshot.create({
          data: {
            sessionId: screenshotData.sessionId,
            interactionId: screenshotData.interactionId || null,
            timestamp: BigInt(screenshotData.timestamp),
            eventType: safeEventType,
            s3Key: compressionResult.s3Key,
            compressed: true,
            format: compressionResult.format,
            fileSize: compressionResult.fileSize || 0,
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
    
    console.log('🚨🚨🚨 PIPELINE DEBUG: completeSession() ENTRY POINT 🚨🚨🚨');
    console.log('📍 Location: DataProcessingPipeline.completeSession()');
    console.log('🆔 SessionID:', sessionId);
    console.log('🆔 ProcessingID:', processingId);
    console.log('📊 Completion data keys:', completionData ? Object.keys(completionData) : 'no data');
    console.log('⏰ Timestamp:', new Date().toISOString());
    
    this.logger.info('🏁 DataProcessingPipeline.completeSession() called', {
      processingId,
      sessionId,
      completionDataKeys: completionData ? Object.keys(completionData) : [],
      timestamp: new Date().toISOString()
    });
    
    try {
      console.log('🔍 PIPELINE DEBUG: About to update session status to PROCESSING/VALIDATING');
      
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
      
      console.log('✅ PIPELINE DEBUG: Session status updated successfully');

      // Queue comprehensive processing job
      console.log('🔄 PIPELINE DEBUG: About to queue job for session completion');
      console.log('📋 Job details:', {
        id: processingId,
        sessionId,
        type: 'session_complete',
        status: 'pending',
        priority: 1
      });
      
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
      
      console.log('✅ PIPELINE DEBUG: Job queued successfully, should trigger processJob() next');

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
    console.log('📥📥📥 PIPELINE DEBUG: queueJob() CALLED 📥📥📥');
    console.log('📍 Location: DataProcessingPipeline.queueJob()');
    console.log('🆔 JobID:', job.id);
    console.log('📊 Job Type:', job.type);
    console.log('🆔 SessionID:', job.sessionId);
    console.log('🎯 Priority:', job.priority);
    console.log('📊 Current queue size (before adding):', this.jobQueue.length);
    
    this.jobQueue.push(job);
    this.jobQueue.sort((a, b) => a.priority - b.priority); // Higher priority first
    
    console.log('✅ PIPELINE DEBUG: Job added to queue successfully');
    console.log('📊 New queue size:', this.jobQueue.length);
    console.log('📋 Queue contents after sorting:', this.jobQueue.map(j => `${j.id}(${j.type}, P${j.priority})`).join(', '));
    
    this.logger.debug('Job queued', {
      jobId: job.id,
      type: job.type,
      priority: job.priority,
      queueSize: this.jobQueue.length,
      sessionId: job.sessionId
    });
  }

  private startProcessing(): void {
    if (this.processingInterval) return;
    
    this.processingInterval = setInterval(() => {
      this.processJobs();
    }, 60000); // Check every minute

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
    // Only log if there are jobs to process or active jobs
    if (this.jobQueue.length > 0 || this.activeJobs.size > 0) {
      console.log('🔄 PIPELINE DEBUG: processJobs() called, checking queue...');
      console.log('📊 Queue length:', this.jobQueue.length);
      console.log('📊 Active jobs:', this.activeJobs.size);
      console.log('📊 Max concurrent:', this.maxConcurrentJobs);
      
      // Enhanced logging for queue contents
      if (this.jobQueue.length > 0) {
        console.log('📋 PIPELINE DEBUG: Jobs in queue:');
        this.jobQueue.forEach((job, index) => {
          console.log(`   ${index + 1}. Job ${job.id} - Type: ${job.type}, SessionID: ${job.sessionId}, Priority: ${job.priority}, Status: ${job.status}`);
        });
      }
    }
    
    if (this.activeJobs.size >= this.maxConcurrentJobs) {
      if (this.jobQueue.length > 0) {
        console.log('⏸️  PIPELINE DEBUG: Max concurrent jobs reached, skipping processing');
      }
      return;
    }
    
    const availableSlots = this.maxConcurrentJobs - this.activeJobs.size;
    const jobsToProcess = this.jobQueue.splice(0, availableSlots);
    
    console.log('🎯 PIPELINE DEBUG: Processing', jobsToProcess.length, 'jobs');
    console.log('🎯 PIPELINE DEBUG: Available slots:', availableSlots);
    
    for (const job of jobsToProcess) {
      console.log('🚀 PIPELINE DEBUG: Starting job:', job.id, 'type:', job.type, 'sessionId:', job.sessionId);
      this.processJob(job);
    }
  }

  private async processJob(job: ProcessingJob): Promise<void> {
    console.log('🎯🎯🎯 PIPELINE DEBUG: processJob() CALLED 🎯🎯🎯');
    console.log('📍 Location: DataProcessingPipeline.processJob()');
    console.log('🆔 JobID:', job.id);
    console.log('📊 Job Type:', job.type);
    console.log('🆔 SessionID:', job.sessionId);
    console.log('⏰ Job created:', job.createdAt);
    
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
      
      console.log('🔄 PIPELINE DEBUG: About to switch on job type:', job.type);

      switch (job.type) {
        case 'interaction':
          console.log('🔄 PIPELINE DEBUG: Processing interaction job');
          result = await this.enhanceInteraction(job.data.interactionId);
          break;
        case 'screenshot':
          console.log('🔄 PIPELINE DEBUG: Processing screenshot job');
          result = await this.analyzeScreenshot(job.data.screenshotId);
          break;
        case 'session_complete':
          console.log('🎯 PIPELINE DEBUG: Processing session_complete job - THIS IS THE BIG ONE!');
          console.log('🆔 About to call processCompleteSession for:', job.sessionId);
          result = await this.processCompleteSession(job.sessionId, job.data);
          console.log('✅ PIPELINE DEBUG: processCompleteSession completed');
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

      console.error('❌❌❌ PIPELINE DEBUG: PROCESSING JOB FAILED ❌❌❌');
      console.error('📍 Location: DataProcessingPipeline.processJob() - catch block');
      console.error('🆔 JobID:', job.id);
      console.error('📊 Job Type:', job.type);
      console.error('🆔 SessionID:', job.sessionId);
      console.error('🔄 Retry Count:', job.retryCount);
      console.error('🔄 Max Retries:', job.maxRetries);
      console.error('💥 Error Message:', getErrorMessage(error));
      console.error('💥 Error Stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('💥 Full Error Object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));

      this.logger.error('Processing job failed', error, {
        jobId: job.id,
        type: job.type,
        sessionId: job.sessionId,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries,
        errorMessage: getErrorMessage(error),
        errorStack: error instanceof Error ? error.stack : 'No stack trace'
      });

      // Retry if under limit
      if (job.retryCount < job.maxRetries) {
        console.log('🔄 PIPELINE DEBUG: Job will be retried', {
          jobId: job.id,
          retryCount: job.retryCount,
          maxRetries: job.maxRetries,
          backoffDelay: Math.pow(2, job.retryCount) * 1000
        });
        
        job.status = 'pending';
        setTimeout(() => {
          console.log('🔄 PIPELINE DEBUG: Re-queuing failed job for retry:', job.id);
          this.queueJob(job);
        }, Math.pow(2, job.retryCount) * 1000); // Exponential backoff
      } else {
        console.error('💀 PIPELINE DEBUG: Job exceeded max retries, marking as permanently failed:', job.id);
        this.notifyProcessingUpdate(job.id, {
          status: 'failed',
          error: getErrorMessage(error)
        });
      }
    } finally {
      console.log('🧹 PIPELINE DEBUG: Cleaning up job from active jobs:', job.id);
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
        // Get current interaction data and update the JSON fields
        const currentInteraction = await this.executeWithThrottling(() =>
          this.prisma.interaction.findUnique({
            where: { id: interactionId },
            select: { interaction: true }
          })
        );

        if (currentInteraction) {
          const currentInteractionData = typeof currentInteraction.interaction === 'object' 
            ? currentInteraction.interaction as any 
            : {};

          await this.executeWithThrottling(() => 
            this.prisma.interaction.update({
              where: { id: interactionId },
              data: {
                interaction: {
                  ...currentInteractionData,
                  userIntent: firstAnalysis.userPsychology?.insights?.[0] || 'Unknown intent',
                  userReasoning: firstAnalysis.analysis || 'No reasoning available',
                  visualCues: firstAnalysis.userPsychology?.behaviorPredictions || []
                }
              }
            })
          );
        }
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
    console.log('🚀🚀🚀 PIPELINE DEBUG: processCompleteSession() ENTRY 🚀🚀🚀');
    console.log('📍 Location: DataProcessingPipeline.processCompleteSession()');
    console.log('🆔 SessionID:', sessionId);
    console.log('📊 Data keys:', data ? Object.keys(data) : 'no data');
    console.log('⏰ Starting at:', new Date().toISOString());
    
    // Step 1: Comprehensive Data Validation
    console.log('🔍 PIPELINE DEBUG: Step 1 - Starting Data Validation');
    await this.updateProcessingStatus(sessionId, 'VALIDATING');
    console.log('✅ PIPELINE DEBUG: Status updated to VALIDATING, calling dataValidation.validateSession()');
    const validationResult = await this.dataValidation.validateSession(sessionId);
    console.log('✅ PIPELINE DEBUG: Data validation completed, result:', {
      isValid: validationResult.isValid,
      score: validationResult.overallScore,
      errorCount: validationResult.errors.length
    });
    
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
    console.log('🔍 PIPELINE DEBUG: Step 2 - Starting Quality Assessment');
    const qualityReport = await this.qualityControl.assessSession(sessionId);
    console.log('✅ PIPELINE DEBUG: Quality assessment completed, score:', qualityReport.overallScore);

    // Step 3: Context Enhancement
    console.log('🔍 PIPELINE DEBUG: Step 3 - Starting Context Enhancement');
    await this.updateProcessingStatus(sessionId, 'ENHANCING');
    console.log('✅ PIPELINE DEBUG: Status updated to ENHANCING, calling enhanceSessionContext()');
    await this.enhanceSessionContext(sessionId);
    console.log('✅ PIPELINE DEBUG: Context enhancement completed');

    // Step 3: Psychology Insights Extraction - SKIPPED FOR NOW
    // await this.updateProcessingStatus(sessionId, 'PSYCHOLOGY_ANALYSIS');
    // await this.extractPsychologyInsights(sessionId);

    // Step 4: Training Data Generation
    console.log('🔍 PIPELINE DEBUG: Step 4 - Starting Training Data Generation');
    await this.updateProcessingStatus(sessionId, 'TRAINING');
    console.log('✅ PIPELINE DEBUG: Status updated to TRAINING, calling generateTrainingData()');
    const trainingData = await this.generateTrainingData(sessionId);
    console.log('✅ PIPELINE DEBUG: Training data generation completed');

    // Step 5: Archive Creation - TEMPORARILY DISABLED
    console.log('🔍 PIPELINE DEBUG: Step 5 - Skipping Archive Creation (temporarily disabled)');
    // await this.updateProcessingStatus(sessionId, 'ARCHIVING');
    // console.log('✅ PIPELINE DEBUG: Status updated to ARCHIVING, calling createSessionArchive()');
    // const archive = await this.storageManager.createSessionArchive(sessionId);
    // console.log('✅ PIPELINE DEBUG: Archive creation completed');

    // Step 6: Complete
    console.log('🔍 PIPELINE DEBUG: Step 6 - Completing Session');
    await this.updateProcessingStatus(sessionId, 'COMPLETED');
    console.log('✅ PIPELINE DEBUG: Status updated to COMPLETED, doing final database update');
    await this.executeWithThrottling(() => 
      this.prisma.unifiedSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          qualityScore: qualityReport.overallScore,
          completeness: qualityReport.completenessScore,
          reliability: qualityReport.reliabilityScore,
          archiveUrl: null, // Archive temporarily disabled
          trainingFileId: trainingData.openaiFileId
        }
      })
    );

    return {
      qualityReport,
      trainingData,
      archive: null // Archive temporarily disabled
    };
  }

  private async performQualityCheck(sessionId: string): Promise<any> {
    return await this.qualityControl.assessSession(sessionId);
  }

  private async generateTrainingData(sessionId: string): Promise<any> {
    console.log('🎓🎓🎓 TRAINING DATA DEBUG: generateTrainingData() ENTRY 🎓🎓🎓');
    console.log('📍 Location: DataProcessingPipeline.generateTrainingData()');
    console.log('🆔 SessionID:', sessionId);
    console.log('⏰ Starting at:', new Date().toISOString());
    
    const session = await this.executeWithThrottling(() => 
      this.prisma.unifiedSession.findUnique({
        where: { id: sessionId },
        include: {
          screenshots: true
        }
      })
    );

    if (!session) {
      console.error('❌ TRAINING DATA DEBUG: Session not found in database:', sessionId);
      throw new Error('Session not found');
    }
    
    console.log('✅ TRAINING DATA DEBUG: Session found, details:', {
      sessionId: session.id,
      status: session.status,
      processingStatus: session.processingStatus,
      interactionCount: session.interactionCount,
      screenshotCount: session.screenshots?.length || 0,
      enhancedInteractionsLength: Array.isArray(session.enhancedInteractions) ? session.enhancedInteractions.length : 'not array'
    });

    // Generate training data
    console.log('🔄 TRAINING DATA DEBUG: Calling OpenAI service to generate training data...');
    // Parse config from JsonValue to access generatedTask
    const parsedConfig = session.config ? (typeof session.config === 'object' ? session.config as any : JSON.parse(session.config as string)) : null;
    
    console.log('🎯 [PIPELINE DEBUG] Session object being passed to OpenAI service:', {
      sessionId: session.id,
      hasConfig: !!session.config,
      configKeys: parsedConfig ? Object.keys(parsedConfig) : 'none',
      hasGeneratedTask: !!parsedConfig?.generatedTask,
      generatedTaskPreview: parsedConfig?.generatedTask ? {
        title: parsedConfig.generatedTask.title,
        description: parsedConfig.generatedTask.description?.substring(0, 100) + '...'
      } : 'none'
    });
    const trainingData = await this.openaiService.generateTrainingData(session);
    console.log('✅ TRAINING DATA DEBUG: OpenAI training data generation completed:', {
      exampleCount: trainingData.examples?.length || 0,
      messageCount: trainingData.messages?.length || 0,  // Legacy format check
      trainingValue: trainingData.trainingValue,
      hasExamples: !!trainingData.examples,
      hasMessages: !!trainingData.messages,
      dataStructure: Object.keys(trainingData || {})
    });

    // Handle both new format (examples) and legacy format (messages)
    const trainingExamples = trainingData.examples || trainingData.messages || [];
    console.log('📊 TRAINING DATA DEBUG: Using training examples:', {
      count: trainingExamples.length,
      source: trainingData.examples ? 'examples' : (trainingData.messages ? 'messages' : 'none')
    });

    if (trainingExamples.length === 0) {
      console.error('❌ TRAINING DATA DEBUG: No training examples found in result');
      throw new Error('No training examples generated');
    }

    // Save training data
    const jsonlContent = trainingExamples.map((msg: any) => JSON.stringify(msg)).join('\n');
    console.log('📝 TRAINING DATA DEBUG: JSONL content prepared, size:', jsonlContent.length, 'characters');
    
    // Find existing training data for this session
    console.log('🔍 TRAINING DATA DEBUG: Checking for existing training data...');
    const existing = await this.prisma.trainingData.findFirst({
      where: { sessionId }
    });
    
    console.log('🔍 TRAINING DATA DEBUG: Existing training data check result:', {
      hasExisting: !!existing,
      existingId: existing?.id || 'none'
    });
    
    // Calculate training quality/value from the result
    const trainingQuality = trainingData.trainingValue || 
                           trainingData.metadata?.overallQuality || 
                           (trainingExamples.length > 0 ? Math.min(0.8, trainingExamples.length * 0.02) : 0.1);
    
    console.log('📊 TRAINING DATA DEBUG: Training quality calculated:', {
      fromTrainingValue: trainingData.trainingValue,
      fromMetadata: trainingData.metadata?.overallQuality,
      calculated: trainingQuality,
      exampleCount: trainingExamples.length
    });

    console.log('💾 TRAINING DATA DEBUG: Saving training data to database...');
    const trainingRecord = await this.executeWithThrottling(() => 
      existing ? 
      this.prisma.trainingData.update({
        where: { id: existing.id },
        data: {
          jsonlData: jsonlContent,
          fileSize: jsonlContent.length,
          trainingQuality: trainingQuality,
          status: 'PENDING'
        }
      }) :
      this.prisma.trainingData.create({
        data: {
          sessionId,
          jsonlData: jsonlContent,
          fileSize: jsonlContent.length,
          trainingQuality: trainingQuality,
          status: 'PENDING'
        }
      })
    );

    console.log('✅ TRAINING DATA DEBUG: Training data saved successfully:', {
      trainingRecordId: trainingRecord.id,
      sessionId: trainingRecord.sessionId,
      fileSize: trainingRecord.fileSize,
      status: trainingRecord.status,
      trainingQuality: trainingRecord.trainingQuality
    });

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
    try {
      // First check if session exists
      const sessionExists = await this.prisma.unifiedSession.findUnique({
        where: { id: sessionId },
        select: { id: true }
      });

      if (!sessionExists) {
        this.logger.warn('Cannot update processing status - session not found', { 
          sessionId, 
          status,
          error: 'Session record does not exist in database'
        });
        throw new Error(`Session ${sessionId} not found - cannot update status to ${status}`);
      }

      await this.executeWithThrottling(() => 
        this.prisma.unifiedSession.update({
          where: { id: sessionId },
          data: { processingStatus: status as any }
        })
      );

      this.logger.info('Processing status updated', { sessionId, status });

    } catch (error) {
      this.logger.error('Failed to update processing status', error, { sessionId, status });
      throw error;
    }
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