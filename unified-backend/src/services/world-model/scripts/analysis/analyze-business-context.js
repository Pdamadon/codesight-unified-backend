const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function analyzeBusinessContext() {
  try {
    const session = await prisma.unifiedSession.findUnique({
      where: { id: 'session_1753726406409_do0hixp2m' }
    });
    
    const interactions = typeof session.enhancedInteractions === 'string' ? 
      JSON.parse(session.enhancedInteractions) : session.enhancedInteractions;
    
    console.log('📊 ANALYZING BUSINESS CONTEXT DATA POPULATION...');
    console.log('Total interactions:', interactions.length);
    console.log('');
    
    // Count interactions with business context
    const withBusinessContext = interactions.filter(i => i.business && Object.keys(i.business).length > 0);
    console.log('🏢 Interactions with business context:', withBusinessContext.length);
    
    if (withBusinessContext.length > 0) {
      console.log('\nSAMPLE BUSINESS CONTEXTS:');
      console.log('='.repeat(80));
      
      withBusinessContext.slice(0, 5).forEach((interaction, index) => {
        console.log(`BUSINESS CONTEXT ${index + 1}:`);
        console.log('- Page URL:', interaction.context?.url || 'No URL');
        console.log('- Element text:', interaction.element?.text || 'No text');
        console.log('- Business context:', JSON.stringify(interaction.business, null, 2));
        console.log('');
      });
    }
    
    // Look specifically at the "Add to Bag" interactions to see what context we have
    console.log('🛒 DETAILED ANALYSIS OF ADD TO BAG INTERACTIONS:');
    console.log('='.repeat(80));
    
    const addToBagInteractions = interactions.filter(interaction => {
      const text = (interaction.element?.text || '').toLowerCase();
      return text.includes('add to bag') || text.includes('add to cart');
    });
    
    addToBagInteractions.forEach((interaction, index) => {
      console.log(`ADD TO BAG INTERACTION ${index + 1}:`);
      console.log('- Page URL:', interaction.context?.url || 'No URL');
      console.log('- Page title:', interaction.context?.pageTitle || 'No title');
      console.log('- Element:', interaction.element?.tag, interaction.element?.text);
      console.log('- Timestamp:', new Date(interaction.timestamp).toISOString());
      
      console.log('- Full interaction structure:');
      console.log('  * element keys:', Object.keys(interaction.element || {}));
      console.log('  * context keys:', Object.keys(interaction.context || {}));
      console.log('  * business keys:', Object.keys(interaction.business || {}));
      console.log('  * state keys:', Object.keys(interaction.state || {}));
      console.log('  * visual keys:', Object.keys(interaction.visual || {}));
      
      // Check for any product-related data in any field
      if (interaction.element?.attributes) {
        console.log('  * element attributes:', JSON.stringify(interaction.element.attributes, null, 4));
      }
      
      if (interaction.context?.productInfo || interaction.context?.product) {
        console.log('  * context product info:', JSON.stringify(interaction.context.productInfo || interaction.context.product, null, 4));
      }
      
      if (interaction.state) {
        console.log('  * state data:', JSON.stringify(interaction.state, null, 4));
      }
      
      if (interaction.visual?.metadata) {
        console.log('  * visual metadata:', JSON.stringify(interaction.visual.metadata, null, 4));
      }
      
      console.log('');
    });
    
    // Also check the interactions right before each "Add to Bag" to see product context
    console.log('🔍 INTERACTIONS BEFORE ADD TO BAG (Product Selection Context):');
    console.log('='.repeat(80));
    
    addToBagInteractions.forEach((addToBagInteraction, index) => {
      const interactionIndex = interactions.findIndex(i => i.timestamp === addToBagInteraction.timestamp);
      const precedingInteractions = interactions.slice(Math.max(0, interactionIndex - 5), interactionIndex);
      
      console.log(`CONTEXT FOR ADD TO BAG ${index + 1}:`);
      console.log('(5 interactions before the Add to Bag click)');
      
      precedingInteractions.forEach((interaction, prevIndex) => {
        console.log(`  ${prevIndex + 1}. ${interaction.element?.text || 'No text'} (${interaction.element?.tag})`);
        console.log(`     URL: ${interaction.context?.url || 'No URL'}`);
        console.log(`     Attributes:`, interaction.element?.attributes ? Object.keys(interaction.element.attributes).join(', ') : 'none');
        
        // Look for size/color/product selection indicators
        const text = (interaction.element?.text || '').toLowerCase();
        const attrs = JSON.stringify(interaction.element?.attributes || {}).toLowerCase();
        
        if (text.includes('size') || attrs.includes('size') || 
            text.includes('color') || attrs.includes('color') ||
            text.includes('xl') || text.includes('small') || text.includes('medium') || text.includes('large') ||
            text.match(/\b(red|blue|black|white|green|gray|brown)\b/)) {
          console.log(`     🎯 PRODUCT SELECTION: This looks like a product choice`);
        }
      });
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeBusinessContext();