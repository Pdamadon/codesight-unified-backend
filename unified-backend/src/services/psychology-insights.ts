import { PrismaClient } from "@prisma/client";
import { Logger } from "../utils/logger";
import { OpenAIIntegrationService } from "./openai-integration-clean";

interface PsychologyInsight {
  category: 'emotional' | 'cognitive' | 'behavioral' | 'social' | 'trust';
  factor: string;
  confidence: number;
  evidence: string[];
  impact: 'low' | 'medium' | 'high';
  description: string;
}

interface UserPsychologyProfile {
  sessionId: string;
  dominantPersonality: 'analytical' | 'impulsive' | 'cautious' | 'social' | 'practical';
  emotionalState: 'excited' | 'frustrated' | 'confident' | 'uncertain' | 'neutral';
  decisionMakingStyle: 'quick' | 'deliberate' | 'comparison_heavy' | 'research_driven';
  trustLevel: number; // 0-100
  urgencyLevel: number; // 0-100
  pricesensitivity: number; // 0-100
  socialInfluence: number; // 0-100
  insights: PsychologyInsight[];
  behaviorPredictions: string[];
  recommendations: string[];
  confidence: number;
  processingTimestamp: Date;
}

interface ShoppingBehaviorPattern {
  patternType: 'browsing' | 'searching' | 'comparing' | 'deciding' | 'purchasing';
  triggers: string[];
  barriers: string[];
  motivators: string[];
  emotionalJourney: {
    stage: string;
    emotion: string;
    intensity: number;
  }[];
  decisionPoints: {
    element: string;
    influence: number;
    reasoning: string;
  }[];
}

export class PsychologyInsightsService {
  private prisma: PrismaClient;
  private logger: Logger;
  private openaiService: OpenAIIntegrationService;

  // Psychology pattern databases
  private emotionalTriggers: Map<string, string[]> = new Map();
  private cognitivePatterns: Map<string, any> = new Map();
  private behavioralIndicators: Map<string, string[]> = new Map();
  private trustSignals: Map<string, number> = new Map();

  constructor(prisma: PrismaClient, openaiService: OpenAIIntegrationService) {
    this.prisma = prisma;
    this.logger = new Logger("PsychologyInsights");
    this.openaiService = openaiService;

    this.initializePsychologyPatterns();
  }

  private initializePsychologyPatterns() {
    // Emotional triggers
    this.emotionalTriggers.set('excitement', [
      'sale', 'discount', 'limited time', 'exclusive', 'new arrival', 'trending'
    ]);
    this.emotionalTriggers.set('urgency', [
      'hurry', 'limited', 'few left', 'ending soon', 'last chance', 'today only'
    ]);
    this.emotionalTriggers.set('trust', [
      'guarantee', 'secure', 'verified', 'certified', 'award', 'trusted'
    ]);
    this.emotionalTriggers.set('social_proof', [
      'bestseller', 'popular', 'recommended', 'top rated', 'customer favorite'
    ]);
    this.emotionalTriggers.set('fear_of_missing_out', [
      'limited edition', 'exclusive', 'members only', 'while supplies last'
    ]);

    // Cognitive patterns
    this.cognitivePatterns.set('analytical', {
      indicators: ['compare', 'specification', 'feature', 'detail', 'review'],
      timeThreshold: 300000, // 5 minutes
      pageViewThreshold: 5
    });
    this.cognitivePatterns.set('impulsive', {
      indicators: ['buy now', 'add to cart', 'quick purchase'],
      timeThreshold: 60000, // 1 minute
      pageViewThreshold: 2
    });

    // Behavioral indicators
    this.behavioralIndicators.set('price_conscious', [
      'price', 'cost', 'cheap', 'affordable', 'budget', 'save', 'discount'
    ]);
    this.behavioralIndicators.set('quality_focused', [
      'premium', 'quality', 'durable', 'reliable', 'professional', 'luxury'
    ]);
    this.behavioralIndicators.set('convenience_focused', [
      'fast', 'quick', 'easy', 'simple', 'convenient', 'instant'
    ]);

    // Trust signals with weights
    this.trustSignals.set('security_badges', 85);
    this.trustSignals.set('customer_reviews', 80);
    this.trustSignals.set('return_policy', 75);
    this.trustSignals.set('contact_information', 70);
    this.trustSignals.set('professional_design', 65);
    this.trustSignals.set('social_media_presence', 60);
  }

  // Main method to extract psychology insights from session
  async extractUserPsychologyInsights(sessionId: string): Promise<UserPsychologyProfile> {
    try {
      this.logger.info("Starting psychology insights extraction", { sessionId });

      // Get session data with interactions and screenshots
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

      // Analyze visual psychology from screenshots
      const visualPsychology = await this.analyzeVisualPsychology(session.screenshots);

      // Analyze behavioral psychology from interactions
      const behavioralPsychology = await this.analyzeBehavioralPsychology(session.interactions);

      // Analyze decision-making patterns
      const decisionPatterns = this.analyzeDecisionMakingPatterns(session);

      // Synthesize comprehensive psychology profile
      const psychologyProfile = await this.synthesizePsychologyProfile(
        sessionId,
        visualPsychology,
        behavioralPsychology,
        decisionPatterns,
        session
      );

      // Save psychology profile
      await this.savePsychologyProfile(psychologyProfile);

      // Update session with psychology insights
      await this.updateSessionWithPsychology(sessionId, psychologyProfile);

      this.logger.info("Psychology insights extraction completed", {
        sessionId,
        dominantPersonality: psychologyProfile.dominantPersonality,
        emotionalState: psychologyProfile.emotionalState,
        confidence: psychologyProfile.confidence
      });

      return psychologyProfile;

    } catch (error) {
      this.logger.error("Psychology insights extraction failed", error, { sessionId });
      throw error;
    }
  }

