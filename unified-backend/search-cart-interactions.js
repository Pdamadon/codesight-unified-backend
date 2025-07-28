const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function searchCartInteractions() {
  try {
    const session = await prisma.unifiedSession.findUnique({
      where: { id: 'session_1753726406409_do0hixp2m' }
    });
    
    const interactions = typeof session.enhancedInteractions === 'string' ? 
      JSON.parse(session.enhancedInteractions) : session.enhancedInteractions;
    
    console.log('🛒 SEARCHING FOR CART-RELATED INTERACTIONS...');
    console.log('Session has', interactions.length, 'total interactions');
    console.log('');
    
    // Find cart-related interactions
    const cartInteractions = interactions.filter(interaction => {
      const element = interaction.element || {};
      const context = interaction.context || {};
      const text = (element.text || '').toLowerCase();
      const url = (context.url || '').toLowerCase();
      const elementAttrs = JSON.stringify(element.attributes || {}).toLowerCase();
      
      return text.includes('add to cart') || 
             text.includes('add to bag') ||
             elementAttrs.includes('cart') ||
             elementAttrs.includes('bag') ||
             url.includes('cart') ||
             url.includes('bag');
    });
    
    console.log('🎯 FOUND', cartInteractions.length, 'CART-RELATED INTERACTIONS:');
    console.log('='.repeat(80));
    
    cartInteractions.forEach((interaction, index) => {
      console.log(`CART INTERACTION ${index + 1}:`);
      console.log('- Element text:', interaction.element?.text || 'No text');
      console.log('- Element tag:', interaction.element?.tag);
      console.log('- Element attributes:', JSON.stringify(interaction.element?.attributes || {}, null, 2));
      console.log('- Page URL:', interaction.context?.url || 'No URL');
      console.log('- Page title:', interaction.context?.pageTitle || 'No title');
      console.log('- Timestamp:', interaction.timestamp);
      console.log('- Has product context?', Boolean(interaction.business?.ecommerce));
      if (interaction.business?.ecommerce) {
        console.log('  Product:', JSON.stringify(interaction.business.ecommerce, null, 2));
      }
      console.log('');
    });
    
    // Also search for product page interactions
    console.log('🏷️  SEARCHING FOR PRODUCT PAGE INTERACTIONS...');
    const productInteractions = interactions.filter(interaction => {
      const context = interaction.context || {};
      const url = (context.url || '').toLowerCase();
      const pageTitle = (context.pageTitle || '').toLowerCase();
      
      return url.includes('/product') || 
             url.includes('/p/') ||
             pageTitle.includes('product') ||
             url.includes('/browse') ||
             url.includes('/category');
    });
    
    console.log('🎯 FOUND', productInteractions.length, 'PRODUCT-RELATED INTERACTIONS');
    
    // Show a few examples with product context
    const sampledProductInteractions = productInteractions.slice(0, 3);
    sampledProductInteractions.forEach((interaction, index) => {
      console.log(`\nPRODUCT INTERACTION ${index + 1}:`);
      console.log('- Page URL:', interaction.context?.url || 'No URL');
      console.log('- Page title:', interaction.context?.pageTitle || 'No title');
      console.log('- Element text:', interaction.element?.text || 'No text');
      console.log('- Has business context?', Boolean(interaction.business));
      if (interaction.business) {
        console.log('  Business context:', JSON.stringify(interaction.business, null, 2));
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

searchCartInteractions();