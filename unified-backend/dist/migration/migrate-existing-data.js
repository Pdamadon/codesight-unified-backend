"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataMigrationService = void 0;
exports.runMigration = runMigration;
const client_1 = require("@prisma/client");
const pg_1 = require("pg");
const logger_1 = require("../utils/logger");
class DataMigrationService {
    sourceDb;
    targetDb;
    logger;
    constructor(config) {
        this.sourceDb = new pg_1.Pool({ connectionString: config.sourceDatabase });
        this.targetDb = new client_1.PrismaClient({ datasourceUrl: config.targetDatabase });
        this.logger = new logger_1.Logger('DataMigration');
    }
    async migrateAllData(config) {
        const startTime = Date.now();
        const result = {
            success: false,
            migratedSessions: 0,
            migratedInteractions: 0,
            errors: [],
            warnings: [],
            duration: 0
        };
        try {
            this.logger.info('Starting data migration', { config });
            // Step 1: Validate source data
            if (config.validateData) {
                await this.validateSourceData();
            }
            // Step 2: Migrate sessions
            const sessionResult = await this.migrateSessions(config);
            result.migratedSessions = sessionResult.count;
            result.errors.push(...sessionResult.errors);
            result.warnings.push(...sessionResult.warnings);
            // Step 3: Migrate interactions (from extension data)
            const interactionResult = await this.migrateInteractions(config);
            result.migratedInteractions = interactionResult.count;
            result.errors.push(...interactionResult.errors);
            // Step 4: Validate migrated data
            if (config.validateData) {
                await this.validateMigratedData();
            }
            result.success = result.errors.length === 0;
            result.duration = Date.now() - startTime;
            this.logger.info('Migration completed', { result });
            return result;
        }
        catch (error) {
            this.logger.error('Migration failed', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            result.errors.push(`Migration failed: ${errorMessage}`);
            result.duration = Date.now() - startTime;
            return result;
        }
    }
    async validateSourceData() {
        this.logger.info('Validating source data...');
        // Check source tables exist
        const tables = await this.sourceDb.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('sessions', 'workers')
    `);
        if (tables.rows.length < 2) {
            throw new Error('Source database missing required tables');
        }
        // Check data counts
        const sessionCount = await this.sourceDb.query('SELECT COUNT(*) FROM sessions');
        const workerCount = await this.sourceDb.query('SELECT COUNT(*) FROM workers');
        this.logger.info('Source data validation complete', {
            sessions: sessionCount.rows[0].count,
            workers: workerCount.rows[0].count
        });
    }
    async migrateSessions(config) {
        this.logger.info('Migrating sessions...');
        const errors = [];
        const warnings = [];
        let migratedCount = 0;
        try {
            // Get all sessions from source database
            const sourceSessions = await this.sourceDb.query(`
        SELECT 
          s.id,
          s.worker_id,
          s.session_data,
          s.video_url,
          s.audio_url,
          s.transcription,
          s.analysis,
          s.status,
          s.created_at,
          s.updated_at,
          w.email,
          w.demographics,
          w.tech_setup
        FROM sessions s
        LEFT JOIN workers w ON s.worker_id = w.worker_id
        ORDER BY s.created_at
      `);
            // Process sessions in batches
            for (let i = 0; i < sourceSessions.rows.length; i += config.batchSize) {
                const batch = sourceSessions.rows.slice(i, i + config.batchSize);
                for (const sourceSession of batch) {
                    try {
                        const unifiedSession = await this.convertToUnifiedSession(sourceSession);
                        if (!config.dryRun) {
                            await this.targetDb.unifiedSession.create({
                                data: unifiedSession
                            });
                        }
                        migratedCount++;
                    }
                    catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        errors.push(`Failed to migrate session ${sourceSession.id}: ${errorMessage}`);
                    }
                }
                this.logger.info(`Migrated batch ${Math.floor(i / config.batchSize) + 1}`, {
                    processed: Math.min(i + config.batchSize, sourceSessions.rows.length),
                    total: sourceSessions.rows.length
                });
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(`Session migration failed: ${errorMessage}`);
        }
        return { count: migratedCount, errors, warnings };
    }
    async convertToUnifiedSession(sourceSession) {
        const sessionData = sourceSession.session_data || {};
        const analysis = sourceSession.analysis || {};
        // Calculate quality scores based on available data
        const qualityScore = this.calculateQualityScore(sourceSession);
        const completeness = this.calculateCompleteness(sourceSession);
        const reliability = this.calculateReliability(sourceSession);
        return {
            id: sourceSession.id.toString(),
            type: 'HUMAN', // All existing sessions are human-generated
            status: this.mapSessionStatus(sourceSession.status),
            startTime: sourceSession.created_at,
            endTime: sourceSession.updated_at,
            duration: this.calculateDuration(sourceSession),
            // Archive URLs (will be populated during archive creation)
            archiveUrl: null,
            trainingFileId: null,
            modelId: null,
            // Quality metrics
            qualityScore,
            completeness,
            reliability,
            trainingValue: qualityScore * 0.8, // Estimate training value
            // Processing status
            processingStatus: 'COMPLETED', // Existing sessions are considered processed
            processingSteps: JSON.stringify([
                { step: 'data_collection', status: 'completed', timestamp: sourceSession.created_at },
                { step: 'migration', status: 'completed', timestamp: new Date() }
            ]),
            processingErrors: JSON.stringify([]),
            // Configuration
            config: JSON.stringify({
                migrated: true,
                originalFormat: 'crowdsource_v1',
                hasVideo: !!sourceSession.video_url,
                hasAudio: !!sourceSession.audio_url,
                hasTranscription: !!sourceSession.transcription
            }),
            // User information
            workerId: sourceSession.worker_id,
            userAgent: sessionData.userAgent || null,
            ipAddress: sessionData.ipAddress || null,
            // Training results (will be populated later)
            trainingMetrics: null,
            modelPerformance: null
        };
    }
    async migrateInteractions(config) {
        this.logger.info('Migrating interactions from session data...');
        const errors = [];
        let migratedCount = 0;
        try {
            // Get sessions with interaction data
            const sessionsWithData = await this.sourceDb.query(`
        SELECT id, session_data, analysis
        FROM sessions 
        WHERE session_data IS NOT NULL 
        AND session_data::text LIKE '%events%'
      `);
            for (const session of sessionsWithData.rows) {
                try {
                    const sessionData = session.session_data;
                    const events = sessionData.events || [];
                    for (const event of events) {
                        const interaction = await this.convertToUnifiedInteraction(session.id, event);
                        if (!config.dryRun) {
                            await this.targetDb.interaction.create({
                                data: interaction
                            });
                        }
                        migratedCount++;
                    }
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    errors.push(`Failed to migrate interactions for session ${session.id}: ${errorMessage}`);
                }
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            errors.push(`Interaction migration failed: ${errorMessage}`);
        }
        return { count: migratedCount, errors };
    }
    async convertToUnifiedInteraction(sessionId, event) {
        const data = event.data || {};
        return {
            sessionId: sessionId.toString(),
            type: this.mapInteractionType(event.type),
            timestamp: BigInt(data.timestamp || Date.now()),
            sessionTime: data.sessionTime || 0,
            // Selector information
            primarySelector: data.selector || data.element || 'unknown',
            selectorAlternatives: JSON.stringify(data.selectors?.alternatives || []),
            xpath: data.xpath || null,
            cssPath: data.cssPath || null,
            // Element details
            elementTag: data.element || 'unknown',
            elementText: data.text || null,
            elementValue: data.value || null,
            elementAttributes: JSON.stringify(data.attributes || {}),
            // Coordinates
            clientX: data.coordinates?.clientX || data.clientX || null,
            clientY: data.coordinates?.clientY || data.clientY || null,
            pageX: data.coordinates?.pageX || data.pageX || null,
            pageY: data.coordinates?.pageY || data.pageY || null,
            // Visual context
            boundingBox: JSON.stringify(data.boundingBox || {}),
            viewport: JSON.stringify(data.viewport || {}),
            isInViewport: data.isInViewport || false,
            percentVisible: data.percentVisible || 0,
            // Page context
            url: data.url || 'unknown',
            pageTitle: data.pageTitle || '',
            pageStructure: JSON.stringify(data.pageStructure || {}),
            // DOM context
            parentElements: JSON.stringify(data.context?.parentElements || []),
            siblingElements: JSON.stringify(data.context?.siblings || []),
            nearbyElements: JSON.stringify(data.context?.nearbyElements || []),
            // State information
            stateBefore: JSON.stringify(data.state?.before || {}),
            stateAfter: JSON.stringify(data.state?.after || {}),
            stateChanges: JSON.stringify(data.state?.changes || {}),
            // Quality metrics
            confidence: data.confidence || 0.5,
            selectorReliability: JSON.stringify(data.selectorReliability || {}),
            // User intent (to be populated by vision analysis)
            userIntent: null,
            userReasoning: null,
            visualCues: JSON.stringify([])
        };
    }
    calculateQualityScore(session) {
        let score = 0;
        // Base score for having session data
        if (session.session_data)
            score += 20;
        // Audio recording bonus
        if (session.audio_url)
            score += 25;
        // Video recording bonus (legacy)
        if (session.video_url)
            score += 20;
        // Transcription bonus
        if (session.transcription)
            score += 15;
        // Analysis data bonus
        if (session.analysis)
            score += 10;
        // Session duration bonus
        const duration = this.calculateDuration(session);
        if (duration > 300)
            score += 10; // 5+ minutes
        return Math.min(score, 100);
    }
    calculateCompleteness(session) {
        let completeness = 0;
        const sessionData = session.session_data || {};
        // Check for required fields
        if (sessionData.events && sessionData.events.length > 0)
            completeness += 40;
        if (session.audio_url)
            completeness += 30;
        if (session.transcription)
            completeness += 20;
        if (sessionData.summary)
            completeness += 10;
        return Math.min(completeness, 100);
    }
    calculateReliability(session) {
        // Base reliability score
        let reliability = 60;
        const sessionData = session.session_data || {};
        const events = sessionData.events || [];
        // More events = higher reliability
        if (events.length > 10)
            reliability += 20;
        else if (events.length > 5)
            reliability += 10;
        // Consistent data structure
        const hasConsistentData = events.every((e) => e.data && e.data.timestamp);
        if (hasConsistentData)
            reliability += 20;
        return Math.min(reliability, 100);
    }
    calculateDuration(session) {
        if (session.updated_at && session.created_at) {
            return Math.floor((new Date(session.updated_at).getTime() - new Date(session.created_at).getTime()) / 1000);
        }
        return 0;
    }
    mapSessionStatus(status) {
        const statusMap = {
            'pending': 'ACTIVE',
            'active': 'ACTIVE',
            'completed': 'COMPLETED',
            'processing': 'PROCESSING',
            'failed': 'FAILED'
        };
        return statusMap[status] || 'COMPLETED';
    }
    mapInteractionType(type) {
        const typeMap = {
            'click': 'CLICK',
            'input': 'INPUT',
            'scroll': 'SCROLL',
            'navigation': 'NAVIGATION',
            'hover': 'HOVER',
            'focus': 'FOCUS',
            'blur': 'BLUR',
            'submit': 'FORM_SUBMIT',
            'keypress': 'KEY_PRESS',
            'drag': 'DRAG',
            'drop': 'DROP'
        };
        return typeMap[type] || 'CLICK';
    }
    async validateMigratedData() {
        this.logger.info('Validating migrated data...');
        // Check session counts
        const sessionCount = await this.targetDb.unifiedSession.count();
        const interactionCount = await this.targetDb.interaction.count();
        // Check data integrity
        const orphanedInteractions = await this.targetDb.interaction.count({
            where: {
                sessionId: ""
            }
        });
        if (orphanedInteractions > 0) {
            throw new Error(`Found ${orphanedInteractions} orphaned interactions`);
        }
        this.logger.info('Data validation complete', {
            sessions: sessionCount,
            interactions: interactionCount,
            orphanedInteractions
        });
    }
    async cleanup() {
        await this.sourceDb.end();
        await this.targetDb.$disconnect();
    }
}
exports.DataMigrationService = DataMigrationService;
// CLI script for running migration
async function runMigration() {
    const config = {
        sourceDatabase: process.env.SOURCE_DATABASE_URL || '',
        targetDatabase: process.env.DATABASE_URL || '',
        batchSize: parseInt(process.env.MIGRATION_BATCH_SIZE || '100'),
        validateData: process.env.VALIDATE_DATA === 'true',
        dryRun: process.env.DRY_RUN === 'true'
    };
    const migrationService = new DataMigrationService(config);
    try {
        const result = await migrationService.migrateAllData(config);
        console.log('Migration Result:', JSON.stringify(result, null, 2));
        if (result.success) {
            console.log('✅ Migration completed successfully');
            process.exit(0);
        }
        else {
            console.log('❌ Migration completed with errors');
            process.exit(1);
        }
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
    finally {
        await migrationService.cleanup();
    }
}
// Run migration if called directly
if (require.main === module) {
    runMigration();
}
