import { PrismaClient } from "@prisma/client";
import { StorageManager } from "./storage-manager-clean";
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
    delay?: number;
}
interface RetentionPolicy {
    name: string;
    description: string;
    retentionPeriod: number;
    conditions: LifecycleCondition[];
    actions: ('delete' | 'archive' | 'anonymize')[];
    enabled: boolean;
}
interface CleanupResult {
    totalFilesProcessed: number;
    filesDeleted: number;
    filesArchived: number;
    spaceSaved: number;
    errors: string[];
    duration: number;
}
export declare class LifecycleManager {
    private prisma;
    private logger;
    private storageManager;
    private s3Storage;
    private lifecyclePolicies;
    private retentionPolicies;
    private executionQueue;
    private isRunning;
    constructor(prisma: PrismaClient, storageManager: StorageManager);
    private initializeDefaultPolicies;
    executeLifecyclePolicies(): Promise<any>;
    private getSessionsForLifecycleProcessing;
    private executePolicyForSessions;
    private evaluateConditions;
    private executeActionsForSession;
    private executeAction;
    private transitionStorage;
    private deleteSession;
    private archiveSession;
    private compressSession;
    private tagSession;
    private notifyLifecycleEvent;
    executeRetentionPolicies(): Promise<CleanupResult>;
    private executeRetentionPolicy;
    private anonymizeSession;
    cleanupTempFiles(): Promise<CleanupResult>;
    private cleanupDirectory;
    monitorStorageCosts(): Promise<any>;
    private generateCostOptimizationRecommendations;
    private compareValues;
    private convertTodays;
    private convertToBytes;
    private startLifecycleProcessor;
    getLifecycleStats(): Promise<any>;
    executePolicy(policyName: string): Promise<any>;
    addLifecyclePolicy(policy: LifecyclePolicy): void;
    addRetentionPolicy(policy: RetentionPolicy): void;
}
export {};
