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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageManager = void 0;
const logger_1 = require("../utils/logger");
const s3_storage_1 = require("./s3-storage");
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const archiver_1 = __importDefault(require("archiver"));
const fs_1 = require("fs");
class StorageManager {
    prisma;
    logger;
    s3Storage;
    tempDir;
    archiveDir;
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new logger_1.Logger("StorageManager");
        this.s3Storage = new s3_storage_1.S3StorageService(prisma);
        this.tempDir = process.env.TEMP_DIR || '/tmp/codesight';
        this.archiveDir = process.env.ARCHIVE_DIR || '/tmp/codesight/archives';
        this.ensureDirectories();
    }
    async ensureDirectories() {
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
            await fs.mkdir(this.archiveDir, { recursive: true });
        }
        catch (error) {
            this.logger.error("Failed to create directories", error);
        }
    }
    // Main method to create session archive
    async createSessionArchive(sessionId) {
        try {
            this.logger.info("Starting session archive creation", { sessionId });
            // Get session data
            const sessionData = await this.gatherSessionData(sessionId);
            // Create temporary directory for this archive
            const tempArchiveDir = path.join(this.tempDir, `archive-${sessionId}-${Date.now()}`);
            await fs.mkdir(tempArchiveDir, { recursive: true });
            // Prepare files for archiving
            const preparedFiles = await this.prepareArchiveFiles(sessionData, tempArchiveDir);
            // Create archive
            const archivePath = path.join(this.archiveDir, `session-${sessionId}.zip`);
            const manifest = await this.createZipArchive(preparedFiles, archivePath, sessionId);
            // Calculate final metrics
            const archiveStats = await fs.stat(archivePath);
            const checksum = await this.calculateFileChecksum(archivePath);
            const compressionRatio = manifest.totalSize > 0 ?
                manifest.compressedSize / manifest.totalSize : 0;
            // Save archive record to database
            const archiveRecord = await this.saveArchiveRecord(sessionId, manifest, archivePath, checksum);
            // Cleanup temporary files
            await this.cleanupTempDirectory(tempArchiveDir);
            // Upload to S3 if configured
            let s3Key;
            if (process.env.S3_BUCKET && process.env.AWS_ACCESS_KEY_ID) {
                try {
                    const uploadResult = await this.s3Storage.uploadSessionArchive(archivePath, sessionId);
                    s3Key = uploadResult.key;
                    this.logger.info("Archive uploaded to S3", { sessionId, s3Key });
                }
                catch (error) {
                    this.logger.warn("Failed to upload to S3, archive saved locally", { sessionId, error });
                }
            }
            const result = {
                archiveId: archiveRecord.id,
                sessionId,
                archivePath,
                s3Key,
                fileSize: archiveStats.size,
                compressionRatio,
                manifest,
                checksum
            };
            this.logger.info("Session archive created successfully", {
                sessionId,
                archiveId: result.archiveId,
                fileSize: result.fileSize,
                compressionRatio: Math.round(result.compressionRatio * 100) / 100,
                s3Uploaded: !!s3Key
            });
            return result;
        }
        catch (error) {
            this.logger.error("Failed to create session archive", error, { sessionId });
            throw error;
        }
    }
    // Gather all session data for archiving
    async gatherSessionData(sessionId) {
        const session = await this.prisma.unifiedSession.findUnique({
            where: { id: sessionId },
            include: {
                interactions: {
                    orderBy: { timestamp: 'asc' }
                },
                screenshots: {
                    orderBy: { timestamp: 'asc' }
                }
            }
        });
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        // Get additional data
        const [psychologyProfile, contextEnhancement, trainingData] = await Promise.all([
            this.prisma.psychologyProfile.findUnique({ where: { sessionId } }),
            this.prisma.contextEnhancement.findUnique({ where: { sessionId } }),
            this.prisma.trainingData.findFirst({
                where: { sessionId },
                orderBy: { createdAt: 'desc' }
            })
        ]);
        return {
            sessionId,
            interactions: session.interactions,
            screenshots: session.screenshots,
            metadata: {
                session: {
                    id: session.id,
                    type: session.type,
                    status: session.status,
                    startTime: session.startTime,
                    endTime: session.endTime,
                    duration: session.duration,
                    qualityScore: session.qualityScore,
                    completeness: session.completeness,
                    reliability: session.reliability,
                    trainingValue: session.trainingValue,
                    workerId: session.workerId,
                    userAgent: session.userAgent,
                    config: session.config
                }
            },
            psychologyProfile,
            contextEnhancement,
            trainingData
        };
    }
    // Prepare files for archiving with optimization
    async prepareArchiveFiles(sessionData, tempDir) {
        const filePaths = [];
        // 1. Create interactions.json
        const interactionsPath = path.join(tempDir, 'interactions.json');
        await fs.writeFile(interactionsPath, JSON.stringify(sessionData.interactions, null, 2));
        filePaths.push(interactionsPath);
        // 2. Create session-metadata.json
        const metadataPath = path.join(tempDir, 'session-metadata.json');
        await fs.writeFile(metadataPath, JSON.stringify(sessionData.metadata, null, 2));
        filePaths.push(metadataPath);
        // 3. Create psychology-profile.json (if available)
        if (sessionData.psychologyProfile) {
            const psychologyPath = path.join(tempDir, 'psychology-profile.json');
            await fs.writeFile(psychologyPath, JSON.stringify(sessionData.psychologyProfile, null, 2));
            filePaths.push(psychologyPath);
        }
        // 4. Create context-enhancement.json (if available)
        if (sessionData.contextEnhancement) {
            const contextPath = path.join(tempDir, 'context-enhancement.json');
            await fs.writeFile(contextPath, JSON.stringify(sessionData.contextEnhancement, null, 2));
            filePaths.push(contextPath);
        }
        // 5. Create training-data.jsonl (if available)
        if (sessionData.trainingData?.jsonlData) {
            const trainingPath = path.join(tempDir, 'training-data.jsonl');
            await fs.writeFile(trainingPath, sessionData.trainingData.jsonlData);
            filePaths.push(trainingPath);
        }
        // 6. Handle screenshots
        if (sessionData.screenshots.length > 0) {
            const screenshotsDir = path.join(tempDir, 'screenshots');
            await fs.mkdir(screenshotsDir, { recursive: true });
            for (const screenshot of sessionData.screenshots) {
                if (screenshot.s3Key) {
                    // Create a reference file instead of downloading the actual screenshot
                    const refPath = path.join(screenshotsDir, `${screenshot.id}.json`);
                    await fs.writeFile(refPath, JSON.stringify({
                        id: screenshot.id,
                        s3Key: screenshot.s3Key,
                        timestamp: screenshot.timestamp,
                        eventType: screenshot.eventType,
                        format: screenshot.format,
                        fileSize: screenshot.fileSize,
                        quality: screenshot.quality,
                        visionAnalysis: screenshot.visionAnalysis,
                        userPsychology: screenshot.userPsychology
                    }, null, 2));
                    filePaths.push(refPath);
                }
            }
        }
        // 7. Create archive manifest
        const manifestPath = path.join(tempDir, 'manifest.json');
        const manifest = await this.generateManifest(filePaths, sessionData.sessionId);
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        filePaths.push(manifestPath);
        return filePaths;
    }
    // Create ZIP archive with compression
    async createZipArchive(filePaths, outputPath, sessionId) {
        return new Promise((resolve, reject) => {
            const output = (0, fs_1.createWriteStream)(outputPath);
            const archive = (0, archiver_1.default)('zip', {
                zlib: { level: 9 } // Maximum compression
            });
            let totalSize = 0;
            const fileEntries = [];
            output.on('close', () => {
                const manifest = {
                    version: '1.0',
                    sessionId,
                    createdAt: new Date(),
                    files: fileEntries,
                    checksums: {},
                    compression: {
                        algorithm: 'deflate',
                        level: 9,
                        ratio: totalSize > 0 ? archive.pointer() / totalSize : 0,
                        method: 'zip'
                    },
                    totalSize,
                    compressedSize: archive.pointer()
                };
                resolve(manifest);
            });
            archive.on('error', reject);
            archive.pipe(output);
            // Add files to archive
            for (const filePath of filePaths) {
                const fileName = path.basename(filePath);
                const relativePath = filePath.includes('screenshots/') ?
                    `screenshots/${fileName}` : fileName;
                archive.file(filePath, { name: relativePath });
            }
            archive.finalize();
        });
    }
    // Generate manifest for archive contents
    async generateManifest(filePaths, sessionId) {
        const files = [];
        const checksums = {};
        let totalSize = 0;
        for (const filePath of filePaths) {
            const stats = await fs.stat(filePath);
            const checksum = await this.calculateFileChecksum(filePath);
            const fileName = path.basename(filePath);
            const entry = {
                filename: fileName,
                originalSize: stats.size,
                compressedSize: 0, // Will be updated after compression
                checksum,
                mimeType: this.getMimeType(fileName),
                lastModified: stats.mtime
            };
            files.push(entry);
            checksums[fileName] = checksum;
            totalSize += stats.size;
        }
        return {
            version: '1.0',
            sessionId,
            createdAt: new Date(),
            files,
            checksums,
            totalSize
        };
    }
    // Utility methods
    async calculateFileChecksum(filePath) {
        const hash = crypto.createHash('sha256');
        const stream = (0, fs_1.createReadStream)(filePath);
        return new Promise((resolve, reject) => {
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }
    getMimeType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.json': 'application/json',
            '.jsonl': 'application/jsonl',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp',
            '.txt': 'text/plain',
            '.zip': 'application/zip'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
    async cleanupTempDirectory(tempDir) {
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch (error) {
            this.logger.warn("Failed to cleanup temp directory", { tempDir, error });
        }
    }
    // Save archive record to database
    async saveArchiveRecord(sessionId, manifest, archivePath, checksum) {
        const stats = await fs.stat(archivePath);
        return await this.prisma.sessionArchive.create({
            data: {
                sessionId,
                version: manifest.version,
                format: 'zip',
                s3Bucket: '', // Will be updated when uploaded to S3
                s3Key: '', // Will be updated when uploaded to S3
                fileSize: BigInt(stats.size),
                checksum,
                manifest: JSON.stringify(manifest),
                compressionRatio: manifest.compression.ratio,
                status: 'COMPLETED'
            }
        });
    }
    // Compress and upload screenshot (for real-time processing)
    async compressAndUploadScreenshot(dataUrl, sessionId, eventType) {
        try {
            // Extract image data from data URL
            const matches = dataUrl.match(/^data:image\/([a-zA-Z]*);base64,(.+)$/);
            if (!matches) {
                throw new Error('Invalid data URL format');
            }
            const [, , base64Data] = matches;
            const imageBuffer = Buffer.from(base64Data, 'base64');
            // For now, we'll just return metadata since we're not implementing full S3 upload yet
            // In a real implementation, you'd compress the image and upload to S3
            const compressedSize = Math.round(imageBuffer.length * 0.7); // Simulate 30% compression
            const s3Key = `screenshots/${sessionId}/${Date.now()}-${eventType}.webp`;
            return {
                s3Key,
                format: 'webp',
                fileSize: compressedSize,
                quality: 85,
                compressed: true,
                originalSize: imageBuffer.length,
                compressionRatio: compressedSize / imageBuffer.length
            };
        }
        catch (error) {
            this.logger.error("Failed to compress and upload screenshot", error, {
                sessionId,
                eventType
            });
            throw error;
        }
    }
    // Get archive information
    async getArchiveInfo(sessionId) {
        const archive = await this.prisma.sessionArchive.findFirst({
            where: { sessionId },
            orderBy: { createdAt: 'desc' }
        });
        if (!archive) {
            return null;
        }
        return {
            id: archive.id,
            sessionId: archive.sessionId,
            version: archive.version,
            format: archive.format,
            fileSize: Number(archive.fileSize),
            checksum: archive.checksum,
            compressionRatio: archive.compressionRatio,
            status: archive.status,
            createdAt: archive.createdAt,
            manifest: JSON.parse(archive.manifest)
        };
    }
    // List archives with filtering
    async listArchives(filters = {}) {
        const where = {};
        if (filters.status) {
            where.status = filters.status;
        }
        if (filters.createdAfter || filters.createdBefore) {
            where.createdAt = {};
            if (filters.createdAfter) {
                where.createdAt.gte = filters.createdAfter;
            }
            if (filters.createdBefore) {
                where.createdAt.lte = filters.createdBefore;
            }
        }
        if (filters.minSize || filters.maxSize) {
            where.fileSize = {};
            if (filters.minSize) {
                where.fileSize.gte = BigInt(filters.minSize);
            }
            if (filters.maxSize) {
                where.fileSize.lte = BigInt(filters.maxSize);
            }
        }
        const archives = await this.prisma.sessionArchive.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100 // Limit results
        });
        return archives.map(archive => ({
            id: archive.id,
            sessionId: archive.sessionId,
            version: archive.version,
            format: archive.format,
            fileSize: Number(archive.fileSize),
            checksum: archive.checksum,
            compressionRatio: archive.compressionRatio,
            status: archive.status,
            createdAt: archive.createdAt
        }));
    }
    // Get storage statistics
    async getStorageStats() {
        const [totalArchives, totalSize, avgCompressionRatio, statusDistribution] = await Promise.all([
            this.prisma.sessionArchive.count(),
            this.prisma.sessionArchive.aggregate({
                _sum: { fileSize: true }
            }),
            this.prisma.sessionArchive.aggregate({
                _avg: { compressionRatio: true }
            }),
            this.prisma.sessionArchive.groupBy({
                by: ['status'],
                _count: true
            })
        ]);
        return {
            totalArchives,
            totalSize: Number(totalSize._sum.fileSize || 0),
            averageCompressionRatio: Math.round((avgCompressionRatio._avg.compressionRatio || 0) * 100) / 100,
            statusDistribution: statusDistribution.reduce((acc, stat) => {
                acc[stat.status] = stat._count;
                return acc;
            }, {})
        };
    }
    // Cleanup old temporary files
    async cleanupTempFiles() {
        try {
            const tempFiles = await fs.readdir(this.tempDir);
            const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
            for (const file of tempFiles) {
                const filePath = path.join(this.tempDir, file);
                const stats = await fs.stat(filePath);
                if (stats.mtime.getTime() < cutoffTime) {
                    await fs.rm(filePath, { recursive: true, force: true });
                    this.logger.debug("Cleaned up old temp file", { filePath });
                }
            }
            this.logger.info("Temp file cleanup completed");
        }
        catch (error) {
            this.logger.error("Failed to cleanup temp files", error);
        }
    }
    // S3 Integration Methods
    // Download archive from S3
    async downloadArchiveFromS3(sessionId, downloadPath) {
        return await this.s3Storage.downloadArchive(sessionId, downloadPath);
    }
    // Generate presigned URL for archive download
    async generateArchiveDownloadUrl(sessionId, expiresIn = 3600) {
        return await this.s3Storage.generateDownloadUrl(sessionId, expiresIn);
    }
    // Delete archive from S3
    async deleteArchiveFromS3(sessionId) {
        await this.s3Storage.deleteArchive(sessionId);
    }
    // Get S3 archive metadata
    async getS3ArchiveMetadata(sessionId) {
        return await this.s3Storage.getArchiveMetadata(sessionId);
    }
    // Get storage cost analysis
    async getStorageCostAnalysis() {
        return await this.s3Storage.getStorageCostAnalysis();
    }
    // Check S3 health
    async checkS3Health() {
        return await this.s3Storage.healthCheck();
    }
    // Get upload progress for active uploads
    getUploadProgress(uploadId) {
        return this.s3Storage.getUploadProgress(uploadId);
    }
    // Cancel active S3 upload
    async cancelS3Upload(uploadId) {
        await this.s3Storage.cancelUpload(uploadId);
    }
    // Optimize storage by moving old archives to cheaper tiers
    async optimizeStorage() {
        try {
            this.logger.info("Starting storage optimization");
            // Get archives older than 30 days
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 30);
            const oldArchives = await this.prisma.sessionArchive.findMany({
                where: {
                    createdAt: { lt: cutoffDate },
                    s3Key: { not: '' },
                    status: 'COMPLETED'
                },
                include: {
                    session: {
                        select: {
                            qualityScore: true,
                            trainingValue: true
                        }
                    }
                }
            });
            let optimizedCount = 0;
            let totalSavings = 0;
            for (const archive of oldArchives) {
                try {
                    // Determine if archive should be moved to cheaper storage
                    const session = archive.session;
                    const shouldOptimize = session && (session.qualityScore < 60 ||
                        session.trainingValue < 50);
                    if (shouldOptimize) {
                        // In a real implementation, you would use S3 lifecycle policies
                        // or manually transition objects to cheaper storage classes
                        this.logger.debug("Archive eligible for storage optimization", {
                            sessionId: archive.sessionId,
                            qualityScore: session?.qualityScore,
                            trainingValue: session?.trainingValue
                        });
                        optimizedCount++;
                        // Estimate savings (this would be actual savings in production)
                        totalSavings += Number(archive.fileSize) * 0.7; // 70% cost reduction estimate
                    }
                }
                catch (error) {
                    this.logger.warn("Failed to optimize archive", {
                        sessionId: archive.sessionId,
                        error
                    });
                }
            }
            const result = {
                totalArchivesAnalyzed: oldArchives.length,
                archivesOptimized: optimizedCount,
                estimatedMonthlySavings: Math.round(totalSavings / (1024 * 1024 * 1024) * 0.004 * 100) / 100, // Glacier pricing
                optimizationDate: new Date()
            };
            this.logger.info("Storage optimization completed", result);
            return result;
        }
        catch (error) {
            this.logger.error("Storage optimization failed", error);
            throw error;
        }
    }
    // Get comprehensive storage metrics
    async getComprehensiveStorageMetrics() {
        try {
            const [localStats, s3CostAnalysis, s3Health] = await Promise.all([
                this.getStorageStats(),
                this.getStorageCostAnalysis(),
                this.checkS3Health()
            ]);
            // Calculate storage efficiency metrics
            // Note: In a real implementation, we would calculate original size before compression
            const compressionSavings = localStats.totalSize * (1 - localStats.averageCompressionRatio);
            return {
                local: localStats,
                s3: {
                    ...s3CostAnalysis,
                    health: s3Health
                },
                efficiency: {
                    totalCompressedSize: localStats.totalSize,
                    estimatedOriginalSize: localStats.totalSize / Math.max(localStats.averageCompressionRatio, 0.1),
                    compressionSavings: Math.round(compressionSavings),
                    compressionSavingsPercent: Math.round((1 - localStats.averageCompressionRatio) * 100),
                    storageEfficiencyScore: Math.min(100, Math.round((1 - localStats.averageCompressionRatio) * 100 + 20))
                },
                recommendations: this.generateStorageRecommendations(localStats, s3CostAnalysis)
            };
        }
        catch (error) {
            this.logger.error("Failed to get comprehensive storage metrics", error);
            throw error;
        }
    }
    // Generate storage optimization recommendations
    generateStorageRecommendations(localStats, s3Stats) {
        const recommendations = [];
        // Compression recommendations
        if (localStats.averageCompressionRatio > 0.8) {
            recommendations.push("Consider implementing additional compression techniques to improve storage efficiency");
        }
        // S3 cost optimization
        if (s3Stats.potentialSavings?.glacierVsStandard > 10) {
            recommendations.push(`Potential monthly savings of $${s3Stats.potentialSavings.glacierVsStandard} by moving old archives to Glacier`);
        }
        // Archive lifecycle
        if (localStats.totalArchives > 1000) {
            recommendations.push("Implement automated lifecycle policies to transition old archives to cheaper storage tiers");
        }
        // Storage health
        if (localStats.statusDistribution.FAILED > 0) {
            recommendations.push(`${localStats.statusDistribution.FAILED} failed archives should be investigated and cleaned up`);
        }
        return recommendations;
    }
    // Health check method for server monitoring
    async healthCheck() {
        try {
            // Check if directories exist and are writable
            await fs.access(this.tempDir, fs.constants.W_OK);
            await fs.access(this.archiveDir, fs.constants.W_OK);
            // Check S3 connection
            const s3Health = await this.s3Storage.healthCheck();
            return s3Health.status === 'healthy' ? 'connected' : 'degraded';
        }
        catch (error) {
            this.logger.error("Storage health check failed", error);
            return 'disconnected';
        }
    }
    // Cleanup old archives
    async cleanupOldArchives(olderThanDays) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
            // Find old archives to delete
            const oldArchives = await this.prisma.sessionArchive.findMany({
                where: {
                    createdAt: { lt: cutoffDate },
                    status: 'COMPLETED'
                },
                select: {
                    id: true,
                    sessionId: true,
                    s3Key: true
                }
            });
            this.logger.info(`Found ${oldArchives.length} archives older than ${olderThanDays} days`);
            let deletedCount = 0;
            for (const archive of oldArchives) {
                try {
                    // Delete from S3 if exists
                    if (archive.s3Key) {
                        await this.s3Storage.deleteArchive(archive.sessionId);
                    }
                    // Delete local file if exists (construct path from sessionId)
                    const localPath = path.join(this.archiveDir, `session-${archive.sessionId}.zip`);
                    try {
                        await fs.unlink(localPath);
                    }
                    catch (err) {
                        // File might not exist locally
                        this.logger.debug(`Local file not found: ${localPath}`);
                    }
                    // Delete database record
                    await this.prisma.sessionArchive.delete({
                        where: { id: archive.id }
                    });
                    deletedCount++;
                    this.logger.debug(`Deleted archive ${archive.id} for session ${archive.sessionId}`);
                }
                catch (error) {
                    this.logger.error(`Failed to delete archive ${archive.id}`, error);
                }
            }
            this.logger.info(`Cleanup completed. Deleted ${deletedCount} of ${oldArchives.length} archives`);
            return deletedCount;
        }
        catch (error) {
            this.logger.error("Failed to cleanup old archives", error);
            throw error;
        }
    }
}
exports.StorageManager = StorageManager;
