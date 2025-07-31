const { PrismaClient } = require('@prisma/client');

async function monitorEnhancedData() {
  const prisma = new PrismaClient();
  
  console.log('🔍 Monitoring for enhanced data in unified sessions...\n');
  console.log('Instructions:');
  console.log('1. Use your browser extension to interact with a website');
  console.log('2. Watch this console for incoming enhanced data');
  console.log('3. Press Ctrl+C to stop monitoring\n');
  
  let lastCheck = new Date();
  
  const monitor = async () => {
    try {
      // Check for new sessions with enhanced interactions
      const sessionsWithEnhanced = await prisma.unifiedSession.findMany({
        where: {
          AND: [
            { interactionCount: { gt: 0 } },
            { updatedAt: { gt: lastCheck } }
          ]
        },
        select: {
          id: true,
          interactionCount: true,
          lastInteractionTime: true,
          version: true,
          enhancedInteractions: true,
          updatedAt: true
        },
        orderBy: { updatedAt: 'desc' },
        take: 5
      });
      
      if (sessionsWithEnhanced.length > 0) {
        console.log(`📊 Found ${sessionsWithEnhanced.length} session(s) with enhanced data:`);
        
        sessionsWithEnhanced.forEach((session, index) => {
          console.log(`\n${index + 1}. Session: ${session.id}`);
          console.log(`   - Interaction count: ${session.interactionCount}`);
          console.log(`   - Version: ${session.version}`);
          console.log(`   - Last interaction: ${session.lastInteractionTime}`);
          console.log(`   - Updated: ${session.updatedAt}`);
          
          if (Array.isArray(session.enhancedInteractions) && session.enhancedInteractions.length > 0) {
            const latest = session.enhancedInteractions[session.enhancedInteractions.length - 1];
            console.log(`   - Latest interaction type: ${latest.type}`);
            console.log(`   - Has enhanced metadata: ${!!latest.metadata}`);
            console.log(`   - Has element details: ${!!latest.elementDetails}`);
            console.log(`   - Selectors: ${latest.selectors?.primary || 'none'}`);
          }
        });
        
        lastCheck = new Date();
      }
      
    } catch (error) {
      console.error('❌ Monitor error:', error.message);
    }
  };
  
  // Check every 3 seconds
  const interval = setInterval(monitor, 3000);
  
  // Cleanup on exit
  process.on('SIGINT', async () => {
    console.log('\n👋 Stopping monitor...');
    clearInterval(interval);
    await prisma.$disconnect();
    process.exit(0);
  });
  
  // Run initial check
  await monitor();
}

monitorEnhancedData();