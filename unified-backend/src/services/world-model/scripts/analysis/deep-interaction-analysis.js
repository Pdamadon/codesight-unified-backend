/**
 * Deep Interaction Analysis
 * 
 * Examine the full raw structure of a single interaction to see
 * ALL available data including images, colors, and metadata
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function deepInteractionAnalysis() {
  console.log('🔬 Deep Interaction Analysis - Full Data Structure\n');
  
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
    
    // Find a product page CLICK interaction with nearby elements
    const targetInteraction = interactions.find(interaction => {
      return interaction.type === 'CLICK' && 
             interaction.context?.url?.includes('/productpage.') &&
             interaction.element?.nearbyElements?.length > 0;
    });
    
    if (!targetInteraction) {
      console.log('❌ No suitable interaction found');
      return;
    }
    
    console.log('🎯 ANALYZING FULL INTERACTION STRUCTURE:\n');
    console.log('='.repeat(80));
    
    // Show the complete interaction structure
    console.log('📍 BASIC INFO:');
    console.log(`   Type: ${targetInteraction.type}`);
    console.log(`   Timestamp: ${targetInteraction.timestamp}`);
    console.log(`   URL: ${targetInteraction.context?.url}`);
    console.log('');
    
    console.log('🏷️ ELEMENT INFO:');
    console.log(`   Text: "${targetInteraction.element?.text || 'none'}"`);
    console.log(`   Tag: ${targetInteraction.element?.tag || targetInteraction.element?.tagName || 'none'}`);
    console.log(`   ID: ${targetInteraction.element?.id || 'none'}`);
    console.log(`   Class: ${targetInteraction.element?.className || 'none'}`);
    console.log('');
    
    if (targetInteraction.element?.attributes) {
      console.log('🏷️ ELEMENT ATTRIBUTES:');
      Object.entries(targetInteraction.element.attributes).forEach(([key, value]) => {
        console.log(`   ${key}: ${JSON.stringify(value)}`);
      });
      console.log('');
    }
    
    if (targetInteraction.element?.nearbyElements?.length > 0) {
      console.log('🏘️ NEARBY ELEMENTS:');
      targetInteraction.element.nearbyElements.forEach((nearby, i) => {
        console.log(`   ${i + 1}. Tag: ${nearby.tag || 'unknown'}`);
        console.log(`      Text: "${nearby.text || 'none'}"`);
        console.log(`      ID: ${nearby.id || 'none'}`);
        console.log(`      Class: ${nearby.className || 'none'}`);
        
        if (nearby.attributes) {
          console.log(`      Attributes:`);
          Object.entries(nearby.attributes).forEach(([key, value]) => {
            console.log(`         ${key}: ${JSON.stringify(value)}`);
            
            // Look for image URLs
            if (typeof value === 'string' && 
                (value.includes('http') && (value.includes('.jpg') || value.includes('.png') || value.includes('.webp')))) {
              console.log(`         🖼️ FOUND IMAGE URL: ${value}`);
            }
          });
        }
        console.log('');
      });
    }
    
    if (targetInteraction.element?.siblingElements?.length > 0) {
      console.log('👥 SIBLING ELEMENTS:');
      targetInteraction.element.siblingElements.slice(0, 5).forEach((sibling, i) => {
        console.log(`   ${i + 1}. Tag: ${sibling.tag || 'unknown'}`);
        console.log(`      Text: "${sibling.text || 'none'}"`);
        console.log(`      ID: ${sibling.id || 'none'}`);
        console.log(`      Class: ${sibling.className || 'none'}`);
        
        if (sibling.attributes) {
          console.log(`      Attributes:`);
          Object.entries(sibling.attributes).forEach(([key, value]) => {
            console.log(`         ${key}: ${JSON.stringify(value)}`);
            
            // Look for image URLs
            if (typeof value === 'string' && 
                (value.includes('http') && (value.includes('.jpg') || value.includes('.png') || value.includes('.webp')))) {
              console.log(`         🖼️ FOUND IMAGE URL: ${value}`);
            }
          });
        }
        console.log('');
      });
    }
    
    if (targetInteraction.element?.parentElements?.length > 0) {
      console.log('👨‍👩‍👧‍👦 PARENT ELEMENTS:');
      targetInteraction.element.parentElements.slice(0, 3).forEach((parent, i) => {
        console.log(`   ${i + 1}. Tag: ${parent.tag || 'unknown'}`);
        console.log(`      Text: "${parent.text?.substring(0, 50) || 'none'}"`);
        console.log(`      ID: ${parent.id || 'none'}`);
        console.log(`      Class: ${parent.className || 'none'}`);
        console.log('');
      });
    }
    
    // Check other interaction properties
    console.log('🔍 OTHER INTERACTION PROPERTIES:');
    Object.keys(targetInteraction).forEach(key => {
      if (!['type', 'timestamp', 'context', 'element'].includes(key)) {
        console.log(`   ${key}: ${JSON.stringify(targetInteraction[key])}`);
      }
    });
    
    // Check context for additional data
    if (targetInteraction.context) {
      console.log('\n🌐 CONTEXT DETAILS:');
      Object.entries(targetInteraction.context).forEach(([key, value]) => {
        if (key !== 'url') {
          console.log(`   ${key}: ${JSON.stringify(value)}`);
        }
      });
    }
    
    // Save the complete interaction for analysis
    fs.writeFileSync('complete-interaction-structure.json', JSON.stringify(targetInteraction, null, 2));
    console.log('\n📄 Complete interaction saved to complete-interaction-structure.json');
    
    // Extract any color information we found
    console.log('\n🎨 COLOR INFORMATION EXTRACTION:');
    const colorInfo = [];
    
    if (targetInteraction.element?.nearbyElements) {
      targetInteraction.element.nearbyElements.forEach((nearby, i) => {
        if (nearby.text && nearby.text.includes('/')) {
          const parts = nearby.text.split('/');
          if (parts.length === 2) {
            colorInfo.push({
              color: parts[0].trim(),
              design: parts[1].trim(),
              source: 'nearbyElement',
              index: i
            });
          }
        }
      });
    }
    
    if (colorInfo.length > 0) {
      console.log('✅ FOUND COLOR INFORMATION:');
      colorInfo.forEach((color, i) => {
        console.log(`   ${i + 1}. Color: "${color.color}" | Design: "${color.design}"`);
      });
    } else {
      console.log('❌ No color information found in this interaction');
    }
    
  } catch (error) {
    console.error('❌ Analysis error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
deepInteractionAnalysis().catch(console.error);