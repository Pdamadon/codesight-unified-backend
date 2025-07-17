import { PrismaClient } from "@prisma/client";
import { Logger } from "../utils/logger";
import { DataValidationService, SessionValidationResult } from "./data-validation";

interface QualityThreshold {
  id: string;
  name: string;
  description: string;
  category: 'overall' | 'completeness' | 'reliability' | 'consistency' | 'training_readiness';
  minScore: number;
  maxScore: number;
  action: 'reject' | 'flag' | 'warn' | 'accept';
  priority: number; // 1-10, higher = more important
  enabled: boolean;
  conditions?: ThresholdCondition[];
}

interface ThresholdCondition {
  field: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'contains' | 'not_contains';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

interface QualityAssessment {
  sessionId: string;
  overallScore: number;
  categoryScores: Record<string, number>;
  thresholdResults: ThresholdResult[];
  finalAction: 'accept' | 'reject' | 'flag' | 'warn';
  actionReason: string;
  recommendations: QualityRecommendation[];
  improvementSuggestions: string[];
  trainingEligible: boolean;
  assessmentTimestamp: Date;
}

interface ThresholdResult {
  thresholdId: string;
  thresholdName: string;
  passed: boolean;
  actualScore: number;
  requiredScore: number;
  action: string;
  priority: number;
  message: string;
}

interface QualityRecommendation {
  category: string;
  priority: 'high' | 'medium' | 'low';
  message: string;
  actionable: boolean;
  estimatedImpact: number; // Expected score improvement
}

interface QualityTrend {
  sessionId: string;
  timestamp: Date;
  overallScore: number;
  categoryScores: Record<string, number>;
  action: string;
}

interface QualityMetrics {
  totalSessions: number;
  acceptedSessions: number;
  rejectedSessions: number;
  flaggedSessions: number;
  averageScore: number;
  categoryAverages: Record<string, number>;
  trendData: QualityTrend[];
  thresholdPerformance: Record<string, { triggered: number; total: number }>;
}

export class QualityThresholdService {
  private prisma: PrismaClient;
  private logger: Logger;
  private validationService: DataValidationService;
  private thresholds: Map<string, QualityThreshold> = new Map();
  private qualityTrends: QualityTrend[] = [];

  constructor(prisma: PrismaClient, validationService: DataValidationService) {
    this.prisma = prisma;
    this.logger = new Logger("QualityThreshold");
    this.validationService = validationService;
    
    this.initializeDefaultThresholds();
  }

