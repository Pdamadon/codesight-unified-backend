import { Logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

interface QualityScore {
  overall: number;
  completeness: number;
  reliability: number;
  accuracy: number;
  trainingValue: number;
}

interface QualityIssue {
  type: 'missing_data' | 'low_quality' | 'inconsistent' | 'privacy_concern' | 'technical_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  field?: string;
  suggestion?: string;
}

interface QualityReport {
  sessionId: string;
  overallScore: number;
  completenessScore: number;
  reliabilityScore: number;
  accuracyScore: number;
  issues: QualityIssue[];
  recommendations: string[];
  trainingReadiness: boolean;
}

export class QualityControlService {
  private logger: Logger;
  private prisma: PrismaClient;

  // Quality thresholds
  private readonly THRESHOLDS = {
    MINIMUM_INTERACTIONS: 5,
    MINIMUM_SESSION_DURATION: 30000, // 30 seconds
    MINIMUM_PAGES_VISITED: 2,
    MINIMUM_QUALITY_SCORE: 60,
    TRAINING_READY_SCORE: 75,
    MAX_MISSING_SELECTORS: 0.2, // 20% of interactions can have missing selectors
    MIN_SCREENSHOT_QUALITY: 50
  };

  constructor() {
    this.logger = new Logger('QualityControl');
    this.prisma = new PrismaClient();
  }

  // Score individual interaction quality
  async scoreInteraction(interaction: any): Promise<number> {
    let score = 0;
    const maxScore = 100;

    // Base score for having core data
    if (interaction.primarySelector) score += 20;
    if (interaction.elementText) score += 15;
    if (interaction.url) score += 10;

    // Selector quality
    const selectorQuality = this.evaluateSelectorQuality(interaction);
    score += selectorQuality * 0.25; // 25% weight

    // Context richness
    const contextScore = this.evaluateContextRichness(interaction);
    score += contextScore * 0.20; // 20% weight

    // Visual information
    if (interaction.boundingBox && interaction.boundingBox !== '{}') score += 10;
    if (interaction.viewport && interaction.viewport !== '{}') score += 5;

    // State tracking
    if (interaction.stateBefore && interaction.stateBefore !== '{}') score += 5;
    if (interaction.stateChanges && interaction.stateChanges !== '{}') score += 10;

    // User intent (from audio/reasoning)
    if (interaction.userIntent) score += 10;
    if (interaction.userReasoning) score += 5;

    return Math.min(score, maxScore);
  }

  // Evaluate selector quality and reliability
  private evaluateSelectorQuality(interaction: any): number {
    let score = 0;

    // Primary selector quality
    const primarySelector = interaction.primarySelector;
    if (primarySelector) {
      if (primarySelector.includes('data-test') || primarySelector.includes('data-cy')) {
        score += 40; // High quality test selectors
      } else if (primarySelector.startsWith('#')) {
        score += 35; // ID selectors are reliable
      } else if (primarySelector.includes('[aria-label')) {
        score += 30; // ARIA selectors are good
      } else if (primarySelector.includes('[name')) {
        score += 25; // Name attributes are decent
      } else if (primarySelector.startsWith('.')) {
        score += 15; // Class selectors are less reliable
      } else {
        score += 10; // Tag selectors are least reliable
      }
    }

    // Alternative selectors bonus
    try {
      const alternatives = JSON.parse(interaction.selectorAlternatives || '[]');
      if (alternatives.length > 0) {
        score += Math.min(alternatives.length * 5, 20); // Up to 20 points for alternatives
      }
    } catch (e) {
      // Ignore parsing errors
    }

    // XPath availability
    if (interaction.xpath) score += 10;

    // CSS path availability  
    if (interaction.cssPath) score += 10;

    return Math.min(score, 100);
  }

  // Evaluate context richness
  private evaluateContextRichness(interaction: any): number {
    let score = 0;

    // DOM context
    try {
      const parentElements = JSON.parse(interaction.parentElements || '[]');
      score += Math.min(parentElements.length * 5, 20);
    } catch (e) {
      // Ignore parsing errors
    }

    try {
      const siblings = JSON.parse(interaction.siblingElements || '[]');
      score += Math.min(siblings.length * 3, 15);
    } catch (e) {
      // Ignore parsing errors
    }

    try {
      const nearby = JSON.parse(interaction.nearbyElements || '[]');
      score += Math.min(nearby.length * 2, 10);
    } catch (e) {
      // Ignore parsing errors
    }

    // Page structure information
    try {
      const pageStructure = JSON.parse(interaction.pageStructure || '{}');
      const structureKeys = Object.keys(pageStructure);
      score += Math.min(structureKeys.length * 3, 15);
    } catch (e) {
      // Ignore parsing errors
    }

    // Element attributes
    try {
      const attributes = JSON.parse(interaction.elementAttributes || '{}');
      const attrCount = Object.keys(attributes).length;
      score += Math.min(attrCount * 2, 10);
    } catch (e) {
      // Ignore parsing errors
    }

    return Math.min(score, 100);
  }

  // Assess complete session quality
  async assessSession(sessionId: string): Promise<QualityReport> {
    try {
      this.logger.info('Assessing session quality', { sessionId });

      const session = await this.prisma.unifiedSession.findUnique({
        where: { id: sessionId },
        include: {
          interactions: true,
          screenshots: true
        }
      });

      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      const issues: QualityIssue[] = [];
      const recommendations: string[] = [];

      // Calculate individual scores
      const completenessScore = this.assessCompleteness(session, issues);
      const reliabilityScore = this.assessReliability(session, issues);
      const accuracyScore = this.assessAccuracy(session, issues);

      // Calculate overall score
      const overallScore = (completenessScore + reliabilityScore + accuracyScore) / 3;

      // Generate recommendations
      this.generateRecommendations(session, issues, recommendations);

      // Determine training readiness
      const trainingReadiness = overallScore >= this.THRESHOLDS.TRAINING_READY_SCORE && 
                               issues.filter(i => i.severity === 'critical').length === 0;

      const report: QualityReport = {
        sessionId,
        overallScore: Math.round(overallScore),
        completenessScore: Math.round(completenessScore),
        reliabilityScore: Math.round(reliabilityScore),
        accuracyScore: Math.round(accuracyScore),
        issues,
        recommendations,
        trainingReadiness
      };

      // Save quality report
      await this.saveQualityReport(report);

      this.logger.info('Session quality assessment completed', {
        sessionId,
        overallScore: report.overallScore,
        trainingReadiness,
        issueCount: issues.length
      });

      return report;

    } catch (error) {
      this.logger.error('Failed to assess session quality', error, { sessionId });
      throw error;
    }
  }

  // Assess data completeness
  private assessCompleteness(session: any, issues: QualityIssue[]): number {
    let score = 100;
    const interactions = session.interactions || [];
    const screenshots = session.screenshots || [];

    // Check minimum interaction count
    if (interactions.length < this.THRESHOLDS.MINIMUM_INTERACTIONS) {
      score -= 30;
      issues.push({
        type: 'missing_data',
        severity: 'high',
        description: `Only ${interactions.length} interactions captured (minimum: ${this.THRESHOLDS.MINIMUM_INTERACTIONS})`,
        suggestion: 'Encourage users to perform more interactions during sessions'
      });
    }

    // Check session duration
    const duration = session.endTime && session.startTime ? 
      new Date(session.endTime).getTime() - new Date(session.startTime).getTime() : 0;
    
    if (duration < this.THRESHOLDS.MINIMUM_SESSION_DURATION) {
      score -= 20;
      issues.push({
        type: 'missing_data',
        severity: 'medium',
        description: `Session too short: ${Math.round(duration / 1000)}s (minimum: ${this.THRESHOLDS.MINIMUM_SESSION_DURATION / 1000}s)`,
        suggestion: 'Encourage longer shopping sessions for better training data'
      });
    }

    // Check page diversity
    const uniquePages = new Set(interactions.map(i => i.url)).size;
    if (uniquePages < this.THRESHOLDS.MINIMUM_PAGES_VISITED) {
      score -= 15;
      issues.push({
        type: 'missing_data',
        severity: 'medium',
        description: `Only ${uniquePages} unique pages visited (minimum: ${this.THRESHOLDS.MINIMUM_PAGES_VISITED})`,
        suggestion: 'Encourage navigation across multiple pages'
      });
    }

    // Check for missing core data
    const missingSelectors = interactions.filter(i => !i.primarySelector).length;
    const missingSelectorRatio = missingSelectors / interactions.length;
    
    if (missingSelectorRatio > this.THRESHOLDS.MAX_MISSING_SELECTORS) {
      score -= 25;
      issues.push({
        type: 'missing_data',
        severity: 'high',
        description: `${Math.round(missingSelectorRatio * 100)}% of interactions missing selectors`,
        suggestion: 'Improve selector capture in browser extension'
      });
    }

    // Check screenshot availability
    if (screenshots.length === 0) {
      score -= 10;
      issues.push({
        type: 'missing_data',
        severity: 'low',
        description: 'No screenshots captured',
        suggestion: 'Enable screenshot capture for visual context'
      });
    }

    return Math.max(score, 0);
  }

  // Assess data reliability
  private assessReliability(session: any, issues: QualityIssue[]): number {
    let score = 100;
    const interactions = session.interactions || [];

    if (interactions.length === 0) return 0;

    // Check selector reliability
    let totalSelectorScore = 0;
    let lowQualitySelectors = 0;

    for (const interaction of interactions) {
      const selectorScore = this.evaluateSelectorQuality(interaction);
      totalSelectorScore += selectorScore;
      
      if (selectorScore < 30) {
        lowQualitySelectors++;
      }
    }

    const avgSelectorScore = totalSelectorScore / interactions.length;
    const lowQualityRatio = lowQualitySelectors / interactions.length;

    if (avgSelectorScore < 50) {
      score -= 30;
      issues.push({
        type: 'low_quality',
        severity: 'high',
        description: `Average selector quality is low: ${Math.round(avgSelectorScore)}%`,
        suggestion: 'Improve selector generation to use more reliable patterns'
      });
    }

    if (lowQualityRatio > 0.3) {
      score -= 20;
      issues.push({
        type: 'low_quality',
        severity: 'medium',
        description: `${Math.round(lowQualityRatio * 100)}% of interactions have low-quality selectors`,
        suggestion: 'Focus on data-test attributes and ID selectors'
      });
    }

    // Check for consistent interaction patterns
    const interactionTypes = interactions.map(i => i.type);
    const typeVariety = new Set(interactionTypes).size;
    
    if (typeVariety < 2) {
      score -= 15;
      issues.push({
        type: 'inconsistent',
        severity: 'medium',
        description: 'Limited interaction variety - only one type of interaction',
        suggestion: 'Capture diverse interaction types (clicks, inputs, navigation)'
      });
    }

    return Math.max(score, 0);
  }

  // Assess data accuracy
  private assessAccuracy(session: any, issues: QualityIssue[]): number {
    let score = 100;
    const interactions = session.interactions || [];

    // Check for data consistency
    let inconsistentTimestamps = 0;
    let invalidUrls = 0;
    let emptyElements = 0;

    for (let i = 0; i < interactions.length; i++) {
      const interaction = interactions[i];
      
      // Check timestamp consistency
      if (i > 0) {
        const prevTimestamp = Number(interactions[i - 1].timestamp);
        const currentTimestamp = Number(interaction.timestamp);
        
        if (currentTimestamp < prevTimestamp) {
          inconsistentTimestamps++;
        }
      }

      // Check URL validity
      if (!interaction.url || !this.isValidUrl(interaction.url)) {
        invalidUrls++;
      }

      // Check for empty element data
      if (!interaction.elementText && !interaction.primarySelector) {
        emptyElements++;
      }
    }

    // Apply penalties for inaccuracies
    if (inconsistentTimestamps > 0) {
      score -= Math.min(inconsistentTimestamps * 5, 20);
      issues.push({
        type: 'inconsistent',
        severity: 'medium',
        description: `${inconsistentTimestamps} interactions have inconsistent timestamps`,
        suggestion: 'Fix timestamp generation in browser extension'
      });
    }

    if (invalidUrls > 0) {
      score -= Math.min(invalidUrls * 3, 15);
      issues.push({
        type: 'inconsistent',
        severity: 'low',
        description: `${invalidUrls} interactions have invalid URLs`,
        suggestion: 'Improve URL capture and validation'
      });
    }

    if (emptyElements > interactions.length * 0.2) {
      score -= 25;
      issues.push({
        type: 'missing_data',
        severity: 'high',
        description: 'Many interactions missing element identification data',
        suggestion: 'Improve element text and selector capture'
      });
    }

    return Math.max(score, 0);
  }

  // Generate quality improvement recommendations
  private generateRecommendations(session: any, issues: QualityIssue[], recommendations: string[]): void {
    const criticalIssues = issues.filter(i => i.severity === 'critical').length;
    const highIssues = issues.filter(i => i.severity === 'high').length;
    const mediumIssues = issues.filter(i => i.severity === 'medium').length;

    if (criticalIssues > 0) {
      recommendations.push('Address critical data quality issues before using for training');
    }

    if (highIssues > 0) {
      recommendations.push('Improve data collection process to address high-severity issues');
    }

    if (session.interactions.length < 10) {
      recommendations.push('Encourage longer shopping sessions with more interactions');
    }

    if (!session.screenshots || session.screenshots.length === 0) {
      recommendations.push('Enable screenshot capture for visual context in training');
    }

    const hasAudioTranscript = session.interactions.some(i => i.userReasoning);
    if (!hasAudioTranscript) {
      recommendations.push('Include audio transcription for user intent understanding');
    }

    if (mediumIssues > 3) {
      recommendations.push('Review browser extension configuration for better data capture');
    }

    // Add training-specific recommendations
    const overallScore = (this.assessCompleteness(session, []) + 
                         this.assessReliability(session, []) + 
                         this.assessAccuracy(session, [])) / 3;

    if (overallScore >= this.THRESHOLDS.TRAINING_READY_SCORE) {
      recommendations.push('Session is ready for training data generation');
    } else if (overallScore >= this.THRESHOLDS.MINIMUM_QUALITY_SCORE) {
      recommendations.push('Session meets minimum quality but could be improved before training');
    } else {
      recommendations.push('Session quality too low for training - collect more data');
    }
  }

  // Save quality report to database
  private async saveQualityReport(report: QualityReport): Promise<void> {
    try {
      await this.prisma.qualityReport.create({
        data: {
          sessionId: report.sessionId,
          overallScore: report.overallScore,
          completenessScore: report.completenessScore,
          reliabilityScore: report.reliabilityScore,
          accuracyScore: report.accuracyScore,
          validationResults: JSON.stringify({
            trainingReadiness: report.trainingReadiness,
            issueCount: report.issues.length,
            criticalIssues: report.issues.filter(i => i.severity === 'critical').length
          }),
          issues: JSON.stringify(report.issues),
          recommendations: JSON.stringify(report.recommendations)
        }
      });

      // Update session quality scores
      await this.prisma.unifiedSession.update({
        where: { id: report.sessionId },
        data: {
          qualityScore: report.overallScore,
          completeness: report.completenessScore,
          reliability: report.reliabilityScore,
          trainingValue: report.trainingReadiness ? report.overallScore : report.overallScore * 0.7
        }
      });

    } catch (error) {
      this.logger.error('Failed to save quality report', error, { sessionId: report.sessionId });
      throw error;
    }
  }

  // Validate URL format
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Batch quality assessment
  async batchAssessQuality(sessionIds: string[]): Promise<QualityReport[]> {
    const reports: QualityReport[] = [];

    for (const sessionId of sessionIds) {
      try {
        const report = await this.assessSession(sessionId);
        reports.push(report);
      } catch (error) {
        this.logger.error('Failed to assess session in batch', error, { sessionId });
        // Continue with other sessions
      }
    }

    this.logger.info('Batch quality assessment completed', {
      totalSessions: sessionIds.length,
      successfulAssessments: reports.length,
      averageQuality: reports.reduce((sum, r) => sum + r.overallScore, 0) / reports.length || 0
    });

    return reports;
  }

  // Advanced Screenshot Quality Assessment
  async assessScreenshotQuality(screenshot: any): Promise<number> {
    let score = 0;
    const maxScore = 100;

    try {
      // File size check (optimal range: 50KB - 500KB)
      if (screenshot.fileSize) {
        const sizeKB = screenshot.fileSize / 1024;
        if (sizeKB >= 50 && sizeKB <= 500) {
          score += 25; // Optimal size
        } else if (sizeKB < 50) {
          score += 15; // Too small, might lack detail
        } else if (sizeKB <= 1000) {
          score += 20; // Large but acceptable
        } else {
          score += 10; // Too large, inefficient
        }
      }

      // Format check (WebP preferred)
      if (screenshot.format === 'webp') {
        score += 15;
      } else if (screenshot.format === 'png') {
        score += 10;
      } else {
        score += 5;
      }

      // Compression check
      if (screenshot.compressed) {
        score += 10;
      }

      // Event type relevance
      const relevantEvents = ['click', 'navigation', 'modal_detected', 'form_submit'];
      if (relevantEvents.some(event => screenshot.eventType?.includes(event))) {
        score += 15;
      }

      // Timing check (not too frequent, not too sparse)
      if (screenshot.sessionId) {
        const recentScreenshots = await this.getRecentScreenshots(screenshot.sessionId, 10000); // Last 10 seconds
        if (recentScreenshots.length <= 3) {
          score += 10; // Good frequency
        } else if (recentScreenshots.length <= 5) {
          score += 5; // Acceptable frequency
        }
        // No points for too many screenshots
      }

      // Vision analysis bonus
      if (screenshot.visionAnalysis) {
        try {
          const analysis = JSON.parse(screenshot.visionAnalysis);
          if (analysis && Object.keys(analysis).length > 0) {
            score += 15;
          }
        } catch (e) {
          // Ignore parsing errors
        }
      }

      // Quality metadata
      if (screenshot.quality && screenshot.quality > 0.7) {
        score += 10;
      }

      this.logger.debug('Screenshot quality assessed', {
        screenshotId: screenshot.id,
        score,
        fileSize: screenshot.fileSize,
        format: screenshot.format
      });

    } catch (error) {
      this.logger.error('Failed to assess screenshot quality', error, {
        screenshotId: screenshot.id
      });
      return 0;
    }

    return Math.min(score, maxScore);
  }

  // Advanced Selector Reliability Testing
  async testSelectorReliability(selector: string, sessionId: string): Promise<number> {
    try {
      // Get page context from session
      const session = await this.prisma.unifiedSession.findUnique({
        where: { id: sessionId },
        include: { interactions: true }
      });

      if (!session) return 0;

      let reliabilityScore = 0;

      // Base reliability by selector type
      if (selector.includes('data-test') || selector.includes('data-cy') || selector.includes('data-qa')) {
        reliabilityScore = 95; // Test attributes are highly reliable
      } else if (selector.startsWith('#')) {
        reliabilityScore = 90; // ID selectors are very reliable
      } else if (selector.includes('[aria-label')) {
        reliabilityScore = 85; // ARIA labels are reliable
      } else if (selector.includes('[name')) {
        reliabilityScore = 75; // Name attributes are good
      } else if (selector.startsWith('.') && !this.hasUnstableClasses(selector)) {
        reliabilityScore = 60; // Stable class selectors
      } else if (selector.startsWith('.')) {
        reliabilityScore = 40; // Potentially unstable classes
      } else {
        reliabilityScore = 30; // Generic selectors
      }

      // Test uniqueness across similar pages
      const similarPages = session.interactions
        .map(i => i.url)
        .filter((url, index, arr) => arr.indexOf(url) === index); // Unique URLs

      if (similarPages.length > 1) {
        // Bonus for selectors that work across multiple pages
        reliabilityScore += 5;
      }

      // Check for dynamic content indicators
      if (this.hasDynamicContentIndicators(selector)) {
        reliabilityScore -= 20;
      }

      // Length penalty (very long selectors are fragile)
      if (selector.length > 200) {
        reliabilityScore -= 15;
      } else if (selector.length > 100) {
        reliabilityScore -= 10;
      }

      return Math.max(0, Math.min(100, reliabilityScore));

    } catch (error) {
      this.logger.error('Failed to test selector reliability', error, { selector, sessionId });
      return 0;
    }
  }

  // Check for unstable CSS classes
  private hasUnstableClasses(selector: string): boolean {
    const unstablePatterns = [
      /\d{8,}/, // Long numbers (likely generated)
      /^[a-f0-9]{8,}$/i, // Hash-like strings
      /css-\w+/i, // CSS-in-JS generated
      /sc-\w+/i, // Styled-components
      /emotion-\w+/i, // Emotion CSS
      /(active|hover|focus|selected|current)/i, // State classes
      /(is-|has-)/i // BEM-style state classes
    ];

    return unstablePatterns.some(pattern => pattern.test(selector));
  }

  // Check for dynamic content indicators
  private hasDynamicContentIndicators(selector: string): boolean {
    const dynamicIndicators = [
      /\[\d+\]/, // Array indices in XPath
      /:nth-child\(\d+\)/, // Positional selectors
      /timestamp/i,
      /random/i,
      /uuid/i,
      /guid/i
    ];

    return dynamicIndicators.some(pattern => pattern.test(selector));
  }

  // Get recent screenshots for frequency analysis
  private async getRecentScreenshots(sessionId: string, timeWindow: number): Promise<any[]> {
    const cutoff = new Date(Date.now() - timeWindow);
    
    return await this.prisma.screenshot.findMany({
      where: {
        sessionId,
        timestamp: {
          gte: BigInt(cutoff.getTime())
        }
      },
      orderBy: { timestamp: 'desc' }
    });
  }

  // Overall Session Quality Calculation with Advanced Metrics
  async calculateOverallSessionQuality(sessionId: string): Promise<QualityScore> {
    try {
      const session = await this.prisma.unifiedSession.findUnique({
        where: { id: sessionId },
        include: {
          interactions: true,
          screenshots: true
        }
      });

      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Calculate component scores
      const completeness = this.assessCompleteness(session, []);
      const reliability = this.assessReliability(session, []);
      const accuracy = this.assessAccuracy(session, []);

      // Calculate screenshot quality average
      let screenshotQuality = 0;
      if (session.screenshots.length > 0) {
        const screenshotScores = await Promise.all(
          session.screenshots.map(screenshot => this.assessScreenshotQuality(screenshot))
        );
        screenshotQuality = screenshotScores.reduce((sum, score) => sum + score, 0) / screenshotScores.length;
      }

      // Calculate selector reliability average
      let selectorReliability = 0;
      const clickInteractions = session.interactions.filter(i => i.type === 'CLICK' && i.primarySelector);
      if (clickInteractions.length > 0) {
        const selectorScores = await Promise.all(
          clickInteractions.map(interaction => 
            this.testSelectorReliability(interaction.primarySelector, sessionId)
          )
        );
        selectorReliability = selectorScores.reduce((sum, score) => sum + score, 0) / selectorScores.length;
      }

      // Calculate training value based on shopping behavior patterns
      const trainingValue = this.calculateTrainingValue(session);

      // Weighted overall score
      const weights = {
        completeness: 0.25,
        reliability: 0.20,
        accuracy: 0.20,
        screenshotQuality: 0.15,
        selectorReliability: 0.10,
        trainingValue: 0.10
      };

      const overall = (
        completeness * weights.completeness +
        reliability * weights.reliability +
        accuracy * weights.accuracy +
        screenshotQuality * weights.screenshotQuality +
        selectorReliability * weights.selectorReliability +
        trainingValue * weights.trainingValue
      );

      const qualityScore: QualityScore = {
        overall: Math.round(overall),
        completeness: Math.round(completeness),
        reliability: Math.round(reliability),
        accuracy: Math.round(accuracy),
        trainingValue: Math.round(trainingValue)
      };

      this.logger.info('Overall session quality calculated', {
        sessionId,
        qualityScore,
        screenshotQuality: Math.round(screenshotQuality),
        selectorReliability: Math.round(selectorReliability)
      });

      return qualityScore;

    } catch (error) {
      this.logger.error('Failed to calculate overall session quality', error, { sessionId });
      throw error;
    }
  }

  // Calculate training value based on shopping behavior patterns
  private calculateTrainingValue(session: any): number {
    let score = 50; // Base score
    const interactions = session.interactions || [];
    
    // Shopping-specific patterns
    const urls = interactions.map(i => i.url).filter(Boolean);
    const uniqueUrls = new Set(urls);
    
    // Page diversity bonus
    if (uniqueUrls.size >= 3) score += 15;
    else if (uniqueUrls.size >= 2) score += 10;
    
    // Shopping behavior indicators
    const hasProductPages = urls.some(url => url.includes('product') || url.includes('item'));
    const hasCartActions = interactions.some(i => 
      i.elementText?.toLowerCase().includes('cart') || 
      i.elementText?.toLowerCase().includes('add to cart')
    );
    const hasSearchBehavior = interactions.some(i => 
      i.type === 'INPUT' || 
      i.url?.includes('search') || 
      i.elementText?.toLowerCase().includes('search')
    );
    const hasNavigation = interactions.some(i => i.type === 'NAVIGATION');
    
    if (hasProductPages) score += 10;
    if (hasCartActions) score += 15;
    if (hasSearchBehavior) score += 10;
    if (hasNavigation) score += 5;
    
    // Interaction variety bonus
    const interactionTypes = new Set(interactions.map(i => i.type));
    score += Math.min(interactionTypes.size * 3, 15);
    
    // User intent data bonus
    const hasUserIntent = interactions.some(i => i.userIntent || i.userReasoning);
    if (hasUserIntent) score += 10;
    
    // Session duration consideration
    const duration = session.endTime && session.startTime ? 
      new Date(session.endTime).getTime() - new Date(session.startTime).getTime() : 0;
    
    if (duration >= 60000 && duration <= 600000) { // 1-10 minutes is optimal
      score += 10;
    } else if (duration >= 30000) { // At least 30 seconds
      score += 5;
    }
    
    return Math.min(score, 100);
  }

  // Batch quality scoring for multiple sessions
  async batchCalculateQuality(sessionIds: string[]): Promise<Map<string, QualityScore>> {
    const results = new Map<string, QualityScore>();
    
    this.logger.info('Starting batch quality calculation', { sessionCount: sessionIds.length });
    
    for (const sessionId of sessionIds) {
      try {
        const qualityScore = await this.calculateOverallSessionQuality(sessionId);
        results.set(sessionId, qualityScore);
      } catch (error) {
        this.logger.error('Failed to calculate quality for session in batch', error, { sessionId });
        // Set default low quality score for failed sessions
        results.set(sessionId, {
          overall: 0,
          completeness: 0,
          reliability: 0,
          accuracy: 0,
          trainingValue: 0
        });
      }
    }
    
    const avgQuality = Array.from(results.values())
      .reduce((sum, score) => sum + score.overall, 0) / results.size;
    
    this.logger.info('Batch quality calculation completed', {
      sessionCount: sessionIds.length,
      averageQuality: Math.round(avgQuality),
      successfulCalculations: results.size
    });
    
    return results;
  }

  // Get quality statistics
  async getQualityStatistics(): Promise<any> {
    try {
      const stats = await this.prisma.qualityReport.aggregate({
        _avg: {
          overallScore: true,
          completenessScore: true,
          reliabilityScore: true,
          accuracyScore: true
        },
        _min: {
          overallScore: true
        },
        _max: {
          overallScore: true
        },
        _count: true
      });

      const recentReports = await this.prisma.qualityReport.findMany({
        take: 10,
        orderBy: { generatedAt: 'desc' },
        select: {
          sessionId: true,
          overallScore: true,
          generatedAt: true
        }
      });

      return {
        summary: {
          totalReports: stats._count,
          averageQuality: Math.round(stats._avg.overallScore || 0),
          minQuality: stats._min.overallScore || 0,
          maxQuality: stats._max.overallScore || 0,
          averageCompleteness: Math.round(stats._avg.completenessScore || 0),
          averageReliability: Math.round(stats._avg.reliabilityScore || 0),
          averageAccuracy: Math.round(stats._avg.accuracyScore || 0)
        },
        recentReports
      };

    } catch (error) {
      this.logger.error('Failed to get quality statistics', error);
      throw error;
    }
  }
}