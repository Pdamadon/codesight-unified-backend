const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getLatestSession() {
  try {
    const latestSession = await prisma.unifiedSession.findFirst({
      orderBy: { createdAt: 'desc' },
      include: {
        interactions: {
          take: 3,
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (latestSession) {
      console.log('🔍 LATEST UNIFIED SESSION:');
      console.log('Session ID:', latestSession.sessionId);
      console.log('Created:', latestSession.createdAt);
      console.log('URL:', latestSession.url);
      console.log('Total Interactions:', latestSession.totalInteractions);
      console.log('');
      
      console.log('🎯 RECENT INTERACTIONS (showing latest 3):');
      latestSession.interactions.forEach((interaction, index) => {
        console.log(`--- Interaction ${index + 1} ---`);
        console.log('Type:', interaction.type);
        console.log('Timestamp:', interaction.timestamp);
        console.log('Element:', interaction.element ? 'Has Element Data' : 'No Element Data');
        
        // Check for price data in legacyData (where enhanced data is stored)
        if (interaction.legacyData) {
          try {
            const enhanced = typeof interaction.legacyData === 'string' 
              ? JSON.parse(interaction.legacyData) 
              : interaction.legacyData;
              
            console.log('Has Enhanced Data:', !!enhanced);
            console.log('Has Price Data:', !!enhanced.priceData);
            
            if (enhanced.priceData) {
              console.log('🆕 PRICE DATA FOUND:');
              console.log('- Clicked Element Prices:', enhanced.priceData.clickedElementPrices?.length || 0);
              console.log('- Nearby Prices:', enhanced.priceData.nearbyPrices?.length || 0);
              console.log('- Product Name:', enhanced.priceData.productInfo?.name || 'None');
              console.log('- Product Brand:', enhanced.priceData.productInfo?.brand || 'None');
              console.log('- Variants Size:', enhanced.priceData.variants?.size || 'None');
              console.log('- Is On Sale:', enhanced.priceData.discounts?.isOnSale || false);
              console.log('- Page Type:', enhanced.priceData.context?.pageType || 'Unknown');
              
              // Show some example prices if available
              if (enhanced.priceData.clickedElementPrices?.length > 0) {
                console.log('- Example Clicked Prices:', enhanced.priceData.clickedElementPrices.slice(0, 2));
              }
              if (enhanced.priceData.nearbyPrices?.length > 0) {
                console.log('- Example Nearby Prices:', enhanced.priceData.nearbyPrices.slice(0, 2).map(p => ({
                  price: p.price,
                  confidence: p.confidence,
                  distance: p.element?.distance
                })));
              }
            }
            
            // Check nearby elements expansion
            if (enhanced.contextData?.nearestClickable) {
              console.log('🎯 NEARBY ELEMENTS:');
              console.log('- Count:', enhanced.contextData.nearestClickable.length);
              console.log('- Has Quality Scores:', enhanced.contextData.nearestClickable.some(el => el.qualityScore));
              
              // Show quality score examples
              const elementsWithScores = enhanced.contextData.nearestClickable
                .filter(el => el.qualityScore)
                .slice(0, 2);
              if (elementsWithScores.length > 0) {
                console.log('- Quality Score Examples:', elementsWithScores.map(el => ({
                  text: el.text?.substring(0, 30) + '...',
                  score: el.qualityScore.score,
                  confidence: el.qualityScore.confidence
                })));
              }
            }
          } catch (e) {
            console.log('Error parsing enhanced data:', e.message);
          }
        } else {
          console.log('❌ No Enhanced Data Found in legacyData');
          
          // Check other possible locations for price data
          console.log('Available fields:', Object.keys(interaction));
          
          // Check if price data might be in element, context, or interaction JSON fields
          ['element', 'context', 'interaction'].forEach(field => {
            if (interaction[field]) {
              try {
                const data = typeof interaction[field] === 'string' 
                  ? JSON.parse(interaction[field]) 
                  : interaction[field];
                console.log(`${field} data keys:`, Object.keys(data));
                if (data.priceData) {
                  console.log(`🆕 PRICE DATA FOUND IN ${field.toUpperCase()}!`);
                  console.log('Price data:', data.priceData);
                }
              } catch (e) {
                console.log(`Error parsing ${field}:`, e.message);
              }
            }
          });
        }
        console.log('');
      });
    } else {
      console.log('❌ No sessions found in database');
    }
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

getLatestSession();