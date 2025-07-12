import logger from '../utils/logger';

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
  score: number; // 0-100
  issues: string[];
  warnings: string[];
}

export class QualityValidator {
  private static readonly MIN_DURATION = 30; // 30 seconds
  private static readonly MAX_DURATION = 1800; // 30 minutes
  private static readonly MIN_FILE_SIZE = 1024 * 1024; // 1MB
  private static readonly MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

  static validateRecording(metrics: QualityMetrics): QualityValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];
    let score = 100;

    try {
      // Duration validation
      if (metrics.duration < this.MIN_DURATION) {
        issues.push(`Recording too short: ${metrics.duration}s (minimum: ${this.MIN_DURATION}s)`);
        score -= 30;
      } else if (metrics.duration > this.MAX_DURATION) {
        issues.push(`Recording too long: ${metrics.duration}s (maximum: ${this.MAX_DURATION}s)`);
        score -= 20;
      }

      // File size validation
      if (metrics.fileSize < this.MIN_FILE_SIZE) {
        issues.push(`File too small: ${this.formatFileSize(metrics.fileSize)} (minimum: ${this.formatFileSize(this.MIN_FILE_SIZE)})`);
        score -= 25;
      } else if (metrics.fileSize > this.MAX_FILE_SIZE) {
        issues.push(`File too large: ${this.formatFileSize(metrics.fileSize)} (maximum: ${this.formatFileSize(this.MAX_FILE_SIZE)})`);
        score -= 15;
      }

      // Audio/Video validation
      if (!metrics.hasAudio && !metrics.hasVideo) {
        issues.push('Recording contains neither audio nor video');
        score -= 50;
      } else {
        if (!metrics.hasAudio) {
          warnings.push('No audio track detected');
          score -= 10;
        }
        if (!metrics.hasVideo) {
          warnings.push('No video track detected');
          score -= 5;
        }
      }

      // Resolution validation (if video present)
      if (metrics.hasVideo && metrics.resolution) {
        const [width, height] = metrics.resolution.split('x').map(Number);
        if (width < 640 || height < 480) {
          warnings.push(`Low resolution: ${metrics.resolution} (recommended: at least 640x480)`);
          score -= 10;
        }
      }

      // Bitrate validation
      if (metrics.bitrate && metrics.bitrate < 100000) { // 100 kbps
        warnings.push(`Low bitrate: ${Math.round(metrics.bitrate / 1000)}kbps (recommended: at least 100kbps)`);
        score -= 5;
      }

      // Calculate final validation
      const isValid = issues.length === 0 && score >= 70;

      logger.info('Quality validation completed', {
        metrics,
        score,
        isValid,
        issuesCount: issues.length,
        warningsCount: warnings.length,
      });

      return {
        isValid,
        score: Math.max(0, Math.min(100, score)),
        issues,
        warnings,
      };

    } catch (error) {
      logger.error('Quality validation error:', error);
      return {
        isValid: false,
        score: 0,
        issues: ['Failed to validate recording quality'],
        warnings: [],
      };
    }
  }

  static async validateFileMetadata(fileUrl: string): Promise<QualityMetrics | null> {
    try {
      // This would typically use a library like ffprobe to extract metadata
      // For now, return basic metrics that would be extracted from the file
      logger.info('Extracting file metadata', { fileUrl });

      // Placeholder implementation - in real scenario, you'd use ffprobe or similar
      return {
        duration: 60, // Would be extracted from file
        fileSize: 10 * 1024 * 1024, // Would be extracted from file
        resolution: '1920x1080', // Would be extracted from video
        bitrate: 500000, // Would be extracted from file
        hasAudio: true, // Would be detected from file
        hasVideo: true, // Would be detected from file
      };

    } catch (error) {
      logger.error('Failed to extract file metadata:', error);
      return null;
    }
  }

  private static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)}${units[unitIndex]}`;
  }

  static getQualityRecommendations(): string[] {
    return [
      'Ensure recording is between 30 seconds and 30 minutes',
      'Use a resolution of at least 640x480 for video',
      'Include both audio narration and screen recording when possible',
      'Maintain stable internet connection during recording',
      'Use a quiet environment for clear audio',
      'Ensure adequate lighting if using webcam',
    ];
  }
}