const { PrismaClient } = require('@prisma/client');

async function debugSizeSelections() {
  const prisma = new PrismaClient();
  
  try {
    const session = await prisma.unifiedSession.findUnique({
      where: { id: 'session_1753726406409_do0hixp2m' }
    });
    
    const interactions = typeof session.enhancedInteractions === 'string' ? 
      JSON.parse(session.enhancedInteractions) : session.enhancedInteractions;
    
    console.log('🔍 DEBUGGING SIZE SELECTIONS');
    console.log('Looking for size-related interactions...');
    console.log('');
    
    // Find interactions that might be size selections
    const potentialSizeSelections = interactions.filter(interaction => {
      const element = interaction.element || {};
      const text = (element.text || '').trim();
      const attributes = element.attributes || {};
      const name = attributes.name || '';
      const ariaLabel = attributes['aria-label'] || '';
      
      // Check for size-related patterns
      return text.match(/^[SMXL]$|^(XS|XXL)$|^\d{2}$/) ||
             name.includes('size') ||
             ariaLabel.toLowerCase().includes('size') ||
             text === 'M' || text === 'L' || text === 'S';
    });
    
    console.log('🎯 FOUND', potentialSizeSelections.length, 'POTENTIAL SIZE SELECTIONS:');
    console.log('='.repeat(80));
    
    potentialSizeSelections.forEach((interaction, index) => {
      const element = interaction.element || {};
      const context = interaction.context || {};
      
      console.log(`SIZE SELECTION ${index + 1}:`);
      console.log('- Text:', element.text || 'No text');
      console.log('- Tag:', element.tag);
      console.log('- Type:', element.attributes?.type);
      console.log('- Name:', element.attributes?.name);
      console.log('- Value:', element.attributes?.value);
      console.log('- Aria-label:', element.attributes?.['aria-label']);
      console.log('- Class:', element.attributes?.class);
      console.log('- Page URL:', context.url);
      console.log('- Timestamp:', new Date(interaction.timestamp).toISOString());
      console.log('');
    });
    
    // Also look for color selections
    console.log('🎨 LOOKING FOR COLOR SELECTIONS:');
    console.log('='.repeat(80));
    
    const potentialColorSelections = interactions.filter(interaction => {
      const element = interaction.element || {};
      const text = (element.text || '').toLowerCase();
      const attributes = element.attributes || {};
      const name = attributes.name || '';
      const ariaLabel = attributes['aria-label'] || '';
      const className = attributes.class || '';
      
      return text.includes('blue') || text.includes('black') || text.includes('white') ||
             text.includes('red') || text.includes('green') || text.includes('brown') ||
             text.includes('dazzling') || text.includes('khaki') ||
             name.includes('color') ||
             ariaLabel.toLowerCase().includes('color') ||
             className.includes('color') ||
             className.includes('swatch');
    });
    
    console.log('Found', potentialColorSelections.length, 'potential color selections:');
    
    potentialColorSelections.forEach((interaction, index) => {
      const element = interaction.element || {};
      const context = interaction.context || {};
      
      console.log(`COLOR SELECTION ${index + 1}:`);
      console.log('- Text:', element.text || 'No text');
      console.log('- Tag:', element.tag);
      console.log('- Name:', element.attributes?.name);
      console.log('- Aria-label:', element.attributes?.['aria-label']);
      console.log('- Class:', element.attributes?.class);
      console.log('- Page URL:', context.url);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

debugSizeSelections();