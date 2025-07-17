export declare function validateEnvironment(): void;
export declare function getConfig(): {
    port: number;
    nodeEnv: string;
    databaseUrl: string;
    jwtSecret: string;
    openaiApiKey: string;
    aws: {
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
        s3BucketName: string;
    };
    frontendUrl: string;
    redisUrl: string | undefined;
    logLevel: string;
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    sessionTimeoutMinutes: number;
    maxSessionsPerUser: number;
    maxConcurrentJobs: number;
    jobTimeoutMs: number;
    maxRetries: number;
    maxScreenshotSizeMb: number;
    screenshotCompressionQuality: number;
    dataRetentionDays: number;
    archiveCleanupIntervalHours: number;
};
