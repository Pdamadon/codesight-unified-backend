/**
 * Agent1DataGenerator - Creates site comprehension training data
 * Phase 4: Agent Training Data Generation for Site Understanding Agent
 */

class Agent1DataGenerator {
  constructor(worldModel) {
    this.worldModel = worldModel;
    this.trainingConfig = {
      maxExamplesPerType: 50,
      minConfidenceThreshold: 0.6,
      contextWindowSize: 3, // Number of pages to include for context
      includeNegativeExamples: true
    };
  }

  /**
   * Generate comprehensive site comprehension training data
   */
  async generateSiteComprehensionData(sessionAnalyses, journeyData) {
    const trainingData = {
      metadata: {
        agentType: 'site-comprehension',
        targetModel: 'gpt-4',
        version: '1.0',
        generatedAt: new Date().toISOString(),
        totalExamples: 0
      },
      
      // Core training datasets
      datasets: {
        navigationPlanning: await this.generateNavigationPlanningData(journeyData),
        pageTypeClassification: await this.generatePageTypeClassificationData(sessionAnalyses),
        siteArchitectureUnderstanding: await this.generateSiteArchitectureData(),
        journeyPatternRecognition: await this.generateJourneyPatternData(journeyData),
        businessFlowUnderstanding: await this.generateBusinessFlowData(journeyData),
        componentRecognition: await this.generateComponentRecognitionData()
      }
    };

    // Calculate total examples
    trainingData.metadata.totalExamples = Object.values(trainingData.datasets)
      .reduce((total, dataset) => total + dataset.examples.length, 0);

    return trainingData;
  }

  /**
   * Generate navigation planning training examples
   */
  async generateNavigationPlanningData(journeyData) {
    const examples = [];
    
    journeyData.forEach(data => {
      if (!data.journeys) return;

      data.journeys.forEach(journey => {
        if (journey.navigationFlow && journey.navigationFlow.length > 2) {
          // Create site comprehension example
          const example = this.createNavigationPlanningExample(journey);
          if (example) examples.push(example);
        }
      });
    });

    return {
      type: 'navigation-planning',
      description: 'Teaches agent to plan navigation routes based on user intent and site structure',
      examples: examples.slice(0, this.trainingConfig.maxExamplesPerType),
      quality: this.calculateDatasetQuality(examples)
    };
  }

  /**
   * Create a navigation planning training example
   */
  createNavigationPlanningExample(journey) {
    const userIntent = journey.userIntent || 'Complete user goal';
    const journeyGoal = journey.journeyGoal || 'unknown';
    const pageSequence = journey.pageTypeSequence || [];
    const navigationFlow = journey.navigationFlow || [];

    if (pageSequence.length < 2) return null;

    // Create site comprehension prompt
    const prompt = this.buildNavigationPrompt(userIntent, journeyGoal, pageSequence, navigationFlow);
    
    // Create site understanding completion
    const completion = this.buildNavigationCompletion(journey, navigationFlow);

    return {
      prompt,
      completion,
      metadata: {
        journeyType: journey.journeyType,
        stepCount: journey.stepCount,
        pageTypes: pageSequence,
        userIntent: userIntent,
        confidence: journey.quality?.overall || 0.5
      }
    };
  }

  /**
   * Build navigation planning prompt for Agent 1
   */
  buildNavigationPrompt(userIntent, journeyGoal, pageSequence, navigationFlow) {
    const siteInfo = this.getSiteContextInfo();
    const availablePages = this.getAvailablePageTypes();
    
    return `SITE COMPREHENSION: Plan navigation for "${userIntent}"

SITE CONTEXT:
- Domain: ${siteInfo.domain}
- Site Type: ${siteInfo.siteType}
- Available Page Types: ${availablePages.join(', ')}
- Navigation Patterns: ${this.getNavigationPatterns()}

GOAL: ${journeyGoal}

Plan the optimal page sequence to achieve this user intent. Consider:
1. Logical page flow based on site architecture
2. User journey patterns for this goal type
3. Available navigation paths and entry points
4. Conversion optimization opportunities

Provide a step-by-step navigation plan with reasoning.`;
  }

  /**
   * Build navigation completion showing site understanding
   */
  buildNavigationCompletion(journey, navigationFlow) {
    let completion = `// Site Comprehension: Navigation plan for "${journey.userIntent}"\n\n`;
    
    completion += `NAVIGATION STRATEGY:\n`;
    completion += `Journey Type: ${journey.journeyType}\n`;
    completion += `Expected Steps: ${journey.stepCount}\n`;
    completion += `Success Indicators: ${this.getSuccessIndicators(journey)}\n\n`;

    completion += `STEP-BY-STEP PLAN:\n`;
    navigationFlow.forEach((step, index) => {
      completion += `${index + 1}. ${step.pageType.toUpperCase()}\n`;
      completion += `   Purpose: ${this.getStepPurpose(step, index, navigationFlow)}\n`;
      completion += `   Key Elements: ${this.getKeyElements(step.pageType)}\n`;
      completion += `   Next Action: ${this.getExpectedAction(step, index, navigationFlow)}\n\n`;
    });

    completion += `SITE ARCHITECTURE UNDERSTANDING:\n`;
    completion += `- This site follows ${this.worldModel.siteArchitecture.domainInfo.siteType} patterns\n`;
    completion += `- Common flow: ${this.getCommonFlow(journey.journeyType)}\n`;
    completion += `- Success rate: Expected ${this.getExpectedSuccessRate(journey.journeyType)}%\n`;

    return completion;
  }

  /**
   * Generate page type classification training data
   */
  async generatePageTypeClassificationData(sessionAnalyses) {
    const examples = [];
    
    sessionAnalyses.forEach(analysis => {
      if (!analysis.pageTypes) return;

      for (const [key, pageAnalysis] of analysis.pageTypes) {
        if (pageAnalysis.confidence > this.trainingConfig.minConfidenceThreshold) {
          const example = this.createPageClassificationExample(pageAnalysis);
          if (example) examples.push(example);
        }
      }
    });

    return {
      type: 'page-type-classification',
      description: 'Teaches agent to identify page types and their characteristics',
      examples: examples.slice(0, this.trainingConfig.maxExamplesPerType),
      quality: this.calculateDatasetQuality(examples)
    };
  }

  /**
   * Create page classification training example
   */
  createPageClassificationExample(pageAnalysis) {
    const pageType = pageAnalysis.pageType;
    const url = pageAnalysis.url;
    const zones = pageAnalysis.zones || [];
    const matchedPatterns = pageAnalysis.matchedPatterns || [];
    
    const prompt = `SITE ANALYSIS: Classify page type and identify site structure

URL: ${url}
Page Title: ${pageAnalysis.metadata?.pageTitle || 'Unknown'}

SEMANTIC ZONES DETECTED:
${zones.map(zone => `- ${zone.name} (confidence: ${zone.confidence.toFixed(2)})`).join('\n')}

MATCHED PATTERNS:
${matchedPatterns.map(pattern => `- ${pattern.type}: ${pattern.pattern}`).join('\n')}

Analyze this page within the site architecture context and provide:
1. Page type classification with reasoning
2. Role in user journey flows
3. Key functional areas and their purposes
4. Relationship to other page types`;

    const completion = `// Site Comprehension: Page Analysis

PAGE CLASSIFICATION: ${pageType.toUpperCase()}

SITE ARCHITECTURE ROLE:
This is a ${pageType} page that serves as ${this.getPageRole(pageType)} in the site's user journey architecture.

FUNCTIONAL ANALYSIS:
${this.getFunctionalAnalysis(pageType, zones)}

JOURNEY CONTEXT:
- Typical entry point: ${this.getTypicalEntryPoint(pageType)}
- Common next steps: ${this.getCommonNextSteps(pageType)}
- Conversion potential: ${this.getConversionPotential(pageType)}

ARCHITECTURAL UNDERSTANDING:
- Page pattern: ${this.getPagePattern(pageType)}
- Component structure: ${this.getComponentStructure(zones)}
- Navigation context: ${this.getNavigationContext(pageType)}`;

    return {
      prompt,
      completion,
      metadata: {
        pageType,
        confidence: pageAnalysis.confidence,
        zonesCount: zones.length,
        patternsMatched: pageAnalysis.matchedPatterns.length
      }
    };
  }

  /**
   * Generate site architecture understanding data
   */
  async generateSiteArchitectureData() {
    const examples = [];
    const architecture = this.worldModel.siteArchitecture;
    
    // Create comprehensive site understanding example
    const siteExample = this.createSiteArchitectureExample(architecture);
    if (siteExample) examples.push(siteExample);

    // Create URL pattern understanding examples
    architecture.urlStructure.commonPatterns.forEach(pattern => {
      const patternExample = this.createUrlPatternExample(pattern);
      if (patternExample) examples.push(patternExample);
    });

    return {
      type: 'site-architecture-understanding',
      description: 'Teaches agent to understand overall site structure and organization',
      examples: examples.slice(0, this.trainingConfig.maxExamplesPerType),
      quality: this.calculateDatasetQuality(examples)
    };
  }

  /**
   * Create site architecture understanding example
   */
  createSiteArchitectureExample(architecture) {
    const commonTransitions = architecture.pageHierarchy?.commonTransitions || [];
    const commonLayouts = architecture.commonLayouts || [];
    
    const prompt = `SITE ARCHITECTURE ANALYSIS: Understand the overall structure and organization

DOMAIN INFO:
- Site: ${architecture.domainInfo?.domain || 'unknown'}
- Type: ${architecture.domainInfo?.siteType || 'unknown'}
- URL Patterns: ${architecture.urlStructure?.commonPatterns?.length || 0} identified
- Page Hierarchy: ${Object.keys(architecture.pageHierarchy?.pageTypes || {}).length} page types

COMMON TRANSITIONS:
${commonTransitions.map(t => `- ${t.transition}: ${t.count} times`).join('\n')}

LAYOUT PATTERNS:
${commonLayouts.map(layout => `- Zones: ${layout.zones.join(' + ')} (${layout.occurrences} occurrences)`).join('\n')}

Provide a comprehensive analysis of this site's architecture, including:
1. Overall site strategy and business model
2. User journey design patterns
3. Information architecture principles
4. Navigation and content organization`;

    const completion = `// Site Architecture Comprehension

BUSINESS MODEL ANALYSIS:
This is a ${architecture.domainInfo.siteType} site following standard ${this.getArchitecturalPattern(architecture.domainInfo.siteType)} patterns.

INFORMATION ARCHITECTURE:
- Hierarchical depth: ${architecture.urlStructure.averagePathDepth} levels average
- Content organization: ${this.getContentOrganization(architecture)}
- Navigation strategy: ${this.getNavigationStrategy(architecture)}

USER EXPERIENCE DESIGN:
- Journey patterns: ${this.getJourneyPatterns(architecture)}
- Conversion optimization: ${this.getConversionOptimization(architecture)}
- Content discoverability: ${this.getDiscoverabilityApproach(architecture)}

TECHNICAL ARCHITECTURE:
- URL structure: ${this.getUrlStructurePattern(architecture)}
- Component reuse: ${this.getComponentReusePattern(architecture)}
- Layout consistency: ${this.getLayoutConsistency(architecture)}

STRATEGIC INSIGHTS:
- Primary user paths: ${this.getPrimaryUserPaths(architecture)}
- Business objectives: ${this.getBusinessObjectives(architecture)}
- Optimization opportunities: ${this.getOptimizationOpportunities(architecture)}`;

    return {
      prompt,
      completion,
      metadata: {
        siteType: architecture.domainInfo.siteType,
        patternsAnalyzed: architecture.urlStructure.commonPatterns.length,
        pageTypes: Object.keys(architecture.pageHierarchy.pageTypes).length
      }
    };
  }

  /**
   * Generate journey pattern recognition data
   */
  async generateJourneyPatternData(journeyData) {
    const examples = [];
    
    journeyData.forEach(data => {
      if (!data.journeys) return;

      data.journeys.forEach(journey => {
        const example = this.createJourneyPatternExample(journey);
        if (example) examples.push(example);
      });
    });

    return {
      type: 'journey-pattern-recognition',
      description: 'Teaches agent to recognize and understand user journey patterns',
      examples: examples.slice(0, this.trainingConfig.maxExamplesPerType),
      quality: this.calculateDatasetQuality(examples)
    };
  }

