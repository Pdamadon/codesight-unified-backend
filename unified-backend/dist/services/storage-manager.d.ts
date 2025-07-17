import { PrismaClient } from "@prisma/client";
interface ArchiveManifest {
    version: string;
    sessionId: string;
    createdAt: Date;
    files: FileManifestEntry[];
    checksums: Record<string, string>;
    compression: CompressionInfo;
    totalSize: number;
    compressedSize: number;
}
interface FileManifestEntry {
    filename: string;
    originalSize: number;
    compressedSize: number;
    checksum: string;
    mimeType: string;
    lastModified: Date;
}
interface CompressionInfo {
    algorithm: string;
    level: number;
    ratio: number;
    method: string;
}
interface ArchiveResult {
    archiveId: string;
    sessionId: string;
    archivePath: string;
    s3Key?: string;
    fileSize: number;
    compressionRatio: number;
    manifest: ArchiveManifest;
    checksum: string;
}
export declare class StorageManager {
    private prisma;
    private logger;
    private s3Storage;
    private tempDir;
    private archiveDir;
    constructor(prisma: PrismaClient);
    private ensureDirectories;
    createSessionArchive(sessionId: string): Promise<ArchiveResult>;
    private gatherSessionData;
    private prepareArchiveFiles;
    private createZipArchive;
    private generateManifest;
    private calculateFileChecksum;
    private getMimeType;
    private cleanupTempDirectory;
    private saveArchiveRecord;
    compressAndUploadScreenshot(dataUrl: string, sessionId: string, eventType: string): Promise<any>;
    getArchiveInfo(sessionId: string): Promise<any>;
    listArchives(filters?: {
        status?: string;
        createdAfter?: Date;
        createdBefore?: Date;
        minSize?: number;
        maxSize?: number;
    }): Promise<any[]>;
    getStorageStats(): Promise<any>;
    cleanupTempFiles(): Promise<void>;
    downloadArchiveFromS3(sessionId: string, downloadPath?: string): Promise<string>;
    generateArchiveDownloadUrl(sessionId: string, expiresIn?: number): Promise<string>;
    deleteArchiveFromS3(sessionId: string): Promise<void>;
    getS3ArchiveMetadata(sessionId: string): Promise<any>;
    getStorageCostAnalysis(): Promise<any>;
    checkS3Health(): Promise<{
        status: string;
        details: any;
    }>;
    getUploadProgress(uploadId: string): any;
    cancelS3Upload(uploadId: string): Promise<void>;
    optimizeStorage(): Promise<any>;
    getComprehensiveStorageMetrics(): Promise<any>;
    private generateStorageRecommendations;
    healthCheck(): Promise<string>;
    cleanupOldArchives(olderThanDays: number): Promise<number>;
}
export {};
