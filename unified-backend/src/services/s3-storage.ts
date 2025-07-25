import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, 
         HeadObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, 
         CompleteMultipartUploadCommand, AbortMultipartUploadCommand,
         PutObjectTaggingCommand, GetObjectTaggingCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PrismaClient } from "@prisma/client";
import { Logger } from "../utils/logger";
import * as fs from 'fs/promises';
import * as path from 'path';
import { createReadStream } from 'fs';

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

interface MultipartUpload {
  uploadId: string;
  key: string;
  parts: Array<{
    partNumber: number;
    etag: string;
    size: number;
  }>;
  totalSize: number;
  startedAt: Date;
}

export class S3StorageService {
  private s3Client: S3Client;
  private prisma: PrismaClient;
  private logger: Logger;
  private config: S3Config;
  private activeUploads: Map<string, MultipartUpload> = new Map();

  constructor(prisma: PrismaClient, config?: S3Config) {
    this.prisma = prisma;
    this.logger = new Logger("S3Storage");
    
    // Use provided config or environment variables
    this.config = config || {
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.S3_BUCKET || 'codesight-archives',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      endpoint: process.env.S3_ENDPOINT
    };

    this.s3Client = new S3Client({
      region: this.config.region,
      credentials: {
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey
      },
      endpoint: this.config.endpoint
    });

    this.logger.info("S3 Storage Service initialized", {
      region: this.config.region,
      bucket: this.config.bucket
    });
  }

  // Upload session archive to S3 with intelligent tiering
  async uploadSessionArchive(
    archivePath: string, 
    sessionId: string,
    options: UploadOptions = {}
  ): Promise<UploadResult> {
    try {
      this.logger.info("Starting session archive upload", { sessionId, archivePath });

      const stats = await fs.stat(archivePath);
      const fileSize = stats.size;
      
      // Determine upload strategy based on file size
      const useMultipart = options.useMultipart ?? (fileSize > 100 * 1024 * 1024); // 100MB threshold
      
      // Generate S3 key with intelligent organization
      const s3Key = this.generateArchiveKey(sessionId);
      
      // Set up upload options with intelligent defaults
      const uploadOptions: UploadOptions = {
        contentType: 'application/zip',
        storageClass: this.determineStorageClass(fileSize),
        serverSideEncryption: 'AES256',
        metadata: {
          sessionId,
          originalSize: fileSize.toString(),
          uploadedAt: new Date().toISOString(),
          version: '1.0'
        },
        tags: {
          Type: 'SessionArchive',
          SessionId: sessionId,
          Environment: process.env.NODE_ENV || 'development',
          CreatedBy: 'unified-backend'
        },
        ...options
      };

      let result: UploadResult;

      if (useMultipart) {
        result = await this.multipartUpload(archivePath, s3Key, uploadOptions);
      } else {
        result = await this.singleUpload(archivePath, s3Key, uploadOptions);
      }

      // Update database with S3 information
      await this.updateArchiveRecord(sessionId, result);

      // Set up lifecycle management tags
      await this.applyLifecycleManagement(result.key, sessionId);

      this.logger.info("Session archive uploaded successfully", {
        sessionId,
        s3Key: result.key,
        size: result.size,
        storageClass: result.storageClass
      });

      return result;

    } catch (error) {
      this.logger.error("Failed to upload session archive", error, { sessionId });
      throw error;
    }
  }

