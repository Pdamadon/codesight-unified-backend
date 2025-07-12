export interface QualityMetrics {
    duration: number;
    fileSize: number;
    resolution?: string;
    bitrate?: number;
    hasAudio: boolean;
    hasVideo: boolean;
}
export interface QualityValidationResult {
    isValid: boolean;
    score: number;
    issues: string[];
    warnings: string[];
}
export declare class QualityValidator {
    private static readonly MIN_DURATION;
    private static readonly MAX_DURATION;
    private static readonly MIN_FILE_SIZE;
    private static readonly MAX_FILE_SIZE;
    static validateRecording(metrics: QualityMetrics): QualityValidationResult;
    static validateFileMetadata(fileUrl: string): Promise<QualityMetrics | null>;
    private static formatFileSize;
    static getQualityRecommendations(): string[];
}
//# sourceMappingURL=qualityValidator.d.ts.map