const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function getRecentTrainingData() {
  try {
    console.log('🔍 Fetching most recent training data...\n');

    // Get the most recent training data entry
    const recentTrainingData = await prisma.trainingData.findFirst({
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!recentTrainingData) {
      console.log('❌ No training data found in database');
      return;
    }

    // Get related session data
    const sessionData = await prisma.unifiedSession.findUnique({
      where: { id: recentTrainingData.sessionId },
      include: {
        interactions: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 5 // Get last 5 interactions
        },
        screenshots: {
          orderBy: {
            timestamp: 'desc'
          },
          take: 3 // Get last 3 screenshots
        },
        _count: {
          select: {
            interactions: true,
            screenshots: true
          }
        }
      }
    });

    console.log('📊 TRAINING DATA SUMMARY');
    console.log('========================');
    console.log(`Training Data ID: ${recentTrainingData.id}`);
    console.log(`Session ID: ${recentTrainingData.sessionId}`);
    console.log(`Created: ${recentTrainingData.createdAt}`);
    console.log(`Data Type: ${recentTrainingData.dataType}`);
    console.log(`Quality Score: ${recentTrainingData.qualityScore}`);
    console.log(`Status: ${recentTrainingData.status}`);
    console.log('');

    if (sessionData) {
      console.log('🗂️ SESSION INFORMATION');
      console.log('=======================');
      console.log(`Session Type: ${sessionData.type}`);
      console.log(`Session Status: ${sessionData.status}`);
      console.log(`Duration: ${sessionData.duration || 'In progress'}`);
      console.log(`Quality Score: ${sessionData.qualityScore || 0}`);
      console.log(`Total Interactions: ${sessionData._count.interactions}`);
      console.log(`Total Screenshots: ${sessionData._count.screenshots}`);
      console.log(`Start Time: ${sessionData.startTime}`);
      console.log(`End Time: ${sessionData.endTime || 'Still active'}`);
      console.log('');
    }

    console.log('📋 RAW TRAINING DATA');
    console.log('====================');
    if (recentTrainingData.jsonlData) {
      console.log('JSONL Data:');
      console.log(recentTrainingData.jsonlData);
    } else {
      console.log('No JSONL data found');
    }
    console.log('');

    if (recentTrainingData.hyperparameters && Object.keys(recentTrainingData.hyperparameters).length > 0) {
      console.log('🔧 HYPERPARAMETERS');
      console.log('==================');
      console.log(JSON.stringify(recentTrainingData.hyperparameters, null, 2));
      console.log('');
    }

    if (recentTrainingData.trainingConfig && Object.keys(recentTrainingData.trainingConfig).length > 0) {
      console.log('⚙️ TRAINING CONFIG');
      console.log('==================');
      console.log(JSON.stringify(recentTrainingData.trainingConfig, null, 2));
      console.log('');
    }

    if (sessionData && sessionData.interactions.length > 0) {
      console.log('🖱️ RECENT INTERACTIONS');
      console.log('======================');
      sessionData.interactions.forEach((interaction, index) => {
        console.log(`${index + 1}. ${interaction.type} at ${new Date(Number(interaction.timestamp))}`);
        console.log(`   Session Time: ${interaction.sessionTime}ms`);
        console.log(`   Quality Score: ${interaction.qualityScore}`);
        console.log(`   Context: ${JSON.stringify(interaction.context, null, 2)}`);
        console.log(`   Element: ${JSON.stringify(interaction.element, null, 2)}`);
        console.log('');
      });
    }

    if (sessionData && sessionData.screenshots.length > 0) {
      console.log('📸 RECENT SCREENSHOTS');
      console.log('=====================');
      sessionData.screenshots.forEach((screenshot, index) => {
        console.log(`${index + 1}. ID: ${screenshot.id}`);
        console.log(`   Captured: ${new Date(Number(screenshot.timestamp))}`);
        console.log(`   Event Type: ${screenshot.eventType}`);
        console.log(`   Trigger: ${screenshot.trigger || 'N/A'}`);
        console.log(`   Quality: ${screenshot.quality}`);
        console.log(`   Has Data URL: ${screenshot.dataUrl ? 'Yes' : 'No'}`);
        console.log(`   Viewport: ${JSON.stringify(screenshot.viewport, null, 2)}`);
        console.log('');
      });
    }

    // Export JSONL file
    if (recentTrainingData.jsonlData) {
      const fs = require('fs');
      const jsonlPath = `./training-data-${recentTrainingData.id}.jsonl`;
      fs.writeFileSync(jsonlPath, recentTrainingData.jsonlData);
      
      console.log(`💾 JSONL data exported to: ${jsonlPath}`);
      console.log(`📄 File size: ${recentTrainingData.fileSize || 'Unknown'} bytes`);
      
      // Also save a readable JSON version for inspection
      const readablePath = `./training-data-${recentTrainingData.id}-readable.json`;
      const exportData = {
        trainingDataId: recentTrainingData.id,
        sessionId: recentTrainingData.sessionId,
        createdAt: recentTrainingData.createdAt,
        status: recentTrainingData.status,
        trainingQuality: recentTrainingData.trainingQuality,
        fileSize: recentTrainingData.fileSize,
        openaiFileId: recentTrainingData.openaiFileId,
        modelId: recentTrainingData.modelId,
        hyperparameters: recentTrainingData.hyperparameters,
        trainingConfig: recentTrainingData.trainingConfig,
        jsonlData: recentTrainingData.jsonlData
      };
      
      fs.writeFileSync(readablePath, JSON.stringify(exportData, null, 2));
      console.log(`📋 Readable JSON exported to: ${readablePath}`);
    } else {
      console.log('❌ No JSONL data found in this training data record');
    }
    
    console.log('');
    console.log('✅ Export complete!');

  } catch (error) {
    console.error('❌ Error fetching training data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
getRecentTrainingData();