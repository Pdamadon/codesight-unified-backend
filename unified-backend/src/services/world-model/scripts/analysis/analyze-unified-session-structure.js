/**
 * Analyze UnifiedSession Data Structure
 * 
 * Examines the actual structure of UnifiedSession data to understand:
 * - What interaction types are captured
 * - What DOM context is available
 * - How user navigation is tracked
 * - What behavioral context exists
 */

import * as dotenv from 'dotenv';
import { PrismaClient, Prisma } from '@prisma/client';

dotenv.config();

class UnifiedSessionAnalyzer {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async analyze() {
    console.log('🔍 Analyzing UnifiedSession Data Structure\n');
    console.log('='.repeat(60));
    
    try {
      await this.examineSessionOverview();
      await this.examineEnhancedInteractions();
      await this.analyzeInteractionTypes();
      await this.analyzeDOMContext();
      await this.analyzeNavigationPatterns();
      await this.identifyBehavioralContext();
      
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
    } finally {
      await this.prisma.$disconnect();
    }
  }
  
  async examineSessionOverview() {
    console.log('📊 SESSION OVERVIEW ANALYSIS');
    console.log('='.repeat(30));
    
    const sessions = await this.prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: Prisma.JsonNull },
        interactionCount: { gt: 5 }
      },
      select: {
        id: true,
        pageType: true,
        userIntent: true,
        shoppingStage: true,
        behaviorType: true,
        qualityScore: true,
        interactionCount: true,
        enhancedInteractions: true
      },
      take: 5,
      orderBy: { qualityScore: 'desc' }
    });
    
    console.log(`\n✅ Found ${sessions.length} high-quality sessions to analyze\n`);
    
    sessions.forEach((session, index) => {
      console.log(`📝 Session ${index + 1}: ${session.id.substring(0, 8)}...`);
      console.log(`   Page Type: ${session.pageType || 'unknown'}`);
      console.log(`   User Intent: ${session.userIntent || 'unknown'}`);
      console.log(`   Shopping Stage: ${session.shoppingStage || 'unknown'}`);
      console.log(`   Behavior Type: ${session.behaviorType || 'unknown'}`);
      console.log(`   Quality Score: ${session.qualityScore}`);
      console.log(`   Interactions: ${session.interactionCount}`);
      
      // Parse enhancedInteractions to get count
      const interactions = this.parseInteractions(session.enhancedInteractions);
      console.log(`   Enhanced Interactions: ${interactions ? interactions.length : 0}`);
      console.log('');
    });
    
    return sessions;
  }
  
  async examineEnhancedInteractions() {
    console.log('🔬 ENHANCED INTERACTIONS STRUCTURE');
    console.log('='.repeat(35));
    
    const session = await this.prisma.unifiedSession.findFirst({
      where: {
        enhancedInteractions: { not: Prisma.JsonNull },
        interactionCount: { gt: 10 }
      },
      select: {
        id: true,
        pageType: true,
        enhancedInteractions: true
      },
      orderBy: { qualityScore: 'desc' }
    });
    
    if (!session) {
      console.log('❌ No suitable session found');
      return;
    }
    
    const interactions = this.parseInteractions(session.enhancedInteractions);
    if (!interactions || interactions.length === 0) {
      console.log('❌ No interactions found');
      return;
    }
    
    console.log(`\n📝 Analyzing session: ${session.id.substring(0, 8)}...`);
    console.log(`📊 Found ${interactions.length} interactions\n`);
    
    // Examine first few interactions in detail
    interactions.slice(0, 3).forEach((interaction, index) => {
      console.log(`🎯 Interaction ${index + 1}:`);
      console.log(`   ID: ${interaction.id || 'none'}`);
      console.log(`   Type: ${interaction.type || 'unknown'}`);
      
      // Context information
      if (interaction.context) {
        console.log(`   Context:`);
        console.log(`     URL: ${interaction.context.url || 'none'}`);
        console.log(`     Page Type: ${interaction.context.pageType || 'none'}`);
        console.log(`     Viewport: ${interaction.context.viewport || 'none'}`);
        console.log(`     Timestamp: ${interaction.context.timestamp || 'none'}`);
        
        // Show other context keys
        const otherKeys = Object.keys(interaction.context).filter(
          key => !['url', 'pageType', 'viewport', 'timestamp'].includes(key)
        );
        if (otherKeys.length > 0) {
          console.log(`     Other Context: ${otherKeys.join(', ')}`);
        }
      }
      
      // Element information
      if (interaction.element) {
        console.log(`   Element:`);
        console.log(`     Text: "${interaction.element.text || 'none'}"`);
        console.log(`     Tag: ${interaction.element.tagName || 'none'}`);
        console.log(`     ID: ${interaction.element.id || 'none'}`);
        console.log(`     Class: ${interaction.element.className || 'none'}`);
        
        // Show other element properties
        const otherKeys = Object.keys(interaction.element).filter(
          key => !['text', 'tagName', 'id', 'className'].includes(key)
        );
        if (otherKeys.length > 0) {
          console.log(`     Other Properties: ${otherKeys.join(', ')}`);
        }
      }
      
      // Other interaction properties
      const otherKeys = Object.keys(interaction).filter(
        key => !['id', 'type', 'context', 'element'].includes(key)
      );
      if (otherKeys.length > 0) {
        console.log(`   Other Data: ${otherKeys.join(', ')}`);
      }
      
      console.log('');
    });
    
    return interactions;
  }
  
  async analyzeInteractionTypes() {
    console.log('🏷️ INTERACTION TYPES ANALYSIS');
    console.log('='.repeat(30));
    
    const sessions = await this.prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: Prisma.JsonNull }
      },
      select: {
        enhancedInteractions: true
      },
      take: 10
    });
    
    const allTypes = new Map();
    const typeExamples = new Map();
    
    sessions.forEach(session => {
      const interactions = this.parseInteractions(session.enhancedInteractions);
      if (interactions) {
        interactions.forEach(interaction => {
          const type = interaction.type || 'unknown';
          
          // Count occurrences
          allTypes.set(type, (allTypes.get(type) || 0) + 1);
          
          // Store examples
          if (!typeExamples.has(type) && interaction.element?.text) {
            typeExamples.set(type, {
              text: interaction.element.text,
              url: interaction.context?.url,
              tagName: interaction.element?.tagName
            });
          }
        });
      }
    });
    
    console.log('\n📊 Interaction Type Distribution:');
    const sortedTypes = Array.from(allTypes.entries()).sort((a, b) => b[1] - a[1]);
    
    sortedTypes.forEach(([type, count]) => {
      const example = typeExamples.get(type);
      console.log(`\n   ${type}: ${count} occurrences`);
      if (example) {
        console.log(`     Example: "${example.text.substring(0, 50)}${example.text.length > 50 ? '...' : ''}"`);
        console.log(`     Tag: ${example.tagName || 'unknown'}`);
        console.log(`     URL: ${example.url ? example.url.substring(0, 60) + '...' : 'none'}`);
      }
    });
    
    return { allTypes, typeExamples };
  }
  
  async analyzeDOMContext() {
    console.log('\n🏗️ DOM CONTEXT ANALYSIS');
    console.log('='.repeat(25));
    
    const sessions = await this.prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: Prisma.JsonNull }
      },
      select: {
        enhancedInteractions: true
      },
      take: 5
    });
    
    const tagStats = new Map();
    const classPatterns = new Map();
    const textPatterns = [];
    
    sessions.forEach(session => {
      const interactions = this.parseInteractions(session.enhancedInteractions);
      if (interactions) {
        interactions.forEach(interaction => {
          if (interaction.element) {
            // Tag name analysis
            const tag = interaction.element.tagName || 'unknown';
            tagStats.set(tag, (tagStats.get(tag) || 0) + 1);
            
            // Class pattern analysis
            if (interaction.element.className) {
              const classes = interaction.element.className.split(' ').filter(Boolean);
              classes.forEach(className => {
                classPatterns.set(className, (classPatterns.get(className) || 0) + 1);
              });
            }
            
            // Text pattern analysis
            if (interaction.element.text && interaction.element.text.length < 100) {
              textPatterns.push({
                text: interaction.element.text,
                tag: tag,
                url: interaction.context?.url
              });
            }
          }
        });
      }
    });
    
    console.log('\n📊 HTML Tag Distribution:');
    const sortedTags = Array.from(tagStats.entries()).sort((a, b) => b[1] - a[1]);
    sortedTags.slice(0, 10).forEach(([tag, count]) => {
      console.log(`   ${tag}: ${count} interactions`);
    });
    
    console.log('\n📊 Common CSS Classes:');
    const sortedClasses = Array.from(classPatterns.entries()).sort((a, b) => b[1] - a[1]);
    sortedClasses.slice(0, 10).forEach(([className, count]) => {
      console.log(`   .${className}: ${count} occurrences`);
    });
    
    console.log('\n📊 Text Patterns by Tag:');
    const textByTag = {};
    textPatterns.forEach(pattern => {
      if (!textByTag[pattern.tag]) textByTag[pattern.tag] = [];
      textByTag[pattern.tag].push(pattern.text);
    });
    
    Object.entries(textByTag).slice(0, 5).forEach(([tag, texts]) => {
      console.log(`\n   <${tag}> elements:${texts.length > 3 ? ` (showing 3 of ${texts.length})` : ''}`);
      texts.slice(0, 3).forEach(text => {
        console.log(`     "${text}"`);
      });
    });
    
    return { tagStats, classPatterns, textPatterns };
  }
  
  async analyzeNavigationPatterns() {
    console.log('\n🗺️ NAVIGATION PATTERNS ANALYSIS');
    console.log('='.repeat(32));
    
    const sessions = await this.prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: Prisma.JsonNull },
        interactionCount: { gt: 5 }
      },
      select: {
        id: true,
        pageType: true,
        shoppingStage: true,
        enhancedInteractions: true
      },
      take: 3,
      orderBy: { qualityScore: 'desc' }
    });
    
    sessions.forEach((session, sessionIndex) => {
      console.log(`\n🧭 Session ${sessionIndex + 1} Navigation Flow:`);
      console.log(`   Page Type: ${session.pageType}`);
      console.log(`   Shopping Stage: ${session.shoppingStage}`);
      
      const interactions = this.parseInteractions(session.enhancedInteractions);
      if (interactions) {
        // Track URL changes to understand navigation
        let currentURL = '';
        let navigationSteps = [];
        
        interactions.forEach((interaction, index) => {
          if (interaction.context?.url && interaction.context.url !== currentURL) {
            currentURL = interaction.context.url;
            navigationSteps.push({
              step: navigationSteps.length + 1,
              url: currentURL,
              trigger: interaction.element?.text || 'unknown',
              interactionType: interaction.type || 'unknown',
              interactionIndex: index
            });
          }
        });
        
        console.log(`   Navigation Steps: ${navigationSteps.length}`);
        navigationSteps.slice(0, 5).forEach(step => {
          console.log(`     ${step.step}. ${step.trigger ? `Clicked "${step.trigger}"` : 'Navigation'}`);
          console.log(`        → ${step.url.substring(0, 80)}${step.url.length > 80 ? '...' : ''}`);
          console.log(`        (${step.interactionType} at interaction ${step.interactionIndex})`);
        });
        
        if (navigationSteps.length > 5) {
          console.log(`     ... and ${navigationSteps.length - 5} more steps`);
        }
      }
    });
  }
  
  async identifyBehavioralContext() {
    console.log('\n🧠 BEHAVIORAL CONTEXT ANALYSIS');
    console.log('='.repeat(30));
    
    const sessions = await this.prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: Prisma.JsonNull }
      },
      select: {
        pageType: true,
        userIntent: true,
        shoppingStage: true,
        behaviorType: true,
        qualityScore: true,
        enhancedInteractions: true
      },
      take: 10
    });
    
    // Analyze behavioral patterns
    const behaviorStats = {
      pageTypes: new Map(),
      userIntents: new Map(),
      shoppingStages: new Map(),
      behaviorTypes: new Map()
    };
    
    sessions.forEach(session => {
      // Count behavioral attributes
      if (session.pageType) {
        behaviorStats.pageTypes.set(session.pageType, (behaviorStats.pageTypes.get(session.pageType) || 0) + 1);
      }
      if (session.userIntent) {
        behaviorStats.userIntents.set(session.userIntent, (behaviorStats.userIntents.get(session.userIntent) || 0) + 1);
      }
      if (session.shoppingStage) {
        behaviorStats.shoppingStages.set(session.shoppingStage, (behaviorStats.shoppingStages.get(session.shoppingStage) || 0) + 1);
      }
      if (session.behaviorType) {
        behaviorStats.behaviorTypes.set(session.behaviorType, (behaviorStats.behaviorTypes.get(session.behaviorType) || 0) + 1);
      }
    });
    
    console.log('\n📊 Behavioral Context Distribution:');
    
    console.log('\n   Page Types:');
    Array.from(behaviorStats.pageTypes.entries()).forEach(([type, count]) => {
      console.log(`     ${type}: ${count} sessions`);
    });
    
    console.log('\n   User Intents:');
    Array.from(behaviorStats.userIntents.entries()).forEach(([intent, count]) => {
      console.log(`     ${intent}: ${count} sessions`);
    });
    
    console.log('\n   Shopping Stages:');
    Array.from(behaviorStats.shoppingStages.entries()).forEach(([stage, count]) => {
      console.log(`     ${stage}: ${count} sessions`);
    });
    
    console.log('\n   Behavior Types:');
    Array.from(behaviorStats.behaviorTypes.entries()).forEach(([type, count]) => {
      console.log(`     ${type}: ${count} sessions`);
    });
    
    return behaviorStats;
  }
  
  parseInteractions(enhancedInteractions) {
    if (!enhancedInteractions) return null;
    
    try {
      let parsed;
      
      if (typeof enhancedInteractions === 'string') {
        parsed = JSON.parse(enhancedInteractions);
      } else {
        parsed = enhancedInteractions;
      }
      
      // Handle array-like objects with numeric keys
      if (typeof parsed === 'object' && !Array.isArray(parsed)) {
        const keys = Object.keys(parsed);
        const numericKeys = keys.filter(key => !isNaN(Number(key))).sort((a, b) => parseInt(a) - parseInt(b));
        
        if (numericKeys.length > 0) {
          return numericKeys.map(key => parsed[key]);
        }
      }
      
      return Array.isArray(parsed) ? parsed : null;
      
    } catch (error) {
      return null;
    }
  }
}

// Run the analysis
const analyzer = new UnifiedSessionAnalyzer();
analyzer.analyze().catch(console.error);