import { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/database";
import { Logger } from "../utils/logger";

interface QualityMetrics {
  completeness: number;
  reliability: number;
  accuracy: number;
  consistency: number;
  overallScore: number;
}

interface QualityThresholds {
  minimum: number;
  good: number;
  excellent: number;
}

interface ValidationResult {
  isValid: boolean;
  score: number;
  issues: QualityIssue[];
  recommendations: string[];
}

interface QualityIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  severity: number;
  field?: string;
  value?: any;
}

interface QualityReport {
  sessionId: string;
  overallScore: number;
  completenessScore: number;
  reliabilityScore: number;
  accuracyScore: number;
  validationResults: any;
  issues: QualityIssue[];
  recommendations: string[];
  generatedAt: Date;
}

export class QualityControlService {
  private prisma: PrismaClient;
  private logger: Logger;
  private thresholds: QualityThresholds;

  constructor() {
    this.prisma = prisma;
    this.logger = new Logger("QualityControl");
    
    // Default quality thresholds
    this.thresholds = {
      minimum: 60,
      good: 75,
      excellent: 90
    };
  }

  // Main quality validation method
  async validateSessionQuality(sessionId: string): Promise<ValidationResult> {
    try {
      this.logger.info("Starting quality validation", { sessionId });

      // Get session data
      const session = await this.getSessionWithData(sessionId);
      if (!session) {
        return {
          isValid: false,
          score: 0,
          issues: [{ type: 'error', category: 'data', message: 'Session not found', severity: 10 }],
          recommendations: ['Verify session ID is correct']
        };
      }

      // Calculate quality metrics
      const metrics = await this.calculateQualityMetrics(session);
      
      // Identify issues
      const issues = this.identifyQualityIssues(session, metrics);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(metrics, issues);
      
      // Determine if session meets quality standards
      const isValid = metrics.overallScore >= this.thresholds.minimum;

      // Save quality report
      await this.saveQualityReport(sessionId, metrics, issues, recommendations);

      const result: ValidationResult = {
        isValid,
        score: metrics.overallScore,
        issues,
        recommendations
      };

      this.logger.info("Quality validation completed", {
        sessionId,
        score: metrics.overallScore,
        isValid,
        issueCount: issues.length
      });

      return result;

    } catch (error) {
      this.logger.error("Quality validation failed", { sessionId, error });
      return {
        isValid: false,
        score: 0,
        issues: [{ type: 'error', category: 'system', message: 'Validation failed', severity: 10 }],
        recommendations: ['Contact system administrator']
      };
    }
  }

  private async getSessionWithData(sessionId: string): Promise<any> {
    return await this.prisma.unifiedSession.findUnique({
      where: { id: sessionId },
      include: {
        interactions: true,
        screenshots: true
      }
    });
  }

  private async calculateQualityMetrics(session: any): Promise<QualityMetrics> {
    // Calculate completeness score
    const completeness = this.calculateCompleteness(session);
    
    // Calculate reliability score
    const reliability = this.calculateReliability(session);
    
    // Calculate accuracy score
    const accuracy = this.calculateAccuracy(session);
    
    // Calculate consistency score
    const consistency = this.calculateConsistency(session);
    
    // Calculate overall score (weighted average)
    const overallScore = Math.round(
      (completeness * 0.3) +
      (reliability * 0.25) +
      (accuracy * 0.25) +
      (consistency * 0.2)
    );

    return {
      completeness,
      reliability,
      accuracy,
      consistency,
      overallScore
    };
  }

  private calculateCompleteness(session: any): number {
    let score = 0;
    let maxScore = 100;

    // Check basic session data
    if (session.startTime) score += 10;
    if (session.endTime) score += 10;
    if (session.duration && session.duration > 0) score += 10;

    // Check interactions
    if (session.interactions && session.interactions.length > 0) {
      score += 20;
      
      // Bonus for multiple interactions
      if (session.interactions.length >= 5) score += 10;
      if (session.interactions.length >= 10) score += 5;
    }

    // Check screenshots
    if (session.screenshots && session.screenshots.length > 0) {
      score += 15;
      
      // Bonus for multiple screenshots
      if (session.screenshots.length >= 3) score += 10;
    }

    // Check for rich interaction data (enhanced structure)
    const richInteractions = session.interactions?.filter((i: any) => {
      // Check enhanced structure first
      if (i.selectors && i.element && i.state) {
        const hasSelector = i.selectors.primary;
        const hasElementText = i.element.text;
        const hasUrl = i.state.url;
        return hasSelector && hasElementText && hasUrl;
      }
      
      // Fallback to legacy structure
      return i.elementText && i.primarySelector && i.url;
    }).length || 0;
    
    if (richInteractions > 0) {
      score += Math.min(20, richInteractions * 2);
    }

    // Bonus for enhanced structure usage
    const enhancedInteractions = session.interactions?.filter((i: any) => 
      i.selectors && i.visual && i.element && i.context && i.state && i.interaction
    ).length || 0;
    
    if (enhancedInteractions > 0) {
      score += Math.min(10, enhancedInteractions);
    }

    return Math.min(score, maxScore);
  }

  private calculateReliability(session: any): number {
    let score = 70; // Base score
    
    if (!session.interactions || session.interactions.length === 0) {
      return 0;
    }

    // Check selector reliability
    let selectorScore = 0;
    let selectorCount = 0;

    session.interactions.forEach((interaction: any) => {
      // Enhanced structure check
      const primarySelector = interaction.selectors?.primary || interaction.primarySelector;
      const alternatives = interaction.selectors?.alternatives || 
        (interaction.selectorAlternatives ? 
          (typeof interaction.selectorAlternatives === 'string' ? 
            JSON.parse(interaction.selectorAlternatives) : interaction.selectorAlternatives) 
          : []);

      if (primarySelector) {
        selectorCount++;
        
        // Good selector patterns
        if (primarySelector.includes('[data-')) selectorScore += 3;
        else if (primarySelector.includes('#')) selectorScore += 2;
        else if (primarySelector.includes('.')) selectorScore += 1;
        
        // Check for alternative selectors
        if (alternatives && Array.isArray(alternatives) && alternatives.length > 1) {
          selectorScore += 2;
        }
        
        // Enhanced structure bonus points
        if (interaction.selectors?.xpath) selectorScore += 1;
        if (interaction.selectors?.fullPath) selectorScore += 1;
      }
    });

    if (selectorCount > 0) {
      const avgSelectorScore = selectorScore / selectorCount;
      score += Math.min(20, avgSelectorScore * 4);
    }

    // Check for consistent data patterns
    const hasConsistentUrls = this.checkUrlConsistency(session.interactions);
    if (hasConsistentUrls) score += 10;

    return Math.min(score, 100);
  }

  private calculateAccuracy(session: any): number {
    let score = 60; // Base score

    if (!session.interactions || session.interactions.length === 0) {
      return 0;
    }

    // Check for accurate element identification
    let accuracyPoints = 0;
    
    session.interactions.forEach((interaction: any) => {
      // Enhanced structure checks first
      const elementText = interaction.element?.text || interaction.elementText;
      const coordinates = interaction.interaction?.coordinates || {
        clientX: interaction.clientX,
        clientY: interaction.clientY
      };
      const pageTitle = interaction.state?.pageTitle || interaction.pageTitle;
      const viewport = interaction.visual?.viewport || interaction.viewport;
      const boundingBox = interaction.visual?.boundingBox || interaction.boundingBox;

      // Points for having element text
      if (elementText && elementText.trim().length > 0) {
        accuracyPoints += 2;
      }
      
      // Points for having coordinates
      if (coordinates.clientX && coordinates.clientY) {
        accuracyPoints += 1;
      }
      
      // Points for having page context
      if (pageTitle && pageTitle.trim().length > 0) {
        accuracyPoints += 1;
      }
      
      // Points for having viewport information
      if (viewport) {
        accuracyPoints += 1;
      }

      // Enhanced structure bonus points
      if (interaction.element?.attributes && Object.keys(interaction.element.attributes).length > 0) {
        accuracyPoints += 1;
      }
      
      if (interaction.context?.parentElements?.length > 0) {
        accuracyPoints += 1;
      }
      
      if (interaction.visual?.isInViewport !== undefined) {
        accuracyPoints += 1;
      }
      
      if (boundingBox && Object.keys(boundingBox).length > 0) {
        accuracyPoints += 1;
      }
    });

    const avgAccuracyPoints = accuracyPoints / session.interactions.length;
    score += Math.min(30, avgAccuracyPoints * 6);

    // Bonus for screenshot quality
    if (session.screenshots && session.screenshots.length > 0) {
      const qualityScreenshots = session.screenshots.filter((s: any) => s.quality > 70).length;
      const qualityRatio = qualityScreenshots / session.screenshots.length;
      score += Math.round(qualityRatio * 10);
    }

    return Math.min(score, 100);
  }

