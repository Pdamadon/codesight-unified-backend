/**
 * Product vs Category Classification Test - Test Parser Phase 3
 * 
 * Tests classification of elements as products, categories, or navigation
 * to avoid issues like "cargo pants" being classified as a category
 */

import { PrismaClient } from '@prisma/client';

class ClassificationTest {
  constructor() {
    this.prisma = new PrismaClient();
  }

  async test() {
    console.log('🏷️ Product vs Category Classification Test\n');
    console.log('==========================================');
    
    try {
      await this.collectAllElements();
      await this.testClassificationLogic();
      await this.analyzeByDomain();
      await this.validateClassification();
      
    } catch (error) {
      console.error('❌ Classification error:', error);
    } finally {
      await this.prisma.$disconnect();
    }
  }

  /**
   * Collect all element texts and contexts
   */
  async collectAllElements() {
    console.log('\n📋 COLLECTING ALL ELEMENTS');
    console.log('===========================');
    
    const sessions = await this.prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: null }
      },
      select: {
        enhancedInteractions: true
      }
    });
    
    let allElements = [];
    
    sessions.forEach(session => {
      const interactions = this.parseInteractions(session.enhancedInteractions);
      
      if (interactions) {
        interactions.forEach(interaction => {
          if (interaction.element && interaction.element.text) {
            const domain = this.extractDomain(interaction.context?.url);
            
            allElements.push({
              text: interaction.element.text.trim(),
              domain: domain,
              url: interaction.context?.url,
              pageType: interaction.context?.pageType,
              interactionType: interaction.type,
              tagName: interaction.element.tagName,
              elementId: interaction.element.id,
              className: interaction.element.className
            });
          }
        });
      }
    });
    
    console.log(`📊 Total elements collected: ${allElements.length}`);
    
    // Group by domain
    const byDomain = {};
    allElements.forEach(el => {
      if (!byDomain[el.domain]) byDomain[el.domain] = [];
      byDomain[el.domain].push(el);
    });
    
    Object.entries(byDomain).forEach(([domain, elements]) => {
      console.log(`   ${domain}: ${elements.length} elements`);
    });
    
    return allElements;
  }

  /**
   * Test classification logic with different approaches
   */
  async testClassificationLogic() {
    console.log('\n🧪 TESTING CLASSIFICATION LOGIC');
    console.log('================================');
    
    const allElements = await this.collectAllElements();
    
    // Test different classification approaches
    const approaches = [
      { name: 'URL-based', classifier: this.classifyByURL.bind(this) },
      { name: 'Text-based', classifier: this.classifyByText.bind(this) },
      { name: 'Context-based', classifier: this.classifyByContext.bind(this) },
      { name: 'Hybrid', classifier: this.classifyHybrid.bind(this) }
    ];
    
    approaches.forEach(approach => {
      console.log(`\n🔍 ${approach.name} Classification:`);
      
      let products = [];
      let categories = [];
      let navigation = [];
      let other = [];
      
      allElements.forEach(element => {
        const classification = approach.classifier(element);
        
        switch (classification) {
          case 'product':
            products.push(element);
            break;
          case 'category':
            categories.push(element);
            break;
          case 'navigation':
            navigation.push(element);
            break;
          default:
            other.push(element);
        }
      });
      
      console.log(`   📊 Results:`);
      console.log(`      Products: ${products.length}`);
      console.log(`      Categories: ${categories.length}`);
      console.log(`      Navigation: ${navigation.length}`);
      console.log(`      Other: ${other.length}`);
      
      // Show samples
      console.log(`\n   🛍️ Sample Products:`);
      products.slice(0, 5).forEach(p => {
        console.log(`      "${p.text}" (${p.domain})`);
      });
      
      console.log(`\n   📁 Sample Categories:`);
      categories.slice(0, 5).forEach(c => {
        console.log(`      "${c.text}" (${c.domain})`);
      });
      
      console.log(`\n   🧭 Sample Navigation:`);
      navigation.slice(0, 5).forEach(n => {
        console.log(`      "${n.text}" (${n.domain})`);
      });
    });
  }

  /**
   * Analyze classification by domain
   */
  async analyzeByDomain() {
    console.log('\n🌐 DOMAIN-SPECIFIC ANALYSIS');
    console.log('============================');
    
    const allElements = await this.collectAllElements();
    const byDomain = {};
    
    allElements.forEach(el => {
      if (!byDomain[el.domain]) byDomain[el.domain] = [];
      byDomain[el.domain].push(el);
    });
    
    Object.entries(byDomain).forEach(([domain, elements]) => {
      console.log(`\n🏢 ${domain}:`);
      
      // Classify elements for this domain
      let products = [];
      let categories = [];
      let navigation = [];
      
      elements.forEach(element => {
        const classification = this.classifyHybrid(element);
        
        switch (classification) {
          case 'product':
            products.push(element);
            break;
          case 'category':
            categories.push(element);
            break;
          case 'navigation':
            navigation.push(element);
            break;
        }
      });
      
      console.log(`   📊 Distribution:`);
      console.log(`      Products: ${products.length}`);
      console.log(`      Categories: ${categories.length}`);
      console.log(`      Navigation: ${navigation.length}`);
      
      // Analyze URL patterns for products
      if (products.length > 0) {
        console.log(`\n   🛍️ Product URL Patterns:`);
        const productURLs = [...new Set(products.map(p => p.url).filter(Boolean))];
        productURLs.slice(0, 3).forEach(url => {
          console.log(`      ${url}`);
        });
        
        console.log(`\n   🛍️ Product Text Samples:`);
        products.slice(0, 5).forEach(p => {
          console.log(`      "${p.text}"`);
        });
      }
      
      // Analyze category patterns
      if (categories.length > 0) {
        console.log(`\n   📁 Category Text Samples:`);
        categories.slice(0, 5).forEach(c => {
          console.log(`      "${c.text}"`);
        });
      }
    });
  }

  /**
   * Validate classification accuracy
   */
  async validateClassification() {
    console.log('\n✅ CLASSIFICATION VALIDATION');
    console.log('=============================');
    
    const allElements = await this.collectAllElements();
    
    // Find potential misclassifications
    console.log('\n🔍 Potential Issues:');
    
    let issues = [];
    
    allElements.forEach(element => {
      const classification = this.classifyHybrid(element);
      const text = element.text.toLowerCase();
      
      // Check for common misclassification patterns
      
      // Products misclassified as categories
      if (classification === 'category' && this.looksLikeProductName(text)) {
        issues.push({
          type: 'product_as_category',
          element: element,
          reason: 'Contains product-like keywords but classified as category'
        });
      }
      
      // Categories misclassified as products
      if (classification === 'product' && this.looksLikeCategoryName(text)) {
        issues.push({
          type: 'category_as_product',
          element: element,
          reason: 'Contains category-like keywords but classified as product'
        });
      }
      
      // Size/color selections misclassified
      if (classification === 'product' && this.looksLikeVariantOption(text)) {
        issues.push({
          type: 'variant_as_product',
          element: element,
          reason: 'Looks like size/color option but classified as product'
        });
      }
    });
    
    console.log(`\n📊 Issues Found: ${issues.length}`);
    
    // Group issues by type
    const issuesByType = {};
    issues.forEach(issue => {
      if (!issuesByType[issue.type]) issuesByType[issue.type] = [];
      issuesByType[issue.type].push(issue);
    });
    
    Object.entries(issuesByType).forEach(([type, typeIssues]) => {
      console.log(`\n❌ ${type.replace(/_/g, ' ').toUpperCase()} (${typeIssues.length}):`);
      typeIssues.slice(0, 5).forEach(issue => {
        console.log(`   "${issue.element.text}" (${issue.element.domain})`);
        console.log(`   Reason: ${issue.reason}`);
      });
    });
    
    console.log('\n🎯 Classification Accuracy:');
    const accuracy = ((allElements.length - issues.length) / allElements.length * 100).toFixed(1);
    console.log(`   Estimated Accuracy: ${accuracy}%`);
    console.log(`   Total Elements: ${allElements.length}`);
    console.log(`   Potential Issues: ${issues.length}`);
  }

  /**
   * Classification Methods
   */
  classifyByURL(element) {
    if (!element.url) return 'unknown';
    
    const url = element.url.toLowerCase();
    
    if (url.includes('/product') || url.includes('/productpage') || url.match(/\/p\/|\/dp\//)) {
      return 'product';
    }
    
    if (url.includes('/browse') || url.includes('/category') || url.match(/\/(men|women|kids|sale)\//)) {
      return 'category';
    }
    
    if (url.includes('/cart') || url.includes('/checkout') || url === '/') {
      return 'navigation';
    }
    
    return 'unknown';
  }

  classifyByText(element) {
    const text = element.text.toLowerCase();
    
    // Product indicators
    const productKeywords = [
      'shirt', 'pants', 'dress', 'shoe', 'jacket', 'sweater', 'polo', 'tee',
      'fit', 'cotton', 'denim', 'leather', 'wool', 'sleeve', 'neck'
    ];
    
    // Category indicators
    const categoryKeywords = [
      'men', 'women', 'kids', 'boys', 'girls', 'baby',
      'shoes', 'clothing', 'accessories', 'sale', 'new'
    ];
    
    // Navigation indicators
    const navKeywords = [
      'home', 'cart', 'bag', 'checkout', 'account', 'login',
      'search', 'menu', 'back', 'next', 'add to'
    ];
    
    if (navKeywords.some(keyword => text.includes(keyword))) {
      return 'navigation';
    }
    
    if (productKeywords.some(keyword => text.includes(keyword)) || (text.includes('$') && text.length > 10)) {
      return 'product';
    }
    
    if (categoryKeywords.some(keyword => text.includes(keyword)) && text.length < 30) {
      return 'category';
    }
    
    return 'unknown';
  }

  classifyByContext(element) {
    // Use page type and interaction context
    if (element.pageType === 'product-detail' || element.pageType === 'product') {
      if (element.interactionType === 'CLICK' && !this.looksLikeVariantOption(element.text)) {
        return 'product';
      }
    }
    
    if (element.pageType === 'category') {
      const text = element.text.toLowerCase();
      if (text.includes('add to') || text.includes('$')) {
        return 'product';
      }
      if (text.length < 30 && this.looksLikeCategoryName(text)) {
        return 'category';
      }
    }
    
    return this.classifyByText(element);
  }

  classifyHybrid(element) {
    // Combine multiple approaches for better accuracy
    const urlClass = this.classifyByURL(element);
    const textClass = this.classifyByText(element);
    const contextClass = this.classifyByContext(element);
    
    // URL-based classification is most reliable
    if (urlClass !== 'unknown') {
      // But validate with text analysis
      if (urlClass === 'product' && this.looksLikeVariantOption(element.text)) {
        return 'navigation'; // Size/color selections
      }
      return urlClass;
    }
    
    // Fall back to context-based
    if (contextClass !== 'unknown') {
      return contextClass;
    }
    
    // Finally use text-based
    return textClass;
  }

  /**
   * Helper validation methods
   */
  looksLikeProductName(text) {
    const productIndicators = [
      'shirt', 'pants', 'dress', 'shoe', 'jacket', 'polo', 'tee',
      'fit', 'cotton', 'sleeve', 'cargo', 'denim', 'sneaker'
    ];
    return productIndicators.some(indicator => text.includes(indicator)) && text.length > 10;
  }

  looksLikeCategoryName(text) {
    const categoryIndicators = [
      'men', 'women', 'kids', 'shoes', 'clothing', 'accessories', 'sale'
    ];
    return categoryIndicators.some(indicator => text.includes(indicator)) && text.length < 50;
  }

  looksLikeVariantOption(text) {
    // Size indicators
    if (text.match(/^(XS|S|M|L|XL|XXL|\d+|\d+\.\d+)$/i)) return true;
    
    // Color indicators
    const colors = ['red', 'blue', 'green', 'black', 'white', 'gray', 'navy', 'brown'];
    if (colors.some(color => text.toLowerCase() === color)) return true;
    
    return false;
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
    if (!url) return 'unknown';
    
    try {
      const match = url.match(/https?:\/\/([^\/]+)/);
      return match ? match[1] : 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }
}

// Run the test
const test = new ClassificationTest();
test.test().catch(console.error);