const { PrismaClient } = require('@prisma/client');

async function debugSimpleVariantDetection() {
  const prisma = new PrismaClient();
  
  try {
    const session = await prisma.unifiedSession.findUnique({
      where: { id: 'session_1753726406409_do0hixp2m' }
    });
    
    const interactions = typeof session.enhancedInteractions === 'string' ? 
      JSON.parse(session.enhancedInteractions) : session.enhancedInteractions;
    
    console.log('🔬 SIMPLE VARIANT DETECTION DEBUG');
    console.log('='.repeat(80));
    
    // Find first Add to Bag
    const addToBagIndex = interactions.findIndex(i => 
      (i.element?.text || '').toLowerCase().includes('add to bag')
    );
    
    console.log('Add to Bag at index:', addToBagIndex);
    console.log('Looking back 15 interactions...');
    console.log('');
    
    // Look back 15 interactions
    const start = Math.max(0, addToBagIndex - 15);
    const lookbackInteractions = interactions.slice(start, addToBagIndex);
    
    console.log('SCANNING', lookbackInteractions.length, 'INTERACTIONS:');
    console.log('='.repeat(80));
    
    let foundSize = null;
    let foundColor = null;
    
    lookbackInteractions.forEach((interaction, index) => {
      const element = interaction.element || {};
      const text = (element.text || '').trim();
      const attrs = element.attributes || {};
      
      // Simple size detection
      if (attrs.name === 'buy-box-Size' && ['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(text)) {
        foundSize = text;
        console.log(`✅ SIZE FOUND: "${text}" at index ${start + index}`);
        console.log('   - Name:', attrs.name);
        console.log('   - Aria:', attrs['aria-label']);
        console.log('   - Type:', attrs.type);
        console.log('');
      }
      
      // Simple color detection
      if (attrs.name === 'color-radio' && text.length > 0) {
        foundColor = text;
        console.log(`✅ COLOR FOUND: "${text}" at index ${start + index}`);
        console.log('   - Name:', attrs.name);
        console.log('   - Aria:', attrs['aria-label']);
        console.log('   - Type:', attrs.type);
        console.log('');
      }
    });
    
    console.log('📊 DETECTION RESULTS:');
    console.log('Size found:', foundSize || 'NONE');
    console.log('Color found:', foundColor || 'NONE');
    console.log('');
    
    if (!foundSize && !foundColor) {
      console.log('❌ NO VARIANTS DETECTED - Let me check if detection logic is wrong...');
      console.log('');
      
      // Show all interactions with text content
      console.log('ALL INTERACTIONS WITH TEXT:');
      lookbackInteractions.forEach((interaction, index) => {
        const element = interaction.element || {};
        const text = (element.text || '').trim();
        const attrs = element.attributes || {};
        
        if (text) {
          console.log(`${start + index}: "${text}" (${element.tag}, name: ${attrs.name || 'none'})`);
        }
      });
    } else {
      console.log('✅ SUCCESS - Variants detected! The issue must be in our ProductContextBuilder logic.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugSimpleVariantDetection();