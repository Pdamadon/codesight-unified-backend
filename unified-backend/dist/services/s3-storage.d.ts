import { PrismaClient } from "@prisma/client";
interface S3Config {
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    endpoint?: string;
}
interface UploadOptions {
    contentType?: string;
    metadata?: Record<string, string>;
    tags?: Record<string, string>;
    storageClass?: 'STANDARD' | 'STANDARD_IA' | 'ONEZONE_IA' | 'GLACIER' | 'DEEP_ARCHIVE';
    serverSideEncryption?: 'AES256' | 'aws:kms';
    useMultipart?: boolean;
    partSize?: number;
}
interface UploadResult {
    key: string;
    bucket: string;
    etag: string;
    location: string;
    size: number;
    uploadId?: string;
    storageClass: string;
    serverSideEncryption?: string;
}
export declare class S3StorageService {
    private s3Client;
    private prisma;
    private logger;
    private config;
    private activeUploads;
    constructor(prisma: PrismaClient, config?: S3Config);
    uploadSessionArchive(archivePath: string, sessionId: string, options?: UploadOptions): Promise<UploadResult>;
    private singleUpload;
    private multipartUpload;
    private uploadParts;
    private uploadSinglePart;
    private abortMultipartUpload;
    private applyTags;
    private generateArchiveKey;
    private determineStorageClass;
    private applyLifecycleManagement;
    private updateArchiveRecord;
    downloadArchive(sessionId: string, downloadPath?: string): Promise<string>;
    generateDownloadUrl(sessionId: string, expiresIn?: number): Promise<string>;
    deleteArchive(sessionId: string): Promise<void>;
    getArchiveMetadata(sessionId: string): Promise<any>;
    listS3Archives(options?: {
        prefix?: string;
        maxKeys?: number;
        startAfter?: string;
    }): Promise<any[]>;
    getStorageCostAnalysis(): Promise<any>;
    healthCheck(): Promise<{
        status: string;
        details: any;
    }>;
    getUploadProgress(uploadId: string): any;
    cancelUpload(uploadId: string): Promise<void>;
    uploadArchive(archivePath: string, sessionId: string): Promise<string>;
    moveToArchiveStorage(s3Key: string): Promise<void>;
}
export {};
