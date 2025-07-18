const { PrismaClient } = require('@prisma/client');

async function checkSessions() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking for recent sessions...\n');
    
    // Get recent sessions
    const recentSessions = await prisma.unifiedSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            interactions: true,
            screenshots: true
          }
        }
      }
    });
    
    if (recentSessions.length === 0) {
      console.log('❌ No sessions found in database');
      return;
    }
    
    console.log(`Found ${recentSessions.length} recent sessions:\n`);
    
    recentSessions.forEach((session, index) => {
      console.log(`--- Session ${index + 1} ---`);
      console.log(`ID: ${session.id}`);
      console.log(`Type: ${session.type}`);
      console.log(`Status: ${session.status}`);
      console.log(`Created: ${session.createdAt}`);
      console.log(`Interactions: ${session._count.interactions}`);
      console.log(`Screenshots: ${session._count.screenshots}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error checking sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessions();