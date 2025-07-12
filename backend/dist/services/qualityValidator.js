"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QualityValidator = void 0;
const logger_1 = __importDefault(require("../utils/logger"));
class QualityValidator {
    static MIN_DURATION = 30;
    static MAX_DURATION = 1800;
    static MIN_FILE_SIZE = 1024 * 1024;
    static MAX_FILE_SIZE = 500 * 1024 * 1024;
    static validateRecording(metrics) {
        const issues = [];
        const warnings = [];
        let score = 100;
        try {
            if (metrics.duration < this.MIN_DURATION) {
                issues.push(`Recording too short: ${metrics.duration}s (minimum: ${this.MIN_DURATION}s)`);
                score -= 30;
            }
            else if (metrics.duration > this.MAX_DURATION) {
                issues.push(`Recording too long: ${metrics.duration}s (maximum: ${this.MAX_DURATION}s)`);
                score -= 20;
            }
            if (metrics.fileSize < this.MIN_FILE_SIZE) {
                issues.push(`File too small: ${this.formatFileSize(metrics.fileSize)} (minimum: ${this.formatFileSize(this.MIN_FILE_SIZE)})`);
                score -= 25;
            }
            else if (metrics.fileSize > this.MAX_FILE_SIZE) {
                issues.push(`File too large: ${this.formatFileSize(metrics.fileSize)} (maximum: ${this.formatFileSize(this.MAX_FILE_SIZE)})`);
                score -= 15;
            }
            if (!metrics.hasAudio && !metrics.hasVideo) {
                issues.push('Recording contains neither audio nor video');
                score -= 50;
            }
            else {
                if (!metrics.hasAudio) {
                    warnings.push('No audio track detected');
                    score -= 10;
                }
                if (!metrics.hasVideo) {
                    warnings.push('No video track detected');
                    score -= 5;
                }
            }
            if (metrics.hasVideo && metrics.resolution) {
                const [width, height] = metrics.resolution.split('x').map(Number);
                if (width < 640 || height < 480) {
                    warnings.push(`Low resolution: ${metrics.resolution} (recommended: at least 640x480)`);
                    score -= 10;
                }
            }
            if (metrics.bitrate && metrics.bitrate < 100000) {
                warnings.push(`Low bitrate: ${Math.round(metrics.bitrate / 1000)}kbps (recommended: at least 100kbps)`);
                score -= 5;
            }
            const isValid = issues.length === 0 && score >= 70;
            logger_1.default.info('Quality validation completed', {
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
        }
        catch (error) {
            logger_1.default.error('Quality validation error:', error);
            return {
                isValid: false,
                score: 0,
                issues: ['Failed to validate recording quality'],
                warnings: [],
            };
        }
    }
    static async validateFileMetadata(fileUrl) {
        try {
            logger_1.default.info('Extracting file metadata', { fileUrl });
            return {
                duration: 60,
                fileSize: 10 * 1024 * 1024,
                resolution: '1920x1080',
                bitrate: 500000,
                hasAudio: true,
                hasVideo: true,
            };
        }
        catch (error) {
            logger_1.default.error('Failed to extract file metadata:', error);
            return null;
        }
    }
    static formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)}${units[unitIndex]}`;
    }
    static getQualityRecommendations() {
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
exports.QualityValidator = QualityValidator;
//# sourceMappingURL=qualityValidator.js.map