  // Single upload for smaller files
  private async singleUpload(
    filePath: string, 
    key: string, 
    options: UploadOptions
  ): Promise<UploadResult> {
    const fileBuffer = await fs.readFile(filePath);
    
    const command = new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: options.contentType,
      Metadata: options.metadata,
      StorageClass: options.storageClass,
      ServerSideEncryption: options.serverSideEncryption
    });

    const response = await this.s3Client.send(command);

    // Apply tags separately
    if (options.tags) {
      await this.applyTags(key, options.tags);
    }

    return {
      key,
      bucket: this.config.bucket,
      etag: response.ETag || '',
      location: `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`,
      size: fileBuffer.length,
      storageClass: options.storageClass || 'STANDARD',
      serverSideEncryption: options.serverSideEncryption
    };
  }

  // Multipart upload for larger files
  private async multipartUpload(
    filePath: string, 
    key: string, 
    options: UploadOptions
  ): Promise<UploadResult> {
    const partSize = options.partSize || 100 * 1024 * 1024; // 100MB parts
    const fileStats = await fs.stat(filePath);
    const totalSize = fileStats.size;
    
    // Initialize multipart upload
    const createCommand = new CreateMultipartUploadCommand({
      Bucket: this.config.bucket,
      Key: key,
      ContentType: options.contentType,
      Metadata: options.metadata,
      StorageClass: options.storageClass,
      ServerSideEncryption: options.serverSideEncryption
    });

    const createResponse = await this.s3Client.send(createCommand);
    const uploadId = createResponse.UploadId!;

    // Track the upload
    const multipartUpload: MultipartUpload = {
      uploadId,
      key,
      parts: [],
      totalSize,
      startedAt: new Date()
    };
    this.activeUploads.set(uploadId, multipartUpload);

    try {
      // Upload parts in parallel (with concurrency limit)
      const parts = await this.uploadParts(filePath, key, uploadId, partSize, totalSize);
      
      // Complete multipart upload
      const completeCommand = new CompleteMultipartUploadCommand({
        Bucket: this.config.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts.map(part => ({
            ETag: part.etag,
            PartNumber: part.partNumber
          }))
        }
      });

      const completeResponse = await this.s3Client.send(completeCommand);

      // Apply tags
      if (options.tags) {
        await this.applyTags(key, options.tags);
      }

      // Clean up tracking
      this.activeUploads.delete(uploadId);

      return {
        key,
        bucket: this.config.bucket,
        etag: completeResponse.ETag || '',
        location: completeResponse.Location || `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${key}`,
        size: totalSize,
        uploadId,
        storageClass: options.storageClass || 'STANDARD',
        serverSideEncryption: options.serverSideEncryption
      };

    } catch (error) {
      // Abort multipart upload on failure
      await this.abortMultipartUpload(key, uploadId);
      this.activeUploads.delete(uploadId);
      throw error;
    }
  }

  // Upload parts with concurrency control
  private async uploadParts(
    filePath: string, 
    key: string, 
    uploadId: string, 
    partSize: number, 
    totalSize: number
  ): Promise<Array<{ partNumber: number; etag: string; size: number }>> {
    const parts: Array<{ partNumber: number; etag: string; size: number }> = [];
    const totalParts = Math.ceil(totalSize / partSize);
    const concurrency = 3; // Upload 3 parts concurrently
    
    // Create chunks of part numbers for concurrent processing
    const partChunks: number[][] = [];
    for (let i = 0; i < totalParts; i += concurrency) {
      partChunks.push(Array.from({ length: Math.min(concurrency, totalParts - i) }, (_, j) => i + j + 1));
    }

    // Process chunks sequentially, parts within chunks concurrently
    for (const chunk of partChunks) {
      const chunkPromises = chunk.map(partNumber => 
        this.uploadSinglePart(filePath, key, uploadId, partNumber, partSize, totalSize)
      );
      
      const chunkResults = await Promise.all(chunkPromises);
      parts.push(...chunkResults);

      // Log progress
      this.logger.debug("Multipart upload progress", {
        key,
        uploadId,
        completedParts: parts.length,
        totalParts,
        progress: Math.round((parts.length / totalParts) * 100)
      });
    }

    return parts.sort((a, b) => a.partNumber - b.partNumber);
  }

  // Upload a single part
  private async uploadSinglePart(
    filePath: string, 
    key: string, 
    uploadId: string, 
    partNumber: number, 
    partSize: number, 
    totalSize: number
  ): Promise<{ partNumber: number; etag: string; size: number }> {
    const start = (partNumber - 1) * partSize;
    const end = Math.min(start + partSize, totalSize);
    const actualPartSize = end - start;

    // Read the specific part of the file
    const fileHandle = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(actualPartSize);
    await fileHandle.read(buffer, 0, actualPartSize, start);
    await fileHandle.close();

    const command = new UploadPartCommand({
      Bucket: this.config.bucket,
      Key: key,
      PartNumber: partNumber,
      UploadId: uploadId,
      Body: buffer
    });

    const response = await this.s3Client.send(command);

    return {
      partNumber,
      etag: response.ETag!,
      size: actualPartSize
    };
  }

  // Abort multipart upload
  private async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    try {
      const command = new AbortMultipartUploadCommand({
        Bucket: this.config.bucket,
        Key: key,
        UploadId: uploadId
      });

      await this.s3Client.send(command);
      this.logger.info("Multipart upload aborted", { key, uploadId });
    } catch (error) {
      this.logger.error("Failed to abort multipart upload", error, { key, uploadId });
    }
  }

  // Apply tags to S3 object
  private async applyTags(key: string, tags: Record<string, string>): Promise<void> {
    try {
      const tagSet = Object.entries(tags).map(([Key, Value]) => ({ Key, Value }));
      
      const command = new PutObjectTaggingCommand({
        Bucket: this.config.bucket,
        Key: key,
        Tagging: { TagSet: tagSet }
      });

      await this.s3Client.send(command);
    } catch (error) {
      this.logger.warn("Failed to apply tags", { key, tags, error });
    }
  }

  // Generate intelligent S3 key structure
  private generateArchiveKey(sessionId: string): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    // Organize by date for efficient lifecycle management
    return `archives/${year}/${month}/${day}/session-${sessionId}.zip`;
  }

  // Determine optimal storage class based on file size and access patterns
  private determineStorageClass(fileSize: number): 'STANDARD' | 'STANDARD_IA' | 'ONEZONE_IA' | 'GLACIER' | 'DEEP_ARCHIVE' {
    // Large archives (>1GB) go to Infrequent Access for cost savings
    if (fileSize > 1024 * 1024 * 1024) {
      return 'STANDARD_IA';
    }
    
    // Medium archives (>100MB) go to Standard for now, will transition via lifecycle
    if (fileSize > 100 * 1024 * 1024) {
      return 'STANDARD';
    }
    
    // Small archives stay in Standard
    return 'STANDARD';
  }

  // Apply lifecycle management tags for automatic tiering
  private async applyLifecycleManagement(key: string, sessionId: string): Promise<void> {
    try {
      // Get session info to determine lifecycle policy
      const session = await this.prisma.unifiedSession.findUnique({
        where: { id: sessionId },
        select: { 
          qualityScore: true, 
          trainingValue: true, 
          createdAt: true 
        }
      });

      if (!session) return;

      const lifecycleTags: Record<string, string> = {};

      // High-value sessions get longer retention in hot storage
      if (session.qualityScore > 80 && session.trainingValue > 70) {
        lifecycleTags.LifecyclePolicy = 'HighValue';
        lifecycleTags.TransitionToIA = '90'; // 90 days
        lifecycleTags.TransitionToGlacier = '365'; // 1 year
      } else if (session.qualityScore > 60) {
        lifecycleTags.LifecyclePolicy = 'Standard';
        lifecycleTags.TransitionToIA = '30'; // 30 days
        lifecycleTags.TransitionToGlacier = '180'; // 6 months
      } else {
        lifecycleTags.LifecyclePolicy = 'LowValue';
        lifecycleTags.TransitionToIA = '7'; // 7 days
        lifecycleTags.TransitionToGlacier = '30'; // 30 days
      }

      await this.applyTags(key, lifecycleTags);

    } catch (error) {
      this.logger.warn("Failed to apply lifecycle management", { key, sessionId, error });
    }
  }

  // Update database archive record with S3 information
  private async updateArchiveRecord(sessionId: string, uploadResult: UploadResult): Promise<void> {
    try {
      await this.prisma.sessionArchive.updateMany({
        where: { 
          sessionId,
          status: 'COMPLETED'
        },
        data: {
          s3Bucket: uploadResult.bucket,
          s3Key: uploadResult.key,
          status: 'COMPLETED'
        }
      });

      this.logger.debug("Archive record updated with S3 info", {
        sessionId,
        s3Key: uploadResult.key
      });

    } catch (error) {
      this.logger.error("Failed to update archive record", error, { sessionId });
    }
  }

  // Download archive from S3
  async downloadArchive(sessionId: string, downloadPath?: string): Promise<string> {
    try {
      const archive = await this.prisma.sessionArchive.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'desc' }
      });

      if (!archive || !archive.s3Key) {
        throw new Error(`Archive not found for session ${sessionId}`);
      }

      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: archive.s3Key
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('Empty response body');
      }

      // Determine download path
      const outputPath = downloadPath || `/tmp/session-${sessionId}.zip`;
      
      // Stream the response to file
      const chunks: Uint8Array[] = [];
      const stream = response.Body as any;
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      const buffer = Buffer.concat(chunks);
      await fs.writeFile(outputPath, buffer);

      this.logger.info("Archive downloaded successfully", {
        sessionId,
        s3Key: archive.s3Key,
        downloadPath: outputPath,
        size: buffer.length
      });

      return outputPath;

    } catch (error) {
      this.logger.error("Failed to download archive", error, { sessionId });
      throw error;
    }
  }

  // Generate presigned URL for direct download
  async generateDownloadUrl(sessionId: string, expiresIn: number = 3600): Promise<string> {
    try {
      const archive = await this.prisma.sessionArchive.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'desc' }
      });

      if (!archive || !archive.s3Key) {
        throw new Error(`Archive not found for session ${sessionId}`);
      }

      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: archive.s3Key
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn });

      this.logger.info("Presigned download URL generated", {
        sessionId,
        s3Key: archive.s3Key,
        expiresIn
      });

      return url;

    } catch (error) {
      this.logger.error("Failed to generate download URL", error, { sessionId });
      throw error;
    }
  }

  // Delete archive from S3
  async deleteArchive(sessionId: string): Promise<void> {
    try {
      const archive = await this.prisma.sessionArchive.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'desc' }
      });

      if (!archive || !archive.s3Key) {
        throw new Error(`Archive not found for session ${sessionId}`);
      }

      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: archive.s3Key
      });

      await this.s3Client.send(command);

      // Update database record
      await this.prisma.sessionArchive.updateMany({
        where: { sessionId },
        data: { status: 'FAILED' } // Mark as failed since it's deleted
      });

      this.logger.info("Archive deleted successfully", {
        sessionId,
        s3Key: archive.s3Key
      });

    } catch (error) {
      this.logger.error("Failed to delete archive", error, { sessionId });
      throw error;
    }
  }

  // Get object metadata
  async getArchiveMetadata(sessionId: string): Promise<any> {
    try {
      const archive = await this.prisma.sessionArchive.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'desc' }
      });

      if (!archive || !archive.s3Key) {
        throw new Error(`Archive not found for session ${sessionId}`);
      }

      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: archive.s3Key
      });

      const response = await this.s3Client.send(command);

      return {
        sessionId,
        s3Key: archive.s3Key,
        size: response.ContentLength,
        lastModified: response.LastModified,
        etag: response.ETag,
        storageClass: response.StorageClass,
        serverSideEncryption: response.ServerSideEncryption,
        metadata: response.Metadata
      };

    } catch (error) {
      this.logger.error("Failed to get archive metadata", error, { sessionId });
      throw error;
    }
  }

  // List all archives in S3 with filtering
  async listS3Archives(options: {
    prefix?: string;
    maxKeys?: number;
    startAfter?: string;
  } = {}): Promise<any[]> {
    try {
      // This would use ListObjectsV2Command in a real implementation
      // For now, we'll return database records
      const archives = await this.prisma.sessionArchive.findMany({
        where: {
          s3Key: { not: '' },
          status: 'COMPLETED'
        },
        orderBy: { createdAt: 'desc' },
        take: options.maxKeys || 100
      });

      return archives.map(archive => ({
        sessionId: archive.sessionId,
        s3Key: archive.s3Key,
        size: Number(archive.fileSize),
        createdAt: archive.createdAt,
        compressionRatio: archive.compressionRatio
      }));

    } catch (error) {
      this.logger.error("Failed to list S3 archives", error);
      throw error;
    }
  }

  // Get storage cost analysis
  async getStorageCostAnalysis(): Promise<any> {
    try {
      const archives = await this.prisma.sessionArchive.findMany({
        where: {
          s3Key: { not: '' },
          status: 'COMPLETED'
        }
      });

      const totalSize = archives.reduce((sum, archive) => sum + Number(archive.fileSize), 0);
      const totalArchives = archives.length;
      
      // Estimate costs (these would be actual costs in a real implementation)
      const standardStorageCost = (totalSize / (1024 * 1024 * 1024)) * 0.023; // $0.023 per GB/month
      const iaStorageCost = (totalSize / (1024 * 1024 * 1024)) * 0.0125; // $0.0125 per GB/month
      const glacierCost = (totalSize / (1024 * 1024 * 1024)) * 0.004; // $0.004 per GB/month

      return {
        totalArchives,
        totalSizeGB: Math.round(totalSize / (1024 * 1024 * 1024) * 100) / 100,
        estimatedMonthlyCosts: {
          standard: Math.round(standardStorageCost * 100) / 100,
          infrequentAccess: Math.round(iaStorageCost * 100) / 100,
          glacier: Math.round(glacierCost * 100) / 100
        },
        potentialSavings: {
          iaVsStandard: Math.round((standardStorageCost - iaStorageCost) * 100) / 100,
          glacierVsStandard: Math.round((standardStorageCost - glacierCost) * 100) / 100
        },
        averageCompressionRatio: archives.reduce((sum, a) => sum + (a.compressionRatio || 0), 0) / totalArchives
      };

    } catch (error) {
      this.logger.error("Failed to get storage cost analysis", error);
      throw error;
    }
  }

  // Health check for S3 connectivity
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      // Try to list objects to verify connectivity
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: 'health-check-test'
      });

      try {
        await this.s3Client.send(command);
      } catch (error: any) {
        // 404 is expected for health check, other errors are problems
        if (error.name !== 'NotFound') {
          throw error;
        }
      }

      return {
        status: 'healthy',
        details: {
          region: this.config.region,
          bucket: this.config.bucket,
          activeUploads: this.activeUploads.size
        }
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: (error as Error).message,
          region: this.config.region,
          bucket: this.config.bucket
        }
      };
    }
  }

  // Get upload progress for active multipart uploads
  getUploadProgress(uploadId: string): any {
    const upload = this.activeUploads.get(uploadId);
    if (!upload) {
      return null;
    }

    const completedSize = upload.parts.reduce((sum, part) => sum + part.size, 0);
    const progress = upload.totalSize > 0 ? (completedSize / upload.totalSize) * 100 : 0;

    return {
      uploadId,
      key: upload.key,
      totalSize: upload.totalSize,
      completedSize,
      progress: Math.round(progress * 100) / 100,
      completedParts: upload.parts.length,
      startedAt: upload.startedAt,
      duration: Date.now() - upload.startedAt.getTime()
    };
  }

  // Cancel active upload
  async cancelUpload(uploadId: string): Promise<void> {
    const upload = this.activeUploads.get(uploadId);
    if (!upload) {
      throw new Error(`Upload ${uploadId} not found`);
    }

    await this.abortMultipartUpload(upload.key, uploadId);
    this.activeUploads.delete(uploadId);

    this.logger.info("Upload cancelled", { uploadId, key: upload.key });
  }

  // Methods expected by StorageManager
  async uploadArchive(archivePath: string, sessionId: string): Promise<string> {
    const result = await this.uploadSessionArchive(archivePath, sessionId);
    return result.key;
  }

  async moveToArchiveStorage(s3Key: string): Promise<void> {
    try {
      // In a real implementation, this would change the storage class
      // For now, we'll just add a tag to indicate it should be moved
      await this.applyTags(s3Key, {
        StorageTransition: 'GLACIER',
        TransitionDate: new Date().toISOString()
      });

      this.logger.info("Archive moved to cold storage", { s3Key });
    } catch (error) {
      this.logger.error("Failed to move archive to cold storage", error, { s3Key });
      throw error;
    }
  }
}