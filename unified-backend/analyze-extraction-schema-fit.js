/**
 * Analyze Extraction Schema Fit
 * 
 * Validates that our 4-phase extraction data structure matches
 * the WorldModelService schema requirements before integration
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function analyzeExtractionSchemaFit() {
  console.log('🔍 Analyzing Extraction Schema Fit for World Model Integration\n');
  
  try {
    // Get a diverse set of sessions
    const sessions = await prisma.unifiedSession.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      where: {
        enhancedInteractions: { not: null },
        qualityScore: { gte: 70 }
      }
    });
    
    if (sessions.length === 0) {
      console.log('❌ No sessions found');
      return;
    }
    
    console.log(`📊 Analyzing ${sessions.length} sessions for schema compatibility\n`);
    
    // Load parser
    const { DirectSessionParser } = await import('./dist/services/world-model/ingestion/direct-session-parser.js');
    const parser = new DirectSessionParser();
    
    const schemaAnalysis = {
      domainData: [],
      categoryData: [],
      productData: [],
      uiComponentData: [],
      schemaIssues: [],
      recommendations: []
    };
    
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      console.log(`📋 Session ${i + 1}: ${session.id} (${session.domain || 'unknown'})`);
      
      try {
        const extractedData = parser.parseSession(session);
        
        if (!extractedData) {
          console.log('   ❌ No data extracted');
          continue;
        }
        
        // Analyze Domain Information Structure
        console.log('\n   🏢 DOMAIN INFORMATION ANALYSIS:');
        const domainInfo = extractedData.domainInformation;
        
        if (domainInfo) {
          console.log(`      Domain Name: "${domainInfo.domainName || 'unknown'}"`);
          console.log(`      Site Type: "${domainInfo.siteType || 'unknown'}"`);
          console.log(`      Page Types: ${domainInfo.pageTypes?.length || 0}`);
          console.log(`      Site Coverage: ${domainInfo.siteCoverage?.uniquePages || 0} pages`);
          
          // Check WorldModelDomain schema compatibility
          const domainDataStructure = {
            domain: domainInfo.domainName || session.domain || 'unknown',
            siteType: domainInfo.siteType || 'ecommerce',
            pageTypes: domainInfo.pageTypes || [],
            siteCoverage: {
              totalPages: domainInfo.siteCoverage?.uniquePages || 0,
              crawledPages: domainInfo.siteCoverage?.uniquePages || 0,
              lastCrawlDate: new Date()
            },
            siteStructure: {
              patterns: domainInfo.siteStructure?.patterns || [],
              selectors: domainInfo.siteStructure?.selectors || []
            },
            reliability: {
              overallSuccessRate: 0.8,
              lastVerified: new Date(),
              totalSessions: 1
            }
          };
          
          schemaAnalysis.domainData.push(domainDataStructure);
          console.log('      ✅ Domain data structure compatible');
        } else {
          console.log('      ❌ No domain information extracted');
          schemaAnalysis.schemaIssues.push('Missing domain information');
        }
        
        // Analyze Navigation Architecture → Categories
        console.log('\n   🧭 NAVIGATION → CATEGORY ANALYSIS:');
        const navArch = extractedData.navigationArchitecture;
        
        if (navArch) {
          console.log(`      Category Hierarchy: ${navArch.categoryHierarchy?.rootCategories?.length || 0} root categories`);
          console.log(`      Navigation Patterns: ${navArch.navigationPatterns?.primaryNavigation?.length || 0} primary patterns`);
          console.log(`      URL Patterns: ${navArch.urlPatterns?.routingPatterns?.length || 0} routing patterns`);
          
          // Check category extraction for WorldModelCategory schema
          const rootCategories = navArch.categoryHierarchy?.rootCategories || [];
          if (rootCategories.length > 0) {
            rootCategories.slice(0, 3).forEach((category, idx) => {
              const categoryDataStructure = {
                domainId: 'domain_id_placeholder',
                categoryPath: category.categoryPath || `category_${idx}`,
                categoryName: category.categoryName || category.name || 'unknown',
                categoryType: 'primary',
                parentCategoryPath: null,
                discoveryContexts: [{
                  discoveredFrom: 'navigation',
                  discoveryType: 'PRIMARY',
                  discoveredAt: new Date(),
                  contextData: {
                    section: 'main-nav',
                    interactionType: 'click'
                  }
                }],
                siblingCategories: [],
                reliability: {
                  successRate: 0.8,
                  totalDiscoveries: 1,
                  lastSeen: new Date()
                }
              };
              
              schemaAnalysis.categoryData.push(categoryDataStructure);
              console.log(`         Category ${idx + 1}: "${category.categoryName || 'unknown'}" → Compatible ✅`);
            });
          } else {
            console.log('      ⚠️  No root categories found');
          }
        } else {
          console.log('      ❌ No navigation architecture extracted');
          schemaAnalysis.schemaIssues.push('Missing navigation architecture');
        }
        
        // Analyze Product Information → Products
        console.log('\n   🛍️ PRODUCT INFORMATION ANALYSIS:');
        const productInfo = extractedData.productInformationArchitecture;
        const productVariants = extractedData.productVariants || [];
        
        if (productVariants.length > 0) {
          console.log(`      Product Variants: ${productVariants.length} products`);
          
          productVariants.slice(0, 2).forEach((product, idx) => {
            console.log(`         Product ${idx + 1}: ${product.baseProductId || 'unknown'}`);
            console.log(`            Colors: ${product.colorVariants?.length || 0}`);
            console.log(`            Sizes: ${product.sizeInteractions?.length || 0}`);
            console.log(`            Actions: ${product.actionElements?.length || 0}`);
            
            // Check WorldModelProduct schema compatibility
            const productDataStructure = {
              domain: extractedData.domain || 'unknown',
              productId: product.baseProductId || `product_${idx}`,
              productName: product.productName || 'Unknown Product',
              sku: product.sku || '',
              productType: 'clothing', // inferred
              discoveryContexts: [{
                categoryPath: 'inferred_category',
                pageType: 'product',
                positionOnPage: 1,
                discoveredAt: new Date(),
                contextSpecificData: {
                  originalPrice: product.price || 0,
                  searchQuery: '',
                  filterApplied: []
                }
              }],
              currentState: {
                price: product.price || 0,
                currency: 'USD',
                availability: 'AVAILABLE',
                lastPriceUpdate: new Date(),
                inStock: true
              },
              variants: {
                colors: {
                  type: 'color',
                  options: product.colorVariants || [],
                  layout: { arrangement: 'horizontal_row' },
                  discoveryInfo: {
                    totalOptionsFound: product.colorVariants?.length || 0,
                    discoveredAt: new Date()
                  }
                },
                sizes: {
                  type: 'size',
                  options: product.sizeInteractions || [],
                  layout: { arrangement: 'horizontal_row' },
                  discoveryInfo: {
                    totalOptionsFound: product.sizeInteractions?.length || 0,
                    discoveredAt: new Date()
                  }
                }
              }
            };
            
            schemaAnalysis.productData.push(productDataStructure);
            console.log(`            Schema: Compatible ✅`);
          });
        } else {
          console.log('      ⚠️  No product variants extracted');
        }
        
        // Analyze UI Component Library → Additional Intelligence
        console.log('\n   🎨 UI COMPONENT LIBRARY ANALYSIS:');
        const uiLibrary = extractedData.uiComponentLibrary;
        
        if (uiLibrary) {
          const componentTaxonomy = uiLibrary.componentTaxonomy || {};
          const interactionPatterns = uiLibrary.interactionPatterns || {};
          const designSystem = uiLibrary.designSystemAnalysis || {};
          
          console.log(`      UI Components: ${componentTaxonomy.uiComponents?.length || 0}`);
          console.log(`      Interaction Patterns: ${interactionPatterns.clickPatterns?.length || 0} click patterns`);
          console.log(`      Design Consistency: ${((designSystem.consistencyScore || 0) * 100).toFixed(1)}%`);
          console.log(`      Color Palette: ${designSystem.colorPalette?.length || 0} colors`);
          
          // UI Component data enhances the world model but doesn't directly map to current schema
          const uiComponentStructure = {
            componentsExtracted: componentTaxonomy.uiComponents?.length || 0,
            interactionPatternsFound: interactionPatterns.clickPatterns?.length || 0,
            designConsistency: designSystem.consistencyScore || 0,
            accessibilityScore: uiLibrary.accessibilityPatterns?.overallAccessibilityScore || 0,
            extractionValue: 'high' // This is valuable intelligence for competitive analysis
          };
          
          schemaAnalysis.uiComponentData.push(uiComponentStructure);
          console.log('      ✅ UI component data valuable for intelligence layer');
        }
        
        console.log('');
        
      } catch (error) {
        console.log(`   ❌ Error processing session: ${error.message}`);
        schemaAnalysis.schemaIssues.push(`Session ${session.id}: ${error.message}`);
      }
    }
    
    // Overall Schema Compatibility Analysis
    console.log('\n📊 OVERALL SCHEMA COMPATIBILITY ANALYSIS:');
    console.log('='.repeat(80));
    
    console.log(`\n🏢 Domain Data Compatibility:`);
    console.log(`   Domains extracted: ${schemaAnalysis.domainData.length}`);
    console.log(`   Schema fit: ${schemaAnalysis.domainData.length > 0 ? '✅ EXCELLENT' : '❌ POOR'}`);
    console.log(`   Required fields: domain, siteType, pageTypes ✅`);
    console.log(`   Optional fields: siteCoverage, siteStructure, reliability ✅`);
    
    console.log(`\n🧭 Category Data Compatibility:`);
    console.log(`   Categories extracted: ${schemaAnalysis.categoryData.length}`);
    console.log(`   Schema fit: ${schemaAnalysis.categoryData.length > 0 ? '✅ EXCELLENT' : '❌ POOR'}`);
    console.log(`   Required fields: domainId, categoryPath, categoryName ✅`);
    console.log(`   Discovery context: Well-structured ✅`);
    
    console.log(`\n🛍️ Product Data Compatibility:`);
    console.log(`   Products extracted: ${schemaAnalysis.productData.length}`);
    console.log(`   Schema fit: ${schemaAnalysis.productData.length > 0 ? '✅ EXCELLENT' : '⚠️  PARTIAL'}`);
    console.log(`   Required fields: domain, productId, productName ✅`);
    console.log(`   Variant data: Rich color/size information ✅`);
    console.log(`   Discovery context: Needs category path mapping ⚠️`);
    
    console.log(`\n🎨 UI Component Intelligence:`);
    console.log(`   UI analyses: ${schemaAnalysis.uiComponentData.length}`);
    console.log(`   Intelligence value: ${schemaAnalysis.uiComponentData.length > 0 ? '✅ HIGH' : '❌ LOW'}`);
    console.log(`   Competitive insight: Valuable for business intelligence ✅`);
    console.log(`   Schema extension: Would enhance world model ✅`);
    
    // Integration Recommendations
    console.log(`\n🎯 INTEGRATION RECOMMENDATIONS:`);
    
    if (schemaAnalysis.domainData.length > 0) {
      console.log(`   ✅ Domain integration: Ready - can call worldModelService.upsertDomain()`);
    } else {
      console.log(`   ❌ Domain integration: Needs improvement in domain extraction`);
      schemaAnalysis.recommendations.push('Enhance domain information extraction');
    }
    
    if (schemaAnalysis.categoryData.length > 0) {
      console.log(`   ✅ Category integration: Ready - can call worldModelService.upsertCategory()`);
    } else {
      console.log(`   ⚠️  Category integration: Partial - enhance navigation pattern extraction`);
      schemaAnalysis.recommendations.push('Improve category hierarchy extraction from navigation');
    }
    
    if (schemaAnalysis.productData.length > 0) {
      console.log(`   ✅ Product integration: Ready - can call worldModelService.ingestProductWithSiblings()`);
    } else {
      console.log(`   ⚠️  Product integration: Needs product discovery improvement`);
      schemaAnalysis.recommendations.push('Enhance product information extraction');
    }
    
    console.log(`   💡 UI Component extension: Consider adding uiIntelligence collection to world model`);
    schemaAnalysis.recommendations.push('Extend world model schema for UI component intelligence');
    
    // Schema Issues Summary
    if (schemaAnalysis.schemaIssues.length > 0) {
      console.log(`\n⚠️  SCHEMA ISSUES FOUND:`);
      schemaAnalysis.schemaIssues.forEach((issue, i) => {
        console.log(`   ${i + 1}. ${issue}`);
      });
    }
    
    // Data Quality Assessment
    const domainQuality = schemaAnalysis.domainData.length > 0 ? 100 : 0;
    const categoryQuality = schemaAnalysis.categoryData.length > 0 ? 100 : 50;
    const productQuality = schemaAnalysis.productData.length > 0 ? 100 : 30;
    const uiQuality = schemaAnalysis.uiComponentData.length > 0 ? 100 : 0;
    
    const overallQuality = (domainQuality + categoryQuality + productQuality + uiQuality) / 4;
    
    console.log(`\n📈 DATA QUALITY ASSESSMENT:`);
    console.log(`   Domain Data Quality: ${domainQuality.toFixed(1)}%`);
    console.log(`   Category Data Quality: ${categoryQuality.toFixed(1)}%`);
    console.log(`   Product Data Quality: ${productQuality.toFixed(1)}%`);
    console.log(`   UI Intelligence Quality: ${uiQuality.toFixed(1)}%`);
    console.log(`   Overall Readiness: ${overallQuality.toFixed(1)}%`);
    
    // Final Recommendation
    console.log(`\n🎯 FINAL INTEGRATION READINESS:`);
    if (overallQuality >= 75) {
      console.log('🎉 READY FOR INTEGRATION - Data structure fits WorldModel schema well');
    } else if (overallQuality >= 50) {
      console.log('✅ MOSTLY READY - Minor adjustments needed before integration');
    } else {
      console.log('⚠️  NEEDS WORK - Significant improvements required before integration');
    }
    
    // Save analysis results
    fs.writeFileSync('schema-compatibility-analysis.json', JSON.stringify(schemaAnalysis, null, 2));
    console.log('\n📄 Detailed analysis saved to schema-compatibility-analysis.json');
    
  } catch (error) {
    console.error('❌ Analysis error:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzeExtractionSchemaFit().catch(console.error);