  // Analyze visual psychology from screenshots using OpenAI Vision
  private async analyzeVisualPsychology(screenshots: any[]): Promise<any> {
    if (screenshots.length === 0) {
      return {
        visualTriggers: [],
        colorPsychology: {},
        layoutInfluence: {},
        trustElements: [],
        persuasionTechniques: []
      };
    }

    try {
      // Use OpenAI Vision API for psychology-focused analysis
      const visionAnalysis = await this.openaiService.analyzeScreenshotsAdvanced(
        screenshots,
        {
          analysisType: 'psychology',
          detailLevel: 'high',
          batchSize: 3,
          includeCache: true
        }
      );

      // Extract structured psychology insights from vision analysis
      const visualPsychology = {
        visualTriggers: this.extractVisualTriggers(visionAnalysis),
        colorPsychology: this.analyzeColorPsychology(visionAnalysis),
        layoutInfluence: this.analyzeLayoutInfluence(visionAnalysis),
        trustElements: this.identifyTrustElements(visionAnalysis),
        persuasionTechniques: this.identifyPersuasionTechniques(visionAnalysis)
      };

      return visualPsychology;

    } catch (error) {
      this.logger.error("Visual psychology analysis failed", error);
      return {
        visualTriggers: [],
        colorPsychology: {},
        layoutInfluence: {},
        trustElements: [],
        persuasionTechniques: []
      };
    }
  }

  // Analyze behavioral psychology from user interactions
  private async analyzeBehavioralPsychology(interactions: any[]): Promise<any> {
    const behaviorMetrics = {
      clickPatterns: this.analyzeClickPatterns(interactions),
      navigationStyle: this.analyzeNavigationStyle(interactions),
      timeSpentPatterns: this.analyzeTimePatterns(interactions),
      interactionIntensity: this.calculateInteractionIntensity(interactions),
      decisionSpeed: this.calculateDecisionSpeed(interactions),
      explorationDepth: this.calculateExplorationDepth(interactions)
    };

    // Identify behavioral personality traits
    const personalityTraits = this.identifyPersonalityTraits(behaviorMetrics);

    // Analyze emotional state from behavior
    const emotionalState = this.inferEmotionalState(behaviorMetrics, interactions);

    // Determine decision-making style
    const decisionMakingStyle = this.determineDecisionMakingStyle(behaviorMetrics);

    return {
      behaviorMetrics,
      personalityTraits,
      emotionalState,
      decisionMakingStyle
    };
  }

  // Analyze decision-making patterns
  private analyzeDecisionMakingPatterns(session: any): any {
    const interactions = session.interactions || [];
    
    // Identify key decision points
    const decisionPoints = interactions.filter((interaction: any) => 
      this.isDecisionPoint(interaction)
    );

    // Analyze decision factors
    const decisionFactors = {
      price: this.calculatePriceInfluence(interactions),
      social_proof: this.calculateSocialProofInfluence(interactions),
      urgency: this.calculateUrgencyInfluence(interactions),
      trust: this.calculateTrustInfluence(interactions),
      convenience: this.calculateConvenienceInfluence(interactions)
    };

    // Determine decision-making speed
    const decisionSpeed = this.calculateOverallDecisionSpeed(interactions);

    // Identify barriers and motivators
    const barriers = this.identifyDecisionBarriers(interactions);
    const motivators = this.identifyDecisionMotivators(interactions);

    return {
      decisionPoints,
      decisionFactors,
      decisionSpeed,
      barriers,
      motivators
    };
  }

  // Synthesize comprehensive psychology profile
  private async synthesizePsychologyProfile(
    sessionId: string,
    visualPsychology: any,
    behavioralPsychology: any,
    decisionPatterns: any,
    session: any
  ): Promise<UserPsychologyProfile> {

    // Determine dominant personality
    const dominantPersonality = this.determineDominantPersonality(
      behavioralPsychology.personalityTraits,
      decisionPatterns
    );

    // Determine emotional state
    const emotionalState = behavioralPsychology.emotionalState;

    // Determine decision-making style
    const decisionMakingStyle = behavioralPsychology.decisionMakingStyle;

    // Calculate psychology metrics
    const trustLevel = this.calculateTrustLevel(visualPsychology, behavioralPsychology);
    const urgencyLevel = this.calculateUrgencyLevel(visualPsychology, decisionPatterns);
    const pricesensitivity = this.calculatePriceSensitivity(behavioralPsychology, decisionPatterns);
    const socialInfluence = this.calculateSocialInfluence(visualPsychology, behavioralPsychology);

    // Generate detailed insights
    const insights = await this.generateDetailedInsights(
      visualPsychology,
      behavioralPsychology,
      decisionPatterns
    );

    // Generate behavior predictions
    const behaviorPredictions = this.generateBehaviorPredictions(
      dominantPersonality,
      emotionalState,
      decisionMakingStyle,
      { trustLevel, urgencyLevel, pricesensitivity, socialInfluence }
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      dominantPersonality,
      emotionalState,
      insights,
      behaviorPredictions
    );

    // Calculate overall confidence
    const confidence = this.calculateOverallConfidence(
      visualPsychology,
      behavioralPsychology,
      session.interactions?.length || 0
    );

    return {
      sessionId,
      dominantPersonality,
      emotionalState,
      decisionMakingStyle,
      trustLevel,
      urgencyLevel,
      pricesensitivity,
      socialInfluence,
      insights,
      behaviorPredictions,
      recommendations,
      confidence,
      processingTimestamp: new Date()
    };
  }

  // Helper methods for visual psychology analysis
  private extractVisualTriggers(visionAnalysis: any): string[] {
    const triggers = [];
    const analysisText = JSON.stringify(visionAnalysis).toLowerCase();

    for (const [trigger, keywords] of this.emotionalTriggers) {
      if (keywords.some(keyword => analysisText.includes(keyword))) {
        triggers.push(trigger);
      }
    }

    return triggers;
  }

  private analyzeColorPsychology(visionAnalysis: any): any {
    // Extract color psychology insights from vision analysis
    const analysisText = JSON.stringify(visionAnalysis).toLowerCase();
    
    const colorInfluences = {
      red: analysisText.includes('red') || analysisText.includes('urgent'),
      blue: analysisText.includes('blue') || analysisText.includes('trust'),
      green: analysisText.includes('green') || analysisText.includes('safe'),
      orange: analysisText.includes('orange') || analysisText.includes('energy'),
      black: analysisText.includes('black') || analysisText.includes('premium'),
      white: analysisText.includes('white') || analysisText.includes('clean')
    };

    return colorInfluences;
  }

  private analyzeLayoutInfluence(visionAnalysis: any): any {
    const analysisText = JSON.stringify(visionAnalysis).toLowerCase();
    
    return {
      visualHierarchy: analysisText.includes('hierarchy') || analysisText.includes('prominent'),
      cluttered: analysisText.includes('cluttered') || analysisText.includes('busy'),
      minimalist: analysisText.includes('clean') || analysisText.includes('simple'),
      focusedLayout: analysisText.includes('focused') || analysisText.includes('clear')
    };
  }

  private identifyTrustElements(visionAnalysis: any): string[] {
    const trustElements: string[] = [];
    const analysisText = JSON.stringify(visionAnalysis).toLowerCase();

    const trustIndicators = [
      'security badge', 'ssl certificate', 'customer reviews', 'ratings',
      'testimonials', 'guarantee', 'return policy', 'contact info'
    ];

    trustIndicators.forEach(indicator => {
      if (analysisText.includes(indicator.replace(' ', ''))) {
        trustElements.push(indicator);
      }
    });

    return trustElements;
  }

  private identifyPersuasionTechniques(visionAnalysis: any): string[] {
    const techniques: string[] = [];
    const analysisText = JSON.stringify(visionAnalysis).toLowerCase();

    const persuasionTechniques = [
      'scarcity', 'urgency', 'social proof', 'authority', 'reciprocity',
      'commitment', 'liking', 'contrast', 'anchoring'
    ];

    persuasionTechniques.forEach(technique => {
      if (analysisText.includes(technique)) {
        techniques.push(technique);
      }
    });

    return techniques;
  }

  // Helper methods for behavioral analysis
  private analyzeClickPatterns(interactions: any[]): any {
    const clickInteractions = interactions.filter(i => i.type === 'CLICK');
    
    return {
      totalClicks: clickInteractions.length,
      averageClickTime: this.calculateAverageClickTime(clickInteractions),
      clickDistribution: this.analyzeClickDistribution(clickInteractions),
      hesitationPatterns: this.identifyHesitationPatterns(clickInteractions)
    };
  }

  private analyzeNavigationStyle(interactions: any[]): string {
    const navigationEvents = interactions.filter(i => 
      i.type === 'NAVIGATION' || i.type === 'CLICK'
    );

    const backtrackCount = this.countBacktracking(navigationEvents);
    const explorationDepth = navigationEvents.length;

    if (backtrackCount > explorationDepth * 0.3) return 'exploratory';
    if (explorationDepth < 5) return 'focused';
    if (backtrackCount < explorationDepth * 0.1) return 'linear';
    return 'mixed';
  }

  private analyzeTimePatterns(interactions: any[]): any {
    const timestamps = interactions.map(i => Number(i.timestamp));
    const intervals = [];

    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i-1]);
    }

    return {
      averageInterval: intervals.reduce((a, b) => a + b, 0) / intervals.length || 0,
      maxInterval: Math.max(...intervals, 0),
      minInterval: Math.min(...intervals, 0),
      variability: this.calculateVariability(intervals)
    };
  }

  private calculateInteractionIntensity(interactions: any[]): number {
    if (interactions.length === 0) return 0;

    const duration = interactions.length > 1 ? 
      Number(interactions[interactions.length - 1].timestamp) - Number(interactions[0].timestamp) : 
      1000;

    return (interactions.length / (duration / 1000)) * 60; // interactions per minute
  }

  private calculateDecisionSpeed(interactions: any[]): 'fast' | 'medium' | 'slow' {
    const decisionPoints = interactions.filter(i => this.isDecisionPoint(i));
    
    if (decisionPoints.length === 0) return 'medium';

    const averageDecisionTime = this.calculateAverageDecisionTime(decisionPoints);

    if (averageDecisionTime < 30000) return 'fast'; // < 30 seconds
    if (averageDecisionTime < 120000) return 'medium'; // < 2 minutes
    return 'slow';
  }

  private calculateExplorationDepth(interactions: any[]): number {
    const uniquePages = new Set(interactions.map(i => i.url)).size;
    const totalInteractions = interactions.length;

    return totalInteractions / Math.max(uniquePages, 1);
  }

  // Helper methods for personality identification
  private identifyPersonalityTraits(behaviorMetrics: any): any {
    const traits = {
      analytical: 0,
      impulsive: 0,
      cautious: 0,
      social: 0,
      practical: 0
    };

    // Analytical traits
    if (behaviorMetrics.explorationDepth > 5) traits.analytical += 30;
    if (behaviorMetrics.decisionSpeed === 'slow') traits.analytical += 20;

    // Impulsive traits
    if (behaviorMetrics.decisionSpeed === 'fast') traits.impulsive += 40;
    if (behaviorMetrics.interactionIntensity > 10) traits.impulsive += 20;

    // Cautious traits
    if (behaviorMetrics.navigationStyle === 'exploratory') traits.cautious += 30;
    if (behaviorMetrics.timeSpentPatterns.averageInterval > 5000) traits.cautious += 20;

    // Practical traits
    if (behaviorMetrics.navigationStyle === 'focused') traits.practical += 30;
    if (behaviorMetrics.explorationDepth < 3) traits.practical += 20;

    return traits;
  }

  private inferEmotionalState(behaviorMetrics: any, interactions: any[]): 'excited' | 'frustrated' | 'confident' | 'uncertain' | 'neutral' {
    const elementTexts = interactions.map(i => i.elementText?.toLowerCase() || '').join(' ');

    // Excitement indicators
    if (elementTexts.includes('sale') || elementTexts.includes('discount')) {
      if (behaviorMetrics.interactionIntensity > 8) return 'excited';
    }

    // Frustration indicators
    if (behaviorMetrics.navigationStyle === 'exploratory' && 
        behaviorMetrics.clickPatterns.hesitationPatterns > 3) {
      return 'frustrated';
    }

    // Confidence indicators
    if (behaviorMetrics.decisionSpeed === 'fast' && 
        behaviorMetrics.navigationStyle === 'focused') {
      return 'confident';
    }

    // Uncertainty indicators
    if (behaviorMetrics.explorationDepth > 8 && 
        behaviorMetrics.decisionSpeed === 'slow') {
      return 'uncertain';
    }

    return 'neutral';
  }

  private determineDecisionMakingStyle(behaviorMetrics: any): 'quick' | 'deliberate' | 'comparison_heavy' | 'research_driven' {
    if (behaviorMetrics.decisionSpeed === 'fast' && behaviorMetrics.explorationDepth < 3) {
      return 'quick';
    }

    if (behaviorMetrics.explorationDepth > 8) {
      return 'research_driven';
    }

    if (behaviorMetrics.navigationStyle === 'exploratory' && behaviorMetrics.explorationDepth > 5) {
      return 'comparison_heavy';
    }

    return 'deliberate';
  }

  // Helper methods for decision analysis
  private isDecisionPoint(interaction: any): boolean {
    const decisionKeywords = [
      'add to cart', 'buy now', 'purchase', 'checkout', 'compare', 'wishlist'
    ];

    const elementText = interaction.elementText?.toLowerCase() || '';
    return decisionKeywords.some(keyword => elementText.includes(keyword));
  }

  private calculatePriceInfluence(interactions: any[]): number {
    const priceInteractions = interactions.filter(i => {
      const text = i.elementText?.toLowerCase() || '';
      return this.behavioralIndicators.get('price_conscious')?.some(keyword => 
        text.includes(keyword)
      );
    });

    return Math.min((priceInteractions.length / interactions.length) * 100, 100);
  }

  private calculateSocialProofInfluence(interactions: any[]): number {
    const socialProofKeywords = ['review', 'rating', 'star', 'testimonial', 'recommended'];
    const socialInteractions = interactions.filter(i => {
      const text = i.elementText?.toLowerCase() || '';
      return socialProofKeywords.some(keyword => text.includes(keyword));
    });

    return Math.min((socialInteractions.length / interactions.length) * 100, 100);
  }

  private calculateUrgencyInfluence(interactions: any[]): number {
    const urgencyKeywords = this.emotionalTriggers.get('urgency') || [];
    const urgencyInteractions = interactions.filter(i => {
      const text = i.elementText?.toLowerCase() || '';
      return urgencyKeywords.some(keyword => text.includes(keyword));
    });

    return Math.min((urgencyInteractions.length / interactions.length) * 100, 100);
  }

  private calculateTrustInfluence(interactions: any[]): number {
    const trustKeywords = this.emotionalTriggers.get('trust') || [];
    const trustInteractions = interactions.filter(i => {
      const text = i.elementText?.toLowerCase() || '';
      return trustKeywords.some(keyword => text.includes(keyword));
    });

    return Math.min((trustInteractions.length / interactions.length) * 100, 100);
  }

  private calculateConvenienceInfluence(interactions: any[]): number {
    const convenienceKeywords = this.behavioralIndicators.get('convenience_focused') || [];
    const convenienceInteractions = interactions.filter(i => {
      const text = i.elementText?.toLowerCase() || '';
      return convenienceKeywords.some(keyword => text.includes(keyword));
    });

    return Math.min((convenienceInteractions.length / interactions.length) * 100, 100);
  }

  // Psychology metric calculations
  private calculateTrustLevel(visualPsychology: any, behavioralPsychology: any): number {
    let trustLevel = 50; // Base trust level

    // Visual trust elements
    trustLevel += visualPsychology.trustElements.length * 10;

    // Behavioral trust indicators
    if (behavioralPsychology.decisionMakingStyle === 'deliberate') trustLevel += 15;
    if (behavioralPsychology.emotionalState === 'confident') trustLevel += 20;

    return Math.min(trustLevel, 100);
  }

  private calculateUrgencyLevel(visualPsychology: any, decisionPatterns: any): number {
    let urgencyLevel = 30; // Base urgency

    // Visual urgency triggers
    if (visualPsychology.visualTriggers.includes('urgency')) urgencyLevel += 30;
    if (visualPsychology.visualTriggers.includes('fear_of_missing_out')) urgencyLevel += 25;

    // Decision speed influence
    urgencyLevel += decisionPatterns.decisionFactors.urgency * 0.4;

    return Math.min(urgencyLevel, 100);
  }

  private calculatePriceSensitivity(behavioralPsychology: any, decisionPatterns: any): number {
    let sensitivity = 40; // Base sensitivity

    // Behavioral indicators
    const traits = behavioralPsychology.personalityTraits;
    if (traits.cautious > traits.impulsive) sensitivity += 20;

    // Decision factors
    sensitivity += decisionPatterns.decisionFactors.price * 0.6;

    return Math.min(sensitivity, 100);
  }

  private calculateSocialInfluence(visualPsychology: any, behavioralPsychology: any): number {
    let influence = 35; // Base influence

    // Visual social proof
    if (visualPsychology.visualTriggers.includes('social_proof')) influence += 25;

    // Behavioral social indicators
    if (behavioralPsychology.personalityTraits.social > 50) influence += 20;

    return Math.min(influence, 100);
  }

  // Generate detailed insights
  private async generateDetailedInsights(
    visualPsychology: any,
    behavioralPsychology: any,
    decisionPatterns: any
  ): Promise<PsychologyInsight[]> {
    const insights: PsychologyInsight[] = [];

    // Emotional insights
    if (visualPsychology.visualTriggers.length > 0) {
      insights.push({
        category: 'emotional',
        factor: 'visual_triggers',
        confidence: 85,
        evidence: visualPsychology.visualTriggers,
        impact: 'high',
        description: `Strong emotional triggers detected: ${visualPsychology.visualTriggers.join(', ')}`
      });
    }

    // Cognitive insights
    const dominantTrait = Object.entries(behavioralPsychology.personalityTraits)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];

    if (dominantTrait && (dominantTrait[1] as number) > 50) {
      insights.push({
        category: 'cognitive',
        factor: 'personality_trait',
        confidence: dominantTrait[1] as number,
        evidence: [`${dominantTrait[0]} behavior pattern`],
        impact: 'medium',
        description: `Dominant ${dominantTrait[0]} personality trait influences decision-making`
      });
    }

    // Behavioral insights
    if (behavioralPsychology.decisionMakingStyle !== 'deliberate') {
      insights.push({
        category: 'behavioral',
        factor: 'decision_style',
        confidence: 75,
        evidence: [behavioralPsychology.decisionMakingStyle],
        impact: 'high',
        description: `${behavioralPsychology.decisionMakingStyle} decision-making style detected`
      });
    }

    // Trust insights
    if (visualPsychology.trustElements.length > 2) {
      insights.push({
        category: 'trust',
        factor: 'trust_signals',
        confidence: 80,
        evidence: visualPsychology.trustElements,
        impact: 'high',
        description: `Multiple trust signals present: ${visualPsychology.trustElements.join(', ')}`
      });
    }

    return insights;
  }

  // Generate behavior predictions
  private generateBehaviorPredictions(
    personality: string,
    emotion: string,
    decisionStyle: string,
    metrics: any
  ): string[] {
    const predictions = [];

    // Personality-based predictions
    const personalityPredictions = {
      analytical: [
        "Likely to research thoroughly before purchasing",
        "Will compare multiple options",
        "Responds well to detailed product information"
      ],
      impulsive: [
        "May make quick purchase decisions",
        "Responds to urgency and scarcity",
        "Influenced by emotional triggers"
      ],
      cautious: [
        "Will seek reassurance and guarantees",
        "Needs multiple touchpoints before deciding",
        "Values trust signals and reviews"
      ],
      social: [
        "Influenced by social proof and recommendations",
        "Likely to share and seek opinions",
        "Responds to community features"
      ],
      practical: [
        "Focuses on value and utility",
        "Prefers straightforward purchasing process",
        "Less influenced by emotional appeals"
      ]
    };

    predictions.push(...(personalityPredictions[personality as keyof typeof personalityPredictions] || []));

    // Emotion-based predictions
    if (emotion === 'excited') {
      predictions.push("High likelihood of immediate action");
    } else if (emotion === 'frustrated') {
      predictions.push("May abandon session without clear guidance");
    } else if (emotion === 'uncertain') {
      predictions.push("Needs additional information and reassurance");
    }

    // Metric-based predictions
    if (metrics.pricesensitivity > 70) {
      predictions.push("Highly price-conscious, will seek deals and discounts");
    }

    if (metrics.trustLevel < 50) {
      predictions.push("Requires additional trust-building elements");
    }

    return predictions;
  }

  // Generate recommendations
  private generateRecommendations(
    personality: string,
    emotion: string,
    insights: PsychologyInsight[],
    predictions: string[]
  ): string[] {
    const recommendations = [];

    // Personality-based recommendations
    const personalityRecommendations = {
      analytical: [
        "Provide detailed product specifications and comparisons",
        "Include comprehensive reviews and ratings",
        "Offer filtering and sorting options"
      ],
      impulsive: [
        "Use urgency and scarcity messaging",
        "Simplify the purchase process",
        "Highlight emotional benefits"
      ],
      cautious: [
        "Display trust badges and security information",
        "Provide clear return and refund policies",
        "Include customer testimonials"
      ],
      social: [
        "Show social proof and popularity indicators",
        "Enable sharing and recommendation features",
        "Display community reviews and discussions"
      ],
      practical: [
        "Focus on value proposition and utility",
        "Streamline navigation and checkout",
        "Minimize distractions and complexity"
      ]
    };

    recommendations.push(...(personalityRecommendations[personality as keyof typeof personalityRecommendations] || []));

    // Emotion-based recommendations
    if (emotion === 'frustrated') {
      recommendations.push("Provide clear navigation and search functionality");
      recommendations.push("Offer live chat or customer support");
    } else if (emotion === 'uncertain') {
      recommendations.push("Add product guides and buying assistance");
      recommendations.push("Provide comparison tools and recommendations");
    }

    // Insight-based recommendations
    const highImpactInsights = insights.filter(i => i.impact === 'high');
    highImpactInsights.forEach(insight => {
      if (insight.category === 'trust' && insight.factor === 'trust_signals') {
        recommendations.push("Leverage existing trust signals more prominently");
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  // Calculate overall confidence
  private calculateOverallConfidence(
    visualPsychology: any,
    behavioralPsychology: any,
    interactionCount: number
  ): number {
    let confidence = 30; // Base confidence

    // Data quality factors
    if (interactionCount > 10) confidence += 20;
    if (interactionCount > 20) confidence += 15;

    // Visual analysis quality
    if (visualPsychology.visualTriggers.length > 0) confidence += 15;
    if (visualPsychology.trustElements.length > 0) confidence += 10;

    // Behavioral analysis quality
    const maxTrait = Math.max(...Object.values(behavioralPsychology.personalityTraits).map((v: unknown) => v as number));
    if (maxTrait > 50) confidence += 10;

    return Math.min(confidence, 100);
  }

  // Utility methods
  private calculateAverageClickTime(clickInteractions: any[]): number {
    if (clickInteractions.length < 2) return 0;

    const intervals = [];
    for (let i = 1; i < clickInteractions.length; i++) {
      intervals.push(
        Number(clickInteractions[i].timestamp) - Number(clickInteractions[i-1].timestamp)
      );
    }

    return intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }

  private analyzeClickDistribution(clickInteractions: any[]): any {
    const elementTypes = clickInteractions.reduce((acc, interaction) => {
      const tag = interaction.elementTag || 'unknown';
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});

    return elementTypes;
  }

  private identifyHesitationPatterns(clickInteractions: any[]): number {
    let hesitationCount = 0;
    const hesitationThreshold = 5000; // 5 seconds

    for (let i = 1; i < clickInteractions.length; i++) {
      const timeDiff = Number(clickInteractions[i].timestamp) - Number(clickInteractions[i-1].timestamp);
      if (timeDiff > hesitationThreshold) {
        hesitationCount++;
      }
    }

    return hesitationCount;
  }

  private countBacktracking(navigationEvents: any[]): number {
    const visitedUrls = new Set();
    let backtrackCount = 0;

    navigationEvents.forEach(event => {
      if (event.url && visitedUrls.has(event.url)) {
        backtrackCount++;
      }
      if (event.url) visitedUrls.add(event.url);
    });

    return backtrackCount;
  }

  private calculateVariability(intervals: number[]): number {
    if (intervals.length === 0) return 0;

    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / intervals.length;
    
    return Math.sqrt(variance);
  }

  private calculateAverageDecisionTime(decisionPoints: any[]): number {
    if (decisionPoints.length < 2) return 0;

    const intervals = [];
    for (let i = 1; i < decisionPoints.length; i++) {
      intervals.push(
        Number(decisionPoints[i].timestamp) - Number(decisionPoints[i-1].timestamp)
      );
    }

    return intervals.reduce((a, b) => a + b, 0) / intervals.length;
  }

  private calculateOverallDecisionSpeed(interactions: any[]): number {
    const decisionPoints = interactions.filter(i => this.isDecisionPoint(i));
    
    if (decisionPoints.length === 0) return 0;

    const totalTime = interactions.length > 0 ? 
      Number(interactions[interactions.length - 1].timestamp) - Number(interactions[0].timestamp) : 
      0;

    return totalTime / decisionPoints.length;
  }

  private identifyDecisionBarriers(interactions: any[]): string[] {
    const barriers = [];
    const elementTexts = interactions.map(i => i.elementText?.toLowerCase() || '').join(' ');

    // Common decision barriers
    if (elementTexts.includes('out of stock')) barriers.push('availability');
    if (elementTexts.includes('shipping') && elementTexts.includes('cost')) barriers.push('shipping_cost');
    if (elementTexts.includes('return') && elementTexts.includes('policy')) barriers.push('return_policy');
    if (elementTexts.includes('size') && elementTexts.includes('guide')) barriers.push('sizing_uncertainty');

    return barriers;
  }

  private identifyDecisionMotivators(interactions: any[]): string[] {
    const motivators = [];
    const elementTexts = interactions.map(i => i.elementText?.toLowerCase() || '').join(' ');

    // Common decision motivators
    if (elementTexts.includes('free shipping')) motivators.push('free_shipping');
    if (elementTexts.includes('discount') || elementTexts.includes('sale')) motivators.push('price_discount');
    if (elementTexts.includes('limited') || elementTexts.includes('exclusive')) motivators.push('scarcity');
    if (elementTexts.includes('review') || elementTexts.includes('rating')) motivators.push('social_proof');

    return motivators;
  }

  private determineDominantPersonality(
    personalityTraits: any,
    decisionPatterns: any
  ): 'analytical' | 'impulsive' | 'cautious' | 'social' | 'practical' {
    const sortedTraits = Object.entries(personalityTraits)
      .sort(([,a], [,b]) => (b as number) - (a as number));

    return sortedTraits[0][0] as any;
  }

  // Save psychology profile to database
  private async savePsychologyProfile(profile: UserPsychologyProfile): Promise<void> {
    try {
      await this.prisma.psychologyProfile.create({
        data: {
          sessionId: profile.sessionId,
          dominantPersonality: profile.dominantPersonality.toUpperCase() as any,
          emotionalState: profile.emotionalState.toUpperCase() as any,
          decisionMakingStyle: profile.decisionMakingStyle.toUpperCase() as any,
          trustLevel: profile.trustLevel,
          urgencyLevel: profile.urgencyLevel,
          priceSensitivity: profile.pricesensitivity,
          socialInfluence: profile.socialInfluence,
          insights: JSON.stringify(profile.insights),
          behaviorPredictions: JSON.stringify(profile.behaviorPredictions),
          recommendations: JSON.stringify(profile.recommendations),
          confidence: profile.confidence,
          processingTimestamp: profile.processingTimestamp
        }
      });
    } catch (error) {
      this.logger.error("Failed to save psychology profile", error, {
        sessionId: profile.sessionId
      });
      throw error;
    }
  }

  // Update session with psychology insights
  private async updateSessionWithPsychology(
    sessionId: string,
    profile: UserPsychologyProfile
  ): Promise<void> {
    try {
      await this.prisma.unifiedSession.update({
        where: { id: sessionId },
        data: {
          dominantPersonality: profile.dominantPersonality.toUpperCase() as any,
          emotionalState: profile.emotionalState.toUpperCase() as any,
          decisionMakingStyle: profile.decisionMakingStyle.toUpperCase() as any,
          trustLevel: profile.trustLevel,
          urgencyLevel: profile.urgencyLevel,
          priceSensitivity: profile.pricesensitivity,
          socialInfluence: profile.socialInfluence,
          psychologyConfidence: profile.confidence
        }
      });
    } catch (error) {
      this.logger.error("Failed to update session with psychology", error, {
        sessionId
      });
      throw error;
    }
  }

  // Batch process multiple sessions
  async batchExtractPsychologyInsights(
    sessionIds: string[]
  ): Promise<Map<string, UserPsychologyProfile>> {
    const results = new Map<string, UserPsychologyProfile>();

    this.logger.info("Starting batch psychology insights extraction", {
      sessionCount: sessionIds.length
    });

    for (const sessionId of sessionIds) {
      try {
        const profile = await this.extractUserPsychologyInsights(sessionId);
        results.set(sessionId, profile);
      } catch (error) {
        this.logger.error(
          "Failed to extract psychology insights for session in batch",
          error,
          { sessionId }
        );
      }
    }

    const avgConfidence = Array.from(results.values())
      .reduce((sum, profile) => sum + profile.confidence, 0) / results.size;

    this.logger.info("Batch psychology insights extraction completed", {
      sessionCount: sessionIds.length,
      successfulExtractions: results.size,
      averageConfidence: Math.round(avgConfidence)
    });

    return results;
  }

  // Get psychology insights statistics
  async getPsychologyStats(): Promise<any> {
    try {
      const stats = await this.prisma.psychologyProfile.aggregate({
        _avg: { 
          confidence: true,
          trustLevel: true,
          urgencyLevel: true,
          priceSensitivity: true,
          socialInfluence: true
        },
        _count: true
      });

      const personalityDistribution = await this.prisma.psychologyProfile.groupBy({
        by: ['dominantPersonality'],
        _count: true
      });

      const emotionalStateDistribution = await this.prisma.psychologyProfile.groupBy({
        by: ['emotionalState'],
        _count: true
      });

      const recentProfiles = await this.prisma.psychologyProfile.findMany({
        take: 10,
        orderBy: { processingTimestamp: 'desc' },
        select: {
          sessionId: true,
          dominantPersonality: true,
          emotionalState: true,
          confidence: true,
          processingTimestamp: true
        }
      });

      return {
        summary: {
          totalProfiles: stats._count,
          averageConfidence: Math.round(stats._avg.confidence || 0),
          averageTrustLevel: Math.round(stats._avg.trustLevel || 0),
          averageUrgencyLevel: Math.round(stats._avg.urgencyLevel || 0),
          averagePriceSensitivity: Math.round(stats._avg.priceSensitivity || 0),
          averageSocialInfluence: Math.round(stats._avg.socialInfluence || 0)
        },
        distributions: {
          personality: personalityDistribution,
          emotionalState: emotionalStateDistribution
        },
        recentProfiles
      };
    } catch (error) {
      this.logger.error("Failed to get psychology stats", error);
      throw error;
    }
  }

  // Get psychology insights for a specific session
  async getPsychologyInsights(sessionId: string): Promise<UserPsychologyProfile | null> {
    try {
      const profile = await this.prisma.psychologyProfile.findUnique({
        where: { sessionId }
      });

      if (!profile) return null;

      return {
        sessionId: profile.sessionId,
        dominantPersonality: profile.dominantPersonality as any,
        emotionalState: profile.emotionalState as any,
        decisionMakingStyle: profile.decisionMakingStyle as any,
        trustLevel: profile.trustLevel,
        urgencyLevel: profile.urgencyLevel,
        pricesensitivity: profile.priceSensitivity,
        socialInfluence: profile.socialInfluence,
        insights: JSON.parse((profile.insights as string) || '[]'),
        behaviorPredictions: JSON.parse((profile.behaviorPredictions as string) || '[]'),
        recommendations: JSON.parse((profile.recommendations as string) || '[]'),
        confidence: profile.confidence,
        processingTimestamp: profile.processingTimestamp
      };
    } catch (error) {
      this.logger.error("Failed to get psychology insights", error, { sessionId });
      throw error;
    }
  }

  // Generate psychology-based training data
  async generatePsychologyTrainingData(sessionId: string): Promise<any> {
    try {
      const profile = await this.getPsychologyInsights(sessionId);
      if (!profile) {
        throw new Error(`Psychology profile not found for session ${sessionId}`);
      }

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

      // Generate training examples based on psychology insights
      const trainingData = {
        sessionId,
        psychologyProfile: profile,
        trainingExamples: this.generatePsychologyTrainingExamples(profile, session),
        metadata: {
          generatedAt: new Date(),
          profileConfidence: profile.confidence,
          trainingValue: this.calculatePsychologyTrainingValue(profile)
        }
      };

      return trainingData;
    } catch (error) {
      this.logger.error("Failed to generate psychology training data", error, { sessionId });
      throw error;
    }
  }

  // Generate training examples based on psychology insights
  private generatePsychologyTrainingExamples(
    profile: UserPsychologyProfile,
    session: any
  ): any[] {
    const examples = [];

    // Example 1: Personality-based interaction prediction
    examples.push({
      type: 'personality_prediction',
      input: {
        userPersonality: profile.dominantPersonality,
        emotionalState: profile.emotionalState,
        pageContext: 'product_page',
        availableActions: ['add_to_cart', 'view_reviews', 'compare', 'save_for_later']
      },
      output: {
        predictedAction: this.predictActionBasedOnPersonality(profile),
        confidence: profile.confidence,
        reasoning: profile.behaviorPredictions[0] || 'Based on personality analysis'
      }
    });

    // Example 2: Emotional trigger response
    const highImpactInsights = profile.insights.filter(i => i.impact === 'high');
    if (highImpactInsights.length > 0) {
      examples.push({
        type: 'emotional_trigger_response',
        input: {
          emotionalTriggers: highImpactInsights.map(i => i.factor),
          userEmotionalState: profile.emotionalState,
          trustLevel: profile.trustLevel
        },
        output: {
          expectedResponse: this.predictEmotionalResponse(profile, highImpactInsights),
          engagementLevel: this.calculateEngagementLevel(profile),
          conversionProbability: this.calculateConversionProbability(profile)
        }
      });
    }

    // Example 3: Decision-making pattern
    examples.push({
      type: 'decision_making_pattern',
      input: {
        decisionMakingStyle: profile.decisionMakingStyle,
        priceSensitivity: profile.pricesensitivity,
        socialInfluence: profile.socialInfluence,
        productCategory: session.pageType || 'general'
      },
      output: {
        decisionFactors: this.identifyKeyDecisionFactors(profile),
        timeToDecision: this.predictDecisionTime(profile),
        requiredInformation: profile.recommendations.slice(0, 3)
      }
    });

    return examples;
  }

  // Helper methods for training data generation
  private predictActionBasedOnPersonality(profile: UserPsychologyProfile): string {
    const personalityActions = {
      analytical: 'view_reviews',
      impulsive: 'add_to_cart',
      cautious: 'save_for_later',
      social: 'compare',
      practical: 'add_to_cart'
    };

    return personalityActions[profile.dominantPersonality] || 'view_reviews';
  }

  private predictEmotionalResponse(
    profile: UserPsychologyProfile,
    insights: PsychologyInsight[]
  ): string {
    if (profile.emotionalState === 'excited' && profile.urgencyLevel > 70) {
      return 'immediate_action';
    } else if (profile.emotionalState === 'uncertain' && profile.trustLevel < 60) {
      return 'seek_reassurance';
    } else if (profile.emotionalState === 'frustrated') {
      return 'abandon_or_seek_help';
    }

    return 'continue_exploration';
  }

  private calculateEngagementLevel(profile: UserPsychologyProfile): 'low' | 'medium' | 'high' {
    const engagementScore = (
      profile.trustLevel + 
      profile.urgencyLevel + 
      (100 - profile.pricesensitivity) + 
      profile.socialInfluence
    ) / 4;

    if (engagementScore > 70) return 'high';
    if (engagementScore > 40) return 'medium';
    return 'low';
  }

  private calculateConversionProbability(profile: UserPsychologyProfile): number {
    let probability = 30; // Base probability

    // Personality adjustments
    const personalityBonus = {
      impulsive: 25,
      practical: 15,
      analytical: 5,
      cautious: -5,
      social: 10
    };

    probability += personalityBonus[profile.dominantPersonality] || 0;

    // Emotional state adjustments
    const emotionBonus = {
      excited: 20,
      confident: 15,
      neutral: 0,
      uncertain: -10,
      frustrated: -20
    };

    probability += emotionBonus[profile.emotionalState] || 0;

    // Trust and urgency influence
    probability += (profile.trustLevel - 50) * 0.3;
    probability += (profile.urgencyLevel - 50) * 0.2;

    return Math.max(0, Math.min(100, Math.round(probability)));
  }

  private identifyKeyDecisionFactors(profile: UserPsychologyProfile): string[] {
    const factors = [];

    if (profile.pricesensitivity > 70) factors.push('price');
    if (profile.trustLevel < 60) factors.push('trust_signals');
    if (profile.socialInfluence > 60) factors.push('social_proof');
    if (profile.urgencyLevel > 70) factors.push('urgency');

    // Add personality-specific factors
    const personalityFactors = {
      analytical: ['detailed_information', 'comparisons'],
      impulsive: ['emotional_appeal', 'simplicity'],
      cautious: ['guarantees', 'reviews'],
      social: ['recommendations', 'popularity'],
      practical: ['value', 'utility']
    };

    factors.push(...(personalityFactors[profile.dominantPersonality] || []));

    return [...new Set(factors)]; // Remove duplicates
  }

  private predictDecisionTime(profile: UserPsychologyProfile): 'immediate' | 'short' | 'medium' | 'long' {
    if (profile.dominantPersonality === 'impulsive' && profile.emotionalState === 'excited') {
      return 'immediate';
    } else if (profile.dominantPersonality === 'analytical' || profile.emotionalState === 'uncertain') {
      return 'long';
    } else if (profile.dominantPersonality === 'cautious') {
      return 'medium';
    }

    return 'short';
  }

  private calculatePsychologyTrainingValue(profile: UserPsychologyProfile): number {
    let value = profile.confidence * 0.4; // Base value from confidence

    // High-impact insights add value
    const highImpactInsights = profile.insights.filter(i => i.impact === 'high');
    value += highImpactInsights.length * 15;

    // Clear personality and emotional state add value
    if (profile.confidence > 70) value += 20;
    if (profile.insights.length > 3) value += 10;

    // Unique combinations add value
    if (profile.dominantPersonality === 'analytical' && profile.emotionalState === 'excited') {
      value += 15; // Interesting contradiction
    }

    return Math.min(Math.round(value), 100);
  }
}