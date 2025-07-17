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
            const manifest = await this.createZipArchive(preparedFiles, archivePath, sessionData);
            // Calculate checksum
            const checksum = await this.calculateFileChecksum(archivePath);
            // Get file stats
            const stats = await fs.stat(archivePath);
            const compressionRatio = manifest.compressedSize / manifest.totalSize;
            // Save archive record to database
            const archiveRecord = await this.saveArchiveRecord(sessionId, manifest, archivePath, checksum);
            // Upload to S3 if configured
            let s3Key;
            if (process.env.AWS_S3_BUCKET) {
                try {
                    s3Key = await this.s3Storage.uploadArchive(archivePath, sessionId);
                    // Update archive record with S3 key
                    await this.prisma.sessionArchive.update({
                        where: { id: archiveRecord.id },
                        data: { s3Key }
                    });
                }
                catch (s3Error) {
                    this.logger.warn("S3 upload failed, archive saved locally", { sessionId, error: s3Error });
                }
            }
            // Cleanup temp directory
            await this.cleanupTempDirectory(tempArchiveDir);
            const result = {
                archiveId: archiveRecord.id,
                sessionId,
                archivePath,
                s3Key,
                fileSize: stats.size,
                compressionRatio,
                manifest,
                checksum
            };
            this.logger.info("Session archive created successfully", {
                sessionId,
                archiveId: result.archiveId,
                fileSize: result.fileSize,
                compressionRatio: result.compressionRatio
            });
            return result;
        }
        catch (error) {
            this.logger.error("Session archive creation failed", { sessionId, error });
            throw error;
        }
    }
    async gatherSessionData(sessionId) {
        const session = await this.prisma.unifiedSession.findUnique({
            where: { id: sessionId },
            include: {
                interactions: true,
                screenshots: true
            }
        });
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        // Get additional data
        const [psychologyProfile, contextEnhancement, trainingData] = await Promise.all([
            this.prisma.psychologyProfile.findUnique({ where: { sessionId } }),
            this.prisma.contextEnhancement.findUnique({ where: { sessionId } }),
            this.prisma.trainingData.findFirst({ where: { sessionId } })
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
                    reliability: session.reliability
                }
            },
            psychologyProfile,
            contextEnhancement,
            trainingData
        };
    }
    async prepareArchiveFiles(sessionData, tempDir) {
        const files = [];
        // Save interactions data
        const interactionsPath = path.join(tempDir, 'interactions.json');
        const interactionsData = JSON.stringify(sessionData.interactions, null, 2);
        await fs.writeFile(interactionsPath, interactionsData);
        files.push(await this.createFileManifestEntry(interactionsPath, 'interactions.json'));
        // Save metadata
        const metadataPath = path.join(tempDir, 'metadata.json');
        const metadataData = JSON.stringify(sessionData.metadata, null, 2);
        await fs.writeFile(metadataPath, metadataData);
        files.push(await this.createFileManifestEntry(metadataPath, 'metadata.json'));
        // Save psychology profile if available
        if (sessionData.psychologyProfile) {
            const psychologyPath = path.join(tempDir, 'psychology-profile.json');
            const psychologyData = JSON.stringify(sessionData.psychologyProfile, null, 2);
            await fs.writeFile(psychologyPath, psychologyData);
            files.push(await this.createFileManifestEntry(psychologyPath, 'psychology-profile.json'));
        }
        // Save context enhancement if available
        if (sessionData.contextEnhancement) {
            const contextPath = path.join(tempDir, 'context-enhancement.json');
            const contextData = JSON.stringify(sessionData.contextEnhancement, null, 2);
            await fs.writeFile(contextPath, contextData);
            files.push(await this.createFileManifestEntry(contextPath, 'context-enhancement.json'));
        }
        // Save training data if available
        if (sessionData.trainingData) {
            const trainingPath = path.join(tempDir, 'training-data.jsonl');
            await fs.writeFile(trainingPath, sessionData.trainingData.jsonlData || '');
            files.push(await this.createFileManifestEntry(trainingPath, 'training-data.jsonl'));
        }
        // Handle screenshots (save references, actual images handled separately)
        if (sessionData.screenshots.length > 0) {
            const screenshotsPath = path.join(tempDir, 'screenshots.json');
            const screenshotsData = JSON.stringify(sessionData.screenshots, null, 2);
            await fs.writeFile(screenshotsPath, screenshotsData);
            files.push(await this.createFileManifestEntry(screenshotsPath, 'screenshots.json'));
        }
        return files;
    }
    async createFileManifestEntry(filePath, filename) {
        const stats = await fs.stat(filePath);
        const checksum = await this.calculateFileChecksum(filePath);
        return {
            filename,
            originalSize: stats.size,
            compressedSize: stats.size, // Will be updated after compression
            checksum,
            mimeType: this.getMimeType(filename),
            lastModified: stats.mtime
        };
    }
    async createZipArchive(files, archivePath, sessionData) {
        return new Promise((resolve, reject) => {
            const output = require('fs').createWriteStream(archivePath);
            const archive = (0, archiver_1.default)('zip', { zlib: { level: 9 } });
            let totalOriginalSize = 0;
            let totalCompressedSize = 0;
            output.on('close', () => {
                const manifest = {
                    version: '1.0',
                    sessionId: sessionData.sessionId,
                    createdAt: new Date(),
                    files: files.map(f => ({ ...f, compressedSize: f.originalSize * 0.7 })), // Estimate compression
                    checksums: files.reduce((acc, f) => ({ ...acc, [f.filename]: f.checksum }), {}),
                    compression: {
                        algorithm: 'zip',
                        level: 9,
                        ratio: totalCompressedSize / totalOriginalSize || 0.7,
                        method: 'deflate'
                    },
                    totalSize: totalOriginalSize,
                    compressedSize: archive.pointer()
                };
                resolve(manifest);
            });
            archive.on('error', reject);
            archive.pipe(output);
            // Add files to archive
            files.forEach(file => {
                const filePath = path.join(path.dirname(archivePath), '..', 'temp', file.filename);
                archive.file(filePath, { name: file.filename });
                totalOriginalSize += file.originalSize;
            });
            archive.finalize();
        });
    }
    async calculateFileChecksum(filePath) {
        const hash = crypto.createHash('sha256');
        const data = await fs.readFile(filePath);
        hash.update(data);
        return hash.digest('hex');
    }
    getMimeType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.json': 'application/json',
            '.jsonl': 'application/jsonl',
            '.txt': 'text/plain',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.webp': 'image/webp'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
    async cleanupTempDirectory(tempDir) {
        try {
            await fs.rm(tempDir, { recursive: true, force: true });
        }
        catch (error) {
            this.logger.error("Failed to cleanup temp directory", { tempDir, error });
        }
    }
    async saveArchiveRecord(sessionId, manifest, archivePath, checksum) {
        const stats = await fs.stat(archivePath);
        return await this.prisma.sessionArchive.create({
            data: {
                sessionId,
                version: manifest.version,
                format: 'zip',
                s3Bucket: process.env.AWS_S3_BUCKET || '',
                s3Key: '', // Will be updated after S3 upload
                fileSize: BigInt(stats.size),
                checksum,
                manifest: manifest,
                compressionRatio: manifest.compression.ratio,
                status: 'CREATING'
            }
        });
    }
    // Screenshot compression and upload
    async compressAndUploadScreenshot(dataUrl, sessionId, eventType) {
        try {
            // Extract image data from data URL
            const matches = dataUrl.match(/^data:image\/([a-zA-Z]*);base64,(.+)$/);
            if (!matches) {
                throw new Error('Invalid data URL format');
            }
            const [, imageType, base64Data] = matches;
            const imageBuffer = Buffer.from(base64Data, 'base64');
            // For now, we'll simulate compression (in real implementation, use Sharp or similar)
            // const compressedBuffer = await sharp(imageBuffer).webp({ quality: 80 }).toBuffer();
            const compressedSize = Math.round(imageBuffer.length * 0.7); // Simulate 30% compression
            const s3Key = `screenshots/${sessionId}/${Date.now()}-${eventType}.webp`;
            return {
                s3Key,
                originalSize: imageBuffer.length,
                compressedSize,
                format: 'webp',
                compressionRatio: compressedSize / imageBuffer.length
            };
        }
        catch (error) {
            this.logger.error("Screenshot compression failed", { sessionId, eventType, error });
            throw error;
        }
    }
    // Archive retrieval methods
    async getArchiveInfo(sessionId) {
        const archive = await this.prisma.sessionArchive.findFirst({
            where: { sessionId }
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
            manifest: archive.manifest,
            compressionRatio: archive.compressionRatio,
            status: archive.status,
            createdAt: archive.createdAt,
            s3Key: archive.s3Key
        };
    }
    // Storage statistics and monitoring
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
            averageCompressionRatio: avgCompressionRatio._avg.compressionRatio || 0,
            statusDistribution: statusDistribution.reduce((acc, item) => ({
                ...acc,
                [item.status]: item._count
            }), {})
        };
    }
    // Cleanup and maintenance
    async cleanupTempFiles() {
        try {
            const tempFiles = await fs.readdir(this.tempDir);
            const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
            for (const file of tempFiles) {
                const filePath = path.join(this.tempDir, file);
                const stats = await fs.stat(filePath);
                if (stats.mtime.getTime() < cutoffTime) {
                    await fs.rm(filePath, { recursive: true, force: true });
                }
            }
            this.logger.info("Temp file cleanup completed");
        }
        catch (error) {
            this.logger.error("Temp file cleanup failed", error);
        }
    }
    // S3 Integration Methods
    async downloadArchiveFromS3(sessionId, downloadPath) {
        return await this.s3Storage.downloadArchive(sessionId, downloadPath);
    }
    async generateArchiveDownloadUrl(sessionId, expiresIn = 3600) {
        return await this.s3Storage.generateDownloadUrl(sessionId, expiresIn);
    }
    async deleteArchiveFromS3(sessionId) {
        await this.s3Storage.deleteArchive(sessionId);
    }
    async getS3ArchiveMetadata(sessionId) {
        return await this.s3Storage.getArchiveMetadata(sessionId);
    }
    async getStorageCostAnalysis() {
        return await this.s3Storage.getStorageCostAnalysis();
    }
    async checkS3Health() {
        return await this.s3Storage.healthCheck();
    }
    // Storage optimization
    async optimizeStorage() {
        try {
            this.logger.info("Starting storage optimization");
            // Find old archives that can be moved to cheaper storage
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 30);
            const oldArchives = await this.prisma.sessionArchive.findMany({
                where: {
                    createdAt: { lt: cutoffDate },
                    status: 'COMPLETED'
                }
            });
            let optimizedCount = 0;
            let totalSavings = 0;
            for (const archive of oldArchives) {
                try {
                    // Move to cheaper S3 storage class
                    if (archive.s3Key) {
                        await this.s3Storage.moveToArchiveStorage(archive.s3Key);
                        optimizedCount++;
                        totalSavings += Number(archive.fileSize) * 0.4; // Estimate 40% cost savings
                    }
                }
                catch (error) {
                    this.logger.warn("Failed to optimize archive", { archiveId: archive.id, error });
                }
            }
            const result = {
                optimizedCount,
                totalSavings,
                estimatedMonthlySavings: totalSavings * 0.1 // Rough estimate
            };
            this.logger.info("Storage optimization completed", result);
            return result;
        }
        catch (error) {
            this.logger.error("Storage optimization failed", error);
            throw error;
        }
    }
    // Health check method for server monitoring
    async healthCheck() {
        try {
            // Check if directories exist and are writable
            await fs.access(this.tempDir, require('fs').constants.W_OK);
            await fs.access(this.archiveDir, require('fs').constants.W_OK);
            // Check S3 connection
            const s3Health = await this.s3Storage.healthCheck();
            return s3Health.status === 'healthy' ? 'connected' : 'degraded';
        }
        catch (error) {
            this.logger.error("Storage health check failed", error);
            return 'disconnected';
        }
    }
}
exports.StorageManager = StorageManager;