  private initializeDefaultThresholds() {
    // Overall Quality Thresholds
    this.addThreshold({
      id: 'minimum_overall_quality',
      name: 'Minimum Overall Quality',
      description: 'Minimum acceptable overall quality score for any session',
      category: 'overall',
      minScore: 40,
      maxScore: 100,
      action: 'reject',
      priority: 10,
      enabled: true
    });

    this.addThreshold({
      id: 'good_overall_quality',
      name: 'Good Overall Quality',
      description: 'Threshold for good quality sessions',
      category: 'overall',
      minScore: 70,
      maxScore: 100,
      action: 'accept',
      priority: 8,
      enabled: true
    });

    this.addThreshold({
      id: 'marginal_overall_quality',
      name: 'Marginal Overall Quality',
      description: 'Sessions that need review but may be acceptable',
      category: 'overall',
      minScore: 40,
      maxScore: 69,
      action: 'flag',
      priority: 6,
      enabled: true
    });

    // Training Readiness Thresholds
    this.addThreshold({
      id: 'training_minimum_quality',
      name: 'Training Minimum Quality',
      description: 'Minimum quality required for training data',
      category: 'training_readiness',
      minScore: 60,
      maxScore: 100,
      action: 'accept',
      priority: 9,
      enabled: true
    });

    this.addThreshold({
      id: 'training_premium_quality',
      name: 'Training Premium Quality',
      description: 'High-quality sessions ideal for training',
      category: 'training_readiness',
      minScore: 85,
      maxScore: 100,
      action: 'accept',
      priority: 10,
      enabled: true
    });

    // Completeness Thresholds
    this.addThreshold({
      id: 'minimum_completeness',
      name: 'Minimum Completeness',
      description: 'Minimum data completeness required',
      category: 'completeness',
      minScore: 50,
      maxScore: 100,
      action: 'reject',
      priority: 8,
      enabled: true
    });

    this.addThreshold({
      id: 'good_completeness',
      name: 'Good Completeness',
      description: 'Good level of data completeness',
      category: 'completeness',
      minScore: 75,
      maxScore: 100,
      action: 'accept',
      priority: 7,
      enabled: true
    });

    // Reliability Thresholds
    this.addThreshold({
      id: 'minimum_reliability',
      name: 'Minimum Reliability',
      description: 'Minimum selector and data reliability',
      category: 'reliability',
      minScore: 45,
      maxScore: 100,
      action: 'reject',
      priority: 7,
      enabled: true
    });

    this.addThreshold({
      id: 'good_reliability',
      name: 'Good Reliability',
      description: 'Good level of data reliability',
      category: 'reliability',
      minScore: 70,
      maxScore: 100,
      action: 'accept',
      priority: 6,
      enabled: true
    });

    // Consistency Thresholds
    this.addThreshold({
      id: 'minimum_consistency',
      name: 'Minimum Consistency',
      description: 'Minimum data consistency required',
      category: 'consistency',
      minScore: 50,
      maxScore: 100,
      action: 'reject',
      priority: 6,
      enabled: true
    });

    // Conditional Thresholds
    this.addThreshold({
      id: 'human_session_enhanced',
      name: 'Enhanced Human Session Quality',
      description: 'Higher standards for human-collected sessions',
      category: 'overall',
      minScore: 65,
      maxScore: 100,
      action: 'flag',
      priority: 8,
      enabled: true,
      conditions: [
        {
          field: 'type',
          operator: 'eq',
          value: 'HUMAN'
        }
      ]
    });

    this.addThreshold({
      id: 'short_session_quality',
      name: 'Short Session Quality Boost',
      description: 'Lower quality threshold for very short sessions',
      category: 'overall',
      minScore: 35,
      maxScore: 100,
      action: 'flag',
      priority: 5,
      enabled: true,
      conditions: [
        {
          field: 'duration',
          operator: 'lt',
          value: 60000 // 1 minute
        }
      ]
    });
  }

  // Main assessment method
  async assessSessionQuality(sessionId: string): Promise<QualityAssessment> {
    try {
      this.logger.info("Starting quality assessment", { sessionId });

      // Get validation results
      const validationResult = await this.validationService.validateSession(sessionId);

      // Evaluate against all thresholds
      const thresholdResults = await this.evaluateThresholds(validationResult);

      // Determine final action
      const { finalAction, actionReason } = this.determineFinalAction(thresholdResults);

      // Generate recommendations
      const recommendations = this.generateQualityRecommendations(validationResult, thresholdResults);

      // Generate improvement suggestions
      const improvementSuggestions = this.generateImprovementSuggestions(validationResult, thresholdResults);

      // Determine training eligibility
      const trainingEligible = this.determineTrainingEligibility(validationResult, thresholdResults);

      const assessment: QualityAssessment = {
        sessionId,
        overallScore: validationResult.overallScore,
        categoryScores: validationResult.categoryScores,
        thresholdResults,
        finalAction,
        actionReason,
        recommendations,
        improvementSuggestions,
        trainingEligible,
        assessmentTimestamp: new Date()
      };

      // Store quality trend data
      this.recordQualityTrend(assessment);

      // Update session status based on assessment
      await this.updateSessionStatus(sessionId, assessment);

      this.logger.info("Quality assessment completed", {
        sessionId,
        finalAction,
        overallScore: validationResult.overallScore,
        trainingEligible
      });

      return assessment;

    } catch (error) {
      this.logger.error("Quality assessment failed", error, { sessionId });
      throw error;
    }
  }

  // Evaluate session against all applicable thresholds
  private async evaluateThresholds(validationResult: SessionValidationResult): Promise<ThresholdResult[]> {
    const results: ThresholdResult[] = [];

    // Get session data for condition evaluation
    const session = await this.prisma.unifiedSession.findUnique({
      where: { id: validationResult.sessionId }
    });

    if (!session) {
      throw new Error(`Session ${validationResult.sessionId} not found`);
    }

    for (const [thresholdId, threshold] of this.thresholds) {
      if (!threshold.enabled) continue;

      // Check if threshold conditions are met
      if (threshold.conditions && !this.evaluateConditions(threshold.conditions, session)) {
        continue;
      }

      // Get the relevant score for this threshold
      const actualScore = this.getRelevantScore(threshold.category, validationResult);

      // Evaluate threshold
      const passed = actualScore >= threshold.minScore && actualScore <= threshold.maxScore;

      results.push({
        thresholdId,
        thresholdName: threshold.name,
        passed,
        actualScore,
        requiredScore: threshold.minScore,
        action: threshold.action,
        priority: threshold.priority,
        message: this.generateThresholdMessage(threshold, actualScore, passed)
      });
    }

    // Sort by priority (highest first)
    return results.sort((a, b) => b.priority - a.priority);
  }

  // Evaluate threshold conditions
  private evaluateConditions(conditions: ThresholdCondition[], session: any): boolean {
    let result = true;
    let currentLogicalOp: 'AND' | 'OR' = 'AND';

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, session);

      if (currentLogicalOp === 'AND') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      currentLogicalOp = condition.logicalOperator || 'AND';
    }

    return result;
  }

  // Evaluate individual condition
  private evaluateCondition(condition: ThresholdCondition, session: any): boolean {
    const fieldValue = this.getFieldValue(condition.field, session);

    switch (condition.operator) {
      case 'gt':
        return fieldValue > condition.value;
      case 'gte':
        return fieldValue >= condition.value;
      case 'lt':
        return fieldValue < condition.value;
      case 'lte':
        return fieldValue <= condition.value;
      case 'eq':
        return fieldValue === condition.value;
      case 'neq':
        return fieldValue !== condition.value;
      case 'contains':
        return String(fieldValue).includes(String(condition.value));
      case 'not_contains':
        return !String(fieldValue).includes(String(condition.value));
      default:
        return false;
    }
  }

  // Get field value from session object
  private getFieldValue(field: string, session: any): any {
    const parts = field.split('.');
    let value = session;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    // Special calculated fields
    if (field === 'duration' && session.startTime && session.endTime) {
      return new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
    }

    return value;
  }

  // Get relevant score for threshold category
  private getRelevantScore(category: string, validationResult: SessionValidationResult): number {
    switch (category) {
      case 'overall':
        return validationResult.overallScore;
      case 'completeness':
        return validationResult.categoryScores.completeness || 0;
      case 'reliability':
        return validationResult.categoryScores.reliability || 0;
      case 'consistency':
        return validationResult.categoryScores.consistency || 0;
      case 'training_readiness':
        return validationResult.trainingReadiness ? 100 : 0;
      default:
        return validationResult.overallScore;
    }
  }

  // Determine final action based on threshold results
  private determineFinalAction(thresholdResults: ThresholdResult[]): { finalAction: 'accept' | 'reject' | 'flag' | 'warn', actionReason: string } {
    // Check for any critical failures (reject actions)
    const rejectResults = thresholdResults.filter(r => !r.passed && r.action === 'reject');
    if (rejectResults.length > 0) {
      const highestPriorityReject = rejectResults[0];
      return {
        finalAction: 'reject',
        actionReason: `Failed critical threshold: ${highestPriorityReject.thresholdName} (score: ${highestPriorityReject.actualScore}, required: ${highestPriorityReject.requiredScore})`
      };
    }

    // Check for flag conditions
    const flagResults = thresholdResults.filter(r => !r.passed && r.action === 'flag');
    if (flagResults.length > 0) {
      const reasons = flagResults.map(r => r.thresholdName).join(', ');
      return {
        finalAction: 'flag',
        actionReason: `Flagged for review: ${reasons}`
      };
    }

    // Check for warnings
    const warnResults = thresholdResults.filter(r => !r.passed && r.action === 'warn');
    if (warnResults.length > 0) {
      const reasons = warnResults.map(r => r.thresholdName).join(', ');
      return {
        finalAction: 'warn',
        actionReason: `Quality concerns: ${reasons}`
      };
    }

    // Default to accept if no issues
    return {
      finalAction: 'accept',
      actionReason: 'All quality thresholds passed'
    };
  }

  // Generate quality recommendations
  private generateQualityRecommendations(validationResult: SessionValidationResult, thresholdResults: ThresholdResult[]): QualityRecommendation[] {
    const recommendations: QualityRecommendation[] = [];

    // Analyze failed thresholds
    const failedThresholds = thresholdResults.filter(r => !r.passed);

    for (const failed of failedThresholds) {
      const threshold = this.thresholds.get(failed.thresholdId);
      if (!threshold) continue;

      const scoreDiff = failed.requiredScore - failed.actualScore;
      const impact = Math.min(scoreDiff, 20); // Cap impact at 20 points

      switch (threshold.category) {
        case 'completeness':
          recommendations.push({
            category: 'Data Collection',
            priority: 'high',
            message: 'Increase session duration and interaction count to improve completeness',
            actionable: true,
            estimatedImpact: impact
          });
          break;

        case 'reliability':
          recommendations.push({
            category: 'Technical Quality',
            priority: 'high',
            message: 'Improve selector quality and reduce fragile selectors',
            actionable: true,
            estimatedImpact: impact
          });
          break;

        case 'consistency':
          recommendations.push({
            category: 'Data Quality',
            priority: 'medium',
            message: 'Fix timestamp inconsistencies and data ordering issues',
            actionable: true,
            estimatedImpact: impact
          });
          break;

        case 'overall':
          recommendations.push({
            category: 'General Quality',
            priority: 'high',
            message: 'Focus on improving data collection methodology and validation',
            actionable: true,
            estimatedImpact: impact
          });
          break;
      }
    }

    // Add specific recommendations based on validation errors
    const criticalErrors = validationResult.errors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > 0) {
      recommendations.push({
        category: 'Critical Issues',
        priority: 'high',
        message: `Address ${criticalErrors.length} critical validation errors`,
        actionable: true,
        estimatedImpact: 25
      });
    }

    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  }

  // Generate improvement suggestions
  private generateImprovementSuggestions(validationResult: SessionValidationResult, thresholdResults: ThresholdResult[]): string[] {
    const suggestions: string[] = [];

    // Analyze patterns in failed thresholds
    const failedCategories = new Set(
      thresholdResults
        .filter(r => !r.passed)
        .map(r => this.thresholds.get(r.thresholdId)?.category)
        .filter(Boolean)
    );

    if (failedCategories.has('completeness')) {
      suggestions.push("Encourage longer user sessions with more interactions");
      suggestions.push("Implement better screenshot capture timing");
      suggestions.push("Add prompts to guide users through complete workflows");
    }

    if (failedCategories.has('reliability')) {
      suggestions.push("Improve selector generation algorithms");
      suggestions.push("Add fallback selectors for better reliability");
      suggestions.push("Implement selector testing before capture");
    }

    if (failedCategories.has('consistency')) {
      suggestions.push("Fix timestamp synchronization issues");
      suggestions.push("Implement better data ordering validation");
      suggestions.push("Add consistency checks during data collection");
    }

    // Add suggestions based on validation warnings
    const warningCategories = new Set(validationResult.warnings.map(w => w.category));
    
    if (warningCategories.has('structural')) {
      suggestions.push("Strengthen data structure validation at collection time");
    }

    if (warningCategories.has('quality')) {
      suggestions.push("Implement real-time quality feedback during sessions");
    }

    return suggestions.slice(0, 8); // Limit to top 8 suggestions
  }

  // Determine training eligibility
  private determineTrainingEligibility(validationResult: SessionValidationResult, thresholdResults: ThresholdResult[]): boolean {
    // Must pass basic validation
    if (!validationResult.trainingReadiness) {
      return false;
    }

    // Must not be rejected
    const hasRejectAction = thresholdResults.some(r => !r.passed && r.action === 'reject');
    if (hasRejectAction) {
      return false;
    }

    // Must meet training-specific thresholds
    const trainingThresholds = thresholdResults.filter(r => 
      this.thresholds.get(r.thresholdId)?.category === 'training_readiness'
    );

    return trainingThresholds.every(t => t.passed);
  }

  // Record quality trend data
  private recordQualityTrend(assessment: QualityAssessment) {
    const trend: QualityTrend = {
      sessionId: assessment.sessionId,
      timestamp: assessment.assessmentTimestamp,
      overallScore: assessment.overallScore,
      categoryScores: assessment.categoryScores,
      action: assessment.finalAction
    };

    this.qualityTrends.push(trend);

    // Keep only last 1000 trends to prevent memory issues
    if (this.qualityTrends.length > 1000) {
      this.qualityTrends = this.qualityTrends.slice(-1000);
    }
  }

  // Update session status based on assessment
  private async updateSessionStatus(sessionId: string, assessment: QualityAssessment) {
    try {
      const status = this.mapActionToStatus(assessment.finalAction);
      
      await this.prisma.unifiedSession.update({
        where: { id: sessionId },
        data: {
          status: status as any,
          qualityScore: assessment.overallScore,
          completeness: assessment.categoryScores.completeness || 0,
          reliability: assessment.categoryScores.reliability || 0,
          trainingEligible: assessment.trainingEligible,
          qualityAssessment: JSON.stringify({
            finalAction: assessment.finalAction,
            actionReason: assessment.actionReason,
            recommendations: assessment.recommendations,
            thresholdResults: assessment.thresholdResults
          })
        }
      });

    } catch (error) {
      this.logger.error("Failed to update session status", error, { sessionId });
    }
  }

  // Map assessment action to session status
  private mapActionToStatus(action: string): string {
    switch (action) {
      case 'accept':
        return 'COMPLETED';
      case 'reject':
        return 'FAILED';
      case 'flag':
        return 'REVIEW_REQUIRED';
      case 'warn':
        return 'COMPLETED';
      default:
        return 'PROCESSING';
    }
  }

  // Generate threshold message
  private generateThresholdMessage(threshold: QualityThreshold, actualScore: number, passed: boolean): string {
    if (passed) {
      return `${threshold.name}: Passed (${actualScore}/${threshold.minScore})`;
    } else {
      const deficit = threshold.minScore - actualScore;
      return `${threshold.name}: Failed by ${deficit} points (${actualScore}/${threshold.minScore})`;
    }
  }

  // Utility methods for threshold management
  addThreshold(threshold: QualityThreshold) {
    this.thresholds.set(threshold.id, threshold);
    this.logger.info("Quality threshold added", { thresholdId: threshold.id, name: threshold.name });
  }

  removeThreshold(thresholdId: string) {
    this.thresholds.delete(thresholdId);
    this.logger.info("Quality threshold removed", { thresholdId });
  }

  updateThreshold(thresholdId: string, updates: Partial<QualityThreshold>) {
    const existing = this.thresholds.get(thresholdId);
    if (existing) {
      this.thresholds.set(thresholdId, { ...existing, ...updates });
      this.logger.info("Quality threshold updated", { thresholdId, updates });
    }
  }

  getThreshold(thresholdId: string): QualityThreshold | undefined {
    return this.thresholds.get(thresholdId);
  }

  getAllThresholds(): QualityThreshold[] {
    return Array.from(this.thresholds.values());
  }

  // Analytics and reporting methods
  async getQualityMetrics(timeRange?: { start: Date; end: Date }): Promise<QualityMetrics> {
    try {
      let trends = this.qualityTrends;
      
      if (timeRange) {
        trends = trends.filter(t => 
          t.timestamp >= timeRange.start && t.timestamp <= timeRange.end
        );
      }

      const totalSessions = trends.length;
      const acceptedSessions = trends.filter(t => t.action === 'accept').length;
      const rejectedSessions = trends.filter(t => t.action === 'reject').length;
      const flaggedSessions = trends.filter(t => t.action === 'flag').length;

      const averageScore = totalSessions > 0 
        ? trends.reduce((sum, t) => sum + t.overallScore, 0) / totalSessions 
        : 0;

      // Calculate category averages
      const categoryAverages: Record<string, number> = {};
      const categories = ['completeness', 'reliability', 'consistency', 'quality'];
      
      for (const category of categories) {
        const scores = trends
          .map(t => t.categoryScores[category])
          .filter(score => score !== undefined);
        
        categoryAverages[category] = scores.length > 0
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length
          : 0;
      }

      // Calculate threshold performance
      const thresholdPerformance: Record<string, { triggered: number; total: number }> = {};
      for (const [thresholdId] of this.thresholds) {
        thresholdPerformance[thresholdId] = { triggered: 0, total: totalSessions };
      }

      return {
        totalSessions,
        acceptedSessions,
        rejectedSessions,
        flaggedSessions,
        averageScore: Math.round(averageScore),
        categoryAverages,
        trendData: trends.slice(-100), // Last 100 trends
        thresholdPerformance
      };

    } catch (error) {
      this.logger.error("Failed to get quality metrics", error);
      throw error;
    }
  }

  // Batch assessment for multiple sessions
  async assessMultipleSessions(sessionIds: string[]): Promise<QualityAssessment[]> {
    const assessments: QualityAssessment[] = [];

    for (const sessionId of sessionIds) {
      try {
        const assessment = await this.assessSessionQuality(sessionId);
        assessments.push(assessment);
      } catch (error) {
        this.logger.error("Failed to assess session", error, { sessionId });
      }
    }

    return assessments;
  }
}