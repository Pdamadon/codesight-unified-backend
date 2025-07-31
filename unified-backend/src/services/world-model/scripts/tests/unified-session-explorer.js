/**
 * UnifiedSession Data Explorer - Test Parser Phase 1
 * 
 * Explores the structure and content of UnifiedSession data
 * to understand what information is available for world model extraction
 */

import { PrismaClient } from '@prisma/client';

class UnifiedSessionExplorer {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async explore() {
    console.log('🔍 UnifiedSession Data Explorer\n');
    console.log('===============================');
    
    try {
      await this.exploreSessionOverview();
      await this.exploreSessionFields();
      await this.exploreInteractionStructure();
      await this.exploreJSONFieldContent();
      await this.analyzeDataQuality();
      
    } catch (error) {
      console.error('❌ Exploration error:', error);
    } finally {
      await this.prisma.$disconnect();
    }
  }

  /**
   * Get overview of available session data
   */
  async exploreSessionOverview() {
    console.log('\n📊 SESSION OVERVIEW');
    console.log('==================');
    
    const totalSessions = await this.prisma.unifiedSession.count();
    const sessionsWithInteractions = await this.prisma.unifiedSession.count({
      where: {
        interactions: {
          some: {}
        }
      }
    });
    
    console.log(`Total UnifiedSessions: ${totalSessions}`);
    console.log(`Sessions with Interactions: ${sessionsWithInteractions}`);
    
    // Status distribution
    const statusCounts = await this.prisma.unifiedSession.groupBy({
      by: ['status'],
      _count: { status: true }
    });
    
    console.log('\nStatus Distribution:');
    statusCounts.forEach(status => {
      console.log(`  ${status.status}: ${status._count.status}`);
    });
    
    // Interaction count stats
    const interactionStats = await this.prisma.unifiedSession.aggregate({
      _avg: { interactionCount: true },
      _max: { interactionCount: true },
      _min: { interactionCount: true }
    });
    
    console.log('\nInteraction Count Stats:');
    console.log(`  Average: ${interactionStats._avg.interactionCount?.toFixed(1) || 0}`);
    console.log(`  Max: ${interactionStats._max.interactionCount || 0}`);
    console.log(`  Min: ${interactionStats._min.interactionCount || 0}`);
  }

  /**
   * Explore session-level fields
   */
  async exploreSessionFields() {
    console.log('\n📋 SESSION FIELDS ANALYSIS');
    console.log('==========================');
    
    const sessions = await this.prisma.unifiedSession.findMany({
      take: 3,
      orderBy: { interactionCount: 'desc' },
      select: {
        id: true,
        type: true,
        status: true,
        pageType: true,
        userIntent: true,
        shoppingStage: true,
        behaviorType: true,
        qualityScore: true,
        interactionCount: true,
        enhancedInteractions: true,
        contextualInsights: true,
        config: true
      }
    });
    
    sessions.forEach((session, index) => {
      console.log(`\n📝 Session ${index + 1}: ${session.id.substring(0, 8)}...`);
      console.log(`   Type: ${session.type}`);
      console.log(`   Status: ${session.status}`);
      console.log(`   Page Type: ${session.pageType || 'null'}`);
      console.log(`   User Intent: ${session.userIntent || 'null'}`);
      console.log(`   Shopping Stage: ${session.shoppingStage || 'null'}`);
      console.log(`   Behavior Type: ${session.behaviorType || 'null'}`);
      console.log(`   Quality Score: ${session.qualityScore}`);
      console.log(`   Interaction Count: ${session.interactionCount}`);
      
      // Analyze JSON fields
      console.log('\n   📦 JSON Fields:');
      
      // Enhanced Interactions
      if (session.enhancedInteractions) {
        const enhanced = this.safeParseJSON(session.enhancedInteractions);
        if (Array.isArray(enhanced)) {
          console.log(`   ✅ enhancedInteractions: Array with ${enhanced.length} items`);
          if (enhanced.length > 0) {
            console.log(`      First item keys: ${Object.keys(enhanced[0]).join(', ')}`);
          }
        } else {
          console.log(`   ❓ enhancedInteractions: ${typeof enhanced}`);
        }
      } else {
        console.log(`   ❌ enhancedInteractions: null`);
      }
      
      // Contextual Insights
      if (session.contextualInsights) {
        const insights = this.safeParseJSON(session.contextualInsights);
        if (insights && typeof insights === 'object') {
          console.log(`   ✅ contextualInsights: Object with keys: ${Object.keys(insights).join(', ')}`);
        } else {
          console.log(`   ❓ contextualInsights: ${typeof insights}`);
        }
      } else {
        console.log(`   ❌ contextualInsights: null`);
      }
      
      // Config
      if (session.config) {
        const config = this.safeParseJSON(session.config);
        if (config && typeof config === 'object') {
          console.log(`   ✅ config: Object with keys: ${Object.keys(config).join(', ')}`);
        } else {
          console.log(`   ❓ config: ${typeof config}`);
        }
      } else {
        console.log(`   ❌ config: null`);
      }
    });
  }

  /**
   * Explore interaction structure
   */
  async exploreInteractionStructure() {
    console.log('\n🔗 INTERACTION STRUCTURE ANALYSIS');
    console.log('==================================');
    
    const interactions = await this.prisma.interaction.findMany({
      take: 5,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        type: true,
        timestamp: true,
        confidence: true,
        context: true,
        element: true,
        selectors: true,
        state: true,
        visual: true,
        sessionId: true
      }
    });
    
    interactions.forEach((interaction, index) => {
      console.log(`\n🎯 Interaction ${index + 1}: ${interaction.id.substring(0, 8)}...`);
      console.log(`   Type: ${interaction.type}`);
      console.log(`   Confidence: ${interaction.confidence}`);
      console.log(`   Session: ${interaction.sessionId.substring(0, 8)}...`);
      
      // Analyze each JSON field
      console.log('\n   📦 JSON Field Analysis:');
      
      const fields = ['context', 'element', 'selectors', 'state', 'visual'];
      fields.forEach(field => {
        const data = interaction[field];
        if (data) {
          const parsed = this.safeParseJSON(data);
          if (parsed && typeof parsed === 'object') {
            const keys = Object.keys(parsed);
            console.log(`   ✅ ${field}: ${keys.length} keys - ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`);
          } else {
            console.log(`   ❓ ${field}: ${typeof parsed}`);
          }
        } else {
          console.log(`   ❌ ${field}: null`);
        }
      });
    });
  }

  /**
   * Deep dive into JSON field content
   */
  async exploreJSONFieldContent() {
    console.log('\n🔍 JSON FIELD CONTENT DEEP DIVE');
    console.log('===============================');
    
    // Get one interaction with rich data
    const richInteraction = await this.prisma.interaction.findFirst({
      where: {
        AND: [
          { context: { not: null } },
          { element: { not: null } },
          { selectors: { not: null } }
        ]
      },
      select: {
        context: true,
        element: true,
        selectors: true,
        state: true,
        visual: true
      }
    });
    
    if (richInteraction) {
      console.log('\n📝 Sample Rich Interaction Data:');
      
      // Context analysis
      const context = this.safeParseJSON(richInteraction.context);
      if (context) {
        console.log('\n🌐 CONTEXT:');
        console.log(JSON.stringify(context, null, 2));
      }
      
      // Element analysis
      const element = this.safeParseJSON(richInteraction.element);
      if (element) {
        console.log('\n🎯 ELEMENT:');
        console.log(JSON.stringify(element, null, 2));
      }
      
      // Selectors analysis
      const selectors = this.safeParseJSON(richInteraction.selectors);
      if (selectors) {
        console.log('\n🔍 SELECTORS:');
        console.log(JSON.stringify(selectors, null, 2));
      }
      
      // State analysis (if exists)
      if (richInteraction.state) {
        const state = this.safeParseJSON(richInteraction.state);
        if (state) {
          console.log('\n📊 STATE:');
          console.log(JSON.stringify(state, null, 2));
        }
      }
      
      // Visual analysis (if exists)
      if (richInteraction.visual) {
        const visual = this.safeParseJSON(richInteraction.visual);
        if (visual) {
          console.log('\n👁️ VISUAL:');
          console.log(JSON.stringify(visual, null, 2));
        }
      }
    }
  }

  /**
   * Analyze data quality and completeness
   */
  async analyzeDataQuality() {
    console.log('\n📊 DATA QUALITY ANALYSIS');
    console.log('========================');
    
    // Count interactions with each field populated
    const fieldCounts = await Promise.all([
      this.prisma.interaction.count({ where: { context: { not: null } } }),
      this.prisma.interaction.count({ where: { element: { not: null } } }),
      this.prisma.interaction.count({ where: { selectors: { not: null } } }),
      this.prisma.interaction.count({ where: { state: { not: null } } }),
      this.prisma.interaction.count({ where: { visual: { not: null } } })
    ]);
    
    const totalInteractions = await this.prisma.interaction.count();
    
    console.log(`\nField Completeness (out of ${totalInteractions} interactions):`);
    const fields = ['context', 'element', 'selectors', 'state', 'visual'];
    fields.forEach((field, index) => {
      const count = fieldCounts[index];
      const percentage = ((count / totalInteractions) * 100).toFixed(1);
      console.log(`  ${field}: ${count}/${totalInteractions} (${percentage}%)`);
    });
    
    // Check for parsing errors
    console.log('\n🔧 JSON Parsing Test:');
    const sampleInteractions = await this.prisma.interaction.findMany({
      take: 10,
      select: { context: true, element: true, selectors: true }
    });
    
    let parseErrors = 0;
    let totalFields = 0;
    
    sampleInteractions.forEach(interaction => {
      ['context', 'element', 'selectors'].forEach(field => {
        if (interaction[field]) {
          totalFields++;
          const parsed = this.safeParseJSON(interaction[field]);
          if (parsed === null) parseErrors++;
        }
      });
    });
    
    console.log(`  Parse Success Rate: ${((totalFields - parseErrors) / totalFields * 100).toFixed(1)}%`);
    console.log(`  Parse Errors: ${parseErrors}/${totalFields}`);
  }

  /**
   * Safely parse JSON with error handling
   */
  safeParseJSON(jsonString) {
    if (!jsonString) return null;
    
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return null;
    }
  }
}

// Run the explorer
const explorer = new UnifiedSessionExplorer();
explorer.explore().catch(console.error);