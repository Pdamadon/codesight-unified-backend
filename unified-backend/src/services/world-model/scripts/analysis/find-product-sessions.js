/**
 * Find Sessions with Product Interactions
 * 
 * Look for UnifiedSession data that contains actual product selections
 * and analyze the click patterns on product pages
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function findProductSessions() {
  console.log('🔍 Searching for Sessions with Product Interactions\n');
  
  try {
    // Get multiple sessions to find ones with product interactions
    const sessions = await prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: null },
        interactionCount: { gt: 10 }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    console.log(`📊 Found ${sessions.length} sessions to analyze\n`);
    
    const productSessions = [];
    
    for (const session of sessions) {
      console.log(`📝 Analyzing session: ${session.id.substring(0, 20)}...`);
      console.log(`   Domain: ${session.domain}`);
      console.log(`   Quality: ${session.qualityScore}`);
      console.log(`   Interactions: ${session.interactionCount}`);
      
      // Parse interactions
      let interactions;
      try {
        if (typeof session.enhancedInteractions === 'string') {
          interactions = JSON.parse(session.enhancedInteractions);
        } else {
          interactions = session.enhancedInteractions;
        }
        
        // Handle object with numeric keys
        if (typeof interactions === 'object' && !Array.isArray(interactions)) {
          const keys = Object.keys(interactions).filter(key => !isNaN(Number(key))).sort((a, b) => parseInt(a) - parseInt(b));
          interactions = keys.map(key => interactions[key]);
        }
      } catch (error) {
        console.log(`   ❌ Failed to parse interactions: ${error.message}`);
        continue;
      }
      
      if (!Array.isArray(interactions)) {
        console.log(`   ❌ Interactions not an array`);
        continue;
      }
      
      // Look for product page URLs
      const productUrls = new Set();
      const clicksOnProductPages = [];
      
      interactions.forEach((interaction, index) => {
        const url = interaction.context?.url || '';
        
        // Check if this is a product page
        const isProductPage = url.includes('/productpage') || 
                             url.includes('/product.do') || 
                             url.includes('/product/') ||
                             url.match(/\/p\/[\w-]+/) ||
                             url.match(/\/s\/[\w-]+\/\d+/);
        
        if (isProductPage) {
          productUrls.add(url);
          
          if (interaction.type === 'CLICK' && interaction.element?.text) {
            clicksOnProductPages.push({
              index,
              text: interaction.element.text,
              url: url,
              tag: interaction.element.tag || interaction.element.tagName,
              className: interaction.element.className,
              id: interaction.element.id,
              timestamp: interaction.timestamp
            });
          }
        }
      });
      
      console.log(`   📄 Product pages found: ${productUrls.size}`);
      console.log(`   🖱️ Clicks on product pages: ${clicksOnProductPages.length}`);
      
      if (productUrls.size > 0 && clicksOnProductPages.length > 0) {
        productSessions.push({
          sessionId: session.id,
          domain: session.domain,
          qualityScore: session.qualityScore,
          totalInteractions: interactions.length,
          productUrls: Array.from(productUrls),
          productClicks: clicksOnProductPages,
          rawInteractions: interactions
        });
        
        console.log(`   ✅ Session has product interactions!`);
        
        // Show sample product URLs
        console.log(`   📍 Sample product URLs:`);
        Array.from(productUrls).slice(0, 3).forEach((url, i) => {
          console.log(`      ${i + 1}. ${url.substring(0, 100)}...`);
        });
        
        // Show sample clicks
        console.log(`   🖱️ Sample product page clicks:`);
        clicksOnProductPages.slice(0, 5).forEach((click, i) => {
          console.log(`      ${i + 1}. "${click.text}" (${click.tag}) at ${click.url.substring(0, 80)}...`);
        });
      } else {
        console.log(`   ⚪ No product interactions`);
      }
      
      console.log('');
    }
    
    console.log(`\n🎯 Summary: Found ${productSessions.length} sessions with product interactions\n`);
    
    if (productSessions.length > 0) {
      // Save the best product session for detailed analysis
      const bestSession = productSessions.reduce((best, current) => {
        const bestScore = (best.productClicks.length * 2) + best.qualityScore;
        const currentScore = (current.productClicks.length * 2) + current.qualityScore;
        return currentScore > bestScore ? current : best;
      });
      
      console.log(`🥇 Best product session: ${bestSession.sessionId}`);
      console.log(`   Domain: ${bestSession.domain}`);
      console.log(`   Product URLs: ${bestSession.productUrls.length}`);
      console.log(`   Product clicks: ${bestSession.productClicks.length}`);
      
      // Save detailed analysis
      const detailedAnalysis = {
        sessionId: bestSession.sessionId,
        domain: bestSession.domain,
        qualityScore: bestSession.qualityScore,
        productUrls: bestSession.productUrls,
        productClicks: bestSession.productClicks,
        detailedSequence: bestSession.rawInteractions.map((interaction, index) => ({
          index,
          type: interaction.type,
          timestamp: interaction.timestamp,
          url: interaction.context?.url,
          elementText: interaction.element?.text,
          elementTag: interaction.element?.tag || interaction.element.tagName,
          elementId: interaction.element?.id,
          elementClass: interaction.element?.className,
          isProductPage: (interaction.context?.url || '').includes('/productpage') || 
                        (interaction.context?.url || '').includes('/product.do') || 
                        (interaction.context?.url || '').includes('/product/') ||
                        !!(interaction.context?.url || '').match(/\/p\/[\w-]+/) ||
                        !!(interaction.context?.url || '').match(/\/s\/[\w-]+\/\d+/)
        }))
      };
      
      fs.writeFileSync('product-session-analysis.json', JSON.stringify(detailedAnalysis, null, 2));
      console.log(`📄 Detailed product session saved to product-session-analysis.json`);
      
      // Show specific product page interaction sequence
      console.log(`\n🔍 Product Page Interaction Sequence:`);
      let productSequenceNumber = 1;
      bestSession.rawInteractions.forEach((interaction, index) => {
        const url = interaction.context?.url || '';
        const isProductPage = url.includes('/productpage') || 
                             url.includes('/product.do') || 
                             url.includes('/product/') ||
                             url.match(/\/p\/[\w-]+/) ||
                             url.match(/\/s\/[\w-]+\/\d+/);
        
        if (isProductPage && interaction.type === 'CLICK') {
          console.log(`   ${productSequenceNumber}. [${index}] "${interaction.element?.text}" (${interaction.type})`);
          console.log(`      URL: ${url.substring(0, 120)}...`);
          console.log(`      Element: ${interaction.element?.tag} (id: ${interaction.element?.id || 'none'}, class: ${interaction.element?.className || 'none'})`);
          
          // Look for potential attributes (colors, sizes, actions)
          const text = interaction.element?.text?.toLowerCase() || '';
          const potentialAttribute = {
            color: /^(black|white|red|blue|green|navy|gray|brown|beige|pink|purple|yellow|orange)$/i.test(text),
            size: /^(xs|s|m|l|xl|xxl|\d{1,2}|\d{2,3}w?)$/i.test(text),
            action: /add to|buy|cart|bag|select/i.test(text),
            style: /fit|regular|slim|loose/i.test(text)
          };
          
          const attributeTypes = Object.entries(potentialAttribute).filter(([_, matches]) => matches).map(([type, _]) => type);
          if (attributeTypes.length > 0) {
            console.log(`      🎯 Potential attributes: ${attributeTypes.join(', ')}`);
          }
          
          productSequenceNumber++;
          console.log('');
        }
      });
    } else {
      console.log('❌ No sessions found with product page interactions');
      console.log('💡 Try ingesting sessions that include actual product browsing');
    }
    
  } catch (error) {
    console.error('❌ Search error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the search
findProductSessions().catch(console.error);