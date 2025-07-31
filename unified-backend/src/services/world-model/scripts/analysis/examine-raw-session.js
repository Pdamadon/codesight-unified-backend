/**
 * Examine Raw UnifiedSession Structure
 * 
 * Look at the actual raw data to understand what we have and design
 * a clean parsing approach that puts data in the right places
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function examineRawSession() {
  console.log('🔍 Examining Raw UnifiedSession Structure\n');
  
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
    
    console.log(`🔍 Analyzing ${interactions.length} interactions...\n`);
    
    // Save raw data to file for detailed analysis
    const rawData = {
      sessionId: latestSession.id,
      domain: latestSession.domain,
      qualityScore: latestSession.qualityScore,
      pageType: latestSession.pageType,
      userIntent: latestSession.userIntent,
      shoppingStage: latestSession.shoppingStage,
      behaviorType: latestSession.behaviorType,
      totalInteractions: interactions.length,
      sampleInteractions: interactions.slice(0, 10).map((interaction, index) => ({
        index,
        type: interaction.type,
        timestamp: interaction.timestamp,
        url: interaction.context?.url,
        elementText: interaction.element?.text,
        elementTag: interaction.element?.tag || interaction.element?.tagName,
        elementId: interaction.element?.id,
        elementClass: interaction.element?.className,
        hasNearbyElements: !!interaction.element?.nearbyElements?.length,
        nearbyCount: interaction.element?.nearbyElements?.length || 0,
        hasSiblingElements: !!interaction.element?.siblingElements?.length,
        siblingCount: interaction.element?.siblingElements?.length || 0,
        hasParentElements: !!interaction.element?.parentElements?.length,
        parentCount: interaction.element?.parentElements?.length || 0
      }))
    };
    
    // Write to file for analysis
    fs.writeFileSync('raw-session-analysis.json', JSON.stringify(rawData, null, 2));
    console.log('📄 Raw session data saved to raw-session-analysis.json');
    
    // Analyze interaction patterns
    console.log('\n📊 Interaction Pattern Analysis:');
    
    const typeStats = {};
    const urlStats = new Map();
    const textStats = new Map();
    
    interactions.forEach(interaction => {
      // Type analysis
      typeStats[interaction.type] = (typeStats[interaction.type] || 0) + 1;
      
      // URL analysis
      const url = interaction.context?.url;
      if (url) {
        const domain = url.split('/')[2];
        const path = url.split('/').slice(3).join('/').split('?')[0];
        urlStats.set(path, (urlStats.get(path) || 0) + 1);
      }
      
      // Text analysis
      const text = interaction.element?.text?.trim();
      if (text && text.length > 0 && text.length < 50) {
        textStats.set(text, (textStats.get(text) || 0) + 1);
      }
    });
    
    console.log('\n🏷️ Interaction Types:');
    Object.entries(typeStats).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    
    console.log('\n🌐 Top URL Paths:');
    const topPaths = Array.from(urlStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    topPaths.forEach(([path, count]) => {
      console.log(`   ${count}x: /${path}`);
    });
    
    console.log('\n📝 Top Element Texts:');
    const topTexts = Array.from(textStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    topTexts.forEach(([text, count]) => {
      console.log(`   ${count}x: "${text}"`);
    });
    
    // Analyze specific problematic interactions
    console.log('\n🔍 Analyzing Category Navigation Patterns:');
    
    const categoryTexts = ['Men', 'Women', 'Girls', 'Boys', 'Baby'];
    categoryTexts.forEach(categoryText => {
      const categoryInteractions = interactions.filter(i => 
        i.element?.text?.trim() === categoryText && i.type === 'CLICK'
      );
      
      if (categoryInteractions.length > 0) {
        console.log(`\n👤 "${categoryText}" interactions (${categoryInteractions.length}):`);
        categoryInteractions.forEach((interaction, index) => {
          console.log(`   ${index + 1}. URL: ${interaction.context?.url?.substring(0, 100)}...`);
          console.log(`      Element: ${interaction.element?.tag} (id: ${interaction.element?.id || 'none'})`);
          console.log(`      Class: ${interaction.element?.className || 'none'}`);
          
          // Check what contamination data exists
          if (interaction.element?.nearbyElements?.length > 0) {
            console.log(`      🏘️ NearbyElements: ${interaction.element.nearbyElements.length}`);
            interaction.element.nearbyElements.slice(0, 3).forEach((nearby, i) => {
              console.log(`         ${i + 1}. "${nearby.text || 'no-text'}" (${nearby.tag || 'no-tag'})`);
            });
          }
          
          if (interaction.element?.siblingElements?.length > 0) {
            console.log(`      👥 SiblingElements: ${interaction.element.siblingElements.length}`);
            interaction.element.siblingElements.slice(0, 3).forEach((sibling, i) => {
              console.log(`         ${i + 1}. "${sibling.text || 'no-text'}" (${sibling.tag || 'no-tag'})`);
            });
          }
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Analysis error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
examineRawSession().catch(console.error);