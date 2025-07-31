/**
 * Home Depot Product and Category Details Analysis
 * 
 * Extract specific product and category information from Home Depot session
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeHomeDepotProductsCategories() {
  console.log('🏪 Home Depot Product & Category Details Analysis\n');
  
  try {
    // Get the Home Depot session
    const session = await prisma.unifiedSession.findFirst({
      where: {
        id: 'session_1753910685015_fzus42zei'
      }
    });
    
    if (!session) {
      console.log('❌ Home Depot session not found');
      return;
    }
    
    // Load parser and extract data
    const { DirectSessionParser } = await import('./dist/services/world-model/ingestion/direct-session-parser.js');
    const parser = new DirectSessionParser();
    
    const extractedData = parser.parseSession(session);
    
    console.log('🔍 DETAILED PRODUCT & CATEGORY EXTRACTION:\n');
    
    // Analyze raw interactions for products and categories
    const interactions = Array.isArray(session.enhancedInteractions) ? 
      session.enhancedInteractions : 
      JSON.parse(session.enhancedInteractions || '[]');
    
    console.log(`📊 Raw Data Analysis: ${interactions.length} interactions\n`);
    
    // Extract product-related interactions
    console.log('🛍️ PRODUCT INFORMATION FOUND:');
    console.log('='.repeat(80));
    
    const productInteractions = interactions.filter(interaction => {
      const url = interaction.context?.url || '';
      const text = interaction.element?.text || '';
      
      return url.includes('/p/') || // Product page URL pattern
             text.toLowerCase().includes('piece') ||
             text.toLowerCase().includes('set') ||
             text.toLowerCase().includes('furniture') ||
             text.toLowerCase().includes('patio') ||
             text.toLowerCase().includes('outdoor') ||
             text.toLowerCase().includes('bay') ||
             text.toLowerCase().includes('steel') ||
             text.toLowerCase().includes('wicker');
    });
    
    console.log(`\n📦 Product-Related Interactions: ${productInteractions.length}\n`);
    
    // Group by product pages
    const productPages = {};
    const productNames = new Set();
    const productBrands = new Set();
    const productCategories = new Set();
    
    productInteractions.forEach(interaction => {
      const url = interaction.context?.url;
      const text = interaction.element?.text || '';
      
      if (url && url.includes('/p/')) {
        if (!productPages[url]) {
          productPages[url] = {
            url,
            interactions: [],
            productName: null,
            productBrand: null,
            productCategory: null,
            productFeatures: [],
            priceInfo: null
          };
        }
        productPages[url].interactions.push(interaction);
        
        // Extract product name from text
        if (text && text.length > 5 && !text.toLowerCase().includes('add') && !text.toLowerCase().includes('cart')) {
          if (text.includes('Piece') || text.includes('Set') || text.includes('Patio') || text.includes('Steel') || text.includes('Wicker')) {
            productPages[url].productName = text;
            productNames.add(text);
          }
          
          // Extract brand
          if (text.includes('Hampton Bay') || text.includes('StyleWell')) {
            const brand = text.includes('Hampton Bay') ? 'Hampton Bay' : 'StyleWell';
            productPages[url].productBrand = brand;
            productBrands.add(brand);
          }
          
          // Extract category
          if (text.includes('Patio') || text.includes('Outdoor')) {
            productPages[url].productCategory = 'Patio Furniture';
            productCategories.add('Patio Furniture');
          }
          
          // Extract features
          if (text.includes('Piece')) {
            const pieceMatch = text.match(/(\d+)-?Piece/i);
            if (pieceMatch) {
              productPages[url].productFeatures.push(`${pieceMatch[1]} Piece Set`);
            }
          }
          
          if (text.includes('Steel') || text.includes('Wicker')) {
            const material = text.includes('Steel') ? 'Steel' : 'Wicker';
            productPages[url].productFeatures.push(`Material: ${material}`);
          }
        }
      }
    });
    
    console.log('📦 PRODUCT DETAILS EXTRACTED:\n');
    
    Object.values(productPages).forEach((product, index) => {
      console.log(`Product ${index + 1}:`);
      console.log(`   URL: ${product.url}`);
      console.log(`   Product Name: ${product.productName || 'Not extracted'}`);
      console.log(`   Brand: ${product.productBrand || 'Not extracted'}`);
      console.log(`   Category: ${product.productCategory || 'Not extracted'}`);
      console.log(`   Features: ${product.productFeatures.length > 0 ? product.productFeatures.join(', ') : 'None extracted'}`);
      console.log(`   Interactions: ${product.interactions.length}`);
      
      // Show key interactions for this product
      const keyInteractions = product.interactions.filter(i => 
        i.element?.text && i.element.text.length > 3 && !i.element.text.includes('undefined')
      );
      
      if (keyInteractions.length > 0) {
        console.log(`   Key Interactions:`);
        keyInteractions.slice(0, 5).forEach((interaction, i) => {
          console.log(`      ${i + 1}. ${interaction.type || 'unknown'}: "${interaction.element?.text || 'no text'}" (${interaction.element?.tag || 'unknown'})`);
        });
      }
      console.log('');
    });
    
    // Extract category information
    console.log('🗂️ CATEGORY INFORMATION FOUND:');
    console.log('='.repeat(80));
    
    const categoryInteractions = interactions.filter(interaction => {
      const text = interaction.element?.text || '';
      const url = interaction.context?.url || '';
      
      return text.toLowerCase().includes('department') ||
             text.toLowerCase().includes('lawn') ||
             text.toLowerCase().includes('garden') ||
             text.toLowerCase().includes('decor') ||
             text.toLowerCase().includes('furniture') ||
             text.toLowerCase().includes('outdoor') ||
             text.toLowerCase().includes('patio') ||
             url.includes('/b/') || // Category page URL pattern
             url.includes('catStyle') ||
             url.includes('Outdoors');
    });
    
    console.log(`\n📂 Category-Related Interactions: ${categoryInteractions.length}\n`);
    
    // Extract category hierarchy
    const categories = new Set();
    const categoryHierarchy = {};
    
    categoryInteractions.forEach(interaction => {
      const text = interaction.element?.text || '';
      const url = interaction.context?.url || '';
      
      if (text) {
        // Main departments
        if (text.includes('Shop By Department')) {
          categories.add('Shop By Department');
        }
        if (text.includes('Lawn & Garden')) {
          categories.add('Lawn & Garden');
        }
        if (text.includes('Decor & Furniture')) {
          categories.add('Decor & Furniture');
        }
        if (text.includes('Patio Furniture')) {
          categories.add('Patio Furniture');
        }
        if (text.includes('Outdoors')) {
          categories.add('Outdoors');
        }
      }
      
      // Extract from URL structure
      if (url.includes('/b/Outdoors-Patio-Furniture/')) {
        if (!categoryHierarchy['Outdoors']) {
          categoryHierarchy['Outdoors'] = [];
        }
        categoryHierarchy['Outdoors'].push('Patio Furniture');
      }
      
      if (url.includes('outdoor+furniture')) {
        categories.add('Outdoor Furniture');
      }
    });
    
    console.log('📂 CATEGORY DETAILS EXTRACTED:\n');
    
    console.log('Main Categories Found:');
    Array.from(categories).forEach((category, index) => {
      console.log(`   ${index + 1}. ${category}`);
    });
    
    if (Object.keys(categoryHierarchy).length > 0) {
      console.log('\nCategory Hierarchy:');
      Object.entries(categoryHierarchy).forEach(([parent, children]) => {
        console.log(`   ${parent}:`);
        children.forEach(child => {
          console.log(`      → ${child}`);
        });
      });
    }
    
    // Search and filter analysis
    console.log('\n🔍 SEARCH & FILTER PATTERNS:');
    console.log('='.repeat(80));
    
    const searchInteractions = interactions.filter(i => 
      i.element?.text?.toLowerCase().includes('find') ||
      i.element?.text?.toLowerCase().includes('search') ||
      i.context?.url?.includes('Search') ||
      i.context?.url?.includes('Ntt-') ||
      i.type === 'INPUT'
    );
    
    console.log(`\nSearch-Related Interactions: ${searchInteractions.length}\n`);
    
    searchInteractions.forEach((interaction, index) => {
      if (index < 10) { // Show top 10
        console.log(`   ${index + 1}. ${interaction.type || 'unknown'}: "${interaction.element?.text || 'no text'}"`);
        if (interaction.context?.url && interaction.context.url.includes('Ntt-')) {
          const searchMatch = interaction.context.url.match(/Ntt-([^/&]+)/);
          if (searchMatch) {
            const searchTerm = decodeURIComponent(searchMatch[1].replace(/\+/g, ' '));
            console.log(`      Search Term: "${searchTerm}"`);
          }
        }
      }
    });
    
    // Product variant analysis
    console.log('\n🎨 PRODUCT VARIANT ANALYSIS:');
    console.log('='.repeat(80));
    
    // Look for size, color, or configuration options
    const variantInteractions = interactions.filter(i => {
      const text = (i.element?.text || '').toLowerCase();
      return text.includes('color') ||
             text.includes('size') ||
             text.includes('piece') ||
             text.includes('blue') ||
             text.includes('brown') ||
             text.includes('dark') ||
             text.includes('steel') ||
             text.includes('wicker');
    });
    
    console.log(`\nVariant-Related Interactions: ${variantInteractions.length}\n`);
    
    const variants = {
      materials: new Set(),
      colors: new Set(),
      sizes: new Set(),
      configurations: new Set()
    };
    
    variantInteractions.forEach(interaction => {
      const text = interaction.element?.text || '';
      
      if (text.includes('Steel')) variants.materials.add('Steel');
      if (text.includes('Wicker')) variants.materials.add('Wicker');
      
      if (text.includes('Blue')) variants.colors.add('Blue');
      if (text.includes('Brown')) variants.colors.add('Brown');
      if (text.includes('Dark')) variants.colors.add('Dark');
      
      const pieceMatch = text.match(/(\d+)-?Piece/i);
      if (pieceMatch) {
        variants.configurations.add(`${pieceMatch[1]} Piece`);
      }
    });
    
    console.log('Product Variants Found:');
    console.log(`   Materials: ${Array.from(variants.materials).join(', ') || 'None'}`);
    console.log(`   Colors: ${Array.from(variants.colors).join(', ') || 'None'}`);
    console.log(`   Configurations: ${Array.from(variants.configurations).join(', ') || 'None'}`);
    
    // Summary for WorldModel integration
    console.log('\n🎯 WORLDMODEL INTEGRATION SUMMARY:');
    console.log('='.repeat(80));
    
    console.log('\nREADY FOR WORLDMODEL STORAGE:');
    
    console.log('\n🏢 Domain Data:');
    console.log(`   Domain: "The Home Depot"`);
    console.log(`   Site Type: "home_improvement"`);
    console.log(`   Business Model: "e_commerce"`);
    
    console.log('\n📂 Category Data:');
    Array.from(categories).forEach((category, index) => {
      console.log(`   Category ${index + 1}:`);
      console.log(`      Name: "${category}"`);
      console.log(`      Path: "${category.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}"`);
      console.log(`      Type: "department"`);
    });
    
    console.log('\n📦 Product Data:');
    Object.values(productPages).forEach((product, index) => {
      if (product.productName) {
        console.log(`   Product ${index + 1}:`);
        console.log(`      Name: "${product.productName}"`);
        console.log(`      Brand: "${product.productBrand || 'Unknown'}"`);
        console.log(`      Category: "${product.productCategory || 'Furniture'}"`);
        console.log(`      Features: [${product.productFeatures.map(f => `"${f}"`).join(', ')}]`);
        console.log(`      URL: "${product.url}"`);
      }
    });
    
    console.log('\n✅ EXTRACTION SUCCESS:');
    console.log(`   Products Identified: ${Object.keys(productPages).length}`);
    console.log(`   Categories Mapped: ${categories.size}`);
    console.log(`   Brands Found: ${productBrands.size}`);
    console.log(`   Variants Detected: ${Object.values(variants).reduce((sum, set) => sum + set.size, 0)}`);
    
  } catch (error) {
    console.error('❌ Analysis error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzeHomeDepotProductsCategories().catch(console.error);