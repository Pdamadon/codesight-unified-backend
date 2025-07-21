import { PrismaClient } from "@prisma/client";
import { Logger } from "../utils/logger";
import { getErrorMessage } from "../utils/type-helpers";

interface ValidationRule {
  id: string;
  name: string;
  description: string;
  category: 'structural' | 'business' | 'quality' | 'completeness' | 'consistency';
  severity: 'critical' | 'major' | 'minor' | 'warning';
  enabled: boolean;
  validator: (data: any, context?: any) => ValidationResult;
  weight: number; // Impact on overall score (1-10)
}

interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata?: Record<string, any>;
}

interface ValidationError {
  ruleId: string;
  severity: 'critical' | 'major' | 'minor';
  message: string;
  field?: string;
  value?: any;
  suggestion?: string;
  category: string;
}

interface ValidationWarning {
  ruleId: string;
  message: string;
  field?: string;
  value?: any;
  suggestion?: string;
  category: string;
}

export interface SessionValidationResult {
  sessionId: string;
  isValid: boolean;
  overallScore: number;
  categoryScores: Record<string, number>;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metrics: ValidationMetrics;
  recommendations: string[];
  trainingReadiness: boolean;
  processingTimestamp: Date;
}

interface ValidationMetrics {
  totalRulesExecuted: number;
  rulesPassedCount: number;
  rulesFailedCount: number;
  criticalErrorsCount: number;
  majorErrorsCount: number;
  minorErrorsCount: number;
  warningsCount: number;
  completenessScore: number;
  reliabilityScore: number;
  qualityScore: number;
  consistencyScore: number;
  validationDuration: number;
}

interface StreamValidationResult {
  sessionId: string;
  dataType: string;
  isValid: boolean;
  score: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  timestamp: Date;
}

export class DataValidationService {
  private prisma: PrismaClient;
  private logger: Logger;
  private validationRules: Map<string, ValidationRule> = new Map();
  private businessRules: Map<string, ValidationRule> = new Map();
  private performanceMetrics: Map<string, number> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.logger = new Logger("DataValidation");
    
    this.initializeValidationRules();
    this.initializeBusinessRules();
  }

  private initializeValidationRules() {
    // Structural Validation Rules
    this.addValidationRule({
      id: 'session_basic_structure',
      name: 'Session Basic Structure',
      description: 'Validates that session has required basic fields',
      category: 'structural',
      severity: 'critical',
      enabled: true,
      weight: 10,
      validator: (session: any) => {
        const errors: ValidationError[] = [];
        let score = 100;

        if (!session.id) {
          errors.push({
            ruleId: 'session_basic_structure',
            severity: 'critical',
            message: 'Session ID is required',
            field: 'id',
            category: 'structural',
            suggestion: 'Ensure session ID is generated and provided'
          });
          score -= 50;
        }

        if (!session.startTime) {
          errors.push({
            ruleId: 'session_basic_structure',
            severity: 'critical',
            message: 'Session start time is required',
            field: 'startTime',
            category: 'structural',
            suggestion: 'Set startTime when session begins'
          });
          score -= 30;
        }

        if (!session.type || !['HUMAN', 'AUTOMATED', 'HYBRID'].includes(session.type)) {
          errors.push({
            ruleId: 'session_basic_structure',
            severity: 'major',
            message: 'Invalid or missing session type',
            field: 'type',
            value: session.type,
            category: 'structural',
            suggestion: 'Set type to HUMAN, AUTOMATED, or HYBRID'
          });
          score -= 20;
        }

        return {
          isValid: errors.length === 0,
          score: Math.max(0, score),
          errors,
          warnings: []
        };
      }
    });

    this.addValidationRule({
      id: 'interaction_structure',
      name: 'Interaction Structure Validation',
      description: 'Validates interaction data structure and required fields',
      category: 'structural',
      severity: 'major',
      enabled: true,
      weight: 8,
      validator: (interactions: any[]) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        let score = 100;

        if (!Array.isArray(interactions)) {
          errors.push({
            ruleId: 'interaction_structure',
            severity: 'critical',
            message: 'Interactions must be an array',
            category: 'structural',
            suggestion: 'Provide interactions as an array'
          });
          return { isValid: false, score: 0, errors, warnings };
        }

        interactions.forEach((interaction, index) => {
          if (!interaction.type) {
            errors.push({
              ruleId: 'interaction_structure',
              severity: 'major',
              message: `Interaction ${index} missing type`,
              field: `interactions[${index}].type`,
              category: 'structural',
              suggestion: 'Set interaction type (CLICK, INPUT, etc.)'
            });
            score -= 5;
          }

          if (!interaction.timestamp) {
            errors.push({
              ruleId: 'interaction_structure',
              severity: 'major',
              message: `Interaction ${index} missing timestamp`,
              field: `interactions[${index}].timestamp`,
              category: 'structural',
              suggestion: 'Include timestamp for each interaction'
            });
            score -= 5;
          }

          if (!interaction.primarySelector && !interaction.elementTag) {
            warnings.push({
              ruleId: 'interaction_structure',
              message: `Interaction ${index} missing element identification`,
              field: `interactions[${index}]`,
              category: 'structural',
              suggestion: 'Include primarySelector or elementTag'
            });
            score -= 2;
          }
        });

        return {
          isValid: errors.filter(e => e.severity === 'critical').length === 0,
          score: Math.max(0, score),
          errors,
          warnings
        };
      }
    });

    this.addValidationRule({
      id: 'screenshot_structure',
      name: 'Screenshot Structure Validation',
      description: 'Validates screenshot data structure and metadata',
      category: 'structural',
      severity: 'major',
      enabled: true,
      weight: 6,
      validator: (screenshots: any[]) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        let score = 100;

        if (!Array.isArray(screenshots)) {
          errors.push({
            ruleId: 'screenshot_structure',
            severity: 'major',
            message: 'Screenshots must be an array',
            category: 'structural',
            suggestion: 'Provide screenshots as an array'
          });
          return { isValid: false, score: 0, errors, warnings };
        }

        screenshots.forEach((screenshot, index) => {
          if (!screenshot.timestamp) {
            errors.push({
              ruleId: 'screenshot_structure',
              severity: 'major',
              message: `Screenshot ${index} missing timestamp`,
              field: `screenshots[${index}].timestamp`,
              category: 'structural',
              suggestion: 'Include timestamp for each screenshot'
            });
            score -= 10;
          }

          if (!screenshot.s3Key && !screenshot.dataUrl) {
            errors.push({
              ruleId: 'screenshot_structure',
              severity: 'major',
              message: `Screenshot ${index} missing image data`,
              field: `screenshots[${index}]`,
              category: 'structural',
              suggestion: 'Include either s3Key or dataUrl'
            });
            score -= 15;
          }

          if (!screenshot.eventType) {
            warnings.push({
              ruleId: 'screenshot_structure',
              message: `Screenshot ${index} missing event type`,
              field: `screenshots[${index}].eventType`,
              category: 'structural',
              suggestion: 'Specify the event that triggered the screenshot'
            });
            score -= 3;
          }
        });

        return {
          isValid: errors.filter(e => e.severity === 'critical').length === 0,
          score: Math.max(0, score),
          errors,
          warnings
        };
      }
    });

    // Completeness Validation Rules
    this.addValidationRule({
      id: 'session_completeness',
      name: 'Session Completeness Check',
      description: 'Validates that session has sufficient data for training',
      category: 'completeness',
      severity: 'major',
      enabled: true,
      weight: 9,
      validator: (session: any) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        let score = 100;

        const interactions = session.interactions || [];
        const screenshots = session.screenshots || [];

        // Minimum interaction count
        if (interactions.length < 3) {
          errors.push({
            ruleId: 'session_completeness',
            severity: 'major',
            message: 'Insufficient interactions for meaningful training data',
            field: 'interactions',
            value: interactions.length,
            category: 'completeness',
            suggestion: 'Sessions should have at least 3 interactions'
          });
          score -= 40;
        } else if (interactions.length < 5) {
          warnings.push({
            ruleId: 'session_completeness',
            message: 'Low interaction count may reduce training value',
            field: 'interactions',
            value: interactions.length,
            category: 'completeness',
            suggestion: 'Consider encouraging longer sessions'
          });
          score -= 10;
        }

        // Session duration check
        if (session.startTime && session.endTime) {
          const duration = new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
          if (duration < 30000) { // 30 seconds
            errors.push({
              ruleId: 'session_completeness',
              severity: 'major',
              message: 'Session too short for meaningful data',
              field: 'duration',
              value: Math.round(duration / 1000),
              category: 'completeness',
              suggestion: 'Sessions should be at least 30 seconds long'
            });
            score -= 30;
          }
        }

        // Screenshot coverage
        if (screenshots.length === 0) {
          warnings.push({
            ruleId: 'session_completeness',
            message: 'No screenshots captured - visual context missing',
            field: 'screenshots',
            category: 'completeness',
            suggestion: 'Enable screenshot capture for better training data'
          });
          score -= 15;
        } else if (screenshots.length < interactions.length * 0.3) {
          warnings.push({
            ruleId: 'session_completeness',
            message: 'Low screenshot to interaction ratio',
            field: 'screenshots',
            category: 'completeness',
            suggestion: 'Increase screenshot capture frequency'
          });
          score -= 10;
        }

        return {
          isValid: errors.filter(e => e.severity === 'critical').length === 0,
          score: Math.max(0, score),
          errors,
          warnings
        };
      }
    });

    // Quality Validation Rules
    this.addValidationRule({
      id: 'selector_quality',
      name: 'Selector Quality Validation',
      description: 'Validates quality and reliability of element selectors',
      category: 'quality',
      severity: 'major',
      enabled: true,
      weight: 7,
      validator: (interactions: any[]) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        let score = 100;

        let missingSelectorCount = 0;
        let lowQualitySelectorCount = 0;

        interactions.forEach((interaction, index) => {
          if (!interaction.primarySelector) {
            missingSelectorCount++;
            errors.push({
              ruleId: 'selector_quality',
              severity: 'major',
              message: `Interaction ${index} missing primary selector`,
              field: `interactions[${index}].primarySelector`,
              category: 'quality',
              suggestion: 'Ensure all interactions have reliable selectors'
            });
          } else {
            // Check selector quality
            const selector = interaction.primarySelector;
            if (selector.includes('nth-child') || selector.includes('nth-of-type')) {
              lowQualitySelectorCount++;
              warnings.push({
                ruleId: 'selector_quality',
                message: `Interaction ${index} uses fragile nth-child selector`,
                field: `interactions[${index}].primarySelector`,
                value: selector,
                category: 'quality',
                suggestion: 'Use more stable selectors like IDs or data attributes'
              });
              score -= 5;
            }

            if (selector.length > 200) {
              warnings.push({
                ruleId: 'selector_quality',
                message: `Interaction ${index} has overly complex selector`,
                field: `interactions[${index}].primarySelector`,
                category: 'quality',
                suggestion: 'Simplify selector for better reliability'
              });
              score -= 3;
            }
          }
        });

        // Calculate score based on missing selectors
        const missingSelectorRatio = missingSelectorCount / Math.max(interactions.length, 1);
        score -= missingSelectorRatio * 50;

        return {
          isValid: missingSelectorRatio < 0.2, // Allow up to 20% missing selectors
          score: Math.max(0, score),
          errors,
          warnings,
          metadata: {
            missingSelectorCount,
            lowQualitySelectorCount,
            missingSelectorRatio
          }
        };
      }
    });

    // Consistency Validation Rules
    this.addValidationRule({
      id: 'timestamp_consistency',
      name: 'Timestamp Consistency Check',
      description: 'Validates that timestamps are logical and consistent',
      category: 'consistency',
      severity: 'major',
      enabled: true,
      weight: 6,
      validator: (session: any) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        let score = 100;

        const interactions = session.interactions || [];
        const screenshots = session.screenshots || [];

        // Check interaction timestamp order
        for (let i = 1; i < interactions.length; i++) {
          const prevTimestamp = Number(interactions[i-1].timestamp);
          const currTimestamp = Number(interactions[i].timestamp);

          if (currTimestamp < prevTimestamp) {
            errors.push({
              ruleId: 'timestamp_consistency',
              severity: 'major',
              message: `Interaction ${i} has timestamp before previous interaction`,
              field: `interactions[${i}].timestamp`,
              category: 'consistency',
              suggestion: 'Ensure interactions are ordered chronologically'
            });
            score -= 15;
          }

          // Check for unrealistic time gaps
          const timeDiff = currTimestamp - prevTimestamp;
          if (timeDiff > 300000) { // 5 minutes
            warnings.push({
              ruleId: 'timestamp_consistency',
              message: `Large time gap (${Math.round(timeDiff/1000)}s) between interactions ${i-1} and ${i}`,
              field: `interactions[${i}].timestamp`,
              category: 'consistency',
              suggestion: 'Investigate potential session interruption'
            });
            score -= 5;
          }
        }

        // Check session time boundaries
        if (session.startTime && interactions.length > 0) {
          const firstInteractionTime = Number(interactions[0].timestamp);
          const sessionStartTime = new Date(session.startTime).getTime();

          if (firstInteractionTime < sessionStartTime) {
            errors.push({
              ruleId: 'timestamp_consistency',
              severity: 'major',
              message: 'First interaction timestamp before session start time',
              field: 'interactions[0].timestamp',
              category: 'consistency',
              suggestion: 'Ensure session start time is set correctly'
            });
            score -= 20;
          }
        }

        return {
          isValid: errors.filter(e => e.severity === 'critical').length === 0,
          score: Math.max(0, score),
          errors,
          warnings
        };
      }
    });
  }

  private initializeBusinessRules() {
    // Training Readiness Rules
    this.addBusinessRule({
      id: 'training_readiness',
      name: 'Training Data Readiness',
      description: 'Determines if session data is ready for AI training',
      category: 'business',
      severity: 'major',
      enabled: true,
      weight: 10,
      validator: (session: any) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        let score = 100;

        // Check minimum quality thresholds
        if (session.qualityScore < 60) {
          errors.push({
            ruleId: 'training_readiness',
            severity: 'major',
            message: 'Quality score below training threshold',
            field: 'qualityScore',
            value: session.qualityScore,
            category: 'business',
            suggestion: 'Improve data collection quality or exclude from training'
          });
          score -= 40;
        }

        // Check completeness
        if (session.completeness < 70) {
          errors.push({
            ruleId: 'training_readiness',
            severity: 'major',
            message: 'Session completeness below training threshold',
            field: 'completeness',
            value: session.completeness,
            category: 'business',
            suggestion: 'Ensure sessions capture complete user journeys'
          });
          score -= 30;
        }

        // Check reliability
        if (session.reliability < 60) {
          warnings.push({
            ruleId: 'training_readiness',
            message: 'Low reliability score may affect training quality',
            field: 'reliability',
            value: session.reliability,
            category: 'business',
            suggestion: 'Improve selector reliability and data consistency'
          });
          score -= 15;
        }

        // Check for psychology insights
        if (!session.dominantPersonality && !session.emotionalState) {
          warnings.push({
            ruleId: 'training_readiness',
            message: 'Missing psychology insights reduces training value',
            field: 'psychology',
            category: 'business',
            suggestion: 'Ensure psychology analysis is completed'
          });
          score -= 10;
        }

        return {
          isValid: errors.length === 0,
          score: Math.max(0, score),
          errors,
          warnings
        };
      }
    });

    // Data Privacy Rules
    this.addBusinessRule({
      id: 'privacy_compliance',
      name: 'Privacy and PII Compliance',
      description: 'Ensures session data complies with privacy requirements',
      category: 'business',
      severity: 'critical',
      enabled: true,
      weight: 9,
      validator: (session: any) => {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        let score = 100;

        const interactions = session.interactions || [];

        // Check for potential PII in interaction data
        interactions.forEach((interaction: any, index: number) => {
          if (interaction.elementValue) {
            const value = interaction.elementValue.toLowerCase();
            
            // Email pattern
            if (value.includes('@') && value.includes('.')) {
              errors.push({
                ruleId: 'privacy_compliance',
                severity: 'critical',
                message: `Potential email address in interaction ${index}`,
                field: `interactions[${index}].elementValue`,
                category: 'business',
                suggestion: 'Remove or mask PII data before storage'
              });
              score -= 30;
            }

            // Phone number pattern
            if (/\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(value)) {
              errors.push({
                ruleId: 'privacy_compliance',
                severity: 'critical',
                message: `Potential phone number in interaction ${index}`,
                field: `interactions[${index}].elementValue`,
                category: 'business',
                suggestion: 'Remove or mask PII data before storage'
              });
              score -= 30;
            }

            // Credit card pattern
            if (/\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/.test(value)) {
              errors.push({
                ruleId: 'privacy_compliance',
                severity: 'critical',
                message: `Potential credit card number in interaction ${index}`,
                field: `interactions[${index}].elementValue`,
                category: 'business',
                suggestion: 'Remove or mask PII data before storage'
              });
              score -= 50;
            }
          }
        });

        // Check for IP address exposure
        if (session.ipAddress && !this.isPrivateIP(session.ipAddress)) {
          warnings.push({
            ruleId: 'privacy_compliance',
            message: 'Public IP address stored - consider privacy implications',
            field: 'ipAddress',
            value: session.ipAddress,
            category: 'business',
            suggestion: 'Consider hashing or removing IP addresses'
          });
          score -= 10;
        }

        return {
          isValid: errors.filter(e => e.severity === 'critical').length === 0,
          score: Math.max(0, score),
          errors,
          warnings
        };
      }
    });
  }

  // Main validation methods
  async validateSession(sessionId: string): Promise<SessionValidationResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info("Starting session validation", { sessionId });

      // Get session data
      const session = await this.prisma.unifiedSession.findUnique({
        where: { id: sessionId },
        include: {
          interactions: {
            orderBy: { timestamp: 'asc' }
          },
          screenshots: {
            orderBy: { timestamp: 'asc' }
          }
        }
      });

      if (!session) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Normalize interactions from both legacy and enhanced sources
      const enhancedInteractions = Array.isArray(session.enhancedInteractions) 
        ? session.enhancedInteractions as any[]
        : [];
      
      // Ensure interactions is an array before normalization
      const legacyInteractions = Array.isArray(session.interactions) ? session.interactions : [];
      
      const allInteractions = [
        // Legacy flat interactions
        ...legacyInteractions.map(this.normalizeInteraction),
        // Enhanced JSON interactions  
        ...enhancedInteractions.map(this.normalizeEnhancedInteraction)
      ].sort((a, b) => a.timestamp - b.timestamp);
      
      // Replace session.interactions with normalized data for validation
      const normalizedSession = {
        ...session,
        interactions: allInteractions
      };

      // Execute all validation rules
      const validationResults = await this.executeValidationRules(normalizedSession);
      const businessResults = await this.executeBusinessRules(normalizedSession);

      // Combine results
      const allErrors = [...validationResults.errors, ...businessResults.errors];
      const allWarnings = [...validationResults.warnings, ...businessResults.warnings];

      // Calculate overall score
      const overallScore = this.calculateOverallScore(validationResults, businessResults);

      // Calculate category scores
      const categoryScores = this.calculateCategoryScores(validationResults, businessResults);

      // Generate recommendations
      const recommendations = this.generateRecommendations(allErrors, allWarnings, session);

      // Determine training readiness
      const trainingReadiness = this.determineTrainingReadiness(overallScore, allErrors, session);

      // Calculate metrics
      const metrics = this.calculateValidationMetrics(
        validationResults,
        businessResults,
        Date.now() - startTime
      );

      const result: SessionValidationResult = {
        sessionId,
        isValid: allErrors.filter(e => e.severity === 'critical').length === 0,
        overallScore,
        categoryScores,
        errors: allErrors,
        warnings: allWarnings,
        metrics,
        recommendations,
        trainingReadiness,
        processingTimestamp: new Date()
      };

      // Update performance metrics
      this.updatePerformanceMetrics('session_validation', Date.now() - startTime);

      this.logger.info("Session validation completed", {
        sessionId,
        overallScore,
        isValid: result.isValid,
        trainingReadiness,
        errorCount: allErrors.length,
        warningCount: allWarnings.length,
        duration: Date.now() - startTime
      });

      return result;

    } catch (error) {
      this.logger.error("Session validation failed", error, { sessionId });
      throw error;
    }
  }

  // Stream data validation for real-time processing
  async validateStreamData(data: any, dataType: 'interaction' | 'screenshot' | 'session_metadata'): Promise<StreamValidationResult> {
    const startTime = Date.now();

    try {
      const sessionId = data.sessionId || 'unknown';
      
      // Get relevant validation rules for data type
      const relevantRules = this.getRelevantRulesForDataType(dataType);
      
      const errors: ValidationError[] = [];
      const warnings: ValidationWarning[] = [];
      let totalScore = 0;
      let ruleCount = 0;

      // Execute relevant rules
      for (const rule of relevantRules) {
        if (!rule.enabled) continue;

        try {
          const result = rule.validator(data);
          totalScore += result.score * (rule.weight / 10);
          ruleCount++;
          
          errors.push(...result.errors);
          warnings.push(...result.warnings);
        } catch (error) {
          this.logger.warn(`Validation rule ${rule.id} failed`, { error: getErrorMessage(error) });
        }
      }

      const averageScore = ruleCount > 0 ? totalScore / ruleCount : 0;

      const result: StreamValidationResult = {
        sessionId,
        dataType,
        isValid: errors.filter(e => e.severity === 'critical').length === 0,
        score: Math.round(averageScore),
        errors,
        warnings,
        timestamp: new Date()
      };

      // Update performance metrics
      this.updatePerformanceMetrics('stream_validation', Date.now() - startTime);

      return result;

    } catch (error) {
      this.logger.error("Stream data validation failed", error, { dataType });
      throw error;
    }
  }

  // Execute all validation rules
  private async executeValidationRules(session: any): Promise<{ errors: ValidationError[], warnings: ValidationWarning[], scores: Record<string, number> }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const scores: Record<string, number> = {};

    for (const [ruleId, rule] of this.validationRules) {
      if (!rule.enabled) continue;

      try {
        let data;
        // Determine what data to pass to the validator  
        switch (ruleId) {
          case 'interaction_structure':
          case 'selector_quality':
            // Use the normalized interactions from the session parameter (not the original session)
            data = session.interactions || [];
            break;
          case 'screenshot_structure':
            data = session.screenshots || [];
            break;
          default:
            data = session;
        }

        const result = rule.validator(data, session);
        scores[ruleId] = result.score;
        
        errors.push(...result.errors);
        warnings.push(...result.warnings);

      } catch (error) {
        this.logger.warn(`Validation rule ${ruleId} failed`, { error: getErrorMessage(error) });
        scores[ruleId] = 0;
      }
    }

    return { errors, warnings, scores };
  }

  // Execute business rules
  private async executeBusinessRules(session: any): Promise<{ errors: ValidationError[], warnings: ValidationWarning[], scores: Record<string, number> }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const scores: Record<string, number> = {};

    for (const [ruleId, rule] of this.businessRules) {
      if (!rule.enabled) continue;

      try {
        const result = rule.validator(session);
        scores[ruleId] = result.score;
        
        errors.push(...result.errors);
        warnings.push(...result.warnings);

      } catch (error) {
        this.logger.warn(`Business rule ${ruleId} failed`, { error: getErrorMessage(error) });
        scores[ruleId] = 0;
      }
    }

    return { errors, warnings, scores };
  }

  // Calculate overall validation score
  private calculateOverallScore(validationResults: any, businessResults: any): number {
    const allScores: Record<string, number> = { ...validationResults.scores, ...businessResults.scores };
    const ruleWeights = new Map<string, ValidationRule>([...this.validationRules, ...this.businessRules]);

    let weightedSum = 0;
    let totalWeight = 0;

    for (const [ruleId, score] of Object.entries(allScores)) {
      const rule = ruleWeights.get(ruleId);
      if (rule) {
        weightedSum += score * rule.weight;
        totalWeight += rule.weight;
      }
    }

    return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  }

  // Calculate category-specific scores
  private calculateCategoryScores(validationResults: any, businessResults: any): Record<string, number> {
    const allScores: Record<string, number> = { ...validationResults.scores, ...businessResults.scores };
    const ruleWeights = new Map<string, ValidationRule>([...this.validationRules, ...this.businessRules]);
    
    const categoryScores: Record<string, { sum: number, weight: number }> = {};

    for (const [ruleId, score] of Object.entries(allScores)) {
      const rule = ruleWeights.get(ruleId);
      if (rule) {
        if (!categoryScores[rule.category]) {
          categoryScores[rule.category] = { sum: 0, weight: 0 };
        }
        categoryScores[rule.category].sum += score * rule.weight;
        categoryScores[rule.category].weight += rule.weight;
      }
    }

    const finalScores: Record<string, number> = {};
    for (const [category, data] of Object.entries(categoryScores)) {
      finalScores[category] = data.weight > 0 ? Math.round(data.sum / data.weight) : 0;
    }

    return finalScores;
  }

  // Generate recommendations based on validation results
  private generateRecommendations(errors: ValidationError[], warnings: ValidationWarning[], session: any): string[] {
    const recommendations: string[] = [];
    const errorCategories = new Set(errors.map(e => e.category));
    const warningCategories = new Set(warnings.map(w => w.category));

    // Critical error recommendations
    if (errors.some(e => e.severity === 'critical')) {
      recommendations.push("Address critical errors before using this session for training");
    }

    // Category-specific recommendations
    if (errorCategories.has('structural')) {
      recommendations.push("Fix structural data issues to ensure proper data processing");
    }

    if (errorCategories.has('completeness') || warningCategories.has('completeness')) {
      recommendations.push("Improve session completeness by encouraging longer user interactions");
    }

    if (errorCategories.has('quality') || warningCategories.has('quality')) {
      recommendations.push("Enhance data quality by improving selector reliability and capture methods");
    }

    if (errorCategories.has('consistency')) {
      recommendations.push("Review data collection process to ensure timestamp and data consistency");
    }

    if (errorCategories.has('business')) {
      recommendations.push("Address business rule violations before proceeding with training");
    }

    // Session-specific recommendations
    const interactions = session.interactions || [];
    const screenshots = session.screenshots || [];

    if (interactions.length < 5) {
      recommendations.push("Consider implementing incentives for longer user sessions");
    }

    if (screenshots.length === 0) {
      recommendations.push("Enable screenshot capture to improve training data quality");
    }

    if (session.qualityScore < 70) {
      recommendations.push("Review and improve data collection methodology");
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  // Determine if session is ready for training
  private determineTrainingReadiness(overallScore: number, errors: ValidationError[], session: any): boolean {
    // Must have no critical errors
    if (errors.some(e => e.severity === 'critical')) {
      return false;
    }

    // Must meet minimum score threshold
    if (overallScore < 60) {
      return false;
    }

    // Must have minimum data requirements
    const interactions = session.interactions || [];
    if (interactions.length < 3) {
      return false;
    }

    // Must have reasonable quality scores
    if (session.qualityScore < 50 || session.completeness < 60) {
      return false;
    }

    return true;
  }

  // Calculate validation metrics
  private calculateValidationMetrics(validationResults: any, businessResults: any, duration: number): ValidationMetrics {
    const allErrors = [...validationResults.errors, ...businessResults.errors];
    const allWarnings = [...validationResults.warnings, ...businessResults.warnings];
    const allScores: Record<string, number> = { ...validationResults.scores, ...businessResults.scores };

    const totalRules = Object.keys(allScores).length;
    const passedRules = Object.values(allScores).filter(score => score > 70).length;
    const failedRules = totalRules - passedRules;

    return {
      totalRulesExecuted: totalRules,
      rulesPassedCount: passedRules,
      rulesFailedCount: failedRules,
      criticalErrorsCount: allErrors.filter(e => e.severity === 'critical').length,
      majorErrorsCount: allErrors.filter(e => e.severity === 'major').length,
      minorErrorsCount: allErrors.filter(e => e.severity === 'minor').length,
      warningsCount: allWarnings.length,
      completenessScore: allScores['session_completeness'] || 0,
      reliabilityScore: allScores['selector_quality'] || 0,
      qualityScore: this.calculateOverallScore(validationResults, businessResults),
      consistencyScore: allScores['timestamp_consistency'] || 0,
      validationDuration: duration
    };
  }

  // Get relevant rules for data type
  private getRelevantRulesForDataType(dataType: string): ValidationRule[] {
    const relevantRules: ValidationRule[] = [];

    switch (dataType) {
      case 'interaction':
        relevantRules.push(
          this.validationRules.get('interaction_structure')!,
          this.validationRules.get('selector_quality')!,
          this.businessRules.get('privacy_compliance')!
        );
        break;
      case 'screenshot':
        relevantRules.push(
          this.validationRules.get('screenshot_structure')!
        );
        break;
      case 'session_metadata':
        relevantRules.push(
          this.validationRules.get('session_basic_structure')!,
          this.businessRules.get('privacy_compliance')!
        );
        break;
    }

    return relevantRules.filter(rule => rule && rule.enabled);
  }

  // Utility methods
  private addValidationRule(rule: ValidationRule): void {
    this.validationRules.set(rule.id, rule);
  }

  private addBusinessRule(rule: ValidationRule): void {
    this.businessRules.set(rule.id, rule);
  }

  private updatePerformanceMetrics(operation: string, duration: number): void {
    const key = `${operation}_avg_duration`;
    const currentAvg = this.performanceMetrics.get(key) || duration;
    const newAvg = (currentAvg + duration) / 2;
    this.performanceMetrics.set(key, newAvg);
  }

  private isPrivateIP(ip: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^127\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/
    ];

    return privateRanges.some(range => range.test(ip));
  }

  // Public API methods
  async getValidationRules(): Promise<ValidationRule[]> {
    return Array.from(this.validationRules.values());
  }

  async getBusinessRules(): Promise<ValidationRule[]> {
    return Array.from(this.businessRules.values());
  }

  async enableRule(ruleId: string): Promise<void> {
    const rule = this.validationRules.get(ruleId) || this.businessRules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      this.logger.info("Validation rule enabled", { ruleId });
    }
  }

  async disableRule(ruleId: string): Promise<void> {
    const rule = this.validationRules.get(ruleId) || this.businessRules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      this.logger.info("Validation rule disabled", { ruleId });
    }
  }

  async getPerformanceMetrics(): Promise<Record<string, number>> {
    return Object.fromEntries(this.performanceMetrics);
  }

  async getValidationStats(): Promise<any> {
    const totalRules = this.validationRules.size + this.businessRules.size;
    const enabledRules = Array.from(this.validationRules.values()).filter(r => r.enabled).length +
                        Array.from(this.businessRules.values()).filter(r => r.enabled).length;

    const categoryDistribution: Record<string, number> = {};
    const allRules = [...Array.from(this.validationRules.values()), ...Array.from(this.businessRules.values())];
    allRules.forEach(rule => {
      categoryDistribution[rule.category] = (categoryDistribution[rule.category] || 0) + 1;
    });

    return {
      totalRules,
      enabledRules,
      disabledRules: totalRules - enabledRules,
      categoryDistribution,
      performanceMetrics: Object.fromEntries(this.performanceMetrics)
    };
  }

  // Batch validation
  async validateMultipleSessions(sessionIds: string[]): Promise<Map<string, SessionValidationResult>> {
    const results = new Map<string, SessionValidationResult>();

    this.logger.info("Starting batch session validation", {
      sessionCount: sessionIds.length
    });

    for (const sessionId of sessionIds) {
      try {
        const result = await this.validateSession(sessionId);
        results.set(sessionId, result);
      } catch (error) {
        this.logger.error("Failed to validate session in batch", error, { sessionId });
      }
    }

    const avgScore = Array.from(results.values())
      .reduce((sum, result) => sum + result.overallScore, 0) / results.size;

    this.logger.info("Batch session validation completed", {
      sessionCount: sessionIds.length,
      successfulValidations: results.size,
      averageScore: Math.round(avgScore)
    });

    return results;
  }

  // Normalization methods for different interaction formats
  private normalizeInteraction(interaction: any): any {
    // For legacy flat interactions stored in interactions table
    return {
      id: interaction.id,
      type: interaction.type,
      timestamp: Number(interaction.timestamp),
      // Extract data from JSON fields
      url: typeof interaction.context === 'object' && interaction.context?.url 
        ? interaction.context.url 
        : null,
      elementText: typeof interaction.element === 'object' && interaction.element?.text
        ? interaction.element.text
        : null,
      elementTag: typeof interaction.element === 'object' && interaction.element?.tag
        ? interaction.element.tag
        : null,
      primarySelector: typeof interaction.selectors === 'object' && interaction.selectors?.primary
        ? interaction.selectors.primary
        : null,
      selectorAlternatives: typeof interaction.selectors === 'object' && interaction.selectors?.alternatives
        ? JSON.stringify(interaction.selectors.alternatives)
        : null,
      // Keep original structure for compatibility
      selectors: interaction.selectors,
      element: interaction.element,
      context: interaction.context,
      visual: interaction.visual,
      state: interaction.state,
      interaction: interaction.interaction
    };
  }

  private normalizeEnhancedInteraction(enhanced: any): any {
    // For enhanced interactions stored in unified sessions JSON
    return {
      id: enhanced.id,
      type: enhanced.type,
      timestamp: enhanced.timestamp,
      // Extract commonly used fields from 6-group structure
      url: enhanced.context?.url || null,
      elementText: enhanced.element?.text || null,
      elementTag: enhanced.element?.tag || null,
      primarySelector: enhanced.selectors?.primary || null,
      selectorAlternatives: enhanced.selectors?.alternatives ? JSON.stringify(enhanced.selectors.alternatives) : null,
      // Keep the enhanced structure
      selectors: enhanced.selectors,
      element: enhanced.element,
      context: enhanced.context,
      visual: enhanced.visual,
      state: enhanced.state,
      interaction: enhanced.interaction,
      // Enhanced training data
      metadata: enhanced.metadata,
      elementDetails: enhanced.elementDetails,
      contextData: enhanced.contextData,
      overlays: enhanced.overlays,
      action: enhanced.action
    };
  }

  // Custom rule management
  addCustomValidationRule(rule: ValidationRule): void {
    this.validationRules.set(rule.id, rule);
    this.logger.info("Custom validation rule added", { ruleId: rule.id });
  }

  addCustomBusinessRule(rule: ValidationRule): void {
    this.businessRules.set(rule.id, rule);
    this.logger.info("Custom business rule added", { ruleId: rule.id });
  }

  removeRule(ruleId: string): boolean {
    const removed = this.validationRules.delete(ruleId) || this.businessRules.delete(ruleId);
    if (removed) {
      this.logger.info("Validation rule removed", { ruleId });
    }
    return removed;
  }
}