  /**
   * Create journey pattern recognition example
   */
  createJourneyPatternExample(journey) {
    const pageTypeSequence = journey.pageTypeSequence || [];
    const conversionPoints = journey.conversionPoints || [];
    
    const prompt = `JOURNEY PATTERN ANALYSIS: Understand user behavior and intent patterns

USER JOURNEY:
- Intent: "${journey.userIntent || 'unknown'}"
- Type: ${journey.journeyType || 'unknown'}
- Steps: ${journey.stepCount || 0}
- Duration: ${Math.round((journey.duration || 0) / 1000)}s

PAGE SEQUENCE:
${pageTypeSequence.map((page, i) => `${i + 1}. ${page}`).join('\n')}

CONVERSION POINTS:
${conversionPoints.map(cp => `- ${cp.type} at step ${cp.stepIndex}`).join('\n') || 'None detected'}

Analyze this journey pattern and provide insights on:
1. User behavior characteristics
2. Journey efficiency and optimization potential
3. Pattern classification and business impact
4. Relationship to site architecture`;

    const completion = `// Journey Pattern Comprehension

BEHAVIOR ANALYSIS:
User Type: ${this.getUserType(journey)}
Intent Category: ${this.getIntentCategory(journey)}
Behavior Pattern: ${this.getBehaviorPattern(journey)}

JOURNEY EFFICIENCY:
- Step optimization: ${this.getStepOptimization(journey)}
- Time efficiency: ${this.getTimeEfficiency(journey)}
- Success probability: ${this.getSuccessProbability(journey)}

BUSINESS IMPACT:
- Value potential: ${this.getValuePotential(journey)}
- Conversion likelihood: ${this.getConversionLikelihood(journey)}
- Optimization priority: ${this.getOptimizationPriority(journey)}

ARCHITECTURAL ALIGNMENT:
- Site support: ${this.getSiteSupport(journey)}
- Pattern consistency: ${this.getPatternConsistency(journey)}
- User experience quality: ${this.getUserExperienceQuality(journey)}`;

    return {
      prompt,
      completion,
      metadata: {
        journeyType: journey.journeyType,
        stepCount: journey.stepCount,
        hasConversion: journey.conversionPoints.length > 0,
        quality: journey.quality?.overall || 0.5
      }
    };
  }

  /**
   * Generate business flow understanding data
   */
  async generateBusinessFlowData(journeyData) {
    const examples = [];
    const businessPatterns = this.worldModel.businessPatterns;
    
    // Create funnel analysis examples
    Object.entries(businessPatterns.conversionFunnels).forEach(([funnelType, funnel]) => {
      const example = this.createBusinessFlowExample(funnelType, funnel);
      if (example) examples.push(example);
    });

    return {
      type: 'business-flow-understanding',
      description: 'Teaches agent to understand business logic and conversion flows',
      examples: examples.slice(0, this.trainingConfig.maxExamplesPerType),
      quality: this.calculateDatasetQuality(examples)
    };
  }

  /**
   * Generate component recognition data
   */
  async generateComponentRecognitionData() {
    const examples = [];
    const components = this.worldModel.componentPatterns;
    
    Object.entries(components).forEach(([componentType, patterns]) => {
      patterns.forEach(pattern => {
        const example = this.createComponentRecognitionExample(componentType, pattern);
        if (example) examples.push(example);
      });
    });

    return {
      type: 'component-recognition',
      description: 'Teaches agent to recognize and understand reusable site components',
      examples: examples.slice(0, this.trainingConfig.maxExamplesPerType),
      quality: this.calculateDatasetQuality(examples)
    };
  }

  /**
   * Export training data in JSONL format
   */
  async exportTrainingJSONL(trainingData, outputPath) {
    const allExamples = [];
    
    // Collect all examples from all datasets
    Object.values(trainingData.datasets).forEach(dataset => {
      dataset.examples.forEach(example => {
        allExamples.push({
          messages: [
            { role: 'user', content: example.prompt },
            { role: 'assistant', content: example.completion }
          ],
          metadata: {
            dataset_type: dataset.type,
            ...example.metadata
          }
        });
      });
    });

    // Write JSONL file
    const fs = require('fs');
    const jsonlContent = allExamples.map(example => JSON.stringify(example)).join('\n');
    await fs.promises.writeFile(outputPath, jsonlContent, 'utf8');

    return {
      outputPath,
      totalExamples: allExamples.length,
      datasets: Object.keys(trainingData.datasets).length,
      exportedAt: new Date().toISOString()
    };
  }

  // Helper methods for building training content
  getSiteContextInfo() {
    return {
      domain: this.worldModel.siteArchitecture?.domainInfo?.domain || 'unknown',
      siteType: this.worldModel.siteArchitecture?.domainInfo?.siteType || 'general'
    };
  }

  getAvailablePageTypes() {
    return Object.keys(this.worldModel.pageTypePatterns || {});
  }

  getNavigationPatterns() {
    const flows = this.worldModel.navigationPatterns?.commonFlows || [];
    return flows.slice(0, 3).map(flow => flow.flow).join('; ');
  }

  getSuccessIndicators(journey) {
    return journey.conversionPoints.map(cp => cp.type).join(', ') || 'engagement metrics';
  }

  getStepPurpose(step, index, flow) {
    const purposes = {
      'homepage': 'Entry point and orientation',
      'categoryPage': 'Product discovery and filtering',
      'productDetailPage': 'Product evaluation and decision',
      'cartPage': 'Purchase review and optimization',
      'checkoutPage': 'Transaction completion',
      'searchResults': 'Query result evaluation'
    };
    return purposes[step.pageType] || 'Navigation and interaction';
  }

  getKeyElements(pageType) {
    const elements = {
      'homepage': 'hero, navigation, featured content',
      'categoryPage': 'filters, product grid, sorting',
      'productDetailPage': 'images, specifications, add-to-cart',
      'cartPage': 'item list, totals, checkout button',
      'checkoutPage': 'forms, payment, confirmation',
      'searchResults': 'results list, filters, pagination'
    };
    return elements[pageType] || 'standard page elements';
  }

  getExpectedAction(step, index, flow) {
    if (index === flow.length - 1) return 'Complete goal or convert';
    const nextStep = flow[index + 1];
    return `Navigate to ${nextStep.pageType}`;
  }

  getCommonFlow(journeyType) {
    const flows = {
      'ecommerce-purchase': 'homepage → category → product → cart → checkout',
      'search-browse': 'search → results → product → comparison',
      'product-research': 'category → product → compare → evaluate'
    };
    return flows[journeyType] || 'general navigation flow';
  }

  getExpectedSuccessRate(journeyType) {
    const rates = {
      'ecommerce-purchase': 85,
      'search-browse': 70,
      'product-research': 60
    };
    return rates[journeyType] || 65;
  }

  calculateDatasetQuality(examples) {
    if (examples.length === 0) return { overall: 0, coverage: 0, diversity: 0 };
    
    const avgConfidence = examples.reduce((sum, ex) => 
      sum + (ex.metadata?.confidence || 0.5), 0) / examples.length;
    
    const diversity = new Set(examples.map(ex => ex.metadata?.pageType || ex.metadata?.journeyType)).size / 10;
    
    return {
      overall: Math.round(((avgConfidence + diversity) / 2) * 100) / 100,
      coverage: Math.min(1, examples.length / 20),
      diversity: Math.min(1, diversity)
    };
  }

  // Additional helper methods would be implemented here
  getPageRole(pageType) { return 'a key component'; }
  getFunctionalAnalysis(pageType, zones) { return 'Standard page functionality'; }
  getTypicalEntryPoint(pageType) { return 'navigation or search'; }
  getCommonNextSteps(pageType) { return 'continued browsing'; }
  getConversionPotential(pageType) { return 'moderate'; }
  getPagePattern(pageType) { return 'standard layout'; }
  getComponentStructure(zones) { return zones.map(z => z.name).join(', '); }
  getNavigationContext(pageType) { return 'part of main site flow'; }
  getArchitecturalPattern(siteType) { return `${siteType} best practices`; }
  getContentOrganization(arch) { return 'hierarchical structure'; }
  getNavigationStrategy(arch) { return 'user-centric design'; }
  getJourneyPatterns(arch) { return 'conversion-optimized flows'; }
  getConversionOptimization(arch) { return 'funnel-based approach'; }
  getDiscoverabilityApproach(arch) { return 'search and browse enabled'; }
  getUrlStructurePattern(arch) { return 'RESTful and semantic'; }
  getComponentReusePattern(arch) { return 'modular design system'; }
  getLayoutConsistency(arch) { return 'consistent across page types'; }
  getPrimaryUserPaths(arch) { return 'optimized conversion funnels'; }
  getBusinessObjectives(arch) { return 'user engagement and conversion'; }
  getOptimizationOpportunities(arch) { return 'personalization and efficiency'; }
  getUserType(journey) { return 'goal-oriented'; }
  getIntentCategory(journey) { return journey.journeyType; }
  getBehaviorPattern(journey) { return 'direct navigation'; }
  getStepOptimization(journey) { return 'efficient path'; }
  getTimeEfficiency(journey) { return 'reasonable duration'; }
  getSuccessProbability(journey) { return 'high likelihood'; }
  getValuePotential(journey) { return 'significant business value'; }
  getConversionLikelihood(journey) { return 'strong conversion signals'; }
  getOptimizationPriority(journey) { return 'medium priority'; }
  getSiteSupport(journey) { return 'well supported by site architecture'; }
  getPatternConsistency(journey) { return 'consistent with site patterns'; }
  getUserExperienceQuality(journey) { return 'positive user experience'; }
  createBusinessFlowExample(funnelType, funnel) { return null; }
  createComponentRecognitionExample(componentType, pattern) { return null; }
  createUrlPatternExample(pattern) { return null; }
}

module.exports = Agent1DataGenerator;