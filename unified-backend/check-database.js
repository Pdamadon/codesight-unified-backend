const { PrismaClient } = require('@prisma/client');

async function checkDatabaseData() {
  // Single PrismaClient instance for this check
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking database for recent data...\n');
    
    // Check for specific session we just created
    const specificSession = await prisma.unifiedSession.findUnique({
      where: { id: 'session_1752798626303_s9bkmeeyy' }
    });
    
    if (specificSession) {
      console.log('✅ Found specific session in database!');
      console.log(`   ID: ${specificSession.id}`);
      console.log(`   Type: ${specificSession.type}`);
      console.log(`   Status: ${specificSession.status}`);
      console.log(`   Created: ${specificSession.startTime.toISOString()}`);
      console.log('');
    } else {
      console.log('❌ Specific session NOT found in database\n');
    }
    
    // Check recent unified sessions
    const recentSessions = await prisma.unifiedSession.findMany({
      take: 10,
      orderBy: { startTime: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        startTime: true,
        endTime: true,
        qualityScore: true,
        processingStatus: true
      }
    });
    
    console.log(`📊 Recent Sessions (${recentSessions.length}):`);
    recentSessions.forEach((session, i) => {
      console.log(`  ${i + 1}. ${session.id}`);
      console.log(`     Type: ${session.type}, Status: ${session.status}`);
      console.log(`     Started: ${session.startTime.toISOString()}`);
      console.log(`     Processing: ${session.processingStatus}`);
      console.log('');
    });
    
    // Check recent interactions
    const recentInteractions = await prisma.interaction.findMany({
      take: 10,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        type: true,
        timestamp: true,
        sessionId: true
      }
    });
    
    console.log(`🖱️  Recent Interactions (${recentInteractions.length}):`);
    recentInteractions.forEach((interaction, i) => {
      console.log(`  ${i + 1}. ${interaction.type} at ${interaction.timestamp.toISOString()}`);
      console.log(`     Session: ${interaction.sessionId}`);
      console.log('');
    });
    
    // Check recent screenshots
    const recentScreenshots = await prisma.screenshot.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        timestamp: true,
        sessionId: true,
        quality: true
      }
    });
    
    console.log(`📸 Recent Screenshots (${recentScreenshots.length}):`);
    recentScreenshots.forEach((screenshot, i) => {
      console.log(`  ${i + 1}. ${screenshot.id} at ${screenshot.timestamp.toISOString()}`);
      console.log(`     Session: ${screenshot.sessionId}`);
      console.log(`     Quality: ${screenshot.quality}`);
      console.log('');
    });
    
    // Get totals
    const sessionCount = await prisma.unifiedSession.count();
    const interactionCount = await prisma.interaction.count();
    const screenshotCount = await prisma.screenshot.count();
    
    console.log('📈 Database Totals:');
    console.log(`   Sessions: ${sessionCount}`);
    console.log(`   Interactions: ${interactionCount}`);
    console.log(`   Screenshots: ${screenshotCount}`);
    
  } catch (error) {
    console.error('❌ Database check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseData();