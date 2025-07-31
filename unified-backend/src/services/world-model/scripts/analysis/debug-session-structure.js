/**
 * Debug UnifiedSession Structure
 * 
 * Examine the actual structure of interactions to understand
 * why Men category is getting Women URL
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugSessionStructure() {
  console.log('🔍 Debugging UnifiedSession Structure for Category URL Issues\n');
  
  try {
    // Get the latest session
    const latestSession = await prisma.unifiedSession.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    
    if (!latestSession) {
      console.log('❌ No sessions found');
      return;
    }
    
    console.log(`📊 Session: ${latestSession.id}`);
    console.log(`🌐 Domain: ${latestSession.domain}`);
    console.log(`📈 Quality: ${latestSession.qualityScore}`);
    console.log(`📝 Enhanced Interactions: ${latestSession.enhancedInteractions?.length || 0}\n`);
    
    // Parse enhanced interactions
    let interactions;
    try {
      if (typeof latestSession.enhancedInteractions === 'string') {
        interactions = JSON.parse(latestSession.enhancedInteractions);
      } else {
        interactions = latestSession.enhancedInteractions;
      }
      
      // Handle object with numeric keys
      if (typeof interactions === 'object' && !Array.isArray(interactions)) {
        const keys = Object.keys(interactions).filter(key => !isNaN(Number(key))).sort((a, b) => parseInt(a) - parseInt(b));
        interactions = keys.map(key => interactions[key]);
      }
    } catch (error) {
      console.log('❌ Failed to parse enhanced interactions:', error.message);
      return;
    }
    
    if (!Array.isArray(interactions)) {
      console.log('❌ Enhanced interactions is not an array');
      return;
    }
    
    console.log(`🔍 Analyzing ${interactions.length} interactions for category URL issues...\n`);
    
    // Look for Men/Women category interactions
    let menInteractions = [];
    let womenInteractions = [];
    
    interactions.forEach((interaction, index) => {
      const text = interaction.element?.text?.trim();
      const url = interaction.context?.url;
      
      if (text === 'Men' || text === 'men') {
        menInteractions.push({ index, text, url, interaction });
      }
      if (text === 'Women' || text === 'women') {
        womenInteractions.push({ index, text, url, interaction });
      }
    });
    
    console.log(`👨 Found ${menInteractions.length} "Men" interactions:`);
    menInteractions.forEach(({ index, text, url }) => {
      console.log(`   ${index}: "${text}" -> ${url?.substring(0, 100)}...`);
    });
    
    console.log(`\n👩 Found ${womenInteractions.length} "Women" interactions:`);
    womenInteractions.forEach(({ index, text, url }) => {
      console.log(`   ${index}: "${text}" -> ${url?.substring(0, 100)}...`);
    });
    
    // Detailed analysis of the first Men interaction
    if (menInteractions.length > 0) {
      console.log(`\n🔬 Detailed Analysis of First "Men" Interaction:`);
      const menInt = menInteractions[0].interaction;
      
      console.log(`📍 Element Text: "${menInt.element?.text}"`);
      console.log(`🌐 Context URL: ${menInt.context?.url?.substring(0, 120)}...`);
      console.log(`🏷️ Element ID: ${menInt.element?.id || 'none'}`);
      console.log(`📋 Element Class: ${menInt.element?.className || 'none'}`);
      
      // Check sibling elements
      if (menInt.element?.siblingElements?.length > 0) {
        console.log(`\n👥 Sibling Elements (${menInt.element.siblingElements.length}):`);
        menInt.element.siblingElements.slice(0, 5).forEach((sibling, i) => {
          console.log(`   ${i + 1}. "${sibling.text || 'no-text'}" (${sibling.tag || 'no-tag'})`);
        });
      }
      
      // Check nearby elements
      if (menInt.element?.nearbyElements?.length > 0) {
        console.log(`\n🏘️ Nearby Elements (${menInt.element.nearbyElements.length}):`);
        menInt.element.nearbyElements.slice(0, 5).forEach((nearby, i) => {
          console.log(`   ${i + 1}. "${nearby.text || 'no-text'}" (${nearby.tag || 'no-tag'})`);
        });
      }
    }
    
    // Detailed analysis of the first Women interaction
    if (womenInteractions.length > 0) {
      console.log(`\n🔬 Detailed Analysis of First "Women" Interaction:`);
      const womenInt = womenInteractions[0].interaction;
      
      console.log(`📍 Element Text: "${womenInt.element?.text}"`);
      console.log(`🌐 Context URL: ${womenInt.context?.url?.substring(0, 120)}...`);
      console.log(`🏷️ Element ID: ${womenInt.element?.id || 'none'}`);
      console.log(`📋 Element Class: ${womenInt.element?.className || 'none'}`);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugSessionStructure().catch(console.error);