  private calculateConsistency(session: any): number {
    let score = 70; // Base score

    if (!session.interactions || session.interactions.length < 2) {
      return score;
    }

    // Check timestamp consistency
    const timestamps = session.interactions.map((i: any) => Number(i.timestamp)).sort();
    let timestampConsistency = true;
    
    for (let i = 1; i < timestamps.length; i++) {
      const timeDiff = timestamps[i] - timestamps[i - 1];
      if (timeDiff < 0 || timeDiff > 300000) { // 5 minutes max between interactions
        timestampConsistency = false;
        break;
      }
    }
    
    if (timestampConsistency) score += 15;

    // Check URL consistency (should be from same domain/site)
    const domains = new Set(
      session.interactions
        .map((i: any) => {
          const url = i.state?.url || i.url;
          try {
            return new URL(url).hostname;
          } catch {
            return null;
          }
        })
        .filter(Boolean)
    );
    
    if (domains.size === 1) score += 10; // Single domain
    else if (domains.size <= 2) score += 5; // Max 2 domains

    // Check interaction type consistency
    const interactionTypes = new Set(session.interactions.map((i: any) => i.type));
    if (interactionTypes.size >= 2) score += 5; // Multiple interaction types is good

    return Math.min(score, 100);
  }

  private checkUrlConsistency(interactions: any[]): boolean {
    if (!interactions || interactions.length === 0) return false;
    
    const validUrls = interactions.filter(i => {
      const url = i.state?.url || i.url;
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });
    
    return validUrls.length / interactions.length > 0.8; // 80% valid URLs
  }

  private identifyQualityIssues(session: any, metrics: QualityMetrics): QualityIssue[] {
    const issues: QualityIssue[] = [];

    // Check for critical issues
    if (metrics.completeness < 30) {
      issues.push({
        type: 'error',
        category: 'completeness',
        message: 'Session data is severely incomplete',
        severity: 9
      });
    }

    if (metrics.reliability < 40) {
      issues.push({
        type: 'error',
        category: 'reliability',
        message: 'Selector reliability is too low for training',
        severity: 8
      });
    }

    // Check for warnings
    if (metrics.accuracy < 60) {
      issues.push({
        type: 'warning',
        category: 'accuracy',
        message: 'Element identification accuracy could be improved',
        severity: 5
      });
    }

    if (!session.interactions || session.interactions.length < 3) {
      issues.push({
        type: 'warning',
        category: 'completeness',
        message: 'Session has very few interactions',
        severity: 6
      });
    }

    if (!session.screenshots || session.screenshots.length === 0) {
      issues.push({
        type: 'warning',
        category: 'completeness',
        message: 'No screenshots captured',
        severity: 4
      });
    }

    // Check for info-level issues
    if (metrics.consistency < 80) {
      issues.push({
        type: 'info',
        category: 'consistency',
        message: 'Some data inconsistencies detected',
        severity: 2
      });
    }

    return issues;
  }

  private generateRecommendations(metrics: QualityMetrics, issues: QualityIssue[]): string[] {
    const recommendations: string[] = [];

    // Recommendations based on metrics
    if (metrics.completeness < 70) {
      recommendations.push('Ensure all required session data is captured');
      recommendations.push('Verify browser extension is working correctly');
    }

    if (metrics.reliability < 70) {
      recommendations.push('Improve selector generation to use more reliable patterns');
      recommendations.push('Add more alternative selectors for each element');
    }

    if (metrics.accuracy < 70) {
      recommendations.push('Verify element identification accuracy');
      recommendations.push('Check screenshot quality settings');
    }

    // Recommendations based on issues
    const errorIssues = issues.filter(i => i.type === 'error');
    if (errorIssues.length > 0) {
      recommendations.push('Address critical errors before using session for training');
    }

    const warningIssues = issues.filter(i => i.type === 'warning');
    if (warningIssues.length > 2) {
      recommendations.push('Review session capture settings to improve data quality');
    }

    // General recommendations
    if (metrics.overallScore < this.thresholds.good) {
      recommendations.push('Consider recapturing this session with improved settings');
    }

    return recommendations;
  }

