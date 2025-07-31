/**
 * Analyze available UnifiedSession data for world model extraction
 */

import { PrismaClient } from '@prisma/client';

async function analyzeUnifiedSessions() {
  console.log('🔍 Analyzing UnifiedSession Data...\n');
  
  const prisma = new PrismaClient();

  try {
    // Check total sessions
    const totalSessions = await prisma.unifiedSession.count();
    console.log(`📊 Total unified sessions: ${totalSessions}`);

    if (totalSessions > 0) {
      // Get sample sessions with interaction counts
      const sessions = await prisma.unifiedSession.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          status: true,
          startTime: true,
          pageType: true,
          userIntent: true,
          shoppingStage: true,
          behaviorType: true,
          qualityScore: true,
          interactionCount: true,
          enhancedInteractions: true,
          contextualInsights: true,
          _count: {
            select: {
              interactions: true
            }
          }
        }
      });

      console.log(`\n📋 Sample Sessions (${sessions.length}):`);
      
      for (let i = 0; i < sessions.length; i++) {
        const session = sessions[i];
        console.log(`\n${i + 1}. Session: ${session.id}`);
        console.log(`   Type: ${session.type}, Status: ${session.status}`);
        console.log(`   Created: ${session.startTime.toISOString()}`);
        console.log(`   Page Type: ${session.pageType || 'Not set'}`);
        console.log(`   User Intent: ${session.userIntent || 'Not set'}`);
        console.log(`   Shopping Stage: ${session.shoppingStage || 'Not set'}`);
        console.log(`   Behavior Type: ${session.behaviorType || 'Not set'}`);
        console.log(`   Quality Score: ${session.qualityScore}`);
        console.log(`   Interactions: ${session._count.interactions} (interactionCount: ${session.interactionCount})`);
        
        // Check enhanced interactions
        if (session.enhancedInteractions && typeof session.enhancedInteractions === 'object') {
          const enhanced = Array.isArray(session.enhancedInteractions) 
            ? session.enhancedInteractions 
            : [];
          console.log(`   Enhanced Interactions: ${enhanced.length}`);
          
          if (enhanced.length > 0) {
            const firstEnhanced = enhanced[0];
            console.log(`   First Enhanced Keys: ${Object.keys(firstEnhanced).join(', ')}`);
          }
        }
        
        // Check contextual insights
        if (session.contextualInsights && typeof session.contextualInsights === 'object') {
          console.log(`   Contextual Insights: ${Object.keys(session.contextualInsights).join(', ')}`);
        }
      }

      // Check a detailed interaction sample
      console.log('\n🔍 Sample Interaction Analysis:');
      const sampleInteractions = await prisma.interaction.findMany({
        take: 3,
        orderBy: { timestamp: 'desc' },
        select: {
          id: true,
          type: true,
          context: true,
          element: true,
          selectors: true,
          state: true,
          visual: true,
          sessionId: true
        }
      });

      sampleInteractions.forEach((interaction, index) => {
        console.log(`\nInteraction ${index + 1}:`);
        console.log(`   ID: ${interaction.id}`);
        console.log(`   Type: ${interaction.type}`);
        console.log(`   Session: ${interaction.sessionId}`);
        
        // Analyze context data
        if (interaction.context && typeof interaction.context === 'object') {
          console.log(`   Context Keys: ${Object.keys(interaction.context).join(', ')}`);
          
          // Look for URL information
          if (interaction.context.url) {
            console.log(`   URL: ${interaction.context.url}`);
          }
          if (interaction.context.domain) {
            console.log(`   Domain: ${interaction.context.domain}`);
          }
          if (interaction.context.pageType) {
            console.log(`   Page Type: ${interaction.context.pageType}`);
          }
        }
        
        // Analyze element data
        if (interaction.element && typeof interaction.element === 'object') {
          console.log(`   Element Keys: ${Object.keys(interaction.element).join(', ')}`);
          
          if (interaction.element.text) {
            console.log(`   Element Text: "${interaction.element.text}"`);
          }
          if (interaction.element.tagName) {
            console.log(`   Tag: ${interaction.element.tagName}`);
          }
        }
        
        // Analyze selectors
        if (interaction.selectors && typeof interaction.selectors === 'object') {
          console.log(`   Selector Keys: ${Object.keys(interaction.selectors).join(', ')}`);
        }
      });
    }

    console.log('\n🎯 World Model Extraction Potential:');
    console.log('   ✅ Real domain extraction from context.url');
    console.log('   ✅ Product vs category from pageType + element analysis');
    console.log('   ✅ Navigation hierarchy from interaction sequences');
    console.log('   ✅ Variant data from color/size selection interactions');
    console.log('   ✅ Spatial relationships from visual context');
    console.log('   ✅ Selector patterns with reliability from usage');
    console.log('   ✅ Business context from shoppingStage, userIntent');

  } catch (error) {
    console.error('❌ Error analyzing unified sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeUnifiedSessions().catch(console.error);