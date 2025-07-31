const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function getCompletedSession() {
  try {
    console.log('🔍 Fetching most recent completed session...\n');

    // Get the most recent completed session
    const completedSession = await prisma.unifiedSession.findFirst({
      where: {
        status: 'COMPLETED'
      },
      orderBy: {
        endTime: 'desc'
      },
      include: {
        interactions: {
          orderBy: {
            timestamp: 'asc'
          }
        },
        screenshots: {
          orderBy: {
            timestamp: 'asc'
          }
        }
      }
    });

    if (!completedSession) {
      console.log('❌ No completed sessions found in database');
      return;
    }

    console.log('📊 COMPLETED SESSION SUMMARY');
    console.log('============================');
    console.log(`Session ID: ${completedSession.id}`);
    console.log(`Status: ${completedSession.status}`);
    console.log(`Duration: ${completedSession.duration || 'Unknown'}ms`);
    console.log(`Start Time: ${completedSession.startTime}`);
    console.log(`End Time: ${completedSession.endTime}`);
    console.log(`Total Interactions: ${completedSession.interactions.length}`);
    console.log(`Total Screenshots: ${completedSession.screenshots.length}`);
    console.log(`Quality Score: ${completedSession.qualityScore}`);
    console.log('');

    // Reduce to half size by sampling every other interaction and key screenshots
    const halfInteractions = completedSession.interactions.filter((_, index) => index % 2 === 0);
    const halfScreenshots = completedSession.screenshots.filter((_, index) => index % 2 === 0);

    // Create reduced session data - convert BigInt to string for JSON serialization
    const reducedSession = {
      ...completedSession,
      interactions: halfInteractions.map(interaction => ({
        ...interaction,
        timestamp: interaction.timestamp.toString()
      })),
      screenshots: halfScreenshots.map(screenshot => ({
        ...screenshot,
        timestamp: screenshot.timestamp.toString(),
        // Remove large dataUrl to save space, keep metadata
        dataUrl: screenshot.dataUrl ? '[DATA_URL_REMOVED]' : null
      }))
    };

    console.log('📉 REDUCED SESSION SIZE');
    console.log('=======================');
    console.log(`Original Interactions: ${completedSession.interactions.length}`);
    console.log(`Reduced Interactions: ${halfInteractions.length}`);
    console.log(`Original Screenshots: ${completedSession.screenshots.length}`);
    console.log(`Reduced Screenshots: ${halfScreenshots.length}`);
    console.log('');

    // Export to JSON file
    const fs = require('fs');
    const exportPath = `./completed-session-${completedSession.id}-half.json`;
    
    fs.writeFileSync(exportPath, JSON.stringify(reducedSession, null, 2));
    
    console.log(`💾 Half-size session data exported to: ${exportPath}`);
    console.log('✅ Export complete!');

  } catch (error) {
    console.error('❌ Error fetching completed session:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
getCompletedSession();