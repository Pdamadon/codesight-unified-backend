const { PrismaClient } = require('@prisma/client');

async function debugLookbackLogic() {
  const prisma = new PrismaClient();
  
  try {
    const session = await prisma.unifiedSession.findUnique({
      where: { id: 'session_1753726406409_do0hixp2m' }
    });
    
    const interactions = typeof session.enhancedInteractions === 'string' ? 
      JSON.parse(session.enhancedInteractions) : session.enhancedInteractions;
    
    console.log('🔍 DEBUGGING LOOKBACK LOGIC FOR SIZE SELECTIONS');
    console.log('='.repeat(80));
    
    // Find the first "Add to Bag" interaction
    const firstAddToBag = interactions.find(interaction => {
      const text = (interaction.element?.text || '').toLowerCase();
      return text.includes('add to bag') || text.includes('add to cart');
    });
    
    if (!firstAddToBag) {
      console.log('No Add to Bag interaction found');
      return;
    }
    
    const addToBagIndex = interactions.findIndex(i => i.timestamp === firstAddToBag.timestamp);
    console.log('Add to Bag interaction found at index:', addToBagIndex);
    console.log('Add to Bag timestamp:', new Date(firstAddToBag.timestamp).toISOString());
    console.log('');
    
    // Look at the 10 interactions before
    const lookbackRange = Math.max(0, addToBagIndex - 10);
    const recentInteractions = interactions.slice(lookbackRange, addToBagIndex);
    
    console.log('LOOKING BACK AT', recentInteractions.length, 'INTERACTIONS BEFORE ADD TO BAG:');
    console.log('='.repeat(80));
    
    recentInteractions.forEach((interaction, index) => {
      const element = interaction.element || {};
      const context = interaction.context || {};
      const text = (element.text || '').trim();
      const attributes = element.attributes || {};
      
      console.log(`INTERACTION ${lookbackRange + index} (${lookbackRange + index - addToBagIndex} before cart):`);
      console.log('- Text:', text || 'No text');
      console.log('- Tag:', element.tag);
      console.log('- URL:', context.url || 'No URL');
      console.log('- Timestamp:', new Date(interaction.timestamp).toISOString());
      
      // Check if this looks like a size selection
      const name = attributes.name || '';
      const ariaLabel = attributes['aria-label'] || '';
      const className = attributes.class || '';
      
      const couldBeSize = name.includes('size') || 
                         name.includes('Size') ||
                         ariaLabel.toLowerCase().includes('size') ||
                         className.includes('dimension') ||
                         ['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(text.toUpperCase());
      
      if (couldBeSize) {
        console.log('  🎯 SIZE CANDIDATE:', {
          text,
          name,
          ariaLabel,
          className,
          type: attributes.type
        });
      }
      
      // Check if this looks like a color selection
      const couldBeColor = name.includes('color') ||
                          ariaLabel.toLowerCase().includes('color') ||
                          className.includes('color') ||
                          className.includes('swatch') ||
                          text.toLowerCase().includes('blue') ||
                          text.toLowerCase().includes('dazzling');
      
      if (couldBeColor) {
        console.log('  🎨 COLOR CANDIDATE:', {
          text,
          name,
          ariaLabel,
          className
        });
      }
      
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugLookbackLogic();