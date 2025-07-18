const { PrismaClient } = require('@prisma/client');

async function monitorEnhancedData() {
  const prisma = new PrismaClient();
  
  console.log('🔍 Monitoring database for new enhanced interaction data...');
  console.log('📊 Looking for interactions with metadata, pageContext, elementDetails, etc.\n');
  
  let lastInteractionCount = 0;
  
  const checkForNewData = async () => {
    try {
      // Get current interaction count
      const totalCount = await prisma.interaction.count();
      
      if (totalCount > lastInteractionCount) {
        console.log(`\n🆕 New interactions detected! Total: ${totalCount} (was ${lastInteractionCount})`);
        
        // Get the newest interactions
        const newInteractions = await prisma.interaction.findMany({
          orderBy: { timestamp: 'desc' },
          take: totalCount - lastInteractionCount,
          select: {
            id: true,
            type: true,
            timestamp: true,
            primarySelector: true,
            metadata: true,
            pageContext: true,
            elementDetails: true,
            contextData: true,
            overlays: true,
            action: true,
            url: true
          }
        });
        
        newInteractions.reverse().forEach((interaction, index) => {
          console.log(`\n--- 🎯 Interaction ${lastInteractionCount + index + 1} ---`);
          console.log(`Type: ${interaction.type}`);
          console.log(`Time: ${new Date(Number(interaction.timestamp)).toLocaleTimeString()}`);
          console.log(`URL: ${interaction.url}`);
          console.log(`Selector: ${interaction.primarySelector}`);
          
          // Check enhanced data fields
          const enhancedFields = {
            'metadata': interaction.metadata,
            'pageContext': interaction.pageContext,
            'elementDetails': interaction.elementDetails,
            'contextData': interaction.contextData,
            'overlays': interaction.overlays,
            'action': interaction.action
          };
          
          console.log('\n📊 Enhanced Data Fields:');
          Object.entries(enhancedFields).forEach(([field, data]) => {
            if (data) {
              try {
                const parsed = JSON.parse(data);
                const keys = Object.keys(parsed);
                console.log(`  ✅ ${field}: ${keys.length} keys (${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''})`);
                
                // Show sample of metadata
                if (field === 'metadata' && parsed.session_id) {
                  console.log(`      Session: ${parsed.session_id}, Page: ${parsed.page_title?.substring(0, 30)}...`);
                }
                
                // Show sample of elementDetails
                if (field === 'elementDetails' && parsed.tag) {
                  console.log(`      Element: <${parsed.tag}> "${parsed.text?.substring(0, 30)}..."`);
                }
                
                // Show sample of context
                if (field === 'contextData' && parsed.nearby_clickable) {
                  console.log(`      Nearby elements: ${parsed.nearby_clickable?.length || 0}`);
                }
                
              } catch (e) {
                console.log(`  ✅ ${field}: [Raw data, ${data.length} chars]`);
              }
            } else {
              console.log(`  ❌ ${field}: null`);
            }
          });
        });
        
        lastInteractionCount = totalCount;
      } else if (totalCount === lastInteractionCount && totalCount > 0) {
        process.stdout.write('.');
      } else {
        process.stdout.write('⏳ Waiting for data...\r');
      }
      
    } catch (error) {
      console.error('\n❌ Error monitoring data:', error.message);
    }
  };
  
  // Check every 2 seconds
  const interval = setInterval(checkForNewData, 2000);
  
  // Initial check
  await checkForNewData();
  
  // Handle cleanup
  process.on('SIGINT', async () => {
    clearInterval(interval);
    await prisma.$disconnect();
    console.log('\n\n👋 Monitoring stopped');
    process.exit(0);
  });
}

monitorEnhancedData().catch(console.error);