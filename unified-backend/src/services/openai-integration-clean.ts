import OpenAI from 'openai';
import { Logger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';
import { prisma } from '../lib/database';

// Core interfaces for OpenAI integration
export interface VisionAnalysisResult {
  analysis: string;
  userPsychology: UserPsychology;
  qualityScore: number;
  confidence: number;
  processingTime: number;
}

export interface UserPsychology {
  dominantPersonality: string;
  emotionalState: string;
  decisionMakingStyle: string;
  trustLevel: number;
  urgencyLevel: number;
  priceSensitivity: number;
  socialInfluence: number;
  insights: string[];
  behaviorPredictions: string[];
}

export interface TrainingData {
  messages: any[];
  visionAnalysis?: VisionAnalysisResult;
  userPsychology?: UserPsychology;
  navigationStrategy?: any;
  selectorReliability?: any[];
  pageStructure?: any;
  trainingValue: number;
  complexity: number;
}

export interface TrainingConfig {
  model: string;
  hyperparameters: {
    n_epochs: number;
    batch_size: number;
    learning_rate_multiplier: number;
  };
  suffix?: string;
}

export class OpenAIIntegrationService {
  private openai: OpenAI;
  private logger: Logger;
  private prisma: PrismaClient;

  constructor() {
    this.logger = new Logger("OpenAIIntegration");
    
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY environment variable is required");
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    this.prisma = prisma;
  }

  // Vision API Integration - Core functionality
  async analyzeScreenshots(screenshots: any[]): Promise<VisionAnalysisResult[]> {
    const results: VisionAnalysisResult[] = [];

    for (const screenshot of screenshots) {
      try {
        const startTime = Date.now();
        
        // Check cache first
        const cached = await this.getCachedAnalysis(screenshot.id, 'comprehensive');
        if (cached) {
          results.push(cached);
          continue;
        }

        // Analyze with OpenAI Vision
        const analysis = await this.analyzeScreenshotWithVision(screenshot);
        
        // Extract psychology insights
        const userPsychology = this.extractPsychologyInsights(analysis);
        
        // Calculate quality score
        const qualityScore = this.calculateVisionQualityScore(analysis);
        
        const result: VisionAnalysisResult = {
          analysis,
          userPsychology,
          qualityScore,
          confidence: this.calculateConfidence(analysis),
          processingTime: Date.now() - startTime
        };

        // Cache the result
        await this.cacheAnalysis(screenshot.id, 'comprehensive', result);
        
        results.push(result);

      } catch (error) {
        this.logger.error("Screenshot analysis failed", { screenshotId: screenshot.id, error });
        
        // Return minimal result on error
        results.push({
          analysis: "Analysis failed",
          userPsychology: this.getDefaultPsychology(),
          qualityScore: 0,
          confidence: 0,
          processingTime: 0
        });
      }
    }

    return results;
  }

  // Single screenshot analysis method for compatibility
  async analyzeScreenshot(screenshot: any): Promise<VisionAnalysisResult> {
    const results = await this.analyzeScreenshots([screenshot]);
    return results[0];
  }

  private async analyzeScreenshotWithVision(screenshot: any): Promise<string> {
    const prompt = `Analyze this e-commerce screenshot and provide insights about:
1. User's shopping behavior and intent
2. Emotional state and decision-making style
3. Page structure and navigation patterns
4. Trust indicators and social proof elements
5. Price sensitivity and urgency signals

Focus on psychological insights that would help understand the user's shopping mindset.`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: screenshot.dataUrl || screenshot.s3Url,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
      temperature: 0.3
    });

    return response.choices[0]?.message?.content || "No analysis available";
  }

  private extractPsychologyInsights(analysis: string): UserPsychology {
    const lowerAnalysis = analysis.toLowerCase();
    
    // Simple keyword-based psychology extraction
    const psychology: UserPsychology = {
      dominantPersonality: this.detectPersonality(lowerAnalysis),
      emotionalState: this.detectEmotionalState(lowerAnalysis),
      decisionMakingStyle: this.detectDecisionStyle(lowerAnalysis),
      trustLevel: this.extractTrustLevel(lowerAnalysis),
      urgencyLevel: this.extractUrgencyLevel(lowerAnalysis),
      priceSensitivity: this.extractPriceSensitivity(lowerAnalysis),
      socialInfluence: this.extractSocialInfluence(lowerAnalysis),
      insights: this.extractInsights(analysis),
      behaviorPredictions: this.generateBehaviorPredictions(analysis)
    };

    return psychology;
  }

  private detectPersonality(analysis: string): string {
    if (analysis.includes('research') || analysis.includes('compare') || analysis.includes('detail')) {
      return 'ANALYTICAL';
    }
    if (analysis.includes('quick') || analysis.includes('impulse') || analysis.includes('immediate')) {
      return 'IMPULSIVE';
    }
    if (analysis.includes('careful') || analysis.includes('cautious') || analysis.includes('hesitant')) {
      return 'CAUTIOUS';
    }
    if (analysis.includes('review') || analysis.includes('social') || analysis.includes('community')) {
      return 'SOCIAL';
    }
    return 'PRACTICAL';
  }

  private detectEmotionalState(analysis: string): string {
    if (analysis.includes('excited') || analysis.includes('enthusiastic') || analysis.includes('eager')) {
      return 'EXCITED';
    }
    if (analysis.includes('frustrated') || analysis.includes('confused') || analysis.includes('difficult')) {
      return 'FRUSTRATED';
    }
    if (analysis.includes('confident') || analysis.includes('decisive') || analysis.includes('sure')) {
      return 'CONFIDENT';
    }
    if (analysis.includes('uncertain') || analysis.includes('unsure') || analysis.includes('hesitant')) {
      return 'UNCERTAIN';
    }
    return 'NEUTRAL';
  }

  private detectDecisionStyle(analysis: string): string {
    if (analysis.includes('quick') || analysis.includes('fast') || analysis.includes('immediate')) {
      return 'QUICK';
    }
    if (analysis.includes('compare') || analysis.includes('comparison') || analysis.includes('versus')) {
      return 'COMPARISON_HEAVY';
    }
    if (analysis.includes('research') || analysis.includes('study') || analysis.includes('investigate')) {
      return 'RESEARCH_DRIVEN';
    }
    return 'DELIBERATE';
  }

  private extractTrustLevel(analysis: string): number {
    let score = 50; // baseline
    if (analysis.includes('trust') || analysis.includes('secure') || analysis.includes('verified')) score += 20;
    if (analysis.includes('suspicious') || analysis.includes('doubt') || analysis.includes('uncertain')) score -= 20;
    if (analysis.includes('review') || analysis.includes('rating') || analysis.includes('testimonial')) score += 15;
    return Math.max(0, Math.min(100, score));
  }

  private extractUrgencyLevel(analysis: string): number {
    let score = 30; // baseline
    if (analysis.includes('urgent') || analysis.includes('limited') || analysis.includes('hurry')) score += 30;
    if (analysis.includes('sale') || analysis.includes('discount') || analysis.includes('offer')) score += 20;
    if (analysis.includes('relaxed') || analysis.includes('browsing') || analysis.includes('casual')) score -= 15;
    return Math.max(0, Math.min(100, score));
  }

  private extractPriceSensitivity(analysis: string): number {
    let score = 40; // baseline
    if (analysis.includes('price') || analysis.includes('cost') || analysis.includes('cheap')) score += 25;
    if (analysis.includes('expensive') || analysis.includes('budget') || analysis.includes('afford')) score += 20;
    if (analysis.includes('premium') || analysis.includes('luxury') || analysis.includes('quality')) score -= 15;
    return Math.max(0, Math.min(100, score));
  }

  private extractSocialInfluence(analysis: string): number {
    let score = 35; // baseline
    if (analysis.includes('review') || analysis.includes('rating') || analysis.includes('social')) score += 25;
    if (analysis.includes('popular') || analysis.includes('trending') || analysis.includes('recommend')) score += 20;
    if (analysis.includes('independent') || analysis.includes('personal') || analysis.includes('own')) score -= 15;
    return Math.max(0, Math.min(100, score));
  }

  private extractInsights(analysis: string): string[] {
    const insights: string[] = [];
    const sentences = analysis.split(/[.!?]+/).filter(s => s.trim().length > 10);
    
    // Extract key insights from analysis
    sentences.forEach(sentence => {
      if (sentence.includes('user') || sentence.includes('customer') || sentence.includes('shopper')) {
        insights.push(sentence.trim());
      }
    });

    return insights.slice(0, 5); // Limit to top 5 insights
  }

  private generateBehaviorPredictions(analysis: string): string[] {
    const predictions: string[] = [];
    
    if (analysis.toLowerCase().includes('compare')) {
      predictions.push('Likely to compare multiple products before purchasing');
    }
    if (analysis.toLowerCase().includes('review')) {
      predictions.push('Will read reviews before making a decision');
    }
    if (analysis.toLowerCase().includes('price')) {
      predictions.push('Price-conscious and will look for deals');
    }
    if (analysis.toLowerCase().includes('quick') || analysis.toLowerCase().includes('fast')) {
      predictions.push('Prefers quick checkout and fast delivery');
    }
    
    return predictions;
  }

  private calculateVisionQualityScore(analysis: string): number {
    if (!analysis || analysis.length < 50) return 0;
    
    let score = 50; // baseline
    
    // Content quality indicators
    if (analysis.length > 200) score += 15;
    if (analysis.includes('user') || analysis.includes('customer')) score += 10;
    if (analysis.includes('psychology') || analysis.includes('behavior')) score += 15;
    if (analysis.includes('trust') || analysis.includes('emotion')) score += 10;
    
    return Math.max(0, Math.min(100, score));
  }

  private calculateConfidence(analysis: string): number {
    if (!analysis) return 0;
    
    let confidence = 60; // baseline
    
    // Confidence indicators
    if (analysis.includes('clearly') || analysis.includes('obviously')) confidence += 15;
    if (analysis.includes('appears') || analysis.includes('seems')) confidence -= 10;
    if (analysis.includes('uncertain') || analysis.includes('unclear')) confidence -= 20;
    if (analysis.length > 500) confidence += 10;
    
    return Math.max(0, Math.min(100, confidence));
  }

  private getDefaultPsychology(): UserPsychology {
    return {
      dominantPersonality: 'PRACTICAL',
      emotionalState: 'NEUTRAL',
      decisionMakingStyle: 'DELIBERATE',
      trustLevel: 50,
      urgencyLevel: 30,
      priceSensitivity: 40,
      socialInfluence: 35,
      insights: [],
      behaviorPredictions: []
    };
  }

  // Training Data Generation with Task Context
  async generateTrainingData(sessionData: any): Promise<TrainingData> {
    try {
      // Get task context if available
      const taskContext = await this.getTaskContext(sessionData.id);
      
      const messages = await this.formatForOpenAI(sessionData, taskContext);
      
      return {
        messages,
        visionAnalysis: sessionData.visionAnalysis,
        userPsychology: sessionData.userPsychology,
        navigationStrategy: sessionData.navigationStrategy,
        selectorReliability: sessionData.selectorReliability,
        pageStructure: sessionData.pageStructure,
        trainingValue: this.calculateTrainingValue(sessionData),
        complexity: this.calculateComplexity(sessionData)
      };
    } catch (error) {
      this.logger.error("Training data generation failed", error);
      throw error;
    }
  }

  // Get task context for session
  private async getTaskContext(sessionId: string): Promise<any> {
    try {
      const taskAssignment = await this.prisma.taskAssignment.findFirst({
        where: { sessionId },
        include: { task: true }
      });

      if (!taskAssignment || !taskAssignment.task) return null;

      return {
        taskId: taskAssignment.task.id,
        title: taskAssignment.task.title,
        description: taskAssignment.task.description,
        type: taskAssignment.task.type,
        difficulty: taskAssignment.task.difficulty,
        steps: JSON.parse(taskAssignment.task.steps),
        successCriteria: JSON.parse(taskAssignment.task.successCriteria),
        status: taskAssignment.status,
        completionTime: taskAssignment.completionTime,
        assignedAt: taskAssignment.assignedAt
      };
    } catch (error) {
      this.logger.error("Failed to get task context", { sessionId, error });
      return null;
    }
  }

  private async formatForOpenAI(sessionData: any, taskContext?: any): Promise<any[]> {
    const trainingExamples: any[] = [];
    
    const enhancedInteractions = sessionData.enhancedInteractions || [];
    if (enhancedInteractions.length === 0) return trainingExamples;

    // Add task-driven training examples if task context is available
    if (taskContext) {
      const taskExamples = this.createTaskDrivenExamples(enhancedInteractions, taskContext);
      trainingExamples.push(...taskExamples);
    }

    // Create individual training examples for each interaction
    enhancedInteractions.forEach((interaction: any) => {
      const examples = this.createFineTuningExamples(interaction, taskContext);
      trainingExamples.push(...examples);
    });

    // Add sequence-based training examples
    if (enhancedInteractions.length > 1) {
      const sequenceExamples = this.createSequenceExamples(enhancedInteractions);
      trainingExamples.push(...sequenceExamples);
    }

    return trainingExamples;
  }

  // Create task-driven training examples - the key innovation!
  private createTaskDrivenExamples(interactions: any[], taskContext: any): any[] {
    const examples = [];
    
    // Task goal → Complete automation sequence
    const automationSequence = interactions
      .map(int => this.getPlaywrightAction(
        int.type?.toLowerCase(), 
        this.getBestSelector(int.selectors)
      ))
      .join(';\n');
    
    examples.push({
      input: `TASK: "${taskContext.description}" on ${new URL(interactions[0]?.context?.url || '').hostname}`,
      output: automationSequence
    });

    // Task step → Specific automation 
    taskContext.steps?.forEach((step: string, index: number) => {
      if (interactions[index]) {
        const interaction = interactions[index];
        const action = this.getPlaywrightAction(
          interaction.type?.toLowerCase(),
          this.getBestSelector(interaction.selectors)
        );
        
        examples.push({
          input: `STEP: "${step}" - How to automate this step?`,
          output: `${action} // ${step}`
        });
      }
    });

    // Success criteria → Verification commands
    taskContext.successCriteria?.forEach((criteria: string) => {
      examples.push({
        input: `VERIFY: "${criteria}" - How to check if this was accomplished?`,
        output: this.generateVerificationCommand(criteria)
      });
    });

    // Task completion analysis
    const taskSuccess = taskContext.status === 'completed';
    examples.push({
      input: `Task completion analysis: "${taskContext.title}" - ${taskSuccess ? 'SUCCESS' : 'INCOMPLETE'}`,
      output: `Task ${taskSuccess ? 'completed successfully' : 'not completed'} in ${taskContext.completionTime || 'unknown'} seconds. Automation sequence: ${automationSequence}`
    });

    return examples;
  }

  // Generate verification commands for success criteria
  private generateVerificationCommand(criteria: string): string {
    const lowerCriteria = criteria.toLowerCase();
    
    if (lowerCriteria.includes('cart icon shows') || lowerCriteria.includes('cart count')) {
      return `await expect(page.locator('.cart-count, [data-testid="cart-count"]')).toBeVisible(); // Verify cart has items`;
    } else if (lowerCriteria.includes('cart page') || lowerCriteria.includes('cart contents')) {
      return `await expect(page.locator('.cart-items, [data-testid="cart-items"]')).toBeVisible(); // Verify on cart page`;
    } else if (lowerCriteria.includes('product') && lowerCriteria.includes('page')) {
      return `await expect(page.locator('h1, [data-testid="product-title"]')).toBeVisible(); // Verify product page loaded`;
    } else if (lowerCriteria.includes('search')) {
      return `await expect(page.locator('.search-results, [data-testid="search-results"]')).toBeVisible(); // Verify search results displayed`;
    } else if (lowerCriteria.includes('price') || lowerCriteria.includes('$')) {
      return `await expect(page.locator('[data-testid="price"], .price')).toBeVisible(); // Verify price displayed`;
    } else {
      return `await expect(page.locator('body')).toContainText('${criteria}'); // Verify criteria met`;
    }
  }

  // Create fine-tuning training examples for individual interactions
  private createFineTuningExamples(interaction: any, taskContext?: any): any[] {
    const examples = [];
    
    const url = interaction.context?.url;
    const hostname = url ? new URL(url).hostname : 'unknown-site';
    const elementText = interaction.element?.text || '';
    const actionType = interaction.type?.toLowerCase() || 'interact';
    const pageTitle = interaction.context?.pageTitle || '';
    
    // Get the best selector based on reliability
    const selectors = interaction.selectors || {};
    const bestSelector = this.getBestSelector(selectors);
    const backupSelectors = this.getBackupSelectors(selectors, bestSelector);
    
    // Extract rich contextual data
    const nearby = interaction.element?.nearbyElements || [];
    const parentElements = interaction.element?.parentElements || [];
    const siblingElements = interaction.element?.siblingElements || [];
    const contextData = interaction.contextData || {};
    const overlays = interaction.overlays || [];
    const elementDetails = interaction.elementDetails || {};
    
    // Build comprehensive context strings
    const nearbyText = nearby.slice(0, 3).map((el: any) => 
      `"${el.text}" (${el.direction}, ${el.distance}px)`
    ).join(', ');
    
    const siblingText = siblingElements.slice(0, 2).map((el: any) => 
      `"${el.text}" (${el.position})`
    ).join(', ');
    
    const parentContext = parentElements.length > 0 ? 
      parentElements[0].className || parentElements[0].tagName : '';
    
    // Determine page context and user journey stage
    const pageContext = this.analyzePageContext(interaction, hostname);
    const userJourneyStage = this.inferUserJourneyStage(interaction, pageContext);
    const conversionContext = this.getConversionContext(interaction, pageContext);

    const playwrightAction = this.getPlaywrightAction(actionType, bestSelector);

    // 🆕 ENHANCED TRAINING EXAMPLES

    // Example 1: Site-specific pattern recognition
    examples.push({
      input: `${hostname.toUpperCase()}: "${elementText}" ${actionType}, ${pageContext.pageType}`,
      output: `${playwrightAction} // ${hostname} ${pageContext.designSystem || 'standard'} pattern`
    });

    // Example 2: Spatial relationship learning
    if (nearbyText) {
      examples.push({
        input: `SPATIAL: "${elementText}" with nearby elements: ${nearbyText} on ${hostname}`,
        output: `${playwrightAction} // Located near: ${nearbyText}`
      });
    }

    // Example 3: DOM hierarchy context
    if (parentContext) {
      examples.push({
        input: `DOM HIERARCHY: "${elementText}" in ${parentContext} container on ${hostname}`,
        output: `${playwrightAction} // Within ${parentContext} structure`
      });
    }

    // Example 4: Sibling element context
    if (siblingText) {
      examples.push({
        input: `SIBLING CONTEXT: "${elementText}" grouped with ${siblingText} on ${hostname}`,
        output: `${playwrightAction} // Part of element group: ${siblingText}`
      });
    }

    // Example 5: Modal/Overlay context
    if (overlays.length > 0) {
      const overlayType = overlays[0].css_selector?.includes('modal') ? 'modal' : 'overlay';
      examples.push({
        input: `${overlayType.toUpperCase()}: "${elementText}" in ${overlayType} on ${hostname}`,
        output: `${playwrightAction} // ${overlayType} interaction`
      });
    }

    // Example 6: Conversion funnel context
    if (conversionContext.stage) {
      examples.push({
        input: `CONVERSION: ${conversionContext.stage} - "${elementText}" on ${hostname}`,
        output: `${playwrightAction} // ${conversionContext.businessAction} action`
      });
    }

    // Example 7: User journey context
    if (userJourneyStage) {
      examples.push({
        input: `USER JOURNEY: ${userJourneyStage} stage, click "${elementText}" on ${hostname}`,
        output: `${playwrightAction} // ${userJourneyStage} workflow`
      });
    }

    // Example 8: Element attribute patterns (enhanced)
    const attributes = interaction.element?.attributes || {};
    const dataTestId = attributes['data-testid'];
    if (dataTestId) {
      examples.push({
        input: `RELIABLE SELECTOR: Find "${elementText}" with data-testid on ${hostname}`,
        output: `[data-testid="${dataTestId}"] // High reliability selector for ${hostname}`
      });
    }

    // Example 9: Visual context (if available)
    const boundingBox = interaction.visual?.boundingBox;
    if (boundingBox) {
      const position = this.getVisualPosition(boundingBox);
      examples.push({
        input: `VISUAL POSITION: "${elementText}" in ${position} area of ${hostname}`,
        output: `${playwrightAction} // ${position} positioned element`
      });
    }

    // Example 10: Selector reliability with context
    if (backupSelectors.length > 0) {
      examples.push({
        input: `SELECTOR STRATEGY: Find "${elementText}" on ${hostname}, primary may fail`,
        output: `Primary: ${bestSelector}, Fallback: ${backupSelectors[0]} // Reliability-based selection`
      });
    }

    // Example 11: Business context integration
    if (taskContext) {
      examples.push({
        input: `TASK: "${taskContext.description}" - interact with "${elementText}" on ${hostname}`,
        output: `${playwrightAction} // Task-driven interaction: ${taskContext.title}`
      });
    }

    // 🆕 Example 12: Structured environment + action format (ChatGPT style)
    const environmentSnapshot = this.createEnvironmentSnapshot(interaction, hostname);
    const userDirection = this.formatUserDirection(taskContext);
    
    examples.push({
      input: `ENVIRONMENT: ${JSON.stringify(environmentSnapshot)}\nUSER GOAL: ${userDirection.goal}\nCURRENT STEP: ${userDirection.currentStep}\nINTENT: ${taskContext?.description || 'User interaction'}`,
      output: JSON.stringify({
        action: actionType,
        selector: bestSelector,
        reasoning: `${pageContext.pageType} page interaction with ${conversionContext.businessAction} intent`,
        confidence: interaction.selectors?.reliability?.[bestSelector] || 0.5,
        context: {
          site: hostname,
          stage: userJourneyStage,
          spatial: nearbyText,
          taskProgress: userDirection.progress
        }
      })
    });

    // 🆕 Example 13: Task-directed interaction with full user context
    if (taskContext) {
      examples.push({
        input: `USER TASK: "${taskContext.title}" - GOAL: "${taskContext.description}" - WEBSITE: ${hostname} - ACTION NEEDED: ${actionType} "${elementText}"`,
        output: `${playwrightAction} // Task: ${taskContext.title} | Step: ${userDirection.currentStep} | Goal: ${taskContext.description}`
      });
    }

    return examples;
  }

  // Create sequence-based training examples
  private createSequenceExamples(interactions: any[]): any[] {
    const examples = [];
    
    // Take sequences of 2-3 interactions
    for (let i = 0; i < interactions.length - 1; i++) {
      const current = interactions[i];
      const next = interactions[i + 1];
      
      const currentAction = this.getPlaywrightAction(
        current.type?.toLowerCase(), 
        this.getBestSelector(current.selectors)
      );
      const nextAction = this.getPlaywrightAction(
        next.type?.toLowerCase(),
        this.getBestSelector(next.selectors)
      );
      
      const currentText = current.element?.text || 'element';
      const nextText = next.element?.text || 'element';
      
      examples.push({
        input: `Sequence: Click "${currentText}" then "${nextText}"`,
        output: `${currentAction};\n${nextAction};`
      });
    }

    return examples;
  }

  private getBestSelector(selectors: any): string {
    if (!selectors) return 'element';
    
    // Priority order: data-testid > id > class > tag
    if (selectors.primary?.includes('data-testid')) return selectors.primary;
    if (selectors.primary?.includes('#')) return selectors.primary;
    
    // Check alternatives for better options
    const alternatives = selectors.alternatives || [];
    const dataTestId = alternatives.find((s: string) => s.includes('data-testid'));
    if (dataTestId) return dataTestId;
    
    const idSelector = alternatives.find((s: string) => s.includes('#'));
    if (idSelector) return idSelector;
    
    return selectors.primary || selectors.alternatives?.[0] || 'element';
  }

  private getBackupSelectors(selectors: any, exclude: string): string[] {
    if (!selectors) return [];
    
    const all = [selectors.primary, ...(selectors.alternatives || []), selectors.xpath]
      .filter(s => s && s !== exclude);
    
    return all.slice(0, 2); // Return top 2 backup selectors
  }

  private getPlaywrightAction(actionType: string, selector: string): string {
    switch (actionType) {
      case 'click':
        return `await page.click('${selector}')`;
      case 'hover':
      case 'focus':
        return `await page.hover('${selector}')`;
      case 'type':
      case 'input':
        return `await page.fill('${selector}', 'value')`;
      case 'select':
        return `await page.selectOption('${selector}', 'option')`;
      default:
        return `await page.click('${selector}')`;
    }
  }

  private inferElementPurpose(elementText: string, attributes: any = {}): string {
    const text = elementText.toLowerCase();
    const type = attributes?.type?.toLowerCase() || '';
    const role = attributes?.role?.toLowerCase() || '';
    
    if (text.includes('add to cart') || text.includes('buy')) return 'Purchase action';
    if (text.includes('login') || text.includes('sign in')) return 'Authentication';
    if (text.includes('search')) return 'Search functionality';
    if (text.includes('menu') || text.includes('nav')) return 'Navigation';
    if (type === 'submit' || attributes?.['data-testid']?.includes('submit')) return 'Form submission';
    if (role === 'button' || attributes?.tagName === 'button') return 'Interactive button';
    if (text.match(/\d+/) && text.includes('$')) return 'Pricing element';
    
    return `Interactive element: ${elementText}`;
  }

  // Enhanced context analysis methods for training data
  private analyzePageContext(interaction: any, hostname: string): any {
    const url = interaction.context?.url || '';
    const pageTitle = interaction.context?.pageTitle || '';
    const overlays = interaction.overlays || [];
    
    // Determine page type from URL and context
    let pageType = 'unknown';
    if (url.includes('/cart')) pageType = 'cart';
    else if (url.includes('/checkout')) pageType = 'checkout';
    else if (url.includes('/product') || url.match(/\/t\//)) pageType = 'product';
    else if (url.includes('/search')) pageType = 'search';
    else if (url === `https://www.${hostname}/` || url === `https://${hostname}/`) pageType = 'homepage';
    else if (overlays.length > 0) pageType = 'modal_overlay';
    
    // Determine design system from hostname
    let designSystem = 'standard';
    if (hostname.includes('nike.com')) designSystem = 'nds'; // Nike Design System
    else if (hostname.includes('amazon.com')) designSystem = 'amazon-ui';
    else if (hostname.includes('uniqlo.com')) designSystem = 'uniqlo-ui';
    
    return {
      pageType,
      designSystem,
      hasModal: overlays.length > 0,
      url,
      title: pageTitle
    };
  }

  private inferUserJourneyStage(interaction: any, pageContext: any): string {
    const elementText = interaction.element?.text?.toLowerCase() || '';
    const url = interaction.context?.url || '';
    
    // Analyze user journey stage based on context
    if (pageContext.pageType === 'homepage') return 'discovery';
    if (pageContext.pageType === 'search') return 'search_browse';
    if (pageContext.pageType === 'product') {
      if (elementText.includes('add to cart') || elementText.includes('add to bag')) return 'consideration_to_intent';
      return 'consideration';
    }
    if (pageContext.pageType === 'cart') {
      if (elementText.includes('checkout')) return 'intent_to_purchase';
      return 'cart_review';
    }
    if (pageContext.pageType === 'checkout') return 'purchase_completion';
    if (pageContext.hasModal && elementText.includes('view bag')) return 'post_add_review';
    
    return 'unknown';
  }

  private getConversionContext(interaction: any, pageContext: any): any {
    const elementText = interaction.element?.text?.toLowerCase() || '';
    
    // Map actions to business conversion stages
    let stage = 'unknown';
    let businessAction = 'unknown';
    
    if (elementText.includes('add to cart') || elementText.includes('add to bag')) {
      stage = 'add_to_cart';
      businessAction = 'conversion_action';
    } else if (elementText.includes('checkout') || elementText.includes('buy now')) {
      stage = 'checkout_initiation';
      businessAction = 'purchase_intent';
    } else if (elementText.includes('view bag') || elementText.includes('view cart')) {
      stage = 'cart_review';
      businessAction = 'cart_validation';
    } else if (elementText.includes('continue shopping')) {
      stage = 'continue_browsing';
      businessAction = 'retention_action';
    }
    
    return { stage, businessAction };
  }

  private getVisualPosition(boundingBox: any): string {
    const { x, y, width, height } = boundingBox;
    const viewport = { width: 1700, height: 863 }; // Default, could be extracted from interaction
    
    // Determine general position on screen
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    const horizontalPos = centerX < viewport.width * 0.33 ? 'left' : 
                         centerX > viewport.width * 0.67 ? 'right' : 'center';
    const verticalPos = centerY < viewport.height * 0.33 ? 'top' :
                       centerY > viewport.height * 0.67 ? 'bottom' : 'middle';
    
    return `${verticalPos}-${horizontalPos}`;
  }

  // Create structured environment snapshot (ChatGPT style)
  private createEnvironmentSnapshot(interaction: any, hostname: string): any {
    const nearby = interaction.element?.nearbyElements || [];
    const parentElements = interaction.element?.parentElements || [];
    
    return {
      url: interaction.context?.url,
      pageTitle: interaction.context?.pageTitle,
      site: hostname,
      pageType: this.analyzePageContext(interaction, hostname).pageType,
      currentElement: {
        tag: interaction.element?.tag,
        text: interaction.element?.text,
        attributes: interaction.element?.attributes
      },
      nearbyElements: nearby.slice(0, 3).map((el: any) => ({
        text: el.text,
        direction: el.direction,
        distance: el.distance,
        interactive: el.isInteractive
      })),
      domHierarchy: parentElements.slice(0, 3).map((parent: any) => ({
        tag: parent.tagName,
        class: parent.className,
        level: parent.level
      })),
      viewport: interaction.visual?.viewport,
      hasModal: (interaction.overlays || []).length > 0,
      cartState: this.extractCartState(interaction),
      filters: this.extractCurrentFilters(interaction)
    };
  }

  private extractCartState(interaction: any): any {
    const elementText = interaction.element?.text || '';
    const match = elementText.match(/\((\d+)\)/); // Extract numbers in parentheses
    return {
      itemCount: match ? parseInt(match[1]) : 0,
      hasItems: !!match
    };
  }

  private extractCurrentFilters(interaction: any): any {
    // Could extract from URL parameters or DOM state
    const url = interaction.context?.url || '';
    const urlParams = new URLSearchParams(url.split('?')[1] || '');
    
    return {
      size: urlParams.get('size'),
      color: urlParams.get('color'),
      price: urlParams.get('price'),
      category: urlParams.get('category')
    };
  }

  // Format user task direction and progress
  private formatUserDirection(taskContext: any): any {
    if (!taskContext) {
      return {
        goal: 'Complete website interaction',
        currentStep: 'Unknown step',
        progress: 'Unknown'
      };
    }

    const steps = taskContext.steps || [];
    const currentStepIndex = Math.min(steps.length - 1, Math.max(0, steps.length - 1)); // Default to last step
    
    return {
      goal: taskContext.description || taskContext.title,
      currentStep: steps[currentStepIndex] || 'Complete task',
      totalSteps: steps.length,
      progress: `Step ${currentStepIndex + 1} of ${steps.length}`,
      successCriteria: taskContext.successCriteria || [],
      taskType: taskContext.type,
      difficulty: taskContext.difficulty,
      estimatedTime: taskContext.estimatedTime
    };
  }

  private generateContextualResponse(interaction: any, psychology: any): string {
    const responses = [
      `I can help you with that. Based on your ${psychology?.decisionMakingStyle || 'browsing'} style, here's what I recommend...`,
      `Great choice! Given your ${psychology?.emotionalState || 'current'} state, this seems like a good fit.`,
      `I notice you're looking at this carefully. That aligns with your ${psychology?.dominantPersonality || 'thoughtful'} approach.`
    ];
    
    return responses[Math.floor(Math.random() * responses.length)];
  }

  private calculateTrainingValue(sessionData: any): number {
    let value = 50; // baseline
    
    // Use enhanced interactions from JSON field
    const enhancedInteractions = sessionData.enhancedInteractions || [];
    if (enhancedInteractions.length > 5) value += 20;
    
    // Screenshots are already properly accessible via session.screenshots
    if (sessionData.screenshots?.length > 3) value += 15;
    if (sessionData.userPsychology?.confidence > 70) value += 15;
    if (sessionData.qualityScore > 80) value += 20;
    
    return Math.max(0, Math.min(100, value));
  }

  private calculateComplexity(sessionData: any): number {
    let complexity = 30; // baseline
    
    // Use enhanced interactions from JSON field
    const enhancedInteractions = sessionData.enhancedInteractions || [];
    if (enhancedInteractions.length > 10) complexity += 25;
    if (sessionData.pageStructure?.complexity > 0.7) complexity += 20;
    if (sessionData.navigationStrategy?.efficiency < 0.5) complexity += 15;
    
    return Math.max(0, Math.min(100, complexity));
  }

  // File Management
  async uploadTrainingFile(data: any, metadata: any): Promise<string> {
    try {
      const jsonlContent = data.messages.map((msg: any) => JSON.stringify(msg)).join('\n');
      
      const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
      const fileObject = Object.assign(blob, {
        name: 'training-data.jsonl',
        lastModified: Date.now()
      });
      
      const file = await this.openai.files.create({
        file: fileObject,
        purpose: 'fine-tune'
      });

      this.logger.info("Training file uploaded", { fileId: file.id, size: jsonlContent.length });
      return file.id;
    } catch (error) {
      this.logger.error("Training file upload failed", error);
      throw error;
    }
  }

  // Fine-tuning Job Management
  async createFineTuningJob(fileId: string, config: TrainingConfig): Promise<string> {
    try {
      const job = await this.openai.fineTuning.jobs.create({
        training_file: fileId,
        model: config.model || 'gpt-4o-mini-2024-07-18',
        hyperparameters: config.hyperparameters,
        suffix: config.suffix
      });

      this.logger.info("Fine-tuning job created", { jobId: job.id, fileId });
      return job.id;
    } catch (error) {
      this.logger.error("Fine-tuning job creation failed", error);
      throw error;
    }
  }

  async monitorTraining(jobId: string): Promise<any> {
    try {
      const job = await this.openai.fineTuning.jobs.retrieve(jobId);
      return {
        id: job.id,
        status: job.status,
        model: job.fine_tuned_model,
        createdAt: job.created_at,
        finishedAt: job.finished_at,
        error: job.error
      };
    } catch (error) {
      this.logger.error("Training monitoring failed", error);
      throw error;
    }
  }

  // Cache Management
  private async getCachedAnalysis(screenshotId: string, analysisType: string): Promise<any> {
    try {
      const cached = await this.prisma.visionAnalysisCache.findFirst({
        where: {
          screenshotId,
          analysisType,
          expiresAt: { gt: new Date() }
        }
      });

      if (cached) {
        await this.prisma.visionAnalysisCache.update({
          where: { id: cached.id },
          data: { hitCount: { increment: 1 } }
        });
        return cached.analysisResult;
      }

      return null;
    } catch (error) {
      this.logger.error("Cache retrieval failed", error);
      return null;
    }
  }

  private async cacheAnalysis(screenshotId: string, analysisType: string, analysis: any): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour cache

      await this.prisma.visionAnalysisCache.create({
        data: {
          screenshotId,
          analysisType,
          analysisResult: analysis,
          qualityScore: analysis.qualityScore || 0,
          expiresAt,
          hitCount: 0
        }
      });
    } catch (error) {
      this.logger.error("Cache storage failed", error);
      // Don't throw - caching is optional
    }
  }

  // Advanced screenshot analysis method for psychology insights
  async analyzeScreenshotsAdvanced(screenshots: any[], options?: any): Promise<VisionAnalysisResult[]> {
    this.logger.info("Advanced screenshot analysis requested", { 
      count: screenshots.length, 
      type: options?.analysisType || 'standard' 
    });
    
    // For now, delegate to the standard analyzeScreenshots method
    // This maintains compatibility while using the existing implementation
    return await this.analyzeScreenshots(screenshots);
  }

  // Health check method for server monitoring
  async healthCheck(): Promise<string> {
    try {
      // Test OpenAI API connection with a simple request
      const models = await this.openai.models.list();
      return models.data.length > 0 ? 'connected' : 'degraded';
    } catch (error) {
      this.logger.error("OpenAI health check failed", error);
      return 'disconnected';
    }
  }
}