  private async saveQualityReport(
    sessionId: string,
    metrics: QualityMetrics,
    issues: QualityIssue[],
    recommendations: string[]
  ): Promise<void> {
    try {
      await this.prisma.qualityReport.create({
        data: {
          sessionId,
          overallScore: metrics.overallScore,
          completenessScore: metrics.completeness,
          reliabilityScore: metrics.reliability,
          accuracyScore: metrics.accuracy,
          validationResults: metrics as any,
          issues: issues as any,
          recommendations: recommendations as any,
          generatedAt: new Date(),
          version: '1.0'
        }
      });

      // Update session with quality scores
      await this.prisma.unifiedSession.update({
        where: { id: sessionId },
        data: {
          qualityScore: metrics.overallScore,
          completeness: metrics.completeness,
          reliability: metrics.reliability
        }
      });

    } catch (error) {
      this.logger.error("Failed to save quality report", { sessionId, error });
    }
  }

  // Batch quality validation
  async validateMultipleSessions(sessionIds: string[]): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];

    for (const sessionId of sessionIds) {
      try {
        const result = await this.validateSessionQuality(sessionId);
        results.push(result);
      } catch (error) {
        this.logger.error("Batch validation failed for session", { sessionId, error });
        results.push({
          isValid: false,
          score: 0,
          issues: [{ type: 'error', category: 'system', message: 'Validation failed', severity: 10 }],
          recommendations: ['Contact system administrator']
        });
      }
    }

    return results;
  }

  // Quality threshold management
  async updateQualityThresholds(thresholds: Partial<QualityThresholds>): Promise<void> {
    this.thresholds = { ...this.thresholds, ...thresholds };
    
    // Save to database
    await this.prisma.systemConfig.upsert({
      where: { key: 'quality_thresholds' },
      update: { value: this.thresholds as any },
      create: {
        key: 'quality_thresholds',
        value: this.thresholds as any,
        description: 'Quality control thresholds',
        category: 'quality'
      }
    });

    this.logger.info("Quality thresholds updated", this.thresholds);
  }

  async getQualityThresholds(): Promise<QualityThresholds> {
    return this.thresholds;
  }

  // Quality reporting and analytics
  async getQualityReport(sessionId: string): Promise<QualityReport | null> {
    const report = await this.prisma.qualityReport.findFirst({
      where: { sessionId },
      orderBy: { generatedAt: 'desc' }
    });

    if (!report) return null;

    return {
      sessionId: report.sessionId,
      overallScore: report.overallScore,
      completenessScore: report.completenessScore,
      reliabilityScore: report.reliabilityScore,
      accuracyScore: report.accuracyScore,
      validationResults: report.validationResults,
      issues: (report.issues as unknown) as QualityIssue[],
      recommendations: report.recommendations as string[],
      generatedAt: report.generatedAt
    };
  }

  async getQualityStats(): Promise<any> {
    const [
      totalReports,
      avgScore,
      scoreDistribution,
      recentReports
    ] = await Promise.all([
      this.prisma.qualityReport.count(),
      this.prisma.qualityReport.aggregate({
        _avg: { overallScore: true }
      }),
      this.prisma.qualityReport.groupBy({
        by: ['overallScore'],
        _count: true,
        where: {
          generatedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      this.prisma.qualityReport.findMany({
        take: 10,
        orderBy: { generatedAt: 'desc' },
        select: {
          sessionId: true,
          overallScore: true,
          generatedAt: true
        }
      })
    ]);

    // Calculate quality grade distribution
    const gradeDistribution = {
      excellent: 0,
      good: 0,
      acceptable: 0,
      poor: 0
    };

    scoreDistribution.forEach((item: any) => {
      const score = item.overallScore;
      if (score >= this.thresholds.excellent) gradeDistribution.excellent += item._count;
      else if (score >= this.thresholds.good) gradeDistribution.good += item._count;
      else if (score >= this.thresholds.minimum) gradeDistribution.acceptable += item._count;
      else gradeDistribution.poor += item._count;
    });

    return {
      totalReports,
      averageScore: Math.round(avgScore._avg.overallScore || 0),
      gradeDistribution,
      recentReports,
      thresholds: this.thresholds
    };
  }

  // Automatic quality monitoring
  async monitorQualityTrends(): Promise<any> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [monthlyAvg, weeklyAvg] = await Promise.all([
      this.prisma.qualityReport.aggregate({
        _avg: { overallScore: true },
        where: { generatedAt: { gte: thirtyDaysAgo } }
      }),
      this.prisma.qualityReport.aggregate({
        _avg: { overallScore: true },
        where: { generatedAt: { gte: sevenDaysAgo } }
      })
    ]);

    const monthlyScore = monthlyAvg._avg.overallScore || 0;
    const weeklyScore = weeklyAvg._avg.overallScore || 0;
    const trend = weeklyScore - monthlyScore;

    const alerts: string[] = [];
    
    if (weeklyScore < this.thresholds.minimum) {
      alerts.push('Weekly average quality score is below minimum threshold');
    }
    
    if (trend < -5) {
      alerts.push('Quality scores are trending downward');
    }

    return {
      monthlyAverage: Math.round(monthlyScore),
      weeklyAverage: Math.round(weeklyScore),
      trend: Math.round(trend * 10) / 10,
      alerts,
      status: alerts.length > 0 ? 'warning' : 'healthy'
    };
  }

  // Health check
  async healthCheck(): Promise<string> {
    try {
      // Test database connection
      await this.prisma.qualityReport.count();
      return 'connected';
    } catch (error) {
      this.logger.error("Quality control health check failed", error);
      return 'disconnected';
    }
  }

  // Missing methods for compatibility with data-processing-pipeline
  async scoreInteraction(interaction: any): Promise<number> {
    try {
      let score = 0;
      
      // Base score for having an interaction
      score += 20;
      
      // Score based on interaction type
      if (interaction.type === 'CLICK') score += 30;
      else if (interaction.type === 'INPUT') score += 25;
      else if (interaction.type === 'SCROLL') score += 10;
      else score += 15;
      
      // Score based on selector quality (enhanced structure first)
      const primarySelector = interaction.selectors?.primary || interaction.primarySelector;
      if (primarySelector && primarySelector.length > 0) {
        score += 20;
        // Prefer specific selectors
        if (primarySelector.startsWith('#')) score += 10;
        else if (primarySelector.includes('[data-')) score += 8;
        else if (primarySelector.includes('.')) score += 5;
        
        // Enhanced structure bonus
        if (interaction.selectors?.alternatives?.length > 1) score += 5;
        if (interaction.selectors?.xpath) score += 3;
        if (interaction.selectors?.fullPath) score += 2;
      }
      
      // Enhanced structure data quality bonus
      if (interaction.element?.text && interaction.element.text.trim().length > 0) score += 8;
      if (interaction.visual?.boundingBox && Object.keys(interaction.visual.boundingBox).length > 0) score += 5;
      if (interaction.context?.parentElements?.length > 0) score += 5;
      if (interaction.state?.url) score += 3;
      if (interaction.visual?.isInViewport !== undefined) score += 2;
      
      // Score based on confidence or quality score
      const confidenceScore = interaction.confidence || (interaction.qualityScore / 100) || 0;
      if (confidenceScore > 0.8) score += 15;
      else if (confidenceScore > 0.6) score += 10;
      else if (confidenceScore > 0.4) score += 5;
      
      return Math.min(score, 100);
    } catch (error) {
      this.logger.error("Failed to score interaction", { error, interactionId: interaction.id });
      return 0;
    }
  }

  async assessSession(sessionId: string): Promise<any> {
    try {
      const validation = await this.validateSessionQuality(sessionId);
      
      return {
        sessionId,
        overallScore: validation.score,
        isValid: validation.isValid,
        issues: validation.issues,
        recommendations: validation.recommendations,
        assessedAt: new Date()
      };
    } catch (error) {
      this.logger.error("Failed to assess session", { error, sessionId });
      return {
        sessionId,
        overallScore: 0,
        isValid: false,
        issues: [{ type: 'error', category: 'assessment', message: 'Assessment failed', severity: 10 }],
        recommendations: ['Retry assessment'],
        assessedAt: new Date()
      };
    }
  }
}