/**
 * Debug Extraction Output
 * 
 * Examine the actual structure of data returned by the 4-phase extraction system
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugExtractionOutput() {
  console.log('🔍 Debugging 4-Phase Extraction Output Structure\n');
  
  try {
    // Get one session to examine
    const session = await prisma.unifiedSession.findFirst({
      where: {
        id: 'session_1753910685015_fzus42zei'  // Home Depot session
      }
    });
    
    if (!session) {
      console.log('❌ Session not found');
      return;
    }
    
    // Load parser and extract data
    const { DirectSessionParser } = await import('./dist/services/world-model/ingestion/direct-session-parser.js');
    const parser = new DirectSessionParser();
    
    console.log('🔧 Running 4-phase extraction...');
    const extractedData = parser.parseSession(session);
    
    if (!extractedData) {
      console.log('❌ No data extracted');
      return;
    }
    
    console.log('✅ Data extracted successfully\n');
    
    // Deep examination of the extracted data structure
    console.log('📊 EXTRACTED DATA STRUCTURE ANALYSIS:');
    console.log('='.repeat(80));
    
    console.log('\n🔑 TOP-LEVEL KEYS:');
    Object.keys(extractedData).forEach((key, i) => {
      const value = extractedData[key];
      const type = Array.isArray(value) ? `Array[${value.length}]` : typeof value;
      console.log(`   ${i + 1}. ${key}: ${type}`);
    });
    
    // Examine domain information in detail
    console.log('\n🏢 DOMAIN INFORMATION DETAILED:');
    console.log('   Raw object:', JSON.stringify(extractedData.domainInformation, null, 4));
    
    // Examine navigation architecture
    console.log('\n🧭 NAVIGATION ARCHITECTURE DETAILED:');
    if (extractedData.navigationArchitecture) {
      console.log('   categoryHierarchy:', JSON.stringify(extractedData.navigationArchitecture.categoryHierarchy, null, 4));
      console.log('   navigationPatterns:', JSON.stringify(extractedData.navigationArchitecture.navigationPatterns, null, 4));
    } else {
      console.log('   ❌ navigationArchitecture is null/undefined');
    }
    
    // Examine shopping flow analysis
    console.log('\n🛒 SHOPPING FLOW ANALYSIS DETAILED:');
    if (extractedData.shoppingFlowAnalysis) {
      console.log('   purchaseFunnel:', JSON.stringify(extractedData.shoppingFlowAnalysis.purchaseFunnel, null, 4));
      console.log('   cartWorkflow:', JSON.stringify(extractedData.shoppingFlowAnalysis.cartWorkflow, null, 4));
    } else {
      console.log('   ❌ shoppingFlowAnalysis is null/undefined');
    }
    
    // Examine product information
    console.log('\n📦 PRODUCT INFORMATION DETAILED:');
    if (extractedData.productInformationArchitecture) {
      console.log('   Raw object:', JSON.stringify(extractedData.productInformationArchitecture, null, 4));
    } else {
      console.log('   ❌ productInformationArchitecture is null/undefined');
    }
    
    // Examine product variants 
    console.log('\n🎨 PRODUCT VARIANTS DETAILED:');
    if (extractedData.productVariants) {
      console.log('   Product variants array:', JSON.stringify(extractedData.productVariants, null, 4));
    } else {
      console.log('   ❌ productVariants is null/undefined');
    }
    
    // Examine product interactions
    console.log('\n🛍️ PRODUCT INTERACTIONS DETAILED:');
    if (extractedData.productInteractions) {
      console.log('   Product interactions array:', JSON.stringify(extractedData.productInteractions, null, 4));
    } else {
      console.log('   ❌ productInteractions is null/undefined');
    }
    
    // Examine navigation events
    console.log('\n🧭 NAVIGATION EVENTS DETAILED:');
    if (extractedData.navigationEvents) {
      console.log('   Navigation events array:', JSON.stringify(extractedData.navigationEvents, null, 4));
    } else {
      console.log('   ❌ navigationEvents is null/undefined');
    }
    
    // Examine UI component library
    console.log('\n🎨 UI COMPONENT LIBRARY DETAILED:');
    if (extractedData.uiComponentLibrary) {
      console.log('   componentTaxonomy:', JSON.stringify(extractedData.uiComponentLibrary.componentTaxonomy, null, 4));
    } else {
      console.log('   ❌ uiComponentLibrary is null/undefined');
    }
    
    // Check what data we actually have for WorldModel mapping
    console.log('\n🎯 WORLDMODEL MAPPING READINESS:');
    console.log('='.repeat(80));
    
    // Domain readiness
    const domainName = extractedData.domainInformation?.domainName;
    const siteType = extractedData.domainInformation?.siteType;
    console.log(`\n🏢 Domain Data Available:`);
    console.log(`   domainName: "${domainName || 'MISSING'}"`);
    console.log(`   siteType: "${siteType || 'MISSING'}"`);
    console.log(`   pageTypes: ${extractedData.domainInformation?.pageTypes ? 'AVAILABLE' : 'MISSING'}`);
    
    // Category readiness
    const rootCategories = extractedData.navigationArchitecture?.categoryHierarchy?.rootCategories;
    console.log(`\n🗂️ Category Data Available:`);
    console.log(`   rootCategories: ${rootCategories ? `AVAILABLE (${rootCategories.length})` : 'MISSING'}`);
    if (rootCategories && rootCategories.length > 0) {
      console.log('   Sample categories:');
      rootCategories.slice(0, 3).forEach((cat, i) => {
        console.log(`      ${i + 1}. name: "${cat.categoryName || cat.name || 'MISSING'}" | path: "${cat.categoryPath || 'MISSING'}"`);
      });
    }
    
    // Product readiness
    const productVariants = extractedData.productVariants;
    const productInteractions = extractedData.productInteractions;
    console.log(`\n📦 Product Data Available:`);
    console.log(`   productVariants: ${productVariants ? `AVAILABLE (${productVariants.length})` : 'MISSING'}`);
    console.log(`   productInteractions: ${productInteractions ? `AVAILABLE (${productInteractions.length})` : 'MISSING'}`);
    
    if (productVariants && productVariants.length > 0) {
      console.log('   Sample product variants:');
      productVariants.slice(0, 2).forEach((prod, i) => {
        console.log(`      ${i + 1}. id: "${prod.baseProductId || 'MISSING'}" | name: "${prod.productName || 'MISSING'}"`);
        console.log(`          colors: ${prod.colorVariants?.length || 0} | sizes: ${prod.sizeInteractions?.length || 0}`);
      });
    }
    
    if (productInteractions && productInteractions.length > 0) {
      console.log('   Sample product interactions:');
      productInteractions.slice(0, 3).forEach((interaction, i) => {
        console.log(`      ${i + 1}. productId: "${interaction.productId || 'MISSING'}" | text: "${interaction.elementText || 'MISSING'}"`);
        console.log(`          action: "${interaction.actionType || 'MISSING'}" | url: "${interaction.pageUrl || 'MISSING'}"`);
      });
    }
    
    console.log('\n🔍 TRANSFORMATION ISSUES IDENTIFIED:');
    console.log('='.repeat(80));
    
    const issues = [];
    
    if (!domainName) issues.push('Domain name not being extracted properly');
    if (!rootCategories || rootCategories.length === 0) issues.push('Categories not being extracted from navigation');
    if (!productVariants || productVariants.length === 0) issues.push('Product variants not being created');
    if (!productInteractions || productInteractions.length === 0) issues.push('Product interactions not being captured');
    
    if (issues.length === 0) {
      console.log('✅ All expected data is available - issue is in WorldModel mapping');
    } else {
      console.log('❌ Data extraction issues found:');
      issues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug
debugExtractionOutput().catch(console.error);