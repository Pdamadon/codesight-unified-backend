interface MigrationConfig {
    sourceDatabase: string;
    targetDatabase: string;
    batchSize: number;
    validateData: boolean;
    dryRun: boolean;
}
interface MigrationResult {
    success: boolean;
    migratedSessions: number;
    migratedInteractions: number;
    errors: string[];
    warnings: string[];
    duration: number;
}
export declare class DataMigrationService {
    private sourceDb;
    private targetDb;
    private logger;
    constructor(config: MigrationConfig);
    migrateAllData(config: MigrationConfig): Promise<MigrationResult>;
    private validateSourceData;
    private migrateSessions;
    private convertToUnifiedSession;
    private migrateInteractions;
    private convertToUnifiedInteraction;
    private calculateQualityScore;
    private calculateCompleteness;
    private calculateReliability;
    private calculateDuration;
    private mapSessionStatus;
    private mapInteractionType;
    private validateMigratedData;
    cleanup(): Promise<void>;
}
export declare function runMigration(): Promise<void>;
export {};
