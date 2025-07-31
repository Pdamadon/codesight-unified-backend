/**
 * Examine Raw Interaction Details
 * 
 * Look at the detailed structure of interactions to see what image
 * and element information we're capturing in UnifiedSession data
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function examineRawInteractionDetails() {
  console.log('🔍 Examining Raw Interaction Details for Image Information\n');
  
  try {
    // Get the H&M product session
    const productSession = await prisma.unifiedSession.findFirst({
      where: {
        id: 'session_1753897349098_p9o66xuwm'
      }
    });
    
    if (!productSession) {
      console.log('❌ H&M product session not found');
      return;
    }
    
    console.log(`📊 Examining session: ${productSession.id}\n`);
    
    // Parse interactions
    let interactions;
    try {
      if (typeof productSession.enhancedInteractions === 'string') {
        interactions = JSON.parse(productSession.enhancedInteractions);
      } else {
        interactions = productSession.enhancedInteractions;
      }
      
      // Handle object with numeric keys
      if (typeof interactions === 'object' && !Array.isArray(interactions)) {
        const keys = Object.keys(interactions).filter(key => !isNaN(Number(key))).sort((a, b) => parseInt(a) - parseInt(b));
        interactions = keys.map(key => interactions[key]);
      }
    } catch (error) {
      console.log('❌ Failed to parse interactions:', error.message);
      return;
    }
    
    if (!Array.isArray(interactions)) {
      console.log('❌ Interactions not an array');
      return;
    }
    
    console.log(`🔍 Analyzing ${interactions.length} interactions for image data...\n`);
    
    // Look for product page interactions and examine their detailed structure
    const productPageInteractions = interactions.filter(interaction => {
      const url = interaction.context?.url || '';
      return url.includes('/productpage.');
    });
    
    console.log(`📄 Found ${productPageInteractions.length} product page interactions\n`);
    
    // Examine the first few product page interactions in detail
    productPageInteractions.slice(0, 5).forEach((interaction, index) => {
      console.log(`🔍 INTERACTION ${index + 1}:`);
      console.log(`   Type: ${interaction.type}`);
      console.log(`   URL: ${interaction.context?.url?.substring(0, 80)}...`);
      console.log(`   Element Text: "${interaction.element?.text || 'none'}"`);
      console.log(`   Element Tag: ${interaction.element?.tag || interaction.element?.tagName || 'none'}`);
      console.log(`   Element ID: ${interaction.element?.id || 'none'}`);
      console.log(`   Element Class: ${interaction.element?.className || 'none'}`);
      
      // Check for image-related attributes
      if (interaction.element?.attributes) {
        console.log(`   Attributes:`);
        Object.entries(interaction.element.attributes).forEach(([key, value]) => {
          console.log(`      ${key}: ${value}`);
          
          // Look for image-related attributes
          if (key.toLowerCase().includes('src') || 
              key.toLowerCase().includes('image') || 
              key.toLowerCase().includes('img') ||
              (typeof value === 'string' && value.includes('.jpg')) ||
              (typeof value === 'string' && value.includes('.png')) ||
              (typeof value === 'string' && value.includes('.webp'))) {
            console.log(`      🖼️ POTENTIAL IMAGE: ${key} = ${value}`);
          }
        });
      }
      
      // Check if element itself contains image information
      if (interaction.element?.src) {
        console.log(`   🖼️ IMAGE SRC: ${interaction.element.src}`);
      }
      
      // Check for nearby elements that might be images
      if (interaction.element?.nearbyElements?.length > 0) {
        console.log(`   🏘️ Nearby Elements (${interaction.element.nearbyElements.length}):`);
        interaction.element.nearbyElements.slice(0, 3).forEach((nearby, i) => {
          console.log(`      ${i + 1}. Tag: ${nearby.tag || 'unknown'}, Text: "${nearby.text || 'none'}"`);
          
          // Check for image elements in nearby
          if (nearby.tag === 'img' || nearby.tag === 'image') {
            console.log(`         🖼️ NEARBY IMAGE FOUND!`);
            if (nearby.src) console.log(`         🖼️ Image SRC: ${nearby.src}`);
            if (nearby.alt) console.log(`         🖼️ Image ALT: ${nearby.alt}`);
            if (nearby.attributes) {
              Object.entries(nearby.attributes).forEach(([key, value]) => {
                if (key.toLowerCase().includes('src') || key.toLowerCase().includes('img')) {
                  console.log(`         🖼️ Image Attribute: ${key} = ${value}`);
                }
              });
            }
          }
        });
      }
      
      // Check for sibling elements that might be images
      if (interaction.element?.siblingElements?.length > 0) {
        const imageSiblings = interaction.element.siblingElements.filter(sibling => 
          sibling.tag === 'img' || sibling.tag === 'image' || 
          (sibling.src && (sibling.src.includes('.jpg') || sibling.src.includes('.png')))
        );
        
        if (imageSiblings.length > 0) {
          console.log(`   👥 Image Siblings Found (${imageSiblings.length}):`);
          imageSiblings.forEach((sibling, i) => {
            console.log(`      ${i + 1}. 🖼️ ${sibling.tag}: ${sibling.src || 'no src'}`);
            if (sibling.alt) console.log(`         ALT: ${sibling.alt}`);
          });
        }
      }
      
      console.log('');
    });
    
    // Also look at page context to see if there's general image information
    console.log('🌐 PAGE CONTEXT ANALYSIS:');
    const uniqueUrls = [...new Set(productPageInteractions.map(i => i.context?.url))];
    console.log(`   Unique product pages visited: ${uniqueUrls.length}`);
    uniqueUrls.slice(0, 3).forEach((url, i) => {
      console.log(`   ${i + 1}. ${url}`);
    });
    
    // Check if there's any page-level context data
    const firstProductInteraction = productPageInteractions[0];
    if (firstProductInteraction?.context?.pageContext) {
      console.log(`\n📄 Page Context Data Available:`);
      console.log(JSON.stringify(firstProductInteraction.context.pageContext, null, 2).substring(0, 500));
    }
    
    // Save detailed analysis
    const analysis = {
      sessionId: productSession.id,
      totalInteractions: interactions.length,
      productPageInteractions: productPageInteractions.length,
      imageAnalysis: {
        interactionsWithImageData: productPageInteractions.filter(i => 
          i.element?.src || 
          i.element?.attributes?.src ||
          i.element?.nearbyElements?.some(n => n.tag === 'img') ||
          i.element?.siblingElements?.some(s => s.tag === 'img')
        ).length,
        potentialImageSources: []
      },
      sampleInteractions: productPageInteractions.slice(0, 3).map(interaction => ({
        type: interaction.type,
        url: interaction.context?.url,
        elementText: interaction.element?.text,
        elementTag: interaction.element?.tag || interaction.element?.tagName,
        hasAttributes: !!interaction.element?.attributes,
        hasNearbyElements: !!interaction.element?.nearbyElements?.length,
        hasSiblingElements: !!interaction.element?.siblingElements?.length,
        attributeKeys: interaction.element?.attributes ? Object.keys(interaction.element.attributes) : []
      }))
    };
    
    fs.writeFileSync('interaction-image-analysis.json', JSON.stringify(analysis, null, 2));
    console.log('\n📄 Detailed analysis saved to interaction-image-analysis.json');
    
  } catch (error) {
    console.error('❌ Analysis error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
examineRawInteractionDetails().catch(console.error);