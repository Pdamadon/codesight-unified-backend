import { PrismaClient } from "@prisma/client";
export interface SessionArchiveData {
    sessionId: string;
    interactions: any[];
    screenshots: any[];
    metadata: any;
    psychologyProfile?: any;
    contextEnhancement?: any;
    trainingData?: any;
}
export interface ArchiveManifest {
    version: string;
    sessionId: string;
    createdAt: Date;
    files: FileManifestEntry[];
    checksums: Record<string, string>;
    compression: CompressionInfo;
    totalSize: number;
    compressedSize: number;
}
export interface FileManifestEntry {
    filename: string;
    originalSize: number;
    compressedSize: number;
    checksum: string;
    mimeType: string;
    lastModified: Date;
}
export interface CompressionInfo {
    algorithm: string;
    level: number;
    ratio: number;
    method: string;
}
export interface ArchiveResult {
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
    private createFileManifestEntry;
    private createZipArchive;
    private calculateFileChecksum;
    private getMimeType;
    private cleanupTempDirectory;
    private saveArchiveRecord;
    compressAndUploadScreenshot(dataUrl: string, sessionId: string, eventType: string): Promise<any>;
    getArchiveInfo(sessionId: string): Promise<any>;
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
    optimizeStorage(): Promise<any>;
    healthCheck(): Promise<string>;
}
