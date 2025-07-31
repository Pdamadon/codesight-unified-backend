/**
 * Analyze Sibling Elements Data
 * 
 * Examine all sibling elements data in the H&M session to understand
 * what contextual information is captured around color selections
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function analyzeSiblingElements() {
  console.log('🔍 Analyzing Sibling Elements Data in H&M Session\n');
  
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
    
    console.log(`📊 Analyzing session: ${productSession.id}\n`);
    
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
    
    console.log(`🔍 Analyzing ${interactions.length} interactions for sibling data...\n`);
    
    let interactionsWithSiblings = 0;
    let totalSiblings = 0;
    const siblingAnalysis = {
      uniqueSiblingTypes: new Set(),
      siblingPatterns: [],
      interactiveSiblings: [],
      textSiblings: [],
      imageRelatedSiblings: []
    };
    
    // Analyze each interaction for sibling elements
    interactions.forEach((interaction, index) => {
      if (interaction.element?.siblingElements?.length > 0) {
        interactionsWithSiblings++;
        const siblings = interaction.element.siblingElements;
        totalSiblings += siblings.length;
        
        console.log(`🔍 INTERACTION ${index + 1}: ${interaction.type}`);
        console.log(`   URL: ${interaction.context?.url?.substring(0, 80)}...`);
        console.log(`   Element: ${interaction.element?.tag} "${interaction.element?.text || 'no text'}"`);
        console.log(`   Siblings (${siblings.length}):`);
        
        siblings.forEach((sibling, i) => {
          console.log(`      ${i + 1}. ${sibling.tag || 'unknown'}`);
          console.log(`         Text: "${sibling.text || 'none'}"`);
          console.log(`         Position: ${sibling.position || 'unknown'}`);
          console.log(`         Distance: ${sibling.distance || 'unknown'}`);
          console.log(`         Selector: ${sibling.selector || 'none'}`);
          console.log(`         Interactive: ${sibling.isInteractive || false}`);
          
          // Track unique types
          siblingAnalysis.uniqueSiblingTypes.add(sibling.tag || 'unknown');
          
          // Categorize siblings
          if (sibling.isInteractive) {
            siblingAnalysis.interactiveSiblings.push({
              tag: sibling.tag,
              text: sibling.text,
              selector: sibling.selector,
              interactionIndex: index
            });
          }
          
          if (sibling.text && sibling.text.trim()) {
            siblingAnalysis.textSiblings.push({
              tag: sibling.tag,
              text: sibling.text.trim(),
              interactionIndex: index
            });
          }
          
          // Check for image-related siblings
          if (sibling.tag === 'img' || 
              (sibling.selector && sibling.selector.includes('image')) ||
              (sibling.attributes && Object.keys(sibling.attributes).some(k => k.includes('src')))) {
            siblingAnalysis.imageRelatedSiblings.push({
              tag: sibling.tag,
              selector: sibling.selector,
              attributes: sibling.attributes,
              interactionIndex: index
            });
          }
          
          // Check if sibling has attributes
          if (sibling.attributes) {
            console.log(`         Attributes:`);
            Object.entries(sibling.attributes).forEach(([key, value]) => {
              console.log(`            ${key}: ${value}`);
            });
          }
          
          // Check bounding box if available
          if (sibling.boundingBox) {
            console.log(`         BoundingBox: ${sibling.boundingBox.width}x${sibling.boundingBox.height} at (${sibling.boundingBox.x}, ${sibling.boundingBox.y})`);
          }
          
          console.log('');
        });
        
        console.log('   ' + '='.repeat(60) + '\n');
      }
    });
    
    // Summary analysis
    console.log(`📊 SIBLING ELEMENTS SUMMARY:`);
    console.log(`   Interactions with siblings: ${interactionsWithSiblings}`);
    console.log(`   Total sibling elements: ${totalSiblings}`);
    console.log(`   Unique sibling tags: ${Array.from(siblingAnalysis.uniqueSiblingTypes).join(', ')}`);
    console.log(`   Interactive siblings: ${siblingAnalysis.interactiveSiblings.length}`);
    console.log(`   Text-containing siblings: ${siblingAnalysis.textSiblings.length}`);
    console.log(`   Image-related siblings: ${siblingAnalysis.imageRelatedSiblings.length}`);
    
    // Show text siblings in detail
    if (siblingAnalysis.textSiblings.length > 0) {
      console.log(`\n📝 TEXT SIBLINGS:`);
      siblingAnalysis.textSiblings.forEach((sibling, i) => {
        console.log(`   ${i + 1}. ${sibling.tag}: "${sibling.text}" (interaction ${sibling.interactionIndex + 1})`);
      });
    }
    
    // Show interactive siblings
    if (siblingAnalysis.interactiveSiblings.length > 0) {
      console.log(`\n🖱️ INTERACTIVE SIBLINGS:`);
      siblingAnalysis.interactiveSiblings.forEach((sibling, i) => {
        console.log(`   ${i + 1}. ${sibling.tag}: "${sibling.text || 'no text'}" (interaction ${sibling.interactionIndex + 1})`);
        console.log(`      Selector: ${sibling.selector || 'none'}`);
      });
    }
    
    // Show image-related siblings
    if (siblingAnalysis.imageRelatedSiblings.length > 0) {
      console.log(`\n🖼️ IMAGE-RELATED SIBLINGS:`);
      siblingAnalysis.imageRelatedSiblings.forEach((sibling, i) => {
        console.log(`   ${i + 1}. ${sibling.tag} (interaction ${sibling.interactionIndex + 1})`);
        console.log(`      Selector: ${sibling.selector || 'none'}`);
        if (sibling.attributes) {
          console.log(`      Attributes: ${Object.keys(sibling.attributes).join(', ')}`);
        }
      });
    }
    
    // Save detailed analysis
    const analysisData = {
      sessionId: productSession.id,
      summary: {
        totalInteractions: interactions.length,
        interactionsWithSiblings,
        totalSiblings,
        uniqueSiblingTypes: Array.from(siblingAnalysis.uniqueSiblingTypes),
        interactiveSiblingsCount: siblingAnalysis.interactiveSiblings.length,
        textSiblingsCount: siblingAnalysis.textSiblings.length,
        imageRelatedSiblingsCount: siblingAnalysis.imageRelatedSiblings.length
      },
      details: {
        interactiveSiblings: siblingAnalysis.interactiveSiblings,
        textSiblings: siblingAnalysis.textSiblings,
        imageRelatedSiblings: siblingAnalysis.imageRelatedSiblings
      }
    };
    
    fs.writeFileSync('sibling-elements-analysis.json', JSON.stringify(analysisData, null, 2));
    console.log('\n📄 Detailed sibling analysis saved to sibling-elements-analysis.json');
    
  } catch (error) {
    console.error('❌ Analysis error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzeSiblingElements().catch(console.error);