/**
 * Agent2DataGenerator - Creates click execution training data
 * Phase 4: Agent Training Data Generation for Click Execution Agent
 */

class Agent2DataGenerator {
  constructor(worldModel) {
    this.worldModel = worldModel;
    this.trainingConfig = {
      maxExamplesPerType: 100,
      minConfidenceThreshold: 0.5,
      includeSpatialContext: true,
      includeElementAlternatives: true,
      focusOnReliableSelectors: true
    };
  }

  /**
   * Generate comprehensive click execution training data
   */
  async generateClickExecutionData(sessionAnalyses, journeyData) {
    const trainingData = {
      metadata: {
        agentType: 'click-execution',
        targetModel: 'gpt-4',
        version: '1.0',
        generatedAt: new Date().toISOString(),
        totalExamples: 0
      },
      
      // Core training datasets
      datasets: {
        preciseClickExecution: await this.generatePreciseClickData(sessionAnalyses, journeyData),
        contextualElementSelection: await this.generateContextualSelectionData(sessionAnalyses),
        spatialElementUnderstanding: await this.generateSpatialUnderstandingData(sessionAnalyses),
        selectorReliabilityAssessment: await this.generateSelectorReliabilityData(sessionAnalyses),
        elementRelationshipMapping: await this.generateElementRelationshipData(sessionAnalyses),
        errorRecoveryAndFallbacks: await this.generateErrorRecoveryData(sessionAnalyses)
      }
    };

    // Calculate total examples
    trainingData.metadata.totalExamples = Object.values(trainingData.datasets)
      .reduce((total, dataset) => total + dataset.examples.length, 0);

    return trainingData;
  }

  /**
   * Generate precise click execution training examples
   */
  async generatePreciseClickData(sessionAnalyses, journeyData) {
    const examples = [];

    sessionAnalyses.forEach(analysis => {
      if (!analysis.patterns?.commonSelectors) return;

      // Extract click interactions from selectors
      for (const [selector, count] of analysis.patterns.commonSelectors) {
        const example = this.createPreciseClickExample(selector, count, analysis);
        if (example) examples.push(example);
      }
    });

    // Add examples from journey interactions
    journeyData.forEach(data => {
      if (!data.journeys) return;

      data.journeys.forEach(journey => {
        journey.interactions?.forEach(interaction => {
          if (interaction.type === 'CLICK') {
            const example = this.createJourneyClickExample(interaction, journey);
            if (example) examples.push(example);
          }
        });
      });
    });

    return {
      type: 'precise-click-execution',
      description: 'Teaches agent to execute precise clicks with reliable selectors',
      examples: examples.slice(0, this.trainingConfig.maxExamplesPerType),
      quality: this.calculateDatasetQuality(examples)
    };
  }

  /**
   * Create precise click execution example
   */
  createPreciseClickExample(selector, count, analysis) {
    // Extract context information
    const selectorInfo = this.analyzeSelectorReliability(selector);
    const spatialContext = this.generateSpatialContext(selector);
    const elementContext = this.generateElementContext(selector, analysis);

    const prompt = this.buildClickExecutionPrompt(selector, elementContext, spatialContext);
    const completion = this.buildClickExecutionCompletion(selector, selectorInfo, elementContext);

    return {
      prompt,
      completion,
      metadata: {
        selector,
        reliability: selectorInfo.reliability,
        usage_count: count,
        selector_type: selectorInfo.type,
        confidence: selectorInfo.confidence
      }
    };
  }

  /**
   * Build click execution prompt for Agent 2
   */
  buildClickExecutionPrompt(selector, elementContext, spatialContext) {
    return `CLICK EXECUTION: Perform precise interaction with target element

GOAL: ${elementContext.goal || 'Click target element'}
CONTEXT: ${elementContext.pageContext || 'Unknown page context'}

TARGET ELEMENT:
- Type: ${elementContext.elementType || 'Unknown'}
- Text: "${elementContext.text || ''}"
- Purpose: ${elementContext.purpose || 'Navigation/interaction'}

SPATIAL CONTEXT:
${spatialContext.nearbyElements.map(el => `- ${el.text} (${el.direction}, ${el.distance}px)`).join('\n')}

AVAILABLE SELECTORS:
${spatialContext.availableSelectors.map((sel, i) => `${i + 1}. ${sel.selector} (reliability: ${sel.reliability})`).join('\n')}

DOM HIERARCHY:
${spatialContext.domHierarchy.map(level => `  ${'  '.repeat(level.depth)}${level.tag}${level.classes ? '.' + level.classes.join('.') : ''}`).join('\n')}

Execute the click with the most reliable selector and provide reasoning for your choice.`;
  }

  /**
   * Build click execution completion showing precise selector choice
   */
  buildClickExecutionCompletion(selector, selectorInfo, elementContext) {
    return `// Precise Click Execution Analysis

SELECTOR CHOSEN: ${selector}
REASONING: ${this.getSelectorReasoning(selectorInfo, elementContext)}

EXECUTION:
await page.click('${selector}');

CONFIDENCE FACTORS:
- Selector Reliability: ${selectorInfo.reliability.toFixed(2)} (${this.getReliabilityLevel(selectorInfo.reliability)})
- Specificity Score: ${selectorInfo.specificity.toFixed(2)}
- Stability Rating: ${selectorInfo.stability}
- Context Accuracy: ${selectorInfo.contextAccuracy.toFixed(2)}

FALLBACK STRATEGY:
${this.getFallbackStrategy(selector, selectorInfo)}

VALIDATION:
- Expected Result: ${elementContext.expectedResult || 'Page navigation or state change'}
- Success Indicators: ${elementContext.successIndicators || 'Element interaction completed'}
- Error Handling: ${this.getErrorHandling(selectorInfo)}`;
  }

  /**
   * Generate contextual element selection training data
   */
  async generateContextualSelectionData(sessionAnalyses) {
    const examples = [];

    sessionAnalyses.forEach(analysis => {
      if (!analysis.semanticZones) return;

      for (const [timestamp, zones] of analysis.semanticZones) {
        zones.forEach(zone => {
          const example = this.createContextualSelectionExample(zone, analysis);
          if (example) examples.push(example);
        });
      }
    });

    return {
      type: 'contextual-element-selection',
      description: 'Teaches agent to select elements based on context and purpose',
      examples: examples.slice(0, this.trainingConfig.maxExamplesPerType),
      quality: this.calculateDatasetQuality(examples)
    };
  }

  /**
   * Create contextual element selection example
   */
  createContextualSelectionExample(zone, analysis) {
    const prompt = `CONTEXTUAL SELECTION: Choose the correct element for the given context

ZONE CONTEXT: ${zone.name}
CONFIDENCE: ${zone.confidence.toFixed(2)}
PAGE TYPE: ${this.getPageTypeForZone(zone, analysis)}

TASK: ${this.getZoneTask(zone.name)}

AVAILABLE ELEMENTS IN ZONE:
${this.getZoneElements(zone)}

SEMANTIC CONTEXT:
- Zone Purpose: ${this.getZonePurpose(zone.name)}
- User Intent: ${this.getZoneUserIntent(zone.name)}
- Expected Interaction: ${this.getZoneInteraction(zone.name)}

Select the most appropriate element and explain your reasoning based on semantic context.`;

    const completion = `// Contextual Element Selection

ELEMENT SELECTED: ${this.getSelectedElement(zone)}
SELECTION REASONING:
${this.getSelectionReasoning(zone)}

CONTEXT ANALYSIS:
- Semantic Match: ${this.getSemanticMatch(zone)}
- Functional Relevance: ${this.getFunctionalRelevance(zone)}
- User Experience Impact: ${this.getUXImpact(zone)}

EXECUTION STRATEGY:
${this.getExecutionStrategy(zone)}`;

    return {
      prompt,
      completion,
      metadata: {
        zoneName: zone.name,
        confidence: zone.confidence,
        elementsCount: zone.matchedSelectors?.length || 0
      }
    };
  }

  /**
   * Generate spatial understanding training data
   */
  async generateSpatialUnderstandingData(sessionAnalyses) {
    const examples = [];

    // This would analyze spatial relationships between elements
    // For now, create basic spatial examples
    sessionAnalyses.forEach(analysis => {
      const example = this.createSpatialUnderstandingExample(analysis);
      if (example) examples.push(example);
    });

    return {
      type: 'spatial-element-understanding',
      description: 'Teaches agent to understand spatial relationships between elements',
      examples: examples.slice(0, this.trainingConfig.maxExamplesPerType),
      quality: this.calculateDatasetQuality(examples)
    };
  }

  /**
   * Generate selector reliability assessment data
   */
  async generateSelectorReliabilityData(sessionAnalyses) {
    const examples = [];
    const selectorReliability = new Map();

    // Collect selector usage patterns
    sessionAnalyses.forEach(analysis => {
      if (!analysis.patterns?.commonSelectors) return;

      for (const [selector, count] of analysis.patterns.commonSelectors) {
        if (!selectorReliability.has(selector)) {
          selectorReliability.set(selector, { count: 0, contexts: [] });
        }
        const data = selectorReliability.get(selector);
        data.count += count;
        data.contexts.push(analysis.sessionId);
      }
    });

    // Create reliability assessment examples
    for (const [selector, data] of selectorReliability) {
      const example = this.createSelectorReliabilityExample(selector, data);
      if (example) examples.push(example);
    }

    return {
      type: 'selector-reliability-assessment',
      description: 'Teaches agent to assess selector reliability and stability',
      examples: examples.slice(0, this.trainingConfig.maxExamplesPerType),
      quality: this.calculateDatasetQuality(examples)
    };
  }

  /**
   * Create selector reliability assessment example
   */
  createSelectorReliabilityExample(selector, data) {
    const reliabilityScore = this.calculateSelectorReliability(selector, data);
    const selectorAnalysis = this.analyzeSelectorPattern(selector);

    const prompt = `SELECTOR RELIABILITY ASSESSMENT: Evaluate selector stability and reliability

SELECTOR: ${selector}
USAGE COUNT: ${data.count}
CONTEXTS: ${data.contexts.length} different sessions

SELECTOR ANALYSIS:
- Type: ${selectorAnalysis.type}
- Specificity: ${selectorAnalysis.specificity}
- Dynamic Elements: ${selectorAnalysis.dynamicElements}
- Fragility Factors: ${selectorAnalysis.fragilityFactors.join(', ')}

Assess the reliability of this selector for automated interactions and provide recommendations.`;

    const completion = `// Selector Reliability Assessment

RELIABILITY SCORE: ${reliabilityScore.toFixed(2)}/1.0 (${this.getReliabilityLevel(reliabilityScore)})

STABILITY ANALYSIS:
${this.getStabilityAnalysis(selector, selectorAnalysis)}

RISK FACTORS:
${this.getRiskFactors(selectorAnalysis)}

RECOMMENDATIONS:
${this.getReliabilityRecommendations(reliabilityScore, selectorAnalysis)}

USAGE GUIDANCE:
${this.getUsageGuidance(reliabilityScore, selectorAnalysis)}`;

    return {
      prompt,
      completion,
      metadata: {
        selector,
        reliability: reliabilityScore,
        usageCount: data.count,
        contexts: data.contexts.length,
        selectorType: selectorAnalysis.type
      }
    };
  }

  /**
   * Generate element relationship mapping data
   */
  async generateElementRelationshipData(sessionAnalyses) {
    const examples = [];

    sessionAnalyses.forEach(analysis => {
      // This would analyze element relationships
      const example = this.createElementRelationshipExample(analysis);
      if (example) examples.push(example);
    });

    return {
      type: 'element-relationship-mapping',
      description: 'Teaches agent to understand element hierarchies and relationships',
      examples: examples.slice(0, this.trainingConfig.maxExamplesPerType),
      quality: this.calculateDatasetQuality(examples)
    };
  }

  /**
   * Generate error recovery and fallback data
   */
  async generateErrorRecoveryData(sessionAnalyses) {
    const examples = [];

    // Create examples for common failure scenarios
    const failureScenarios = [
      'element_not_found',
      'element_not_clickable',
      'selector_changed',
      'page_not_loaded',
      'element_covered_by_overlay'
    ];

    failureScenarios.forEach(scenario => {
      const example = this.createErrorRecoveryExample(scenario);
      if (example) examples.push(example);
    });

    return {
      type: 'error-recovery-and-fallbacks',
      description: 'Teaches agent to handle errors and implement fallback strategies',
      examples: examples.slice(0, this.trainingConfig.maxExamplesPerType),
      quality: this.calculateDatasetQuality(examples)
    };
  }

  /**
   * Create error recovery training example
   */
  createErrorRecoveryExample(scenario) {
    const scenarioInfo = this.getScenarioInfo(scenario);

    const prompt = `ERROR RECOVERY: Handle interaction failure and implement fallback strategy

SCENARIO: ${scenario.replace('_', ' ').toUpperCase()}
ERROR: ${scenarioInfo.error}
CONTEXT: ${scenarioInfo.context}

ORIGINAL ATTEMPT:
${scenarioInfo.originalAttempt}

FAILURE REASON: ${scenarioInfo.failureReason}

Implement a recovery strategy to complete the intended interaction.`;

    const completion = `// Error Recovery Strategy

FAILURE ANALYSIS:
${scenarioInfo.analysis}

RECOVERY APPROACH:
${scenarioInfo.recoveryApproach}

FALLBACK IMPLEMENTATION:
${scenarioInfo.fallbackCode}

VALIDATION:
${scenarioInfo.validation}

PREVENTION:
${scenarioInfo.prevention}`;

    return {
      prompt,
      completion,
      metadata: {
        scenario,
        errorType: scenarioInfo.errorType,
        complexity: scenarioInfo.complexity
      }
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

  // Helper methods for analysis and content generation

  analyzeSelectorReliability(selector) {
    const isXPath = selector.startsWith('//');
    const hasId = selector.includes('#') || selector.includes('@id');
    const hasClass = selector.includes('.') || selector.includes('@class');
    const hasDataTest = selector.includes('data-test') || selector.includes('data-cy');
    const hasIndex = selector.includes('[') && selector.includes(']') && /\d+/.test(selector);
    
    let reliability = 0.5; // Base score
    
    if (hasDataTest) reliability += 0.3;
    if (hasId) reliability += 0.2;
    if (hasClass) reliability += 0.1;
    if (hasIndex) reliability -= 0.2; // Index-based selectors are fragile
    if (isXPath && selector.length > 100) reliability -= 0.1; // Very long XPaths are fragile
    
    reliability = Math.max(0, Math.min(1, reliability));
    
    return {
      reliability,
      type: this.getSelectorType(selector),
      specificity: this.calculateSpecificity(selector),
      stability: this.getStabilityRating(reliability),
      contextAccuracy: reliability * 0.9 + 0.1,
      confidence: reliability
    };
  }

  getSelectorType(selector) {
    if (selector.startsWith('//')) return 'xpath';
    if (selector.includes('[data-test')) return 'data-testid';
    if (selector.includes('#')) return 'id';
    if (selector.includes('.')) return 'class';
    return 'generic';
  }

  calculateSpecificity(selector) {
    let score = 0;
    if (selector.includes('#')) score += 0.4;
    if (selector.includes('[data-')) score += 0.3;
    if (selector.includes('.')) score += 0.2;
    if (selector.includes('::')) score += 0.1;
    return Math.min(1, score);
  }

  getStabilityRating(reliability) {
    if (reliability >= 0.8) return 'high';
    if (reliability >= 0.6) return 'medium';
    return 'low';
  }

  getSelectorReasoning(selectorInfo, elementContext) {
    return `This selector shows ${selectorInfo.reliability.toFixed(2)} reliability based on ${selectorInfo.type} pattern analysis. The specificity score of ${selectorInfo.specificity.toFixed(2)} indicates ${this.getSpecificityLevel(selectorInfo.specificity)} targeting precision.`;
  }

  getSpecificityLevel(score) {
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  getReliabilityLevel(score) {
    if (score >= 0.8) return 'excellent';
    if (score >= 0.6) return 'good';
    if (score >= 0.4) return 'fair';
    return 'poor';
  }

  getFallbackStrategy(selector, selectorInfo) {
    if (selectorInfo.reliability < 0.6) {
      return 'Consider alternative selectors or wait strategies due to lower reliability';
    }
    return 'Standard retry with exponential backoff if element not immediately available';
  }

  getErrorHandling(selectorInfo) {
    return `Monitor for ${this.getCommonErrors(selectorInfo.type)} and implement ${this.getRetryStrategy(selectorInfo.stability)} retry pattern`;
  }

  getCommonErrors(selectorType) {
    const errors = {
      'xpath': 'element not found, stale element reference',
      'data-testid': 'attribute removed, element restructure',
      'id': 'id changed, dynamic content',
      'class': 'styling changes, class modifications',
      'generic': 'DOM restructure, element removal'
    };
    return errors[selectorType] || 'general interaction failures';
  }

  getRetryStrategy(stability) {
    const strategies = {
      'high': 'minimal',
      'medium': 'standard',
      'low': 'aggressive'
    };
    return strategies[stability] || 'standard';
  }

  calculateDatasetQuality(examples) {
    if (examples.length === 0) return { overall: 0, coverage: 0, diversity: 0 };
    
    const avgReliability = examples.reduce((sum, ex) => 
      sum + (ex.metadata?.reliability || ex.metadata?.confidence || 0.5), 0) / examples.length;
    
    const uniqueTypes = new Set(examples.map(ex => 
      ex.metadata?.selector_type || ex.metadata?.zoneName || 'unknown')).size;
    
    return {
      overall: Math.round(avgReliability * 100) / 100,
      coverage: Math.min(1, examples.length / 30),
      diversity: Math.min(1, uniqueTypes / 8)
    };
  }

  // Placeholder methods for missing functionality
  createJourneyClickExample(interaction, journey) { return null; }
  generateSpatialContext(selector) { 
    return { 
      nearbyElements: [], 
      availableSelectors: [{ selector, reliability: 0.8 }], 
      domHierarchy: [] 
    }; 
  }
  generateElementContext(selector, analysis) { 
    return { 
      goal: 'Execute interaction', 
      elementType: 'button',
      text: 'Click target',
      purpose: 'navigation'
    }; 
  }
  getPageTypeForZone(zone, analysis) { return 'unknown'; }
  getZoneTask(zoneName) { return `Interact with ${zoneName} elements`; }
  getZoneElements(zone) { return zone.matchedSelectors?.join('\n') || 'No elements'; }
  getZonePurpose(zoneName) { return `${zoneName} functionality`; }
  getZoneUserIntent(zoneName) { return `Use ${zoneName} features`; }
  getZoneInteraction(zoneName) { return 'click or input'; }
  getSelectedElement(zone) { return zone.matchedSelectors?.[0] || 'first available'; }
  getSelectionReasoning(zone) { return `Selected based on ${zone.name} context and confidence ${zone.confidence.toFixed(2)}`; }
  getSemanticMatch(zone) { return 'high relevance'; }
  getFunctionalRelevance(zone) { return 'directly supports user goal'; }
  getUXImpact(zone) { return 'positive interaction experience'; }
  getExecutionStrategy(zone) { return 'Direct interaction with validation'; }
  createSpatialUnderstandingExample(analysis) { return null; }
  createElementRelationshipExample(analysis) { return null; }
  calculateSelectorReliability(selector, data) { 
    return Math.min(1, data.count / 10 + (data.contexts.length / 5)); 
  }
  analyzeSelectorPattern(selector) {
    return {
      type: this.getSelectorType(selector),
      specificity: this.calculateSpecificity(selector),
      dynamicElements: selector.includes('[') && selector.includes(']'),
      fragilityFactors: []
    };
  }
  getStabilityAnalysis(selector, analysis) { return 'Selector shows good stability patterns'; }
  getRiskFactors(analysis) { return 'Low risk of failure based on pattern analysis'; }
  getReliabilityRecommendations(score, analysis) { return 'Suitable for production use with standard monitoring'; }
  getUsageGuidance(score, analysis) { return 'Use with confidence, implement standard error handling'; }
  getScenarioInfo(scenario) {
    return {
      error: 'Element interaction failed',
      context: 'Standard page interaction',
      originalAttempt: 'await page.click(selector)',
      failureReason: 'Element not found or not interactable',
      analysis: 'Temporary page state or selector issue',
      recoveryApproach: 'Wait and retry with alternative strategy',
      fallbackCode: 'await page.waitForSelector(fallbackSelector); await page.click(fallbackSelector);',
      validation: 'Verify page state change after successful interaction',
      prevention: 'Use more reliable selectors and implement proper waits',
      errorType: 'interaction_failure',
      complexity: 'medium'
    };
  }
}

module.exports = Agent2DataGenerator;