import { PrismaClient } from "@prisma/client";
import { Logger } from "../utils/logger";
import { StorageManager } from "./storage-manager-clean";
import { S3StorageService } from "./s3-storage";
import * as fs from 'fs/promises';
import * as path from 'path';

interface LifecyclePolicy {
  name: string;
  description: string;
  rules: LifecycleRule[];
  enabled: boolean;
  priority: number;
}

interface LifecycleRule {
  id: string;
  name: string;
  conditions: LifecycleCondition[];
  actions: LifecycleAction[];
  enabled: boolean;
}

interface LifecycleCondition {
  type: 'age' | 'quality_score' | 'training_value' | 'file_size' | 'access_count' | 'storage_class';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number | string;
  unit?: 'days' | 'months' | 'years' | 'bytes' | 'mb' | 'gb';
}

interface LifecycleAction {
  type: 'transition' | 'delete' | 'archive' | 'compress' | 'notify' | 'tag';
  target?: string;
  parameters?: Record<string, any>;
  delay?: number; // days
}

interface LifecycleExecution {
  id: string;
  policyName: string;
  ruleName: string;
  sessionId: string;
  action: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, any>;
}

interface RetentionPolicy {
  name: string;
  description: string;
  retentionPeriod: number; // days
  conditions: LifecycleCondition[];
  actions: ('delete' | 'archive' | 'anonymize')[];
  enabled: boolean;
}

interface CleanupResult {
  totalFilesProcessed: number;
  filesDeleted: number;
  filesArchived: number;
  spaceSaved: number; // bytes
  errors: string[];
  duration: number; // milliseconds
}

export class LifecycleManager {
  private prisma: PrismaClient;
  private logger: Logger;
  private storageManager: StorageManager;
  private s3Storage: S3StorageService;
  
  private lifecyclePolicies: Map<string, LifecyclePolicy> = new Map();
  private retentionPolicies: Map<string, RetentionPolicy> = new Map();
  private executionQueue: LifecycleExecution[] = [];
  private isRunning = false;

  constructor(prisma: PrismaClient, storageManager: StorageManager) {
    this.prisma = prisma;
    this.logger = new Logger("LifecycleManager");
    this.storageManager = storageManager;
    this.s3Storage = new S3StorageService(prisma);

    this.initializeDefaultPolicies();
    this.startLifecycleProcessor();
  }

  private initializeDefaultPolicies() {
    // High-Value Data Policy
    this.lifecyclePolicies.set('high_value_data', {
      name: 'High Value Data',
      description: 'Lifecycle management for high-quality, high-training-value sessions',
      enabled: true,
      priority: 1,
      rules: [
        {
          id: 'hv_transition_to_ia',
          name: 'Transition to Infrequent Access',
          enabled: true,
          conditions: [
            { type: 'age', operator: 'gte', value: 90, unit: 'days' },
            { type: 'quality_score', operator: 'gte', value: 80 },
            { type: 'training_value', operator: 'gte', value: 70 }
          ],
          actions: [
            { type: 'transition', target: 'STANDARD_IA' },
            { type: 'tag', parameters: { LifecycleStage: 'InfrequentAccess' } }
          ]
        },
        {
          id: 'hv_transition_to_glacier',
          name: 'Transition to Glacier',
          enabled: true,
          conditions: [
            { type: 'age', operator: 'gte', value: 365, unit: 'days' },
            { type: 'quality_score', operator: 'gte', value: 80 },
            { type: 'training_value', operator: 'gte', value: 70 }
          ],
          actions: [
            { type: 'transition', target: 'GLACIER' },
            { type: 'tag', parameters: { LifecycleStage: 'LongTermArchive' } }
          ]
        }
      ]
    });

    // Standard Data Policy
    this.lifecyclePolicies.set('standard_data', {
      name: 'Standard Data',
      description: 'Lifecycle management for standard quality sessions',
      enabled: true,
      priority: 2,
      rules: [
        {
          id: 'std_transition_to_ia',
          name: 'Transition to Infrequent Access',
          enabled: true,
          conditions: [
            { type: 'age', operator: 'gte', value: 30, unit: 'days' },
            { type: 'quality_score', operator: 'gte', value: 60 },
            { type: 'quality_score', operator: 'lt', value: 80 }
          ],
          actions: [
            { type: 'transition', target: 'STANDARD_IA' },
            { type: 'tag', parameters: { LifecycleStage: 'InfrequentAccess' } }
          ]
        },
        {
          id: 'std_transition_to_glacier',
          name: 'Transition to Glacier',
          enabled: true,
          conditions: [
            { type: 'age', operator: 'gte', value: 180, unit: 'days' },
            { type: 'quality_score', operator: 'gte', value: 60 }
          ],
          actions: [
            { type: 'transition', target: 'GLACIER' },
            { type: 'tag', parameters: { LifecycleStage: 'LongTermArchive' } }
          ]
        }
      ]
    });

    // Low-Value Data Policy
    this.lifecyclePolicies.set('low_value_data', {
      name: 'Low Value Data',
      description: 'Aggressive lifecycle management for low-quality sessions',
      enabled: true,
      priority: 3,
      rules: [
        {
          id: 'lv_quick_transition',
          name: 'Quick Transition to IA',
          enabled: true,
          conditions: [
            { type: 'age', operator: 'gte', value: 7, unit: 'days' },
            { type: 'quality_score', operator: 'lt', value: 60 }
          ],
          actions: [
            { type: 'transition', target: 'STANDARD_IA' },
            { type: 'tag', parameters: { LifecycleStage: 'InfrequentAccess' } }
          ]
        },
        {
          id: 'lv_glacier_transition',
          name: 'Quick Glacier Transition',
          enabled: true,
          conditions: [
            { type: 'age', operator: 'gte', value: 30, unit: 'days' },
            { type: 'quality_score', operator: 'lt', value: 60 }
          ],
          actions: [
            { type: 'transition', target: 'GLACIER' },
            { type: 'tag', parameters: { LifecycleStage: 'LongTermArchive' } }
          ]
        },
        {
          id: 'lv_deep_archive',
          name: 'Deep Archive for Very Low Value',
          enabled: true,
          conditions: [
            { type: 'age', operator: 'gte', value: 90, unit: 'days' },
            { type: 'quality_score', operator: 'lt', value: 40 },
            { type: 'training_value', operator: 'lt', value: 30 }
          ],
          actions: [
            { type: 'transition', target: 'DEEP_ARCHIVE' },
            { type: 'tag', parameters: { LifecycleStage: 'DeepArchive' } }
          ]
        }
      ]
    });

    // Retention Policies
    this.retentionPolicies.set('gdpr_compliance', {
      name: 'GDPR Compliance',
      description: 'GDPR-compliant data retention (7 years for business records)',
      retentionPeriod: 2555, // 7 years
      enabled: true,
      conditions: [
        { type: 'age', operator: 'gte', value: 2555, unit: 'days' }
      ],
      actions: ['anonymize']
    });

    this.retentionPolicies.set('failed_sessions', {
      name: 'Failed Sessions Cleanup',
      description: 'Clean up failed or incomplete sessions',
      retentionPeriod: 30,
      enabled: true,
      conditions: [
        { type: 'age', operator: 'gte', value: 30, unit: 'days' },
        { type: 'quality_score', operator: 'lt', value: 20 }
      ],
      actions: ['delete']
    });

    this.retentionPolicies.set('temp_files', {
      name: 'Temporary Files Cleanup',
      description: 'Clean up temporary files and incomplete uploads',
      retentionPeriod: 1,
      enabled: true,
      conditions: [
        { type: 'age', operator: 'gte', value: 1, unit: 'days' }
      ],
      actions: ['delete']
    });
  }

  // Main lifecycle execution method
  async executeLifecyclePolicies(): Promise<any> {
    try {
      this.logger.info("Starting lifecycle policy execution");

      const results = {
        policiesExecuted: 0,
        rulesExecuted: 0,
        sessionsProcessed: 0,
        actionsPerformed: 0,
        errors: [] as string[],
        startTime: new Date(),
        endTime: null as Date | null,
        duration: 0
      };

      // Get all sessions that might need lifecycle actions
      const sessions = await this.getSessionsForLifecycleProcessing();

      this.logger.info(`Found ${sessions.length} sessions for lifecycle processing`);

      // Execute policies in priority order
      const sortedPolicies = Array.from(this.lifecyclePolicies.values())
        .filter(policy => policy.enabled)
        .sort((a, b) => a.priority - b.priority);

      for (const policy of sortedPolicies) {
        try {
          const policyResult = await this.executePolicyForSessions(policy, sessions);
          results.policiesExecuted++;
          results.rulesExecuted += policyResult.rulesExecuted;
          results.sessionsProcessed += policyResult.sessionsProcessed;
          results.actionsPerformed += policyResult.actionsPerformed;
        } catch (error) {
          this.logger.error(`Failed to execute policy ${policy.name}`, error);
          results.errors.push(`Policy ${policy.name}: ${(error as Error).message}`);
        }
      }

      results.endTime = new Date();
      results.duration = results.endTime.getTime() - results.startTime.getTime();

      this.logger.info("Lifecycle policy execution completed", {
        policiesExecuted: results.policiesExecuted,
        rulesExecuted: results.rulesExecuted,
        sessionsProcessed: results.sessionsProcessed,
        actionsPerformed: results.actionsPerformed,
        duration: results.duration,
        errors: results.errors.length
      });

      return results;

    } catch (error) {
      this.logger.error("Lifecycle policy execution failed", error);
      throw error;
    }
  }

  // Get sessions that need lifecycle processing
  private async getSessionsForLifecycleProcessing(): Promise<any[]> {
    // Get sessions older than 1 day that haven't been processed recently
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 1);

    return await this.prisma.unifiedSession.findMany({
      where: {
        createdAt: { lt: cutoffDate },
        status: { in: ['COMPLETED', 'ARCHIVED'] }
      },
      include: {
        archives: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  // Execute a specific policy for a set of sessions
  private async executePolicyForSessions(policy: LifecyclePolicy, sessions: any[]): Promise<any> {
    const result = {
      rulesExecuted: 0,
      sessionsProcessed: 0,
      actionsPerformed: 0
    };

    for (const rule of policy.rules.filter(r => r.enabled)) {
      const matchingSessions = sessions.filter(session => 
        this.evaluateConditions(rule.conditions, session)
      );

      if (matchingSessions.length > 0) {
        this.logger.debug(`Rule ${rule.name} matches ${matchingSessions.length} sessions`);

        for (const session of matchingSessions) {
          try {
            await this.executeActionsForSession(rule.actions, session, policy.name, rule.name);
            result.sessionsProcessed++;
            result.actionsPerformed += rule.actions.length;
          } catch (error) {
            this.logger.error(`Failed to execute actions for session ${session.id}`, error);
          }
        }

        result.rulesExecuted++;
      }
    }

    return result;
  }

  // Evaluate lifecycle conditions for a session
  private evaluateConditions(conditions: LifecycleCondition[], session: any): boolean {
    return conditions.every(condition => {
      switch (condition.type) {
        case 'age':
          const ageInDays = (Date.now() - new Date(session.createdAt).getTime()) / (1000 * 60 * 60 * 24);
          const targetAge = this.convertTodays(condition.value as number, condition.unit || 'days');
          return this.compareValues(ageInDays, condition.operator, targetAge);

        case 'quality_score':
          return this.compareValues(session.qualityScore || 0, condition.operator, condition.value as number);

        case 'training_value':
          return this.compareValues(session.trainingValue || 0, condition.operator, condition.value as number);

        case 'file_size':
          const archiveSize = session.archives?.[0]?.fileSize ? Number(session.archives[0].fileSize) : 0;
          const targetSize = this.convertToBytes(condition.value as number, condition.unit || 'bytes');
          return this.compareValues(archiveSize, condition.operator, targetSize);

        default:
          return false;
      }
    });
  }

  // Execute actions for a specific session
  private async executeActionsForSession(
    actions: LifecycleAction[], 
    session: any, 
    policyName: string, 
    ruleName: string
  ): Promise<void> {
    for (const action of actions) {
      const execution: LifecycleExecution = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        policyName,
        ruleName,
        sessionId: session.id,
        action: action.type,
        status: 'pending',
        startedAt: new Date()
      };

      try {
        execution.status = 'running';
        await this.executeAction(action, session);
        execution.status = 'completed';
        execution.completedAt = new Date();

        this.logger.debug("Lifecycle action executed", {
          sessionId: session.id,
          action: action.type,
          policyName,
          ruleName
        });

      } catch (error) {
        execution.status = 'failed';
        execution.error = (error as Error).message;
        execution.completedAt = new Date();

        this.logger.error("Lifecycle action failed", error, {
          sessionId: session.id,
          action: action.type,
          policyName,
          ruleName
        });
      }

      // Store execution record (in a real implementation, you'd save this to database)
      this.executionQueue.push(execution);
    }
  }

  // Execute a specific lifecycle action
  private async executeAction(action: LifecycleAction, session: any): Promise<void> {
    switch (action.type) {
      case 'transition':
        await this.transitionStorage(session, action.target!);
        break;

      case 'delete':
        await this.deleteSession(session);
        break;

      case 'archive':
        await this.archiveSession(session);
        break;

      case 'compress':
        await this.compressSession(session);
        break;

      case 'tag':
        await this.tagSession(session, action.parameters || {});
        break;

      case 'notify':
        await this.notifyLifecycleEvent(session, action);
        break;

      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }
  
  // Action implementations
  private async transitionStorage(session: any, targetStorageClass: string): Promise<void> {
    if (session.archives?.[0]?.s3Key) {
      // In a real implementation, you would use S3 API to change storage class
      // For now, we'll just update the database record
      await this.prisma.sessionArchive.updateMany({
        where: { sessionId: session.id },
        data: {
          // Add storage class tracking in a real implementation
        }
      });

      this.logger.info("Storage class transitioned", {
        sessionId: session.id,
        targetClass: targetStorageClass
      });
    }
  }

  private async deleteSession(session: any): Promise<void> {
    // Delete from S3 if exists
    if (session.archives?.[0]?.s3Key) {
      try {
        await this.s3Storage.deleteArchive(session.id);
      } catch (error) {
        this.logger.warn("Failed to delete from S3", { sessionId: session.id, error });
      }
    }

    // Delete database records
    await this.prisma.psychologyProfile.deleteMany({ where: { sessionId: session.id } });
    await this.prisma.contextEnhancement.deleteMany({ where: { sessionId: session.id } });
    await this.prisma.trainingData.deleteMany({ where: { sessionId: session.id } });
    await this.prisma.sessionArchive.deleteMany({ where: { sessionId: session.id } });
    await this.prisma.screenshot.deleteMany({ where: { sessionId: session.id } });
    await this.prisma.interaction.deleteMany({ where: { sessionId: session.id } });
    await this.prisma.unifiedSession.delete({ where: { id: session.id } });

    this.logger.info("Session deleted", { sessionId: session.id });
  }

  private async archiveSession(session: any): Promise<void> {
    if (!session.archives?.[0]) {
      // Create archive if it doesn't exist
      await this.storageManager.createSessionArchive(session.id);
      this.logger.info("Session archived", { sessionId: session.id });
    }
  }

  private async compressSession(session: any): Promise<void> {
    // In a real implementation, you might re-compress with higher compression
    this.logger.info("Session compression requested", { sessionId: session.id });
  }

  private async tagSession(session: any, tags: Record<string, any>): Promise<void> {
    // Update session with lifecycle tags
    const currentInsights = session.contextualInsights ? 
      JSON.parse(session.contextualInsights) : {};
    
    currentInsights.lifecycleTags = {
      ...currentInsights.lifecycleTags,
      ...tags,
      lastUpdated: new Date().toISOString()
    };

    await this.prisma.unifiedSession.update({
      where: { id: session.id },
      data: {
        contextualInsights: JSON.stringify(currentInsights)
      }
    });

    this.logger.debug("Session tagged", { sessionId: session.id, tags });
  }

  private async notifyLifecycleEvent(session: any, action: LifecycleAction): Promise<void> {
    // In a real implementation, you might send notifications via email, Slack, etc.
    this.logger.info("Lifecycle notification", {
      sessionId: session.id,
      event: action.parameters?.event || 'lifecycle_action',
      message: action.parameters?.message || 'Lifecycle action performed'
    });
  }

  // Retention policy execution
  async executeRetentionPolicies(): Promise<CleanupResult> {
    try {
      this.logger.info("Starting retention policy execution");

      const result: CleanupResult = {
        totalFilesProcessed: 0,
        filesDeleted: 0,
        filesArchived: 0,
        spaceSaved: 0,
        errors: [],
        duration: 0
      };

      const startTime = Date.now();

      for (const [policyName, policy] of this.retentionPolicies) {
        if (!policy.enabled) continue;

        try {
          const policyResult = await this.executeRetentionPolicy(policy);
          result.totalFilesProcessed += policyResult.totalFilesProcessed;
          result.filesDeleted += policyResult.filesDeleted;
          result.filesArchived += policyResult.filesArchived;
          result.spaceSaved += policyResult.spaceSaved;
        } catch (error) {
          this.logger.error(`Failed to execute retention policy ${policyName}`, error);
          result.errors.push(`Policy ${policyName}: ${(error as Error).message}`);
        }
      }

      result.duration = Date.now() - startTime;

      this.logger.info("Retention policy execution completed", {
        totalFilesProcessed: result.totalFilesProcessed,
        filesDeleted: result.filesDeleted,
        filesArchived: result.filesArchived,
        spaceSavedMB: Math.round(result.spaceSaved / (1024 * 1024)),
        duration: result.duration,
        errors: result.errors.length
      });

      return result;

    } catch (error) {
      this.logger.error("Retention policy execution failed", error);
      throw error;
    }
  }

  // Execute a specific retention policy
  private async executeRetentionPolicy(policy: RetentionPolicy): Promise<CleanupResult> {
    const result: CleanupResult = {
      totalFilesProcessed: 0,
      filesDeleted: 0,
      filesArchived: 0,
      spaceSaved: 0,
      errors: [],
      duration: 0
    };

    // Find sessions matching retention criteria
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriod);

    const sessions = await this.prisma.unifiedSession.findMany({
      where: {
        createdAt: { lt: cutoffDate }
      },
      include: {
        archives: true
      }
    });

    const matchingSessions = sessions.filter(session => 
      this.evaluateConditions(policy.conditions, session)
    );

    result.totalFilesProcessed = matchingSessions.length;

    for (const session of matchingSessions) {
      try {
        const archiveSize = session.archives?.[0]?.fileSize ? 
          Number(session.archives[0].fileSize) : 0;

        for (const action of policy.actions) {
          switch (action) {
            case 'delete':
              await this.deleteSession(session);
              result.filesDeleted++;
              result.spaceSaved += archiveSize;
              break;

            case 'archive':
              if (!session.archives?.[0]) {
                await this.archiveSession(session);
                result.filesArchived++;
              }
              break;

            case 'anonymize':
              await this.anonymizeSession(session);
              break;
          }
        }
      } catch (error) {
        result.errors.push(`Session ${session.id}: ${(error as Error).message}`);
      }
    }

    return result;
  }

  // Anonymize session data for compliance
  private async anonymizeSession(session: any): Promise<void> {
    // Remove or hash PII data
    await this.prisma.unifiedSession.update({
      where: { id: session.id },
      data: {
        workerId: null,
        userAgent: null,
        ipAddress: null,
        config: JSON.stringify({ anonymized: true })
      }
    });

    // Anonymize interaction data
    await this.prisma.interaction.updateMany({
      where: { sessionId: session.id },
      data: {
        userIntent: null,
        userReasoning: null,
        visualCues: JSON.stringify([])
      }
    });

    this.logger.info("Session anonymized", { sessionId: session.id });
  }

  // Automated cleanup of temporary files
  async cleanupTempFiles(): Promise<CleanupResult> {
    try {
      this.logger.info("Starting temporary files cleanup");

      const result: CleanupResult = {
        totalFilesProcessed: 0,
        filesDeleted: 0,
        filesArchived: 0,
        spaceSaved: 0,
        errors: [],
        duration: 0
      };

      const startTime = Date.now();

      // Clean up storage manager temp files
      await this.storageManager.cleanupTempFiles();

      // Clean up old processing files
      const tempDirs = [
        process.env.TEMP_DIR || '/tmp/codesight',
        '/tmp/codesight-processing',
        '/tmp/codesight-uploads'
      ];

      for (const tempDir of tempDirs) {
        try {
          const cleanupResult = await this.cleanupDirectory(tempDir, 24); // 24 hours
          result.totalFilesProcessed += cleanupResult.totalFilesProcessed;
          result.filesDeleted += cleanupResult.filesDeleted;
          result.spaceSaved += cleanupResult.spaceSaved;
        } catch (error) {
          result.errors.push(`Directory ${tempDir}: ${(error as Error).message}`);
        }
      }

      result.duration = Date.now() - startTime;

      this.logger.info("Temporary files cleanup completed", {
        totalFilesProcessed: result.totalFilesProcessed,
        filesDeleted: result.filesDeleted,
        spaceSavedMB: Math.round(result.spaceSaved / (1024 * 1024)),
        duration: result.duration,
        errors: result.errors.length
      });

      return result;

    } catch (error) {
      this.logger.error("Temporary files cleanup failed", error);
      throw error;
    }
  }

  // Clean up a specific directory
  private async cleanupDirectory(dirPath: string, maxAgeHours: number): Promise<CleanupResult> {
    const result: CleanupResult = {
      totalFilesProcessed: 0,
      filesDeleted: 0,
      filesArchived: 0,
      spaceSaved: 0,
      errors: [],
      duration: 0
    };

    try {
      const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        
        try {
          const stats = await fs.stat(filePath);
          result.totalFilesProcessed++;

          if (stats.mtime.getTime() < cutoffTime) {
            await fs.rm(filePath, { recursive: true, force: true });
            result.filesDeleted++;
            result.spaceSaved += stats.size;
          }
        } catch (error) {
          result.errors.push(`File ${filePath}: ${(error as Error).message}`);
        }
      }
    } catch (error) {
      if ((error as any).code !== 'ENOENT') { // Directory doesn't exist is OK
        throw error;
      }
    }

    return result;
  }

  // Storage cost monitoring
  async monitorStorageCosts(): Promise<any> {
    try {
      this.logger.info("Starting storage cost monitoring");

      const [storageStats, costAnalysis] = await Promise.all([
        this.storageManager.getStorageStats(),
        this.storageManager.getStorageCostAnalysis()
      ]);

      // Calculate cost trends
      const currentMonth = new Date().getMonth();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;

      // Get archives created this month vs last month
      const thisMonthStart = new Date();
      thisMonthStart.setDate(1);
      thisMonthStart.setHours(0, 0, 0, 0);

      const lastMonthStart = new Date(thisMonthStart);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);

      const [thisMonthArchives, lastMonthArchives] = await Promise.all([
        this.prisma.sessionArchive.aggregate({
          where: { createdAt: { gte: thisMonthStart } },
          _sum: { fileSize: true },
          _count: true
        }),
        this.prisma.sessionArchive.aggregate({
          where: { 
            createdAt: { 
              gte: lastMonthStart,
              lt: thisMonthStart
            }
          },
          _sum: { fileSize: true },
          _count: true
        })
      ]);

      const thisMonthSize = Number(thisMonthArchives._sum.fileSize || 0);
      const lastMonthSize = Number(lastMonthArchives._sum.fileSize || 0);
      const growthRate = lastMonthSize > 0 ? 
        ((thisMonthSize - lastMonthSize) / lastMonthSize) * 100 : 0;

      // Generate cost alerts
      const alerts = [];
      if (growthRate > 50) {
        alerts.push({
          type: 'high_growth',
          message: `Storage growth rate is ${Math.round(growthRate)}% this month`,
          severity: 'warning'
        });
      }

      if (costAnalysis.estimatedMonthlyCosts?.standard > 100) {
        alerts.push({
          type: 'high_cost',
          message: `Estimated monthly storage cost is $${costAnalysis.estimatedMonthlyCosts.standard}`,
          severity: 'info'
        });
      }

      const costMonitoring = {
        currentPeriod: {
          archives: thisMonthArchives._count,
          sizeGB: Math.round(thisMonthSize / (1024 * 1024 * 1024) * 100) / 100,
          estimatedCost: Math.round(thisMonthSize / (1024 * 1024 * 1024) * 0.023 * 100) / 100
        },
        previousPeriod: {
          archives: lastMonthArchives._count,
          sizeGB: Math.round(lastMonthSize / (1024 * 1024 * 1024) * 100) / 100,
          estimatedCost: Math.round(lastMonthSize / (1024 * 1024 * 1024) * 0.023 * 100) / 100
        },
        trends: {
          growthRate: Math.round(growthRate * 100) / 100,
          archiveGrowth: thisMonthArchives._count - lastMonthArchives._count
        },
        optimization: costAnalysis,
        alerts,
        recommendations: this.generateCostOptimizationRecommendations(costAnalysis, growthRate)
      };

      this.logger.info("Storage cost monitoring completed", {
        currentCost: costMonitoring.currentPeriod.estimatedCost,
        growthRate: costMonitoring.trends.growthRate,
        alerts: alerts.length
      });

      return costMonitoring;

    } catch (error) {
      this.logger.error("Storage cost monitoring failed", error);
      throw error;
    }
  }

  // Generate cost optimization recommendations
  private generateCostOptimizationRecommendations(costAnalysis: any, growthRate: number): string[] {
    const recommendations = [];

    if (growthRate > 30) {
      recommendations.push("Consider implementing more aggressive lifecycle policies due to high growth rate");
    }

    if (costAnalysis.potentialSavings?.glacierVsStandard > 20) {
      recommendations.push(`Potential savings of $${costAnalysis.potentialSavings.glacierVsStandard}/month by moving old data to Glacier`);
    }

    if (costAnalysis.averageCompressionRatio > 0.7) {
      recommendations.push("Compression ratio could be improved - consider additional compression techniques");
    }

    if (costAnalysis.totalSizeGB > 1000) {
      recommendations.push("Large storage volume detected - consider implementing data deduplication");
    }

    return recommendations;
  }

  // Utility methods
  private compareValues(actual: number, operator: string, expected: number): boolean {
    switch (operator) {
      case 'gt': return actual > expected;
      case 'gte': return actual >= expected;
      case 'lt': return actual < expected;
      case 'lte': return actual <= expected;
      case 'eq': return actual === expected;
      default: return false;
    }
  }

  private convertTodays(value: number, unit: string): number {
    switch (unit) {
      case 'days': return value;
      case 'months': return value * 30;
      case 'years': return value * 365;
      default: return value;
    }
  }

  private convertToBytes(value: number, unit: string): number {
    switch (unit) {
      case 'bytes': return value;
      case 'mb': return value * 1024 * 1024;
      case 'gb': return value * 1024 * 1024 * 1024;
      default: return value;
    }
  }

  // Start the lifecycle processor
  private startLifecycleProcessor(): void {
    // Run lifecycle policies every 6 hours
    setInterval(async () => {
      if (!this.isRunning) {
        this.isRunning = true;
        try {
          await this.executeLifecyclePolicies();
          await this.executeRetentionPolicies();
          await this.cleanupTempFiles();
        } catch (error) {
          this.logger.error("Scheduled lifecycle execution failed", error);
        } finally {
          this.isRunning = false;
        }
      }
    }, 6 * 60 * 60 * 1000); // 6 hours

    // Run temp file cleanup every hour
    setInterval(async () => {
      try {
        await this.cleanupTempFiles();
      } catch (error) {
        this.logger.error("Scheduled temp cleanup failed", error);
      }
    }, 60 * 60 * 1000); // 1 hour

    this.logger.info("Lifecycle processor started");
  }

  // Get lifecycle statistics
  async getLifecycleStats(): Promise<any> {
    const recentExecutions = this.executionQueue
      .filter(exec => exec.startedAt.getTime() > Date.now() - (24 * 60 * 60 * 1000))
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    const stats = {
      policies: {
        total: this.lifecyclePolicies.size,
        enabled: Array.from(this.lifecyclePolicies.values()).filter(p => p.enabled).length
      },
      retentionPolicies: {
        total: this.retentionPolicies.size,
        enabled: Array.from(this.retentionPolicies.values()).filter(p => p.enabled).length
      },
      recentExecutions: {
        total: recentExecutions.length,
        completed: recentExecutions.filter(e => e.status === 'completed').length,
        failed: recentExecutions.filter(e => e.status === 'failed').length,
        running: recentExecutions.filter(e => e.status === 'running').length
      },
      isRunning: this.isRunning
    };

    return stats;
  }

  // Manual policy execution
  async executePolicy(policyName: string): Promise<any> {
    const policy = this.lifecyclePolicies.get(policyName);
    if (!policy) {
      throw new Error(`Policy ${policyName} not found`);
    }

    const sessions = await this.getSessionsForLifecycleProcessing();
    return await this.executePolicyForSessions(policy, sessions);
  }

  // Add custom lifecycle policy
  addLifecyclePolicy(policy: LifecyclePolicy): void {
    this.lifecyclePolicies.set(policy.name, policy);
    this.logger.info("Lifecycle policy added", { policyName: policy.name });
  }

  // Add custom retention policy
  addRetentionPolicy(policy: RetentionPolicy): void {
    this.retentionPolicies.set(policy.name, policy);
    this.logger.info("Retention policy added", { policyName: policy.name });
  }
}