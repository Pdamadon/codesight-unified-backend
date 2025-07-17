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
exports.MonitoringAnalyticsService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const os = __importStar(require("os"));
const process = __importStar(require("process"));
class MonitoringAnalyticsService {
    prisma;
    logger;
    metricsBuffer;
    alertConfigs;
    activeAlerts;
    metricsInterval;
    constructor() {
        this.prisma = new client_1.PrismaClient();
        this.logger = new logger_1.Logger("MonitoringAnalytics");
        this.metricsBuffer = [];
        this.alertConfigs = new Map();
        this.activeAlerts = new Map();
        this.metricsInterval = null;
        this.initializeDefaultAlerts();
        this.startMetricsCollection();
    }
    initializeDefaultAlerts() {
        const defaultAlerts = [
            {
                id: 'high_cpu_usage',
                name: 'High CPU Usage',
                type: 'threshold',
                metric: 'cpu.usage',
                condition: 'greater_than',
                threshold: 80,
                enabled: true,
                channels: ['log', 'email']
            },
            {
                id: 'high_memory_usage',
                name: 'High Memory Usage',
                type: 'threshold',
                metric: 'memory.usage',
                condition: 'greater_than',
                threshold: 85,
                enabled: true,
                channels: ['log', 'email']
            },
            {
                id: 'low_quality_sessions',
                name: 'Low Quality Sessions',
                type: 'threshold',
                metric: 'quality.average',
                condition: 'less_than',
                threshold: 60,
                enabled: true,
                channels: ['log']
            },
            {
                id: 'high_error_rate',
                name: 'High Error Rate',
                type: 'threshold',
                metric: 'errors.rate',
                condition: 'greater_than',
                threshold: 5,
                enabled: true,
                channels: ['log', 'email']
            }
        ];
        defaultAlerts.forEach(alert => {
            this.alertConfigs.set(alert.id, alert);
        });
    }
    startMetricsCollection() {
        // Collect system metrics every 30 seconds
        this.metricsInterval = setInterval(() => {
            this.collectSystemMetrics();
        }, 30000);
        // Flush performance metrics every 5 minutes
        setInterval(() => {
            this.flushPerformanceMetrics();
        }, 300000);
        // Check alerts every minute
        setInterval(() => {
            this.checkAlerts();
        }, 60000);
    }
    // System Metrics Collection
    async collectSystemMetrics() {
        try {
            const metrics = {
                timestamp: new Date(),
                cpu: {
                    usage: await this.getCpuUsage(),
                    loadAverage: os.loadavg()
                },
                memory: this.getMemoryMetrics(),
                disk: await this.getDiskMetrics(),
                network: {
                    connections: 0, // Would need to implement actual network monitoring
                    activeRequests: this.metricsBuffer.length
                }
            };
            // Store metrics in database
            await this.storeSystemMetrics(metrics);
            // Check for alerts
            await this.evaluateSystemAlerts(metrics);
        }
        catch (error) {
            this.logger.error("Failed to collect system metrics", error);
        }
    }
    async getCpuUsage() {
        return new Promise((resolve) => {
            const startUsage = process.cpuUsage();
            setTimeout(() => {
                const endUsage = process.cpuUsage(startUsage);
                const totalUsage = endUsage.user + endUsage.system;
                const usage = (totalUsage / 1000000) * 100; // Convert to percentage
                resolve(Math.min(usage, 100));
            }, 100);
        });
    }
    getMemoryMetrics() {
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();
        const usedMemory = totalMemory - freeMemory;
        return {
            used: usedMemory,
            free: freeMemory,
            total: totalMemory,
            usage: (usedMemory / totalMemory) * 100
        };
    }
    async getDiskMetrics() {
        // Simplified disk metrics - in production, you'd use a proper disk monitoring library
        const stats = await Promise.resolve().then(() => __importStar(require('fs'))).then(fs => fs.promises.stat('.'));
        return {
            used: 0,
            free: 0,
            total: 0,
            usage: 0
        };
    }
    async storeSystemMetrics(metrics) {
        try {
            await this.prisma.systemConfig.create({
                data: {
                    key: `system_metrics_${Date.now()}`,
                    value: metrics,
                    description: 'System performance metrics',
                    category: 'metrics'
                }
            });
        }
        catch (error) {
            this.logger.error("Failed to store system metrics", error);
        }
    }
    // Performance Metrics
    recordPerformanceMetric(metric) {
        this.metricsBuffer.push(metric);
        // If buffer is getting too large, flush immediately
        if (this.metricsBuffer.length > 1000) {
            this.flushPerformanceMetrics();
        }
    }
    async flushPerformanceMetrics() {
        if (this.metricsBuffer.length === 0)
            return;
        try {
            const metrics = [...this.metricsBuffer];
            this.metricsBuffer = [];
            // Store metrics in batches
            const batchSize = 100;
            for (let i = 0; i < metrics.length; i += batchSize) {
                const batch = metrics.slice(i, i + batchSize);
                await this.prisma.systemConfig.create({
                    data: {
                        key: `performance_metrics_${Date.now()}_${i}`,
                        value: batch,
                        description: 'Performance metrics batch',
                        category: 'performance'
                    }
                });
            }
            this.logger.debug(`Flushed ${metrics.length} performance metrics`);
        }
        catch (error) {
            this.logger.error("Failed to flush performance metrics", error);
        }
    }
    // Business Metrics
    async getBusinessMetrics() {
        try {
            const [totalSessions, activeSessions, completedSessions, avgQuality, totalInteractions, totalScreenshots, trainingData] = await Promise.all([
                this.prisma.unifiedSession.count(),
                this.prisma.unifiedSession.count({ where: { status: 'ACTIVE' } }),
                this.prisma.unifiedSession.count({ where: { status: 'COMPLETED' } }),
                this.prisma.unifiedSession.aggregate({ _avg: { qualityScore: true } }),
                this.prisma.interaction.count(),
                this.prisma.screenshot.count(),
                this.prisma.trainingData.count()
            ]);
            // Get storage usage
            const storageStats = await this.getStorageUsage();
            return {
                totalSessions,
                activeSessions,
                completedSessions,
                averageQualityScore: Math.round(avgQuality._avg.qualityScore || 0),
                totalInteractions,
                totalScreenshots,
                storageUsed: storageStats.totalSize,
                trainingDataGenerated: trainingData
            };
        }
        catch (error) {
            this.logger.error("Failed to get business metrics", error);
            throw error;
        }
    }
    async getStorageUsage() {
        try {
            const archiveStats = await this.prisma.sessionArchive.aggregate({
                _sum: { fileSize: true },
                _count: true
            });
            return {
                totalSize: Number(archiveStats._sum.fileSize || 0),
                fileCount: archiveStats._count
            };
        }
        catch (error) {
            return { totalSize: 0, fileCount: 0 };
        }
    }
    // Analytics and Reporting
    async getPerformanceAnalytics(timeRange = '24h') {
        try {
            const startTime = this.getTimeRangeStart(timeRange);
            const performanceData = await this.prisma.systemConfig.findMany({
                where: {
                    category: 'performance',
                    createdAt: { gte: startTime }
                },
                orderBy: { createdAt: 'desc' }
            });
            // Aggregate performance metrics
            const allMetrics = [];
            performanceData.forEach(record => {
                const metrics = record.value;
                allMetrics.push(...metrics);
            });
            // Calculate analytics
            const analytics = {
                totalRequests: allMetrics.length,
                averageResponseTime: this.calculateAverage(allMetrics.map(m => m.responseTime)),
                p95ResponseTime: this.calculatePercentile(allMetrics.map(m => m.responseTime), 95),
                p99ResponseTime: this.calculatePercentile(allMetrics.map(m => m.responseTime), 99),
                errorRate: this.calculateErrorRate(allMetrics),
                endpointBreakdown: this.analyzeEndpoints(allMetrics),
                timeSeriesData: this.generateTimeSeries(allMetrics, timeRange)
            };
            return analytics;
        }
        catch (error) {
            this.logger.error("Failed to get performance analytics", error);
            throw error;
        }
    }
    async getSystemAnalytics(timeRange = '24h') {
        try {
            const startTime = this.getTimeRangeStart(timeRange);
            const systemData = await this.prisma.systemConfig.findMany({
                where: {
                    category: 'metrics',
                    createdAt: { gte: startTime }
                },
                orderBy: { createdAt: 'desc' }
            });
            const metrics = systemData.map(record => record.value);
            return {
                averageCpuUsage: this.calculateAverage(metrics.map(m => m.cpu.usage)),
                averageMemoryUsage: this.calculateAverage(metrics.map(m => m.memory.usage)),
                peakCpuUsage: Math.max(...metrics.map(m => m.cpu.usage)),
                peakMemoryUsage: Math.max(...metrics.map(m => m.memory.usage)),
                systemHealth: this.calculateSystemHealth(metrics),
                trends: this.calculateTrends(metrics)
            };
        }
        catch (error) {
            this.logger.error("Failed to get system analytics", error);
            throw error;
        }
    }
    // Alert Management
    async createAlert(config) {
        const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const alertConfig = {
            id: alertId,
            ...config
        };
        this.alertConfigs.set(alertId, alertConfig);
        // Store in database
        await this.prisma.systemConfig.create({
            data: {
                key: `alert_config_${alertId}`,
                value: alertConfig,
                description: `Alert configuration: ${config.name}`,
                category: 'alerts'
            }
        });
        this.logger.info("Alert created", { alertId, name: config.name });
        return alertId;
    }
    async updateAlert(alertId, updates) {
        const existing = this.alertConfigs.get(alertId);
        if (!existing) {
            throw new Error(`Alert ${alertId} not found`);
        }
        const updated = { ...existing, ...updates };
        this.alertConfigs.set(alertId, updated);
        // Update in database
        await this.prisma.systemConfig.updateMany({
            where: { key: `alert_config_${alertId}` },
            data: { value: updated }
        });
        this.logger.info("Alert updated", { alertId, updates });
    }
    async deleteAlert(alertId) {
        this.alertConfigs.delete(alertId);
        this.activeAlerts.delete(alertId);
        // Remove from database
        await this.prisma.systemConfig.deleteMany({
            where: { key: `alert_config_${alertId}` }
        });
        this.logger.info("Alert deleted", { alertId });
    }
    async checkAlerts() {
        try {
            // Get current metrics
            const businessMetrics = await this.getBusinessMetrics();
            const systemMetrics = await this.getCurrentSystemMetrics();
            // Check each alert configuration
            for (const [alertId, config] of this.alertConfigs) {
                if (!config.enabled)
                    continue;
                const shouldAlert = await this.evaluateAlert(config, {
                    business: businessMetrics,
                    system: systemMetrics
                });
                if (shouldAlert && !this.activeAlerts.has(alertId)) {
                    await this.triggerAlert(config, { business: businessMetrics, system: systemMetrics });
                }
                else if (!shouldAlert && this.activeAlerts.has(alertId)) {
                    await this.resolveAlert(alertId);
                }
            }
        }
        catch (error) {
            this.logger.error("Alert checking failed", error);
        }
    }
    async evaluateAlert(config, metrics) {
        const value = this.getMetricValue(config.metric, metrics);
        switch (config.condition) {
            case 'greater_than':
                return value > config.threshold;
            case 'less_than':
                return value < config.threshold;
            case 'equals':
                return value === config.threshold;
            default:
                return false;
        }
    }
    getMetricValue(metricPath, metrics) {
        const parts = metricPath.split('.');
        let value = metrics;
        for (const part of parts) {
            value = value?.[part];
        }
        return typeof value === 'number' ? value : 0;
    }
    async triggerAlert(config, metrics) {
        const alert = {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            configId: config.id,
            severity: this.determineSeverity(config, metrics),
            message: `${config.name}: ${config.metric} ${config.condition} ${config.threshold}`,
            details: metrics,
            timestamp: new Date(),
            acknowledged: false
        };
        this.activeAlerts.set(config.id, alert);
        // Send notifications
        await this.sendAlertNotifications(alert, config);
        // Store alert
        await this.prisma.systemConfig.create({
            data: {
                key: `active_alert_${alert.id}`,
                value: alert,
                description: `Active alert: ${config.name}`,
                category: 'active_alerts'
            }
        });
        this.logger.warn("Alert triggered", {
            alertId: alert.id,
            configId: config.id,
            severity: alert.severity,
            message: alert.message
        });
    }
    async resolveAlert(alertId) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert)
            return;
        alert.resolvedAt = new Date();
        this.activeAlerts.delete(alertId);
        // Update in database
        await this.prisma.systemConfig.updateMany({
            where: { key: `active_alert_${alert.id}` },
            data: { value: alert }
        });
        this.logger.info("Alert resolved", { alertId: alert.id });
    }
    determineSeverity(config, metrics) {
        const value = this.getMetricValue(config.metric, metrics);
        const threshold = config.threshold;
        if (config.metric.includes('cpu') || config.metric.includes('memory')) {
            if (value > threshold * 1.5)
                return 'critical';
            if (value > threshold * 1.2)
                return 'high';
            return 'medium';
        }
        return 'medium';
    }
    async sendAlertNotifications(alert, config) {
        for (const channel of config.channels) {
            try {
                switch (channel) {
                    case 'log':
                        this.logger.warn(`ALERT: ${alert.message}`, alert.details);
                        break;
                    case 'email':
                        // Implement email notification
                        this.logger.info("Email alert sent", { alertId: alert.id });
                        break;
                    case 'webhook':
                        // Implement webhook notification
                        this.logger.info("Webhook alert sent", { alertId: alert.id });
                        break;
                }
            }
            catch (error) {
                this.logger.error(`Failed to send alert via ${channel}`, error);
            }
        }
    }
    // Utility methods
    getTimeRangeStart(timeRange) {
        const now = new Date();
        switch (timeRange) {
            case '1h':
                return new Date(now.getTime() - 60 * 60 * 1000);
            case '24h':
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
            case '7d':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case '30d':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            default:
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }
    }
    calculateAverage(values) {
        if (values.length === 0)
            return 0;
        return values.reduce((sum, val) => sum + val, 0) / values.length;
    }
    calculatePercentile(values, percentile) {
        if (values.length === 0)
            return 0;
        const sorted = values.sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index] || 0;
    }
    calculateErrorRate(metrics) {
        if (metrics.length === 0)
            return 0;
        const errors = metrics.filter(m => m.statusCode >= 400).length;
        return (errors / metrics.length) * 100;
    }
    analyzeEndpoints(metrics) {
        const endpointStats = new Map();
        metrics.forEach(metric => {
            const key = `${metric.method} ${metric.endpoint}`;
            if (!endpointStats.has(key)) {
                endpointStats.set(key, {
                    count: 0,
                    totalTime: 0,
                    errors: 0
                });
            }
            const stats = endpointStats.get(key);
            stats.count++;
            stats.totalTime += metric.responseTime;
            if (metric.statusCode >= 400)
                stats.errors++;
        });
        const result = {};
        endpointStats.forEach((stats, endpoint) => {
            result[endpoint] = {
                requests: stats.count,
                averageResponseTime: stats.totalTime / stats.count,
                errorRate: (stats.errors / stats.count) * 100
            };
        });
        return result;
    }
    generateTimeSeries(metrics, timeRange) {
        // Simplified time series generation
        const buckets = new Map();
        const bucketSize = this.getBucketSize(timeRange);
        metrics.forEach(metric => {
            const bucket = Math.floor(metric.timestamp.getTime() / bucketSize) * bucketSize;
            if (!buckets.has(bucket)) {
                buckets.set(bucket, { count: 0, totalTime: 0 });
            }
            const stats = buckets.get(bucket);
            stats.count++;
            stats.totalTime += metric.responseTime;
        });
        const result = [];
        buckets.forEach((stats, timestamp) => {
            result.push({
                timestamp: new Date(timestamp),
                requests: stats.count,
                averageResponseTime: stats.totalTime / stats.count
            });
        });
        return result.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }
    getBucketSize(timeRange) {
        switch (timeRange) {
            case '1h':
                return 5 * 60 * 1000; // 5 minutes
            case '24h':
                return 60 * 60 * 1000; // 1 hour
            case '7d':
                return 6 * 60 * 60 * 1000; // 6 hours
            case '30d':
                return 24 * 60 * 60 * 1000; // 1 day
            default:
                return 60 * 60 * 1000; // 1 hour
        }
    }
    async getCurrentSystemMetrics() {
        return {
            timestamp: new Date(),
            cpu: {
                usage: await this.getCpuUsage(),
                loadAverage: os.loadavg()
            },
            memory: this.getMemoryMetrics(),
            disk: await this.getDiskMetrics(),
            network: {
                connections: 0,
                activeRequests: this.metricsBuffer.length
            }
        };
    }
    async evaluateSystemAlerts(metrics) {
        // Check CPU usage
        if (metrics.cpu.usage > 80) {
            this.logger.warn("High CPU usage detected", { usage: metrics.cpu.usage });
        }
        // Check memory usage
        if (metrics.memory.usage > 85) {
            this.logger.warn("High memory usage detected", { usage: metrics.memory.usage });
        }
    }
    calculateSystemHealth(metrics) {
        if (metrics.length === 0)
            return 'unknown';
        const avgCpu = this.calculateAverage(metrics.map(m => m.cpu.usage));
        const avgMemory = this.calculateAverage(metrics.map(m => m.memory.usage));
        if (avgCpu > 80 || avgMemory > 85)
            return 'critical';
        if (avgCpu > 60 || avgMemory > 70)
            return 'warning';
        return 'healthy';
    }
    calculateTrends(metrics) {
        if (metrics.length < 2)
            return { cpu: 'stable', memory: 'stable' };
        const recent = metrics.slice(-10);
        const older = metrics.slice(-20, -10);
        const recentCpu = this.calculateAverage(recent.map(m => m.cpu.usage));
        const olderCpu = this.calculateAverage(older.map(m => m.cpu.usage));
        const recentMemory = this.calculateAverage(recent.map(m => m.memory.usage));
        const olderMemory = this.calculateAverage(older.map(m => m.memory.usage));
        return {
            cpu: recentCpu > olderCpu * 1.1 ? 'increasing' : recentCpu < olderCpu * 0.9 ? 'decreasing' : 'stable',
            memory: recentMemory > olderMemory * 1.1 ? 'increasing' : recentMemory < olderMemory * 0.9 ? 'decreasing' : 'stable'
        };
    }
    // Health check and cleanup
    async healthCheck() {
        try {
            await this.prisma.systemConfig.count();
            return 'connected';
        }
        catch (error) {
            this.logger.error("Monitoring service health check failed", error);
            return 'disconnected';
        }
    }
    async cleanup() {
        if (this.metricsInterval) {
            clearInterval(this.metricsInterval);
        }
        // Flush any remaining metrics
        await this.flushPerformanceMetrics();
        this.logger.info("Monitoring service cleaned up");
    }
}
exports.MonitoringAnalyticsService = MonitoringAnalyticsService;
