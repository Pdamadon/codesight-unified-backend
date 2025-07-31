/**
 * Enhanced Interactions Parser - Test Parser Phase 1.5
 * 
 * Explores the enhancedInteractions JSON field to understand
 * the actual interaction data structure and extract world model information
 */

import { PrismaClient } from '@prisma/client';

class EnhancedInteractionsParser {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async explore() {
    console.log('🔍 Enhanced Interactions Parser\n');
    console.log('===============================');
    
    try {
      await this.exploreEnhancedInteractions();
      await this.analyzeInteractionTypes();
      await this.extractDomainInfo();
      await this.classifyElements();
      await this.findNavigationPatterns();
      
    } catch (error) {
      console.error('❌ Parsing error:', error);
    } finally {
      await this.prisma.$disconnect();
    }
  }

  /**
   * Explore enhanced interactions structure
   */
  async exploreEnhancedInteractions() {
    console.log('\n📊 ENHANCED INTERACTIONS STRUCTURE');
    console.log('===================================');
    
    const sessions = await this.prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: null }
      },
      select: {
        id: true,
        interactionCount: true,
        enhancedInteractions: true,
        pageType: true,
        userIntent: true,
        shoppingStage: true
      },
      take: 3
    });
    
    sessions.forEach((session, index) => {
      console.log(`\n📝 Session ${index + 1}: ${session.id.substring(0, 8)}...`);
      console.log(`   Interaction Count: ${session.interactionCount}`);
      console.log(`   Page Type: ${session.pageType}`);
      console.log(`   User Intent: ${session.userIntent}`);
      console.log(`   Shopping Stage: ${session.shoppingStage}`);
      
      // Parse enhanced interactions
      const enhanced = this.safeParseJSON(session.enhancedInteractions);
      if (Array.isArray(enhanced)) {
        console.log(`   ✅ Enhanced Interactions: ${enhanced.length} items`);
        
        if (enhanced.length > 0) {
          const first = enhanced[0];
          console.log(`   📋 First Interaction Keys: ${Object.keys(first).join(', ')}`);
          
          // Show sample interaction data
          console.log('\n   🎯 Sample Interaction:');
          console.log('   ' + JSON.stringify(first, null, 6).replace(/\n/g, '\n   '));
          
          // Analyze interaction types in this session
          const types = enhanced.map(interaction => interaction.type || 'unknown');
          const typeCounts = this.countOccurrences(types);
          console.log(`\n   📊 Interaction Types:`, typeCounts);
        }
      } else {
        console.log(`   ❌ Enhanced Interactions: Invalid format (${typeof enhanced})`);
      }
    });
  }

  /**
   * Analyze different interaction types across sessions
   */
  async analyzeInteractionTypes() {
    console.log('\n🔗 INTERACTION TYPES ANALYSIS');
    console.log('=============================');
    
    const sessions = await this.prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: null }
      },
      select: {
        enhancedInteractions: true
      }
    });
    
    let allTypes = [];
    let allElements = [];
    let totalInteractions = 0;
    
    sessions.forEach(session => {
      const enhanced = this.safeParseJSON(session.enhancedInteractions);
      if (Array.isArray(enhanced)) {
        totalInteractions += enhanced.length;
        
        enhanced.forEach(interaction => {
          // Collect types
          allTypes.push(interaction.type || 'unknown');
          
          // Collect element text for classification
          if (interaction.element && interaction.element.text) {
            allElements.push({
              text: interaction.element.text,
              type: interaction.type,
              tagName: interaction.element.tagName,
              url: interaction.context?.url
            });
          }
        });
      }
    });
    
    console.log(`\n📊 Total Interactions Analyzed: ${totalInteractions}`);
    console.log('\n🏷️ Interaction Type Distribution:');
    const typeCounts = this.countOccurrences(allTypes);
    Object.entries(typeCounts).forEach(([type, count]) => {
      const percentage = ((count / totalInteractions) * 100).toFixed(1);
      console.log(`   ${type}: ${count} (${percentage}%)`);
    });
    
    console.log('\n📝 Sample Element Texts by Type:');
    const elementsByType = {};
    allElements.forEach(el => {
      if (!elementsByType[el.type]) elementsByType[el.type] = [];
      if (elementsByType[el.type].length < 5) {
        elementsByType[el.type].push(el.text);
      }
    });
    
    Object.entries(elementsByType).forEach(([type, texts]) => {
      console.log(`\n   ${type.toUpperCase()}:`);
      texts.forEach(text => {
        console.log(`     "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
      });
    });
  }

  /**
   * Extract domain information from interactions
   */
  async extractDomainInfo() {
    console.log('\n🌐 DOMAIN EXTRACTION ANALYSIS');
    console.log('=============================');
    
    const sessions = await this.prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: null }
      },
      select: {
        enhancedInteractions: true
      }
    });
    
    let domains = new Set();
    let urlPatterns = [];
    let pageTypes = new Set();
    
    sessions.forEach(session => {
      const enhanced = this.safeParseJSON(session.enhancedInteractions);
      if (Array.isArray(enhanced)) {
        enhanced.forEach(interaction => {
          // Extract domain from URL
          if (interaction.context && interaction.context.url) {
            const url = interaction.context.url;
            const domainMatch = url.match(/https?:\/\/([^\/]+)/);
            if (domainMatch) {
              domains.add(domainMatch[1]);
            }
            
            // Collect URL patterns
            urlPatterns.push(url);
          }
          
          // Collect page types
          if (interaction.context && interaction.context.pageType) {
            pageTypes.add(interaction.context.pageType);
          }
        });
      }
    });
    
    console.log('🏢 Domains Found:');
    Array.from(domains).forEach(domain => {
      console.log(`   ${domain}`);
    });
    
    console.log('\n📄 Page Types Found:');
    Array.from(pageTypes).forEach(pageType => {
      console.log(`   ${pageType}`);
    });
    
    console.log('\n🔗 Sample URL Patterns:');
    urlPatterns.slice(0, 10).forEach(url => {
      console.log(`   ${url}`);
    });
  }

  /**
   * Classify elements as products, categories, or navigation
   */
  async classifyElements() {
    console.log('\n🏷️ ELEMENT CLASSIFICATION ANALYSIS');
    console.log('===================================');
    
    const sessions = await this.prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: null }
      },
      select: {
        enhancedInteractions: true
      }
    });
    
    let products = [];
    let categories = [];
    let navigation = [];
    let other = [];
    
    sessions.forEach(session => {
      const enhanced = this.safeParseJSON(session.enhancedInteractions);
      if (Array.isArray(enhanced)) {
        enhanced.forEach(interaction => {
          if (interaction.element && interaction.element.text) {
            const element = {
              text: interaction.element.text,
              tagName: interaction.element.tagName,
              type: interaction.type,
              url: interaction.context?.url,
              pageType: interaction.context?.pageType
            };
            
            // Simple classification logic
            const text = element.text.toLowerCase();
            
            if (this.looksLikeProduct(text, element)) {
              products.push(element);
            } else if (this.looksLikeCategory(text, element)) {
              categories.push(element);
            } else if (this.looksLikeNavigation(text, element)) {
              navigation.push(element);
            } else {
              other.push(element);
            }
          }
        });
      }
    });
    
    console.log('\n🛍️ PRODUCTS (Sample):');
    products.slice(0, 5).forEach(p => {
      console.log(`   "${p.text}" (${p.tagName}, ${p.pageType})`);
    });
    
    console.log('\n📁 CATEGORIES (Sample):');
    categories.slice(0, 5).forEach(c => {
      console.log(`   "${c.text}" (${c.tagName}, ${c.type})`);
    });
    
    console.log('\n🧭 NAVIGATION (Sample):');
    navigation.slice(0, 5).forEach(n => {
      console.log(`   "${n.text}" (${n.tagName}, ${n.type})`);
    });
    
    console.log(`\n📊 Classification Summary:`);
    console.log(`   Products: ${products.length}`);
    console.log(`   Categories: ${categories.length}`);
    console.log(`   Navigation: ${navigation.length}`);
    console.log(`   Other: ${other.length}`);
  }

  /**
   * Find navigation patterns within sessions
   */
  async findNavigationPatterns() {
    console.log('\n🗺️ NAVIGATION PATTERNS ANALYSIS');
    console.log('================================');
    
    const sessions = await this.prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: null }
      },
      select: {
        id: true,
        enhancedInteractions: true
      },
      take: 2
    });
    
    sessions.forEach((session, index) => {
      console.log(`\n🧭 Session ${index + 1} Navigation Flow:`);
      
      const enhanced = this.safeParseJSON(session.enhancedInteractions);
      if (Array.isArray(enhanced)) {
        // Build navigation sequence
        const navSequence = enhanced
          .filter(interaction => interaction.element && interaction.element.text)
          .map((interaction, idx) => ({
            step: idx + 1,
            text: interaction.element.text,
            type: interaction.type,
            url: interaction.context?.url,
            pageType: interaction.context?.pageType
          }))
          .slice(0, 10); // First 10 steps
        
        navSequence.forEach(step => {
          console.log(`   ${step.step}. "${step.text}" (${step.type})`);
          if (step.url) {
            console.log(`      URL: ${step.url.substring(0, 60)}...`);
          }
        });
      }
    });
  }

  /**
   * Classification helper methods
   */
  looksLikeProduct(text, element) {
    const productKeywords = [
      'shirt', 'pants', 'dress', 'shoe', 'jacket', 'sweater',
      'polo', 'tee', 'jean', 'sneaker', 'boot', 'coat',
      'fit', 'cotton', 'regular', 'slim', 'cargo', 'size'
    ];
    
    return productKeywords.some(keyword => text.includes(keyword)) ||
           element.pageType === 'product-detail' ||
           (text.includes('$') && text.length > 10);
  }

  looksLikeCategory(text, element) {
    const categoryKeywords = [
      'men', 'women', 'kids', 'boys', 'girls',
      'shoes', 'clothing', 'accessories', 'sale'
    ];
    
    return categoryKeywords.some(keyword => text.includes(keyword)) ||
           element.pageType === 'category' ||
           (element.tagName === 'a' && text.length < 30);
  }

  looksLikeNavigation(text, element) {
    const navKeywords = [
      'back', 'next', 'home', 'menu', 'search',
      'cart', 'account', 'login', 'checkout'
    ];
    
    return navKeywords.some(keyword => text.includes(keyword)) ||
           element.type === 'navigate';
  }

  /**
   * Helper methods
   */
  safeParseJSON(jsonString) {
    if (!jsonString) return null;
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      return null;
    }
  }

  countOccurrences(array) {
    return array.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {});
  }
}

// Run the parser
const parser = new EnhancedInteractionsParser();
parser.explore().catch(console.error);