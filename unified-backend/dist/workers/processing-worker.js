const { parentPort, workerData } = require('worker_threads');
const { PrismaClient } = require('@prisma/client');

class ProcessingWorker {
  constructor() {
    this.workerId = workerData.workerId;
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: workerData.databaseUrl
        }
      }
    });
    
    this.setupMessageHandling();
    this.sendMessage({ type: 'worker_ready' });
  }

  setupMessageHandling() {
    if (!parentPort) {
      throw new Error('Worker must be run in worker thread');
    }

    parentPort.on('message', async (message) => {
      try {
        switch (message.type) {
          case 'process_job':
            await this.processJob(message.job);
            break;
          default:
            this.sendMessage({
              type: 'error',
              error: `Unknown message type: ${message.type}`
            });
        }
      } catch (error) {
        this.sendMessage({
          type: 'job_failed',
          jobId: message.job?.id,
          error: error.message
        });
      }
    });
  }

  async processJob(job) {
    const startTime = Date.now();
    
    try {
      this.sendMessage({
        type: 'job_progress',
        jobId: job.id,
        progress: 0,
        stage: 'starting'
      });

      let result;
      
      switch (job.type) {
        case 'session_processing':
          result = await this.processSession(job);
          break;
        case 'batch_validation':
          result = await this.batchValidation(job);
          break;
        case 'quality_scoring':
          result = await this.qualityScoring(job);
          break;
        case 'context_enhancement':
          result = await this.contextEnhancement(job);
          break;
        case 'training_generation':
          result = await this.trainingGeneration(job);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      const processingTime = Date.now() - startTime;
      
      this.sendMessage({
        type: 'job_completed',
        jobId: job.id,
        result,
        processingTime
      });

    } catch (error) {
      this.sendMessage({
        type: 'job_failed',
        jobId: job.id,
        error: error.message
      });
    }
  }

  async processSession(job) {
    const { sessionId } = job.data;
    
    this.sendMessage({
      type: 'job_progress',
      jobId: job.id,
      progress: 10,
      stage: 'validation'
    });

    // Step 1: Validate session data
    const validation = await this.validateSessionData(sessionId);
    
    this.sendMessage({
      type: 'job_progress',
      jobId: job.id,
      progress: 30,
      stage: 'quality_scoring'
    });

    // Step 2: Calculate quality scores
    const qualityScore = await this.calculateQualityScore(sessionId);
    
    this.sendMessage({
      type: 'job_progress',
      jobId: job.id,
      progress: 50,
      stage: 'context_enhancement'
    });

    // Step 3: Enhance context
    const contextEnhancement = await this.enhanceContext(sessionId);
    
    this.sendMessage({
      type: 'job_progress',
      jobId: job.id,
      progress: 70,
      stage: 'screenshot_analysis'
    });

    // Step 4: Process screenshots
    const screenshotAnalysis = await this.processScreenshots(sessionId);
    
    this.sendMessage({
      type: 'job_progress',
      jobId: job.id,
      progress: 90,
      stage: 'finalizing'
    });

    // Step 5: Update session with results
    await this.updateSessionResults(sessionId, {
      validation,
      qualityScore,
      contextEnhancement,
      screenshotAnalysis
    });

    return {
      sessionId,
      validation,
      qualityScore,
      contextEnhancement,
      screenshotAnalysis,
      status: 'completed'
    };
  }

  async validateSessionData(sessionId) {
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

    // Basic validation logic
    const validation = {
      isValid: true,
      score: 100,
      errors: [],
      warnings: []
    };

    // Check minimum requirements
    if (session.interactions.length < 3) {
      validation.warnings.push('Low interaction count');
      validation.score -= 20;
    }

    if (session.screenshots.length === 0) {
      validation.warnings.push('No screenshots captured');
      validation.score -= 10;
    }

    // Check session duration
    const duration = session.endTime && session.startTime ? 
      new Date(session.endTime).getTime() - new Date(session.startTime).getTime() : 0;
    
    if (duration < 30000) { // Less than 30 seconds
      validation.warnings.push('Session duration too short');
      validation.score -= 15;
    }

    validation.isValid = validation.score >= 60;
    return validation;
  }

  async calculateQualityScore(sessionId) {
    const session = await this.prisma.unifiedSession.findUnique({
      where: { id: sessionId },
      include: {
        interactions: true,
        screenshots: true
      }
    });

    let score = 50; // Base score

    // Interaction quality
    const interactions = session.interactions || [];
    if (interactions.length > 0) {
      const hasSelectors = interactions.filter(i => i.primarySelector).length;
      const selectorRatio = hasSelectors / interactions.length;
      score += selectorRatio * 30;

      // Interaction variety
      const types = new Set(interactions.map(i => i.type));
      score += Math.min(types.size * 5, 20);
    }

    // Screenshot quality
    if (session.screenshots.length > 0) {
      score += Math.min(session.screenshots.length * 2, 20);
    }

    return {
      overall: Math.min(Math.round(score), 100),
      completeness: Math.min(Math.round(score * 0.9), 100),
      reliability: Math.min(Math.round(score * 0.8), 100),
      accuracy: Math.min(Math.round(score * 0.85), 100)
    };
  }

  async enhanceContext(sessionId) {
    const session = await this.prisma.unifiedSession.findUnique({
      where: { id: sessionId },
      include: {
        interactions: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    const interactions = session.interactions || [];
    const urls = interactions.map(i => i.url).filter(Boolean);
    const uniqueUrls = [...new Set(urls)];

    // Analyze page types
    const pageTypes = {
      product: urls.filter(url => url.includes('product') || url.includes('item')).length,
      category: urls.filter(url => url.includes('category') || url.includes('browse')).length,
      search: urls.filter(url => url.includes('search') || url.includes('find')).length,
      cart: urls.filter(url => url.includes('cart') || url.includes('basket')).length
    };

    // Determine primary intent
    let primaryIntent = 'browse';
    if (pageTypes.search > 0) primaryIntent = 'search';
    if (pageTypes.product > 2) primaryIntent = 'compare';
    if (pageTypes.cart > 0) primaryIntent = 'purchase';

    // Analyze navigation pattern
    const navigationPattern = {
      type: uniqueUrls.length > 5 ? 'exploratory' : 'focused',
      uniquePagesVisited: uniqueUrls.length,
      totalInteractions: interactions.length,
      efficiency: Math.min((uniqueUrls.length / interactions.length) * 100, 100)
    };

    // Shopping behavior classification
    const duration = session.endTime && session.startTime ? 
      new Date(session.endTime).getTime() - new Date(session.startTime).getTime() : 0;

    let behaviorType = 'convenience_focused';
    if (duration < 120000 && uniqueUrls.length <= 3) {
      behaviorType = 'impulse';
    } else if (pageTypes.product > 3 && duration > 300000) {
      behaviorType = 'research_heavy';
    }

    return {
      primaryIntent,
      navigationPattern,
      behaviorType,
      pageTypes,
      trainingValue: Math.min(
        (uniqueUrls.length * 10) + 
        (Object.values(pageTypes).reduce((a, b) => a + b, 0) * 5) +
        (interactions.length * 2), 
        100
      )
    };
  }

  async processScreenshots(sessionId) {
    const screenshots = await this.prisma.screenshot.findMany({
      where: { sessionId }
    });

    if (screenshots.length === 0) {
      return { processed: 0, analysis: null };
    }

    // Basic screenshot analysis
    const analysis = {
      totalScreenshots: screenshots.length,
      formats: {},
      averageFileSize: 0,
      qualityScore: 0
    };

    let totalSize = 0;
    let qualitySum = 0;

    for (const screenshot of screenshots) {
      // Count formats
      const format = screenshot.format || 'unknown';
      analysis.formats[format] = (analysis.formats[format] || 0) + 1;

      // Calculate average file size
      if (screenshot.fileSize) {
        totalSize += screenshot.fileSize;
      }

      // Quality scoring
      let screenshotQuality = 50;
      if (screenshot.compressed) screenshotQuality += 20;
      if (screenshot.format === 'webp') screenshotQuality += 15;
      if (screenshot.fileSize && screenshot.fileSize < 500000) screenshotQuality += 15; // < 500KB

      qualitySum += screenshotQuality;
    }

    analysis.averageFileSize = Math.round(totalSize / screenshots.length);
    analysis.qualityScore = Math.round(qualitySum / screenshots.length);

    return {
      processed: screenshots.length,
      analysis
    };
  }

  async updateSessionResults(sessionId, results) {
    await this.prisma.unifiedSession.update({
      where: { id: sessionId },
      data: {
        qualityScore: results.qualityScore.overall,
        completeness: results.qualityScore.completeness,
        reliability: results.qualityScore.reliability,
        trainingValue: results.contextEnhancement.trainingValue,
        processingStatus: 'COMPLETED',
        userIntent: results.contextEnhancement.primaryIntent,
        behaviorType: results.contextEnhancement.behaviorType,
        navigationEfficiency: results.contextEnhancement.navigationPattern.efficiency
      }
    });
  }

  async batchValidation(job) {
    const { sessionIds } = job.data;
    const results = [];

    for (let i = 0; i < sessionIds.length; i++) {
      const sessionId = sessionIds[i];
      const progress = Math.round((i / sessionIds.length) * 100);
      
      this.sendMessage({
        type: 'job_progress',
        jobId: job.id,
        progress,
        stage: `validating_${i + 1}_of_${sessionIds.length}`
      });

      try {
        const validation = await this.validateSessionData(sessionId);
        results.push({ sessionId, validation, success: true });
      } catch (error) {
        results.push({ sessionId, error: error.message, success: false });
      }
    }

    return {
      totalSessions: sessionIds.length,
      successfulValidations: results.filter(r => r.success).length,
      results
    };
  }

  async qualityScoring(job) {
    const { sessionIds } = job.data;
    const results = [];

    for (let i = 0; i < sessionIds.length; i++) {
      const sessionId = sessionIds[i];
      const progress = Math.round((i / sessionIds.length) * 100);
      
      this.sendMessage({
        type: 'job_progress',
        jobId: job.id,
        progress,
        stage: `scoring_${i + 1}_of_${sessionIds.length}`
      });

      try {
        const qualityScore = await this.calculateQualityScore(sessionId);
        results.push({ sessionId, qualityScore, success: true });
      } catch (error) {
        results.push({ sessionId, error: error.message, success: false });
      }
    }

    return {
      totalSessions: sessionIds.length,
      successfulScoring: results.filter(r => r.success).length,
      averageQuality: results
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.qualityScore.overall, 0) / 
        results.filter(r => r.success).length || 0,
      results
    };
  }

  async contextEnhancement(job) {
    const { sessionIds } = job.data;
    const results = [];

    for (let i = 0; i < sessionIds.length; i++) {
      const sessionId = sessionIds[i];
      const progress = Math.round((i / sessionIds.length) * 100);
      
      this.sendMessage({
        type: 'job_progress',
        jobId: job.id,
        progress,
        stage: `enhancing_${i + 1}_of_${sessionIds.length}`
      });

      try {
        const enhancement = await this.enhanceContext(sessionId);
        results.push({ sessionId, enhancement, success: true });
      } catch (error) {
        results.push({ sessionId, error: error.message, success: false });
      }
    }

    return {
      totalSessions: sessionIds.length,
      successfulEnhancements: results.filter(r => r.success).length,
      averageTrainingValue: results
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.enhancement.trainingValue, 0) / 
        results.filter(r => r.success).length || 0,
      results
    };
  }

  async trainingGeneration(job) {
    // Placeholder for training data generation
    const { sessionIds } = job.data;
    
    this.sendMessage({
      type: 'job_progress',
      jobId: job.id,
      progress: 50,
      stage: 'generating_training_data'
    });

    // Simulate training data generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      totalSessions: sessionIds.length,
      trainingDataGenerated: true,
      format: 'jsonl',
      estimatedSize: sessionIds.length * 1024 // Rough estimate
    };
  }

  sendMessage(message) {
    if (parentPort) {
      parentPort.postMessage(message);
    }
  }
}

// Initialize worker
new ProcessingWorker();