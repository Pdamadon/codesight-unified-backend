import { Router, Request, Response } from 'express';
import { MonitoringAnalyticsService } from '../services/monitoring-analytics';
import { Logger } from '../utils/logger';
import { getErrorMessage } from '../utils/type-helpers';

const router = Router();
const logger = new Logger('AnalyticsRoutes');
const monitoringService = new MonitoringAnalyticsService();

// Dashboard overview endpoint
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '24h';
    
    const [
      businessMetrics,
      performanceAnalytics,
      systemAnalytics
    ] = await Promise.all([
      monitoringService.getBusinessMetrics(),
      monitoringService.getPerformanceAnalytics(timeRange),
      monitoringService.getSystemAnalytics(timeRange)
    ]);

    res.json({
      success: true,
      data: {
        business: businessMetrics,
        performance: performanceAnalytics,
        system: systemAnalytics,
        timeRange,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    logger.error('Dashboard data retrieval failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Business metrics endpoint
router.get('/business', async (req: Request, res: Response) => {
  try {
    const metrics = await monitoringService.getBusinessMetrics();
    
    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    logger.error('Business metrics retrieval failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve business metrics'
    });
  }
});

// Performance analytics endpoint
router.get('/performance', async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '24h';
    const analytics = await monitoringService.getPerformanceAnalytics(timeRange);
    
    res.json({
      success: true,
      data: analytics,
      timeRange
    });

  } catch (error) {
    logger.error('Performance analytics retrieval failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance analytics'
    });
  }
});

// System analytics endpoint
router.get('/system', async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '24h';
    const analytics = await monitoringService.getSystemAnalytics(timeRange);
    
    res.json({
      success: true,
      data: analytics,
      timeRange
    });

  } catch (error) {
    logger.error('System analytics retrieval failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system analytics'
    });
  }
});

// Real-time metrics endpoint
router.get('/realtime', async (req: Request, res: Response) => {
  try {
    // Set up Server-Sent Events for real-time data
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Send initial data
    const businessMetrics = await monitoringService.getBusinessMetrics();
    res.write(`data: ${JSON.stringify({
      type: 'business',
      data: businessMetrics,
      timestamp: new Date()
    })}\n\n`);

    // Set up interval to send updates
    const interval = setInterval(async () => {
      try {
        const metrics = await monitoringService.getBusinessMetrics();
        res.write(`data: ${JSON.stringify({
          type: 'business',
          data: metrics,
          timestamp: new Date()
        })}\n\n`);
      } catch (error) {
        logger.error('Real-time metrics update failed', error);
      }
    }, 30000); // Update every 30 seconds

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(interval);
    });

  } catch (error) {
    logger.error('Real-time metrics setup failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set up real-time metrics'
    });
  }
});

// Quality analytics endpoint
router.get('/quality', async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '7d';
    const startDate = getTimeRangeStart(timeRange);

    // Get quality metrics from database
    const qualityReports = await require('../services/quality-control-clean')
      .QualityControlService.prototype.prisma.qualityReport.findMany({
        where: {
          generatedAt: { gte: startDate }
        },
        select: {
          overallScore: true,
          completenessScore: true,
          reliabilityScore: true,
          accuracyScore: true,
          generatedAt: true,
          sessionId: true
        }
      });

    // Calculate analytics
    const analytics = {
      totalReports: qualityReports.length,
      averageQuality: calculateAverage(qualityReports.map((r: any) => r.overallScore)),
      averageCompleteness: calculateAverage(qualityReports.map((r: any) => r.completenessScore)),
      averageReliability: calculateAverage(qualityReports.map((r: any) => r.reliabilityScore)),
      averageAccuracy: calculateAverage(qualityReports.map((r: any) => r.accuracyScore)),
      qualityDistribution: calculateQualityDistribution(qualityReports),
      trends: calculateQualityTrends(qualityReports),
      timeRange
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('Quality analytics retrieval failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve quality analytics'
    });
  }
});

// Training analytics endpoint
router.get('/training', async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '30d';
    const startDate = getTimeRangeStart(timeRange);

    // Get training data metrics
    const trainingData = await require('../services/openai-integration-clean')
      .OpenAIIntegrationService.prototype.prisma.trainingData.findMany({
        where: {
          createdAt: { gte: startDate }
        },
        select: {
          status: true,
          trainingQuality: true,
          expectedPerformance: true,
          createdAt: true,
          completedAt: true
        }
      });

    const analytics = {
      totalTrainingJobs: trainingData.length,
      completedJobs: trainingData.filter((t: any) => t.status === 'COMPLETED').length,
      failedJobs: trainingData.filter((t: any) => t.status === 'FAILED').length,
      averageQuality: calculateAverage(trainingData.map((t: any) => t.trainingQuality)),
      averagePerformance: calculateAverage(trainingData.map((t: any) => t.expectedPerformance)),
      statusDistribution: calculateStatusDistribution(trainingData),
      timeRange
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('Training analytics retrieval failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve training analytics'
    });
  }
});

// Storage analytics endpoint
router.get('/storage', async (req: Request, res: Response) => {
  try {
    // Get storage metrics from storage manager
    const storageStats = await require('../services/storage-manager-clean')
      .StorageManager.prototype.getStorageStats();

    const analytics = {
      totalArchives: storageStats.totalArchives,
      totalSize: storageStats.totalSize,
      averageCompressionRatio: storageStats.averageCompressionRatio,
      statusDistribution: storageStats.statusDistribution,
      costEstimate: calculateStorageCost(storageStats.totalSize),
      efficiency: {
        compressionSavings: calculateCompressionSavings(storageStats),
        storageOptimization: calculateStorageOptimization(storageStats)
      }
    };

    res.json({
      success: true,
      data: analytics
    });

  } catch (error) {
    logger.error('Storage analytics retrieval failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve storage analytics'
    });
  }
});

