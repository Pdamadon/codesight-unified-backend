const { PrismaClient } = require('@prisma/client');

async function checkEnhancedData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking for recent interactions with enhanced data...\n');
    
    // Get recent interactions
    const recentInteractions = await prisma.interaction.findMany({
      orderBy: { timestamp: 'desc' },
      take: 5,
      select: {
        id: true,
        timestamp: true,
        type: true,
        metadata: true,
        pageContext: true,
        elementDetails: true,
        contextData: true,
        overlays: true,
        action: true,
        primarySelector: true
      }
    });
    
    if (recentInteractions.length === 0) {
      console.log('❌ No interactions found in database');
      return;
    }
    
    console.log(`Found ${recentInteractions.length} recent interactions:\n`);
    
    recentInteractions.forEach((interaction, index) => {
      console.log(`--- Interaction ${index + 1} ---`);
      console.log(`ID: ${interaction.id}`);
      console.log(`Type: ${interaction.type}`);
      console.log(`Timestamp: ${new Date(Number(interaction.timestamp))}`);
      console.log(`Primary Selector: ${interaction.primarySelector}`);
      console.log(`Has metadata: ${interaction.metadata ? '✅' : '❌'}`);
      console.log(`Has pageContext: ${interaction.pageContext ? '✅' : '❌'}`);
      console.log(`Has elementDetails: ${interaction.elementDetails ? '✅' : '❌'}`);
      console.log(`Has contextData: ${interaction.contextData ? '✅' : '❌'}`);
      console.log(`Has overlays: ${interaction.overlays ? '✅' : '❌'}`);
      console.log(`Has action: ${interaction.action ? '✅' : '❌'}`);
      
      if (interaction.metadata) {
        console.log('📊 Metadata sample:', JSON.stringify(JSON.parse(interaction.metadata), null, 2).substring(0, 200) + '...');
      }
      
      console.log('');
    });
    
  } catch (error) {
    console.error('Error checking enhanced data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEnhancedData();