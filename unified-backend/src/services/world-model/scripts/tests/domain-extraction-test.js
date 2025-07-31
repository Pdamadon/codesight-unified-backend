/**
 * Domain Extraction Test Parser - Test Parser Phase 2
 * 
 * Tests domain extraction from UnifiedSession data to identify
 * real e-commerce domains instead of "unknown-ecommerce.com"
 */

import { PrismaClient } from '@prisma/client';

class DomainExtractionTest {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async test() {
    console.log('🌐 Domain Extraction Test Parser\n');
    console.log('=================================');
    
    try {
      await this.examineRawData();
      await this.testDomainExtraction();
      await this.analyzeURLPatterns();
      await this.buildSiteProfiles();
      
    } catch (error) {
      console.error('❌ Domain extraction error:', error);
    } finally {
      await this.prisma.$disconnect();
    }
  }

  /**
   * Examine raw enhanced interactions structure
   */
  async examineRawData() {
    console.log('\n🔍 RAW DATA STRUCTURE EXAMINATION');
    console.log('==================================');
    
    const session = await this.prisma.unifiedSession.findFirst({
      where: {
        enhancedInteractions: { not: null }
      },
      select: {
        id: true,
        enhancedInteractions: true
      }
    });
    
    if (session) {
      console.log(`📝 Session: ${session.id.substring(0, 8)}...`);
      
      // Try different parsing approaches
      const rawData = session.enhancedInteractions;
      console.log(`\n📦 Raw Data Type: ${typeof rawData}`);
      
      if (typeof rawData === 'string') {
        console.log('🔤 Attempting JSON.parse...');
        try {
          const parsed = JSON.parse(rawData);
          console.log(`✅ Parsed as: ${typeof parsed}`);
          console.log(`📊 Keys: ${Object.keys(parsed).slice(0, 10).join(', ')}`);
          
          // If it's an object with numeric keys, it might be an array-like object
          if (typeof parsed === 'object' && !Array.isArray(parsed)) {
            const keys = Object.keys(parsed);
            const numericKeys = keys.filter(key => !isNaN(key)).sort((a, b) => parseInt(a) - parseInt(b));
            
            if (numericKeys.length > 0) {
              console.log(`🔢 Found ${numericKeys.length} numeric keys (array-like object)`);
              
              // Show first few items
              const firstItems = numericKeys.slice(0, 3).map(key => parsed[key]);
              console.log('\n📋 First 3 Items:');
              firstItems.forEach((item, index) => {
                console.log(`\n   Item ${index + 1}:`);
                if (item && typeof item === 'object') {
                  console.log(`   Keys: ${Object.keys(item).join(', ')}`);
                  
                  // Look for URL or domain information
                  if (item.context && item.context.url) {
                    console.log(`   🔗 URL: ${item.context.url}`);
                  }
                  if (item.element && item.element.text) {
                    console.log(`   📝 Element: "${item.element.text.substring(0, 50)}..."`);
                  }
                } else {
                  console.log(`   Type: ${typeof item}`);
                }
              });
            }
          }
        } catch (parseError) {
          console.log(`❌ JSON Parse Error: ${parseError.message}`);
        }
      } else if (typeof rawData === 'object') {
        console.log('🔧 Direct object access...');
        const keys = Object.keys(rawData);
        console.log(`📊 Keys: ${keys.slice(0, 10).join(', ')}`);
        
        // Check if it's array-like with numeric keys
        const numericKeys = keys.filter(key => !isNaN(key)).sort((a, b) => parseInt(a) - parseInt(b));
        
        if (numericKeys.length > 0) {
          console.log(`🔢 Found ${numericKeys.length} numeric keys`);
          
          // Examine first item
          const firstKey = numericKeys[0];
          const firstItem = rawData[firstKey];
          
          if (firstItem && typeof firstItem === 'object') {
            console.log(`\n📋 First Item (${firstKey}):`);
            console.log(`   Keys: ${Object.keys(firstItem).join(', ')}`);
            
            // Look for URL or domain information
            if (firstItem.context && firstItem.context.url) {
              console.log(`   🔗 URL: ${firstItem.context.url}`);
            }
            if (firstItem.element && firstItem.element.text) {
              console.log(`   📝 Element: "${firstItem.element.text}"`);
            }
            if (firstItem.type) {
              console.log(`   🏷️ Type: ${firstItem.type}`);
            }
          }
        }
      }
    } else {
      console.log('❌ No sessions with enhanced interactions found');
    }
  }

  /**
   * Test domain extraction methods
   */
  async testDomainExtraction() {
    console.log('\n🏗️ DOMAIN EXTRACTION TESTING');
    console.log('=============================');
    
    const sessions = await this.prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: null }
      },
      select: {
        id: true,
        enhancedInteractions: true
      },
      take: 3
    });
    
    let allDomains = new Set();
    let allURLs = [];
    
    sessions.forEach((session, sessionIndex) => {
      console.log(`\n📝 Session ${sessionIndex + 1}: ${session.id.substring(0, 8)}...`);
      
      const interactions = this.parseInteractions(session.enhancedInteractions);
      
      if (interactions && interactions.length > 0) {
        console.log(`   ✅ Found ${interactions.length} interactions`);
        
        // Extract domains and URLs from this session
        let sessionDomains = new Set();
        let sessionURLs = [];
        
        interactions.forEach(interaction => {
          if (interaction.context && interaction.context.url) {
            const url = interaction.context.url;
            sessionURLs.push(url);
            allURLs.push(url);
            
            // Extract domain
            const domain = this.extractDomain(url);
            if (domain) {
              sessionDomains.add(domain);
              allDomains.add(domain);
            }
          }
        });
        
        console.log(`   🌐 Domains found: ${Array.from(sessionDomains).join(', ')}`);
        console.log(`   🔗 Sample URLs:`);
        sessionURLs.slice(0, 3).forEach(url => {
          console.log(`      ${url}`);
        });
        
      } else {
        console.log(`   ❌ No interactions parsed`);
      }
    });
    
    console.log('\n🌍 OVERALL DOMAIN EXTRACTION RESULTS:');
    console.log(`   Total unique domains: ${allDomains.size}`);
    Array.from(allDomains).forEach(domain => {
      console.log(`   ✅ ${domain}`);
    });
  }

  /**
   * Analyze URL patterns for each domain
   */
  async analyzeURLPatterns() {
    console.log('\n🔗 URL PATTERN ANALYSIS');
    console.log('=======================');
    
    const sessions = await this.prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: null }
      },
      select: {
        enhancedInteractions: true
      }
    });
    
    let urlsByDomain = {};
    
    sessions.forEach(session => {
      const interactions = this.parseInteractions(session.enhancedInteractions);
      
      if (interactions) {
        interactions.forEach(interaction => {
          if (interaction.context && interaction.context.url) {
            const url = interaction.context.url;
            const domain = this.extractDomain(url);
            
            if (domain) {
              if (!urlsByDomain[domain]) urlsByDomain[domain] = [];
              urlsByDomain[domain].push(url);
            }
          }
        });
      }
    });
    
    // Analyze patterns for each domain
    Object.entries(urlsByDomain).forEach(([domain, urls]) => {
      console.log(`\n🏢 ${domain} (${urls.length} URLs):`);
      
      // Categorize URLs
      const patterns = this.categorizeURLs(urls);
      
      Object.entries(patterns).forEach(([category, categoryURLs]) => {
        if (categoryURLs.length > 0) {
          console.log(`   📁 ${category.toUpperCase()} (${categoryURLs.length}):`);
          categoryURLs.slice(0, 3).forEach(url => {
            console.log(`      ${url}`);
          });
          if (categoryURLs.length > 3) {
            console.log(`      ... and ${categoryURLs.length - 3} more`);
          }
        }
      });
    });
  }

  /**
   * Build site profiles based on extracted data
   */
  async buildSiteProfiles() {
    console.log('\n🏗️ SITE PROFILE BUILDING');
    console.log('=========================');
    
    const sessions = await this.prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: null }
      },
      select: {
        enhancedInteractions: true,
        pageType: true,
        userIntent: true,
        shoppingStage: true
      }
    });
    
    let siteProfiles = {};
    
    sessions.forEach(session => {
      const interactions = this.parseInteractions(session.enhancedInteractions);
      
      if (interactions) {
        interactions.forEach(interaction => {
          if (interaction.context && interaction.context.url) {
            const domain = this.extractDomain(interaction.context.url);
            
            if (domain) {
              if (!siteProfiles[domain]) {
                siteProfiles[domain] = {
                  domain,
                  siteName: this.formatSiteName(domain),
                  siteType: 'ecommerce', // Assume e-commerce for now
                  interactionCount: 0,
                  pageTypes: new Set(),
                  elementTypes: new Set(),
                  sampleElements: []
                };
              }
              
              const profile = siteProfiles[domain];
              profile.interactionCount++;
              
              // Collect page types
              if (interaction.context.pageType) {
                profile.pageTypes.add(interaction.context.pageType);
              }
              if (session.pageType) {
                profile.pageTypes.add(session.pageType);
              }
              
              // Collect element information
              if (interaction.element) {
                if (interaction.element.tagName) {
                  profile.elementTypes.add(interaction.element.tagName);
                }
                
                if (interaction.element.text && profile.sampleElements.length < 10) {
                  profile.sampleElements.push({
                    text: interaction.element.text,
                    type: interaction.type,
                    tagName: interaction.element.tagName
                  });
                }
              }
            }
          }
        });
      }
    });
    
    // Display site profiles
    Object.values(siteProfiles).forEach(profile => {
      console.log(`\n🏢 ${profile.siteName} (${profile.domain})`);
      console.log(`   Type: ${profile.siteType}`);
      console.log(`   Interactions: ${profile.interactionCount}`);
      console.log(`   Page Types: ${Array.from(profile.pageTypes).join(', ')}`);
      console.log(`   Element Types: ${Array.from(profile.elementTypes).join(', ')}`);
      
      console.log('   Sample Elements:');
      profile.sampleElements.slice(0, 5).forEach(el => {
        console.log(`     "${el.text}" (${el.tagName}, ${el.type})`);
      });
    });
  }

  /**
   * Helper methods
   */
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
        const numericKeys = keys.filter(key => !isNaN(key)).sort((a, b) => parseInt(a) - parseInt(b));
        
        if (numericKeys.length > 0) {
          return numericKeys.map(key => parsed[key]);
        }
      }
      
      return Array.isArray(parsed) ? parsed : null;
      
    } catch (error) {
      return null;
    }
  }

  extractDomain(url) {
    if (!url) return null;
    
    try {
      const match = url.match(/https?:\/\/([^\/]+)/);
      return match ? match[1] : null;
    } catch (error) {
      return null;
    }
  }

  categorizeURLs(urls) {
    const patterns = {
      homepage: [],
      category: [],
      product: [],
      search: [],
      cart: [],
      checkout: [],
      other: []
    };
    
    urls.forEach(url => {
      const lowerURL = url.toLowerCase();
      
      if (lowerURL.match(/\/(home|index|\/)$/)) {
        patterns.homepage.push(url);
      } else if (lowerURL.includes('/product') || lowerURL.match(/\/p\/|\/dp\/|productpage/)) {
        patterns.product.push(url);
      } else if (lowerURL.includes('/category') || lowerURL.includes('/browse') || lowerURL.match(/\/(men|women|kids|sale)\//)) {
        patterns.category.push(url);
      } else if (lowerURL.includes('/search') || lowerURL.includes('?q=')) {
        patterns.search.push(url);
      } else if (lowerURL.includes('/cart') || lowerURL.includes('/bag')) {
        patterns.cart.push(url);
      } else if (lowerURL.includes('/checkout') || lowerURL.includes('/payment')) {
        patterns.checkout.push(url);
      } else {
        patterns.other.push(url);
      }
    });
    
    return patterns;
  }

  formatSiteName(domain) {
    return domain
      .replace(/^www\./, '')
      .replace(/\.(com|net|org)$/, '')
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}

// Run the test
const test = new DomainExtractionTest();
test.test().catch(console.error);