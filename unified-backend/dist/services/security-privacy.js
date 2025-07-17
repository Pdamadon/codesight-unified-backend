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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityPrivacyService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const crypto = __importStar(require("crypto"));
const bcrypt = __importStar(require("bcryptjs"));
class SecurityPrivacyService {
    prisma;
    logger;
    encryptionConfig;
    encryptionKey;
    constructor() {
        this.prisma = new client_1.PrismaClient();
        this.logger = new logger_1.Logger("SecurityPrivacy");
        this.encryptionConfig = {
            algorithm: 'aes-256-gcm',
            keyLength: 32,
            ivLength: 16
        };
        // Initialize encryption key from environment or generate
        const keyString = process.env.ENCRYPTION_KEY;
        if (keyString) {
            this.encryptionKey = Buffer.from(keyString, 'hex');
        }
        else {
            this.encryptionKey = crypto.randomBytes(this.encryptionConfig.keyLength);
            this.logger.warn("No encryption key provided, generated temporary key");
        }
    }
    // PII Detection and Masking
    async detectAndMaskPII(data) {
        try {
            const result = {
                hasPII: false,
                detectedTypes: [],
                maskedData: JSON.parse(JSON.stringify(data)), // Deep clone
                confidence: 0
            };
            // Recursively scan and mask data
            this.scanForPII(result.maskedData, result);
            this.logger.debug("PII detection completed", {
                hasPII: result.hasPII,
                types: result.detectedTypes,
                confidence: result.confidence
            });
            return result;
        }
        catch (error) {
            this.logger.error("PII detection failed", error);
            return {
                hasPII: false,
                detectedTypes: [],
                maskedData: data,
                confidence: 0
            };
        }
    }
    scanForPII(obj, result, path = '') {
        if (typeof obj === 'string') {
            this.detectPIIInString(obj, result, path);
        }
        else if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
                this.scanForPII(item, result, `${path}[${index}]`);
            });
        }
        else if (obj && typeof obj === 'object') {
            Object.keys(obj).forEach(key => {
                const newPath = path ? `${path}.${key}` : key;
                // Check key names for PII indicators
                if (this.isPIIField(key)) {
                    const maskedValue = this.maskPIIValue(obj[key], this.getPIIType(key));
                    if (maskedValue !== obj[key]) {
                        obj[key] = maskedValue;
                        result.hasPII = true;
                        const piiType = this.getPIIType(key);
                        if (!result.detectedTypes.includes(piiType)) {
                            result.detectedTypes.push(piiType);
                        }
                    }
                }
                this.scanForPII(obj[key], result, newPath);
            });
        }
    }
    detectPIIInString(text, result, path) {
        if (!text || typeof text !== 'string')
            return;
        const patterns = {
            email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
            phone: /(\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g,
            ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
            creditCard: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
            ipAddress: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g
        };
        Object.entries(patterns).forEach(([type, pattern]) => {
            if (pattern.test(text)) {
                result.hasPII = true;
                if (!result.detectedTypes.includes(type)) {
                    result.detectedTypes.push(type);
                }
                result.confidence = Math.max(result.confidence, 0.8);
            }
        });
    }
    isPIIField(fieldName) {
        const piiFields = [
            'email', 'phone', 'ssn', 'social', 'credit', 'card',
            'name', 'firstname', 'lastname', 'address', 'street',
            'city', 'zip', 'postal', 'birth', 'age', 'dob'
        ];
        const lowerField = fieldName.toLowerCase();
        return piiFields.some(pii => lowerField.includes(pii));
    }
    getPIIType(fieldName) {
        const lowerField = fieldName.toLowerCase();
        if (lowerField.includes('email'))
            return 'email';
        if (lowerField.includes('phone'))
            return 'phone';
        if (lowerField.includes('name'))
            return 'name';
        if (lowerField.includes('address') || lowerField.includes('street'))
            return 'address';
        if (lowerField.includes('credit') || lowerField.includes('card'))
            return 'creditCard';
        if (lowerField.includes('ssn') || lowerField.includes('social'))
            return 'ssn';
        return 'personal';
    }
    maskPIIValue(value, type) {
        if (!value || typeof value !== 'string')
            return value;
        switch (type) {
            case 'email':
                return this.maskEmail(value);
            case 'phone':
                return this.maskPhone(value);
            case 'name':
                return this.maskName(value);
            case 'address':
                return '[MASKED_ADDRESS]';
            case 'creditCard':
                return this.maskCreditCard(value);
            case 'ssn':
                return 'XXX-XX-XXXX';
            default:
                return this.maskGeneric(value);
        }
    }
    maskEmail(email) {
        const atIndex = email.indexOf('@');
        if (atIndex <= 0)
            return '[MASKED_EMAIL]';
        const username = email.substring(0, atIndex);
        const domain = email.substring(atIndex);
        if (username.length <= 2) {
            return 'XX' + domain;
        }
        return username[0] + 'X'.repeat(username.length - 2) + username[username.length - 1] + domain;
    }
    maskPhone(phone) {
        const digits = phone.replace(/\D/g, '');
        if (digits.length === 10) {
            return `XXX-XXX-${digits.slice(-4)}`;
        }
        else if (digits.length === 11) {
            return `X-XXX-XXX-${digits.slice(-4)}`;
        }
        return '[MASKED_PHONE]';
    }
    maskName(name) {
        const parts = name.trim().split(/\s+/);
        return parts.map(part => {
            if (part.length <= 1)
                return 'X';
            return part[0] + 'X'.repeat(part.length - 1);
        }).join(' ');
    }
    maskCreditCard(card) {
        const digits = card.replace(/\D/g, '');
        if (digits.length >= 13) {
            return `XXXX-XXXX-XXXX-${digits.slice(-4)}`;
        }
        return '[MASKED_CARD]';
    }
    maskGeneric(value) {
        if (value.length <= 2)
            return 'XX';
        return value[0] + 'X'.repeat(Math.min(value.length - 2, 8)) + value[value.length - 1];
    }
    // Data Encryption
    async encryptData(data) {
        try {
            const jsonString = JSON.stringify(data);
            const iv = crypto.randomBytes(this.encryptionConfig.ivLength);
            const cipher = crypto.createCipheriv(this.encryptionConfig.algorithm, this.encryptionKey, iv);
            let encrypted = cipher.update(jsonString, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            // Combine IV and encrypted data
            const result = iv.toString('hex') + ':' + encrypted;
            return result;
        }
        catch (error) {
            this.logger.error("Data encryption failed", error);
            throw new Error("Encryption failed");
        }
    }
    async decryptData(encryptedData) {
        try {
            const parts = encryptedData.split(':');
            if (parts.length !== 2) {
                throw new Error("Invalid encrypted data format");
            }
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            const decipher = crypto.createDecipheriv(this.encryptionConfig.algorithm, this.encryptionKey, iv);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return JSON.parse(decrypted);
        }
        catch (error) {
            this.logger.error("Data decryption failed", error);
            throw new Error("Decryption failed");
        }
    }
    // Access Control
    async validateApiKey(apiKey) {
        try {
            if (!apiKey) {
                return { isValid: false };
            }
            // Hash the API key for comparison
            const hashedKey = await bcrypt.hash(apiKey, 10);
            // In a real implementation, you'd check against a database
            // For now, we'll use environment variables
            const validKeys = process.env.VALID_API_KEYS?.split(',') || [];
            for (const validKey of validKeys) {
                if (await bcrypt.compare(apiKey, validKey)) {
                    return {
                        isValid: true,
                        userId: 'system',
                        roles: ['user']
                    };
                }
            }
            // Log failed authentication attempt
            await this.logSecurityEvent('auth_failed', {
                apiKey: apiKey.substring(0, 8) + '...',
                timestamp: new Date()
            });
            return { isValid: false };
        }
        catch (error) {
            this.logger.error("API key validation failed", error);
            return { isValid: false };
        }
    }
    async generateApiKey(userId, roles = ['user']) {
        try {
            // Generate a secure random API key
            const keyBytes = crypto.randomBytes(32);
            const apiKey = keyBytes.toString('hex');
            // Hash for storage
            const hashedKey = await bcrypt.hash(apiKey, 12);
            // Store in database (in a real implementation)
            await this.prisma.systemConfig.create({
                data: {
                    key: `api_key_${userId}`,
                    value: {
                        hashedKey,
                        userId,
                        roles,
                        createdAt: new Date(),
                        lastUsed: null
                    },
                    description: `API key for user ${userId}`,
                    category: 'security'
                }
            });
            await this.logSecurityEvent('api_key_generated', {
                userId,
                roles,
                timestamp: new Date()
            });
            return apiKey;
        }
        catch (error) {
            this.logger.error("API key generation failed", error);
            throw new Error("Failed to generate API key");
        }
    }
    // Privacy Compliance
    async processDataDeletionRequest(userId, dataTypes = ['all']) {
        try {
            this.logger.info("Processing data deletion request", { userId, dataTypes });
            if (dataTypes.includes('all') || dataTypes.includes('sessions')) {
                // Delete user sessions
                await this.prisma.unifiedSession.deleteMany({
                    where: { workerId: userId }
                });
            }
            if (dataTypes.includes('all') || dataTypes.includes('interactions')) {
                // Delete interactions (cascade should handle this)
                const sessions = await this.prisma.unifiedSession.findMany({
                    where: { workerId: userId },
                    select: { id: true }
                });
                for (const session of sessions) {
                    await this.prisma.interaction.deleteMany({
                        where: { sessionId: session.id }
                    });
                }
            }
            if (dataTypes.includes('all') || dataTypes.includes('screenshots')) {
                // Delete screenshots
                const sessions = await this.prisma.unifiedSession.findMany({
                    where: { workerId: userId },
                    select: { id: true }
                });
                for (const session of sessions) {
                    await this.prisma.screenshot.deleteMany({
                        where: { sessionId: session.id }
                    });
                }
            }
            // Log the deletion
            await this.logPrivacyEvent('data_deletion', {
                userId,
                dataTypes,
                timestamp: new Date(),
                status: 'completed'
            });
            this.logger.info("Data deletion request completed", { userId, dataTypes });
        }
        catch (error) {
            this.logger.error("Data deletion request failed", { userId, error });
            await this.logPrivacyEvent('data_deletion', {
                userId,
                dataTypes,
                timestamp: new Date(),
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    async generateDataExport(userId) {
        try {
            this.logger.info("Generating data export", { userId });
            // Get all user data
            const sessions = await this.prisma.unifiedSession.findMany({
                where: { workerId: userId },
                include: {
                    interactions: true,
                    screenshots: {
                        select: {
                            id: true,
                            timestamp: true,
                            eventType: true,
                            format: true,
                            fileSize: true,
                            quality: true
                            // Exclude actual image data for privacy
                        }
                    }
                }
            });
            const exportData = {
                userId,
                exportDate: new Date(),
                sessions: sessions.map(session => ({
                    id: session.id,
                    type: session.type,
                    startTime: session.startTime,
                    endTime: session.endTime,
                    duration: session.duration,
                    qualityScore: session.qualityScore,
                    interactions: session.interactions.map(interaction => ({
                        id: interaction.id,
                        type: interaction.type,
                        timestamp: interaction.timestamp,
                        elementText: interaction.elementText,
                        url: interaction.url,
                        pageTitle: interaction.pageTitle
                        // Exclude potentially sensitive selector data
                    })),
                    screenshots: session.screenshots
                }))
            };
            // Log the export
            await this.logPrivacyEvent('data_export', {
                userId,
                timestamp: new Date(),
                sessionCount: sessions.length
            });
            return exportData;
        }
        catch (error) {
            this.logger.error("Data export failed", { userId, error });
            throw error;
        }
    }
    // Security Event Logging
    async logSecurityEvent(event, details) {
        try {
            await this.prisma.systemConfig.create({
                data: {
                    key: `security_log_${Date.now()}`,
                    value: {
                        event,
                        details,
                        timestamp: new Date()
                    },
                    description: `Security event: ${event}`,
                    category: 'security_log'
                }
            });
        }
        catch (error) {
            this.logger.error("Failed to log security event", error);
        }
    }
    async logPrivacyEvent(event, details) {
        try {
            await this.prisma.systemConfig.create({
                data: {
                    key: `privacy_log_${Date.now()}`,
                    value: {
                        event,
                        details,
                        timestamp: new Date()
                    },
                    description: `Privacy event: ${event}`,
                    category: 'privacy_log'
                }
            });
        }
        catch (error) {
            this.logger.error("Failed to log privacy event", error);
        }
    }
    // Security Monitoring
    async getSecurityMetrics() {
        try {
            const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const securityLogs = await this.prisma.systemConfig.findMany({
                where: {
                    category: 'security_log',
                    createdAt: { gte: thirtyDaysAgo }
                }
            });
            const privacyLogs = await this.prisma.systemConfig.findMany({
                where: {
                    category: 'privacy_log',
                    createdAt: { gte: thirtyDaysAgo }
                }
            });
            // Analyze security events
            const securityEvents = securityLogs.map(log => log.value);
            const authFailures = securityEvents.filter(e => e.event === 'auth_failed').length;
            const apiKeyGenerations = securityEvents.filter(e => e.event === 'api_key_generated').length;
            // Analyze privacy events
            const privacyEvents = privacyLogs.map(log => log.value);
            const dataDeletions = privacyEvents.filter(e => e.event === 'data_deletion').length;
            const dataExports = privacyEvents.filter(e => e.event === 'data_export').length;
            return {
                period: '30 days',
                security: {
                    authFailures,
                    apiKeyGenerations,
                    totalEvents: securityEvents.length
                },
                privacy: {
                    dataDeletions,
                    dataExports,
                    totalEvents: privacyEvents.length
                },
                alerts: this.generateSecurityAlerts(securityEvents, privacyEvents)
            };
        }
        catch (error) {
            this.logger.error("Failed to get security metrics", error);
            return {
                error: "Failed to retrieve security metrics"
            };
        }
    }
    generateSecurityAlerts(securityEvents, privacyEvents) {
        const alerts = [];
        // Check for suspicious activity
        const recentAuthFailures = securityEvents.filter(e => e.event === 'auth_failed' &&
            new Date(e.details.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length;
        if (recentAuthFailures > 10) {
            alerts.push(`High number of authentication failures in last 24 hours: ${recentAuthFailures}`);
        }
        // Check for unusual data deletion patterns
        const recentDeletions = privacyEvents.filter(e => e.event === 'data_deletion' &&
            new Date(e.details.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length;
        if (recentDeletions > 5) {
            alerts.push(`Unusual number of data deletion requests: ${recentDeletions}`);
        }
        return alerts;
    }
    // Health check
    async healthCheck() {
        try {
            // Test encryption/decryption
            const testData = { test: 'data' };
            const encrypted = await this.encryptData(testData);
            const decrypted = await this.decryptData(encrypted);
            if (JSON.stringify(testData) !== JSON.stringify(decrypted)) {
                return 'degraded';
            }
            // Test database connection
            await this.prisma.systemConfig.count();
            return 'connected';
        }
        catch (error) {
            this.logger.error("Security service health check failed", error);
            return 'disconnected';
        }
    }
}
exports.SecurityPrivacyService = SecurityPrivacyService;
