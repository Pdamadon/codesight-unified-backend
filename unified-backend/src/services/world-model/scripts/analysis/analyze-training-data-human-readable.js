#!/usr/bin/env node

/**
 * Human-Readable Training Data Analyzer
 * Shows training data in nested, easy-to-read format
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:najZqhoAVxKXadShnHIwCsEmOQfFNpeB@nozomi.proxy.rlwy.net:19563/railway'
});

async function analyzeTrainingData() {
  console.log('🔍 HUMAN-READABLE TRAINING DATA ANALYSIS\n');
  
  try {
    // Get the most recent training data
    const latestTraining = await prisma.trainingData.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (!latestTraining) {
      console.log('❌ No training data found');
      return;
    }

    console.log('📊 LATEST TRAINING DATA OVERVIEW');
    console.log('─'.repeat(50));
    console.log(`Session ID: ${latestTraining.sessionId}`);
    console.log(`Created: ${latestTraining.createdAt}`);
    console.log(`File Size: ${latestTraining.fileSize.toLocaleString()} characters`);
    console.log(`Training Quality: ${latestTraining.trainingQuality}`);
    console.log(`Status: ${latestTraining.status}`);
    console.log(`Format: ${latestTraining.trainingConfig?.format || 'Unknown'}`);
    console.log();

    if (!latestTraining.jsonlContent) {
      console.log('❌ No JSONL content found');
      return;
    }

    // Parse JSONL content
    const lines = latestTraining.jsonlContent.split('\n').filter(line => line.trim());
    console.log(`📝 TRAINING EXAMPLES: ${lines.length} total examples\n`);

    // Analyze first few examples in detail
    const exampleCount = Math.min(3, lines.length);
    
    for (let i = 0; i < exampleCount; i++) {
      try {
        const example = JSON.parse(lines[i]);
        
        console.log(`🎯 EXAMPLE ${i + 1} of ${lines.length}`);
        console.log('═'.repeat(60));
        
        // Show example type and basic info
        console.log(`📌 TYPE: ${example.context?.pageType || 'Unknown'}`);
        console.log(`📌 USER JOURNEY: ${example.context?.userJourney || 'Not specified'}`);
        console.log(`📌 QUALITY SCORE: ${example.quality?.score || 'Unknown'}`);
        console.log();

        // Show the prompt (truncated)
        console.log('💭 PROMPT:');
        const promptPreview = example.prompt ? example.prompt.substring(0, 200) + '...' : 'No prompt';
        console.log(`   ${promptPreview}`);
        console.log();

        // Show the completion (truncated)
        console.log('✅ COMPLETION:');
        const completionPreview = example.completion ? example.completion.substring(0, 150) + '...' : 'No completion';
        console.log(`   ${completionPreview}`);
        console.log();

        // Enhanced Context Analysis
        console.log('🔍 ENHANCED CONTEXT ANALYSIS:');
        console.log('─'.repeat(40));

        // Check for ProductContextBuilder data
        if (example.context?.business?.ecommerce) {
          console.log('  🛒 PRODUCT CONTEXT BUILDER DATA:');
          console.log(`     └─ E-commerce: ${example.context.business.ecommerce.substring(0, 100)}...`);
        } else {
          console.log('  🛒 Product Context Builder: ❌ Not detected');
        }

        // Check for SequenceAwareTrainer data
        if (example.context?.journeyContext || example.context?.userJourney) {
          console.log('  🔗 SEQUENCE AWARE TRAINER DATA:');
          console.log(`     └─ Journey: ${example.context.userJourney || 'Present'}`);
          if (example.context.journeyContext) {
            console.log(`     └─ Journey Context: ${JSON.stringify(example.context.journeyContext).substring(0, 100)}...`);
          }
        } else {
          console.log('  🔗 Sequence Aware Trainer: ❌ Not detected');
        }

        // Check for DynamicPatternMatcher data
        if (example.context?.business?.ecommerce?.includes('size') || 
            example.context?.business?.ecommerce?.includes('color') ||
            example.context?.element?.attributes?.includes('size') ||
            example.context?.element?.attributes?.includes('color')) {
          console.log('  🔍 DYNAMIC PATTERN MATCHER DATA:');
          console.log('     └─ Size/Color patterns: ✅ Detected in context');
        } else {
          console.log('  🔍 Dynamic Pattern Matcher: ❌ Not clearly detected');
        }

        // Check for HybridJourneyTracker data
        if (example.context?.journeyGoal || example.context?.funnelStages) {
          console.log('  🛤️ HYBRID JOURNEY TRACKER DATA:');
          console.log(`     └─ Journey Goal: ${example.context.journeyGoal || 'Not set'}`);
          console.log(`     └─ Funnel Stages: ${example.context.funnelStages?.join(' → ') || 'None'}`);
        } else {
          console.log('  🛤️ Hybrid Journey Tracker: ❌ Not detected');
        }

        // Check for enhanced selector data
        if (example.context?.technical?.selectors) {
          console.log('  🎯 ENHANCED SELECTOR DATA:');
          console.log(`     └─ Selectors: ${example.context.technical.selectors.substring(0, 80)}...`);
        } else {
          console.log('  🎯 Enhanced Selectors: ❌ Not detected');
        }

        // Check for spatial/visual context
        if (example.context?.visual || example.context?.spatialContext) {
          console.log('  📐 SPATIAL/VISUAL CONTEXT:');
          if (example.context.spatialContext) {
            console.log(`     └─ Spatial: ${example.context.spatialContext.substring(0, 80)}...`);
          }
          if (example.context.visual) {
            console.log(`     └─ Visual: ${JSON.stringify(example.context.visual).substring(0, 80)}...`);
          }
        } else {
          console.log('  📐 Spatial/Visual Context: ❌ Not detected');
        }

        // Check quality factors
        if (example.quality?.factors) {
          console.log('  ⭐ QUALITY FACTORS:');
          const factors = example.quality.factors;
          console.log(`     └─ Reliable Selector: ${factors.hasReliableSelector ? '✅' : '❌'}`);
          console.log(`     └─ Spatial Context: ${factors.hasSpatialContext ? '✅' : '❌'}`);
          console.log(`     └─ Business Context: ${factors.hasBusinessContext ? '✅' : '❌'}`);
          console.log(`     └─ Visual Context: ${factors.hasVisualContext ? '✅' : '❌'}`);
          if (factors.multiStepJourney !== undefined) {
            console.log(`     └─ Multi-Step Journey: ${factors.multiStepJourney ? '✅' : '❌'}`);
          }
          if (factors.funnelProgression !== undefined) {
            console.log(`     └─ Funnel Progression: ${factors.funnelProgression ? '✅' : '❌'}`);
          }
        }

        console.log('\n' + '═'.repeat(60) + '\n');

      } catch (error) {
        console.log(`❌ Error parsing example ${i + 1}:`, error.message);
      }
    }

    // Summary statistics
    console.log('📈 SUMMARY STATISTICS');
    console.log('─'.repeat(30));
    
    let enhancedExamples = 0;
    let productContextExamples = 0;
    let sequenceExamples = 0;
    let dynamicPatternExamples = 0;

    for (const line of lines) {
      try {
        const example = JSON.parse(line);
        
        let hasEnhancements = false;
        
        if (example.context?.business?.ecommerce) {
          productContextExamples++;
          hasEnhancements = true;
        }
        
        if (example.context?.journeyContext || example.context?.userJourney) {
          sequenceExamples++;
          hasEnhancements = true;
        }
        
        if (example.context?.business?.ecommerce?.includes('size') || 
            example.context?.business?.ecommerce?.includes('color')) {
          dynamicPatternExamples++;
          hasEnhancements = true;
        }
        
        if (hasEnhancements) {
          enhancedExamples++;
        }
        
      } catch (error) {
        // Skip invalid examples
      }
    }

    console.log(`📊 Total Examples: ${lines.length}`);
    console.log(`🚀 Enhanced Examples: ${enhancedExamples} (${((enhancedExamples/lines.length)*100).toFixed(1)}%)`);
    console.log(`🛒 Product Context: ${productContextExamples} examples`);
    console.log(`🔗 Sequence Data: ${sequenceExamples} examples`);
    console.log(`🔍 Dynamic Patterns: ${dynamicPatternExamples} examples`);

    console.log('\n✅ Analysis complete! Check the detailed breakdown above.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeTrainingData();