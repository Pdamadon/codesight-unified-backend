/**
 * Home Depot Session Data Breakdown
 * 
 * Detailed analysis of what information was extracted from the Home Depot session
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeHomeDepotBreakdown() {
  console.log('🏪 Home Depot Session Data Breakdown\n');
  
  try {
    // Get the Home Depot session specifically
    const session = await prisma.unifiedSession.findFirst({
      where: {
        id: 'session_1753910685015_fzus42zei'  // Home Depot session ID from previous run
      }
    });
    
    if (!session) {
      console.log('❌ Home Depot session not found');
      return;
    }
    
    console.log(`📊 Analyzing Home Depot session: ${session.id}\n`);
    
    // Load parser and extract data
    const { DirectSessionParser } = await import('./dist/services/world-model/ingestion/direct-session-parser.js');
    const parser = new DirectSessionParser();
    
    const extractedData = parser.parseSession(session);
    
    if (!extractedData) {
      console.log('❌ No data extracted from Home Depot session');
      return;
    }
    
    console.log('🔍 HOME DEPOT EXTRACTION BREAKDOWN:');
    console.log('='.repeat(80));
    
    // Session Overview
    console.log('\n📋 SESSION OVERVIEW:');
    console.log(`   Session ID: ${extractedData.sessionId}`);
    console.log(`   Domain: ${extractedData.domain}`);
    console.log(`   Total Interactions: ${extractedData.totalInteractions}`);
    console.log(`   Quality Score: ${extractedData.qualityScore}`);
    console.log(`   Processing Time: ${extractedData.processingTimestamp}`);
    
    // Domain Information Analysis
    console.log('\n🏢 DOMAIN INFORMATION EXTRACTED:');
    const domainInfo = extractedData.domainInformation;
    
    console.log(`   Domain Name: "${domainInfo.domainName}"`);
    console.log(`   Site Type: ${domainInfo.siteType || 'unknown'}`);
    console.log(`   UI Framework: ${domainInfo.uiFramework || 'unknown'}`);
    console.log(`   Page Types Discovered: ${Object.keys(domainInfo.pageTypes || {}).length}`);
    
    if (domainInfo.pageTypes) {
      console.log('\n   📄 Page Type Details:');
      Object.entries(domainInfo.pageTypes).forEach(([pageType, details]) => {
        console.log(`      ${pageType.toUpperCase()}:`);
        console.log(`         URL Pattern: ${details.urlPattern}`);
        console.log(`         Interactions: ${details.count}`);
        console.log(`         Elements: ${details.elementPatterns?.slice(0, 5).join(', ') || 'none'}${details.elementPatterns?.length > 5 ? '...' : ''}`);
      });
    }
    
    console.log(`\n   🌐 Site Coverage:`);
    console.log(`      Unique Pages: ${domainInfo.siteCoverage?.uniquePages || 0}`);
    console.log(`      Total Interactions: ${domainInfo.siteCoverage?.totalInteractions || 0}`);
    console.log(`      Page Depth: ${domainInfo.siteCoverage?.averagePageDepth || 0}`);
    
    // Navigation Architecture Analysis
    console.log('\n🧭 NAVIGATION ARCHITECTURE EXTRACTED:');
    const navArch = extractedData.navigationArchitecture;
    
    console.log(`   Category Hierarchy:`);
    console.log(`      Root Categories: ${navArch.categoryHierarchy?.rootCategories?.length || 0}`);
    console.log(`      Max Depth: ${navArch.categoryHierarchy?.maxDepth || 0}`);
    console.log(`      Total Categories: ${navArch.categoryHierarchy?.totalCategories || 0}`);
    
    if (navArch.categoryHierarchy?.rootCategories?.length > 0) {
      console.log('\n   📂 Root Categories Found:');
      navArch.categoryHierarchy.rootCategories.forEach((category, i) => {
        console.log(`      ${i + 1}. ${category.categoryName || category.name || 'Unnamed'}`);
        console.log(`         Path: ${category.categoryPath || 'unknown'}`);
        console.log(`         Type: ${category.categoryType || 'unknown'}`);
      });
    }
    
    console.log(`\n   🔗 Navigation Patterns:`);
    console.log(`      Primary Navigation: ${navArch.navigationPatterns?.primaryNavigation?.length || 0} patterns`);
    console.log(`      Secondary Navigation: ${navArch.navigationPatterns?.secondaryNavigation?.length || 0} patterns`);
    
    if (navArch.navigationPatterns?.primaryNavigation?.length > 0) {
      console.log('\n   🧭 Primary Navigation Patterns (top 10):');
      navArch.navigationPatterns.primaryNavigation.slice(0, 10).forEach((pattern, i) => {
        console.log(`      ${i + 1}. ${pattern.linkText || 'No text'} → ${pattern.targetUrl || 'unknown'}`);
        console.log(`         Element: ${pattern.elementType || 'unknown'} | Position: ${pattern.position || 'unknown'}`);
      });
    }
    
    console.log(`\n   🌍 Cross-Page Relationships:`);
    console.log(`      Total Relationships: ${navArch.crossPageRelationships?.length || 0}`);
    
    if (navArch.crossPageRelationships?.length > 0) {
      console.log('\n   🔗 Page Relationships (top 5):');
      navArch.crossPageRelationships.slice(0, 5).forEach((rel, i) => {
        console.log(`      ${i + 1}. ${rel.fromPage || 'unknown'} → ${rel.toPage || 'unknown'}`);
        console.log(`         Type: ${rel.relationshipType || 'unknown'} | Strength: ${rel.relationshipStrength || 0}`);
      });
    }
    
    console.log(`\n   📍 URL Patterns:`);
    console.log(`      Routing Patterns: ${navArch.urlPatterns?.routingPatterns?.length || 0}`);
    console.log(`      Parameter Patterns: ${navArch.urlPatterns?.parameterPatterns?.length || 0}`);
    
    // Shopping Flow Analysis
    console.log('\n🛒 SHOPPING FLOW ANALYSIS:');
    const shoppingFlow = extractedData.shoppingFlowAnalysis;
    
    console.log(`   Purchase Funnel:`);
    console.log(`      Total Stages: ${shoppingFlow.purchaseFunnel?.totalStages || 0}`);
    console.log(`      Current Status: ${shoppingFlow.purchaseFunnel?.currentStatus || 'unknown'}`);
    console.log(`      Completion Rate: ${((shoppingFlow.flowCompletionRate || 0) * 100).toFixed(1)}%`);
    
    if (shoppingFlow.purchaseFunnel?.stages?.length > 0) {
      console.log('\n   🔄 Purchase Funnel Stages:');
      shoppingFlow.purchaseFunnel.stages.forEach((stage, i) => {
        console.log(`      Stage ${stage.stageNumber || i + 1}: ${stage.stageName || 'Unknown'}`);
        console.log(`         Page Type: ${stage.pageType || 'unknown'} | Actions: ${stage.actions || 0}`);
        console.log(`         Conversion Rate: ${((stage.conversionRate || 0) * 100).toFixed(1)}%`);
      });
    }
    
    console.log(`\n   🛍️ Cart Workflow:`);
    console.log(`      Cart Actions: ${shoppingFlow.cartWorkflow?.cartActions?.length || 0}`);
    console.log(`      Add to Cart Events: ${shoppingFlow.cartWorkflow?.addToCartEvents || 0}`);
    console.log(`      Cart Abandonment: ${shoppingFlow.cartWorkflow?.cartAbandonment ? 'Yes' : 'No'}`);
    
    if (shoppingFlow.cartWorkflow?.cartActions?.length > 0) {
      console.log('\n   🛒 Cart Actions Detected:');
      shoppingFlow.cartWorkflow.cartActions.forEach((action, i) => {
        console.log(`      ${i + 1}. ${action.actionType || 'unknown'}: ${action.productId || 'unknown product'}`);
        console.log(`         Timestamp: ${new Date(action.timestamp || 0).toISOString()}`);
        console.log(`         Context: ${action.context || 'unknown'}`);
      });
    }
    
    console.log(`\n   ⚙️ Product Configuration:`);
    console.log(`      Configuration Steps: ${shoppingFlow.productConfiguration?.configurationSteps || 0}`);
    console.log(`      Product Customization: ${shoppingFlow.productConfiguration?.productCustomization ? 'Available' : 'Not Available'}`);
    
    // Product Information Architecture
    console.log('\n📦 PRODUCT INFORMATION ARCHITECTURE:');
    const productInfo = extractedData.productInformationArchitecture;
    
    console.log(`   Products Analyzed: ${productInfo.productsAnalyzed || 0}`);
    console.log(`   Product Types: ${productInfo.productTypes?.length || 0}`);
    console.log(`   Variant Patterns: ${productInfo.variantPatterns?.length || 0}`);
    console.log(`   Price Information: ${productInfo.priceInformationAvailable ? 'Available' : 'Not Available'}`);
    
    if (productInfo.productTypes?.length > 0) {
      console.log(`\n   🏷️ Product Types Found: ${productInfo.productTypes.join(', ')}`);
    }
    
    // Check for actual product interactions
    if (extractedData.productInteractions?.length > 0) {
      console.log('\n   🛍️ Product Interactions Detected:');
      extractedData.productInteractions.forEach((interaction, i) => {
        console.log(`      ${i + 1}. Product: ${interaction.productId || 'unknown'}`);
        console.log(`         Page: ${interaction.pageUrl || 'unknown'}`);
        console.log(`         Action: ${interaction.actionType || 'unknown'}`);
        console.log(`         Element: ${interaction.elementText || 'no text'}`);
      });
    }
    
    // Product Variants
    if (extractedData.productVariants?.length > 0) {
      console.log('\n   🎨 Product Variants Found:');
      extractedData.productVariants.forEach((variant, i) => {
        console.log(`      ${i + 1}. Product: ${variant.baseProductId || 'unknown'}`);
        console.log(`         Colors: ${variant.colorVariants?.length || 0}`);
        console.log(`         Sizes: ${variant.sizeInteractions?.length || 0}`);
        console.log(`         Actions: ${variant.actionElements?.length || 0}`);
      });
    }
    
    // UI Component Library Analysis
    console.log('\n🎨 UI COMPONENT LIBRARY ANALYSIS:');
    const uiLibrary = extractedData.uiComponentLibrary;
    
    console.log(`   Component Taxonomy:`);
    console.log(`      UI Components: ${uiLibrary.componentTaxonomy?.uiComponents?.length || 0}`);
    console.log(`      Component Hierarchy: ${uiLibrary.componentTaxonomy?.componentHierarchy?.length || 0}`);
    console.log(`      Component Variants: ${uiLibrary.componentTaxonomy?.componentVariants?.length || 0}`);
    
    if (uiLibrary.componentTaxonomy?.uiComponents?.length > 0) {
      console.log('\n   🧩 UI Components Found (top 10):');
      uiLibrary.componentTaxonomy.uiComponents.slice(0, 10).forEach((component, i) => {
        console.log(`      ${i + 1}. ${component.componentName || 'unnamed'} (${component.componentType || 'unknown'})`);
        console.log(`         Category: ${component.componentCategory || 'unknown'}`);
        console.log(`         Usage: ${component.usageFrequency || 0}x | Business Value: ${component.businessValue || 'unknown'}`);
        console.log(`         Functionality: ${component.functionality || 'unknown'}`);
      });
    }
    
    console.log(`\n   ⚡ Interaction Patterns:`);
    console.log(`      Click Patterns: ${uiLibrary.interactionPatterns?.clickPatterns?.length || 0}`);
    console.log(`      Hover Patterns: ${uiLibrary.interactionPatterns?.hoverPatterns?.length || 0}`);
    console.log(`      Form Patterns: ${uiLibrary.interactionPatterns?.formInteractionPatterns?.length || 0}`);
    
    console.log(`\n   📐 Layout Patterns:`);
    console.log(`      Responsive Breakpoints: ${uiLibrary.layoutPatterns?.responsiveBreakpoints?.length || 0}`);
    console.log(`      Grid Systems: ${uiLibrary.layoutPatterns?.gridSystems?.length || 0}`);
    console.log(`      Layout Components: ${uiLibrary.layoutPatterns?.layoutComponents?.length || 0}`);
    
    console.log(`\n   ♿ Accessibility Patterns:`);
    console.log(`      ARIA Patterns: ${uiLibrary.accessibilityPatterns?.ariaPatterns?.length || 0}`);
    console.log(`      Keyboard Navigation: ${uiLibrary.accessibilityPatterns?.keyboardNavigationPatterns?.length || 0}`);
    console.log(`      Overall Accessibility Score: ${((uiLibrary.accessibilityPatterns?.overallAccessibilityScore || 0) * 100).toFixed(1)}%`);
    
    console.log(`\n   🎨 Design System:`);
    console.log(`      Color Palette: ${uiLibrary.designSystemAnalysis?.colorPalette?.length || 0} colors`);
    console.log(`      Typography Patterns: ${uiLibrary.designSystemAnalysis?.typographyPatterns?.length || 0}`);
    console.log(`      Spacing Patterns: ${uiLibrary.designSystemAnalysis?.spacingPatterns?.length || 0}`);
    console.log(`      Consistency Score: ${((uiLibrary.designSystemAnalysis?.consistencyScore || 0) * 100).toFixed(1)}%`);
    
    // Raw interaction analysis
    console.log('\n🔍 RAW INTERACTION ANALYSIS:');
    const interactions = Array.isArray(session.enhancedInteractions) ? 
      session.enhancedInteractions : 
      JSON.parse(session.enhancedInteractions || '[]');
    
    console.log(`   Total Raw Interactions: ${interactions.length}`);
    
    // Analyze interaction types
    const interactionTypes = {};
    const elementTypes = {};
    const pageUrls = new Set();
    
    interactions.forEach(interaction => {
      const type = interaction.type || 'unknown';
      interactionTypes[type] = (interactionTypes[type] || 0) + 1;
      
      const elementTag = interaction.element?.tag || interaction.element?.tagName || 'unknown';
      elementTypes[elementTag] = (elementTypes[elementTag] || 0) + 1;
      
      if (interaction.context?.url) {
        pageUrls.add(interaction.context.url);
      }
    });
    
    console.log('\n   📊 Interaction Types:');
    Object.entries(interactionTypes).forEach(([type, count]) => {
      console.log(`      ${type}: ${count} times`);
    });
    
    console.log('\n   🏷️ Element Types Interacted With:');
    Object.entries(elementTypes).forEach(([tag, count]) => {
      console.log(`      ${tag}: ${count} times`);
    });
    
    console.log(`\n   🌐 Unique Pages Visited: ${pageUrls.size}`);
    if (pageUrls.size > 0) {
      console.log('   📄 Page URLs (top 5):');
      Array.from(pageUrls).slice(0, 5).forEach((url, i) => {
        const shortUrl = url.length > 80 ? url.substring(0, 80) + '...' : url;
        console.log(`      ${i + 1}. ${shortUrl}`);
      });
    }
    
    // Home Depot specific analysis
    console.log('\n🏠 HOME DEPOT SPECIFIC INSIGHTS:');
    
    // Look for Home Depot specific patterns
    const homeDepotElements = interactions.filter(i => 
      i.element?.text?.toLowerCase().includes('depot') ||
      i.context?.url?.includes('homedepot') ||
      i.element?.text?.toLowerCase().includes('tool') ||
      i.element?.text?.toLowerCase().includes('cart') ||
      i.element?.text?.toLowerCase().includes('add')
    );
    
    console.log(`   Home Depot Specific Interactions: ${homeDepotElements.length}`);
    
    if (homeDepotElements.length > 0) {
      console.log('\n   🔨 Home Depot Specific Elements:');
      homeDepotElements.slice(0, 10).forEach((element, i) => {
        console.log(`      ${i + 1}. "${element.element?.text || 'no text'}" (${element.element?.tag || 'unknown'})`);
        if (element.context?.url) {
          const shortUrl = element.context.url.length > 60 ? element.context.url.substring(0, 60) + '...' : element.context.url;
          console.log(`         URL: ${shortUrl}`);
        }
      });
    }
    
    // Summary Assessment
    console.log('\n📊 HOME DEPOT EXTRACTION SUMMARY:');
    console.log('='.repeat(80));
    
    const domainSuccess = domainInfo && domainInfo.domainName;
    const navSuccess = navArch && navArch.navigationPatterns?.primaryNavigation?.length > 0;
    const shoppingSuccess = shoppingFlow && shoppingFlow.cartWorkflow?.cartActions?.length > 0;
    const uiSuccess = uiLibrary && uiLibrary.componentTaxonomy?.uiComponents?.length > 0;
    
    console.log(`   ✅ Domain Information: ${domainSuccess ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   ✅ Navigation Architecture: ${navSuccess ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   ✅ Shopping Flow Analysis: ${shoppingSuccess ? 'SUCCESS' : 'PARTIAL'}`);
    console.log(`   ✅ UI Component Library: ${uiSuccess ? 'SUCCESS' : 'FAILED'}`);
    
    const successCount = [domainSuccess, navSuccess, shoppingSuccess, uiSuccess].filter(Boolean).length;
    const successRate = (successCount / 4) * 100;
    
    console.log(`\n   Overall Success Rate: ${successRate.toFixed(1)}% (${successCount}/4 phases)`);
    console.log(`   Data Quality: Rich home improvement retail intelligence extracted`);
    console.log(`   Business Value: High - competitive insights for home improvement sector`);
    
  } catch (error) {
    console.error('❌ Analysis error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzeHomeDepotBreakdown().catch(console.error);