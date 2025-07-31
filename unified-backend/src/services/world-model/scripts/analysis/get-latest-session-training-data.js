const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function getLatestSessionTrainingData() {
  try {
    console.log('🔍 Fetching training data for session: session_1753426751181_0fhbz9145\n');

    // Get the specific session's training data
    const trainingData = await prisma.trainingData.findFirst({
      where: {
        sessionId: 'session_1753426751181_0fhbz9145'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!trainingData) {
      console.log('❌ No training data found for this session');
      return;
    }

    console.log('📊 TRAINING DATA SUMMARY');
    console.log('========================');
    console.log(`Training Data ID: ${trainingData.id}`);
    console.log(`Session ID: ${trainingData.sessionId}`);
    console.log(`Created: ${trainingData.createdAt}`);
    console.log(`Status: ${trainingData.status}`);
    console.log(`Quality Score: ${trainingData.trainingQuality}`);
    console.log(`File Size: ${trainingData.fileSize} bytes`);
    console.log('');

    if (trainingData.jsonlData) {
      // Parse and analyze the JSONL data
      const lines = trainingData.jsonlData.split('\n').filter(line => line.trim());
      console.log(`📄 JSONL ANALYSIS`);
      console.log(`==================`);
      console.log(`Total Examples: ${lines.length}`);
      console.log('');

      // Analyze example types
      const examples = lines.map(line => JSON.parse(line));
      const journeyExamples = examples.filter(ex => ex.prompt && ex.prompt.includes('JOURNEY'));
      const taskExamples = examples.filter(ex => ex.prompt && ex.prompt.includes('TASK'));
      const decisionExamples = examples.filter(ex => ex.prompt && ex.prompt.includes('DECISION'));
      const otherExamples = examples.filter(ex => !ex.prompt || (!ex.prompt.includes('JOURNEY') && !ex.prompt.includes('TASK') && !ex.prompt.includes('DECISION')));

      console.log(`🎯 EXAMPLE BREAKDOWN`);
      console.log(`===================`);
      console.log(`Journey Examples: ${journeyExamples.length}`);
      console.log(`Task Examples: ${taskExamples.length}`);
      console.log(`Decision Examples: ${decisionExamples.length}`);
      console.log(`Other Examples: ${otherExamples.length}`);
      console.log('');

      // Show sample of each type
      if (journeyExamples.length > 0) {
        console.log(`📋 SAMPLE JOURNEY EXAMPLE`);
        console.log(`=========================`);
        const sample = journeyExamples[0];
        console.log(`Prompt (truncated): ${sample.prompt.substring(0, 200)}...`);
        console.log(`Completion (truncated): ${sample.completion.substring(0, 200)}...`);
        if (sample.context) {
          console.log(`Context Keys: ${Object.keys(sample.context).join(', ')}`);
        }
        if (sample.quality) {
          console.log(`Quality Score: ${sample.quality.score}`);
        }
        console.log('');
      }

      if (taskExamples.length > 0) {
        console.log(`🎯 SAMPLE TASK EXAMPLE`);
        console.log(`======================`);
        const sample = taskExamples[0];
        console.log(`Prompt (truncated): ${sample.prompt.substring(0, 200)}...`);
        console.log(`Completion (truncated): ${sample.completion.substring(0, 200)}...`);
        console.log('');
      }

      if (decisionExamples.length > 0) {
        console.log(`🤔 SAMPLE DECISION EXAMPLE`);
        console.log(`==========================`);
        const sample = decisionExamples[0];
        console.log(`Prompt (truncated): ${sample.prompt.substring(0, 200)}...`);
        console.log(`Completion (truncated): ${sample.completion.substring(0, 200)}...`);
        console.log('');
      }

      // Export full data for analysis
      const fs = require('fs');
      const exportPath = `./latest-session-training-data-${trainingData.sessionId}-analysis.jsonl`;
      fs.writeFileSync(exportPath, trainingData.jsonlData);
      console.log(`💾 Full training data exported to: ${exportPath}`);
      
      // Also create a readable breakdown
      const breakdown = {
        summary: {
          totalExamples: lines.length,
          journeyExamples: journeyExamples.length,
          taskExamples: taskExamples.length,
          decisionExamples: decisionExamples.length,
          otherExamples: otherExamples.length
        },
        sampleJourney: journeyExamples[0] || null,
        sampleTask: taskExamples[0] || null,
        sampleDecision: decisionExamples[0] || null
      };
      
      const breakdownPath = `./latest-session-breakdown-${trainingData.sessionId}.json`;
      fs.writeFileSync(breakdownPath, JSON.stringify(breakdown, null, 2));
      console.log(`📊 Training data breakdown exported to: ${breakdownPath}`);
    }

    console.log('✅ Analysis complete!');

  } catch (error) {
    console.error('❌ Error fetching training data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
getLatestSessionTrainingData();