// Custom report generation endpoint
router.post('/reports', async (req: Request, res: Response) => {
  try {
    const { reportType, timeRange, filters, format } = req.body;

    let reportData;
    switch (reportType) {
      case 'performance':
        reportData = await monitoringService.getPerformanceAnalytics(timeRange);
        break;
      case 'quality':
        reportData = await generateQualityReport(timeRange, filters);
        break;
      case 'business':
        reportData = await monitoringService.getBusinessMetrics();
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid report type'
        });
    }

    // Format report based on requested format
    const formattedReport = await formatReport(reportData, format || 'json');

    res.json({
      success: true,
      data: formattedReport,
      reportType,
      timeRange,
      generatedAt: new Date()
    });

  } catch (error) {
    logger.error('Report generation failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate report'
    });
  }
});

// Export data endpoint
router.get('/export/:type', async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    const { format = 'json', timeRange = '30d' } = req.query;

    let data;
    switch (type) {
      case 'performance':
        data = await monitoringService.getPerformanceAnalytics(timeRange as string);
        break;
      case 'business':
        data = await monitoringService.getBusinessMetrics();
        break;
      case 'system':
        data = await monitoringService.getSystemAnalytics(timeRange as string);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid export type'
        });
    }

    // Set appropriate headers for download
    const filename = `${type}_analytics_${new Date().toISOString().split('T')[0]}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      const csv = convertToCSV(data);
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.json(data);
    }

  } catch (error) {
    logger.error('Data export failed', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export data'
    });
  }
});

// Utility functions
function getTimeRangeStart(timeRange: string): Date {
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

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, val) => sum + val, 0) / values.length);
}

function calculateQualityDistribution(reports: any[]): any {
  const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 };
  
  reports.forEach(report => {
    if (report.overallScore >= 90) distribution.excellent++;
    else if (report.overallScore >= 75) distribution.good++;
    else if (report.overallScore >= 60) distribution.fair++;
    else distribution.poor++;
  });

  return distribution;
}

function calculateQualityTrends(reports: any[]): any {
  if (reports.length < 2) return { trend: 'stable', change: 0 };

  const sorted = reports.sort((a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime());
  const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2));
  const secondHalf = sorted.slice(Math.floor(sorted.length / 2));

  const firstAvg = calculateAverage(firstHalf.map(r => r.overallScore));
  const secondAvg = calculateAverage(secondHalf.map(r => r.overallScore));
  
  const change = secondAvg - firstAvg;
  
  return {
    trend: change > 2 ? 'improving' : change < -2 ? 'declining' : 'stable',
    change: Math.round(change * 10) / 10
  };
}

function calculateStatusDistribution(data: any[]): any {
  const distribution: any = {};
  
  data.forEach(item => {
    distribution[item.status] = (distribution[item.status] || 0) + 1;
  });

  return distribution;
}

function calculateStorageCost(totalSize: number): any {
  // Rough AWS S3 pricing calculation
  const sizeInGB = totalSize / (1024 * 1024 * 1024);
  const standardCost = sizeInGB * 0.023; // $0.023 per GB for standard storage
  const glacierCost = sizeInGB * 0.004; // $0.004 per GB for glacier
  
  return {
    current: Math.round(standardCost * 100) / 100,
    optimized: Math.round(glacierCost * 100) / 100,
    savings: Math.round((standardCost - glacierCost) * 100) / 100
  };
}

function calculateCompressionSavings(stats: any): any {
  const originalSize = stats.totalSize / (stats.averageCompressionRatio || 0.7);
  const savings = originalSize - stats.totalSize;
  
  return {
    originalSize: Math.round(originalSize),
    compressedSize: stats.totalSize,
    savings: Math.round(savings),
    percentage: Math.round((savings / originalSize) * 100)
  };
}

function calculateStorageOptimization(stats: any): any {
  return {
    compressionRatio: stats.averageCompressionRatio,
    efficiency: stats.averageCompressionRatio < 0.5 ? 'excellent' : 
                stats.averageCompressionRatio < 0.7 ? 'good' : 'fair',
    recommendations: generateStorageRecommendations(stats)
  };
}

function generateStorageRecommendations(stats: any): string[] {
  const recommendations = [];
  
  if (stats.averageCompressionRatio > 0.8) {
    recommendations.push('Consider implementing better compression algorithms');
  }
  
  if (stats.statusDistribution.FAILED > 0) {
    recommendations.push('Review and clean up failed archives');
  }
  
  return recommendations;
}

async function generateQualityReport(timeRange: string, filters: any): Promise<any> {
  // Implementation would depend on specific quality control service
  return {
    summary: 'Quality report generated',
    timeRange,
    filters
  };
}

async function formatReport(data: any, format: string): Promise<any> {
  switch (format) {
    case 'csv':
      return convertToCSV(data);
    case 'json':
    default:
      return data;
  }
}

function convertToCSV(data: any): string {
  // Simple CSV conversion - would need more sophisticated implementation for complex data
  if (Array.isArray(data)) {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];
    
    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }
  
  return JSON.stringify(data);
}

export { router as analyticsRoutes };