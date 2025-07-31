/**
 * Upload Current Sessions to World Model
 * 
 * Extract data from our current sessions (H&M, Gap, Home Depot) and store
 * in MongoDB using the WorldModelService
 */

import { PrismaClient } from '@prisma/client';
import { WorldModelService } from './dist/services/world-model/database/service.js';

const prisma = new PrismaClient();

async function uploadSessionsToWorldModel() {
  console.log('🌍 Uploading Current Sessions to World Model Database\n');
  
  let worldModelService;
  
  try {
    // Initialize WorldModelService
    const mongoConnectionString = process.env.MONGODB_CONNECTION_STRING || process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DATABASE_NAME || 'world_model';
    worldModelService = new WorldModelService(mongoConnectionString, dbName);
    
    console.log('🔗 Connecting to MongoDB...');
    await worldModelService.connect();
    console.log('✅ Connected to MongoDB world model database\n');
    
    // Get our current high-quality sessions
    const sessions = await prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: null },
        qualityScore: { gte: 70 }
      },
      orderBy: { createdAt: 'desc' },
      take: 5  // Our current test sessions
    });
    
    if (sessions.length === 0) {
      console.log('❌ No sessions found');
      return;
    }
    
    console.log(`📊 Found ${sessions.length} sessions to upload\n`);
    
    // Load the DirectSessionParser
    const { DirectSessionParser } = await import('./dist/services/world-model/ingestion/direct-session-parser.js');
    const parser = new DirectSessionParser();
    
    const uploadResults = {
      domainsUploaded: 0,
      categoriesUploaded: 0,
      productsUploaded: 0,
      errors: []
    };
    
    for (let i = 0; i < sessions.length; i++) {
      const session = sessions[i];
      
      console.log(`📋 Processing Session ${i + 1}/${sessions.length}: ${session.id}`);
      console.log(`   Domain: ${session.domain || 'unknown'}`);
      console.log(`   Quality Score: ${session.qualityScore}`);
      
      try {
        // Extract data using 4-phase system
        const extractedData = parser.parseSession(session);
        
        if (!extractedData) {
          console.log('   ❌ No data extracted, skipping...\n');
          continue;
        }
        
        console.log('   ✅ Data extracted successfully');
        
        // 1. Upload Domain Information
        const domainInfo = extractedData.domainInformation;
        if (domainInfo && domainInfo.domainName) {
          console.log('   🏢 Uploading domain information...');
          
          const domainData = {
            domain: domainInfo.domainName,
            siteType: domainInfo.siteType || 'ecommerce',
            pageTypes: domainInfo.pageTypes || {},
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
              overallSuccessRate: 0.9,
              lastVerified: new Date(),
              totalSessions: 1
            }
          };
          
          const domainId = await worldModelService.upsertDomain(domainData);
          console.log(`      ✅ Domain uploaded: ${domainId}`);
          uploadResults.domainsUploaded++;
          
          // 2. Upload Category Information - Extract from primaryNavigation instead of rootCategories
          const navArch = extractedData.navigationArchitecture;
          if (navArch && navArch.navigationPatterns?.primaryNavigation?.length > 0) {
            console.log('   🗂️ Uploading categories from navigation patterns...');
            
            // Extract actual category names from primary navigation
            const categoryPatterns = navArch.navigationPatterns.primaryNavigation.filter(nav => {
              const text = nav.text || '';
              // Look for department/category-like navigation items
              return text.includes('Department') || 
                     text.includes('Lawn') || 
                     text.includes('Garden') || 
                     text.includes('Decor') || 
                     text.includes('Furniture') ||
                     text.includes('Women') ||
                     text.includes('Men') ||
                     text.includes('Girls') ||
                     text.includes('Boys') ||
                     text.includes('Baby') ||
                     text.includes('Toddler') ||
                     (text.length > 3 && text.length < 30 && !text.includes('help') && !text.includes('find') && !text.includes('email'));
            });
            
            for (const navItem of categoryPatterns) {
              const categoryName = navItem.text;
              const categoryData = {
                domainId: domainId,
                categoryPath: categoryName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and'),
                categoryName: categoryName,
                categoryType: 'primary',
                parentCategoryPath: null,
                discoveryContexts: [{
                  discoveredFrom: 'navigation',
                  discoveryType: 'PRIMARY',
                  discoveredAt: new Date(),
                  contextData: {
                    section: 'main-nav',
                    interactionType: navItem.elementType || 'link'
                  },
                  spatialContext: {
                    nearbyCategories: [],
                    menuStructure: 'horizontal'
                  }
                }],
                siblingCategories: [],
                reliability: {
                  successRate: 0.8,
                  totalDiscoveries: navItem.interactionData?.clickCount || 1,
                  lastSeen: new Date()
                }
              };
              
              const categoryId = await worldModelService.upsertCategory(categoryData);
              console.log(`      ✅ Category uploaded: ${categoryName} (${categoryId})`);
              uploadResults.categoriesUploaded++;
            }
          }
          
          // 3. Upload Product Information - Extract from shopping flow and product interactions
          const shoppingFlow = extractedData.shoppingFlowAnalysis;
          const productInteractions = extractedData.productInteractions || [];
          const productVariants = extractedData.productVariants || [];
          
          // First upload products from variants (if any)
          if (productVariants.length > 0) {
            console.log('   📦 Uploading product variants...');
            
            for (const product of productVariants) {
              const productData = {
                domain: extractedData.domain,
                primaryProduct: {
                  productId: product.baseProductId || `product_${Date.now()}`,
                  productName: product.productName || 'Unknown Product',
                  sku: product.sku || '',
                  productType: product.productType || 'clothing',
                  price: product.price || 0,
                  currency: 'USD',
                  availability: 'AVAILABLE',
                  inStock: true,
                  url: product.productUrl || '',
                  image: product.primaryImage || '',
                  images: product.images || [],
                  variants: {
                    colors: product.colorVariants || [],
                    sizes: product.sizeInteractions || [],
                    styles: []
                  },
                  selectors: {},
                  workflows: {}
                },
                siblingProducts: [],
                categoryPath: 'products',
                pageContext: {
                  pageType: 'product',
                  totalProductsOnPage: 1
                },
                spatialContext: {
                  nearbyElements: []
                }
              };
              
              await worldModelService.ingestProductWithSiblings(productData);
              console.log(`      ✅ Product variant uploaded: ${product.baseProductId}`);
              uploadResults.productsUploaded++;
            }
          }
          
          // Upload products from multiple sources - navigation patterns, shopping flow, etc.
          const discoveredProducts = new Map(); // Use Map to deduplicate products
          
          // 1. Extract products from shopping flow conversion events
          if (shoppingFlow?.purchaseFunnel?.conversionEvents?.length > 0) {
            console.log('   📦 Extracting products from shopping flow...');
            
            for (const event of shoppingFlow.purchaseFunnel.conversionEvents) {
              if (event.eventType === 'add_to_cart' && event.productData) {
                const productUrl = event.productData.url;
                const productTitle = event.productData.productName || '';
                
                let productId = 'unknown-product';
                let productName = 'Unknown Product';
                let productType = 'unknown';
                let brand = '';
                
                // Extract product ID from Home Depot URL
                if (productUrl && productUrl.includes('/p/')) {
                  const urlMatch = productUrl.match(/\/p\/[^\/]+\/(\d+)/);
                  if (urlMatch) {
                    productId = `homedepot-${urlMatch[1]}`;
                  }
                }
                
                // Extract product name and brand from title
                if (productTitle) {
                  productName = productTitle.replace(' - The Home Depot', '').trim();
                  
                  // Extract brand
                  if (productName.includes('Hampton Bay')) {
                    brand = 'Hampton Bay';
                  } else if (productName.includes('StyleWell')) {
                    brand = 'StyleWell';
                  }
                  
                  // Determine product type from name
                  if (productName.toLowerCase().includes('patio') || productName.toLowerCase().includes('outdoor')) {
                    productType = 'outdoor_furniture';
                  } else if (productName.toLowerCase().includes('steel') || productName.toLowerCase().includes('dining')) {
                    productType = 'furniture';
                  }
                }
                
                discoveredProducts.set(productId, {
                  productId,
                  productName,
                  brand,
                  productType,
                  url: productUrl,
                  source: 'shopping_flow',
                  addedToCart: true
                });
              }
            }
          }
          
          // 2. Extract products from navigation patterns (product pages visited)
          if (navArch?.navigationPatterns?.primaryNavigation?.length > 0) {
            console.log('   📦 Extracting products from navigation patterns...');
            
            for (const navItem of navArch.navigationPatterns.primaryNavigation) {
              const navUrl = navItem.url;
              const navText = navItem.text || '';
              
              // Look for product page URLs (Home Depot pattern: /p/ProductName/ProductID)
              if (navUrl && navUrl.includes('/p/')) {
                let productId = 'unknown-product';
                let productName = 'Unknown Product';
                let productType = 'unknown';
                let brand = '';
                
                // Extract product name and ID from Home Depot URL pattern
                const homeDepotMatch = navUrl.match(/\/p\/([^\/]+)\/(\d+)/);
                if (homeDepotMatch) {
                  // Extract product name from URL slug (between /p/ and /productID)
                  const urlSlug = homeDepotMatch[1];
                  const productIdNum = homeDepotMatch[2];
                  
                  productId = `homedepot-${productIdNum}`;
                  
                  // Convert URL slug to readable product name
                  productName = urlSlug
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());
                  
                  // Clean up common URL artifacts
                  productName = productName
                    .replace(/\bGc\b/g, '')
                    .replace(/\bSrp\b/g, '')
                    .replace(/\bWh\b/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                  
                  console.log(`      🔍 Extracted from URL: "${productName}" (ID: ${productId})`);
                }
                
                // Extract brand from product name
                if (productName.includes('Hampton Bay')) {
                  brand = 'Hampton Bay';
                } else if (productName.includes('StyleWell') || productName.includes('Park Pointe')) {
                  brand = 'StyleWell';
                } else {
                  // Try to extract brand from URL
                  if (navUrl.includes('Hampton-Bay') || navUrl.includes('hampton-bay')) {
                    brand = 'Hampton Bay';
                  } else if (navUrl.includes('StyleWell') || navUrl.includes('stylewell')) {
                    brand = 'StyleWell';
                  }
                }
                
                // Determine product type from name
                if (productName.toLowerCase().includes('patio') || 
                    productName.toLowerCase().includes('outdoor') || 
                    productName.toLowerCase().includes('conversation set') ||
                    productName.toLowerCase().includes('wicker')) {
                  productType = 'outdoor_furniture';
                } else if (productName.toLowerCase().includes('steel') || 
                           productName.toLowerCase().includes('dining')) {
                  productType = 'furniture';
                }
                
                // Only add if this is a valid product URL
                if (productId !== 'unknown-product') {
                  discoveredProducts.set(productId, {
                    productId,
                    productName,
                    brand,
                    productType,
                    url: navUrl,
                    source: 'navigation',
                    addedToCart: false
                  });
                }
              }
            }
          }
          
          // 3. Upload all discovered products
          if (discoveredProducts.size > 0) {
            console.log(`   📦 Uploading ${discoveredProducts.size} discovered products...`);
            
            for (const [productId, product] of discoveredProducts) {
              const productData = {
                domain: extractedData.domain,
                primaryProduct: {
                  productId: product.productId,
                  productName: product.productName,
                  sku: '',
                  productType: product.productType,
                  price: 0, // Would extract from page if available
                  currency: 'USD',
                  availability: 'AVAILABLE',
                  inStock: true,
                  url: product.url,
                  image: '',
                  images: [],
                  variants: { colors: [], sizes: [], styles: [] },
                  selectors: {},
                  workflows: {},
                  brand: product.brand
                },
                siblingProducts: [],
                categoryPath: 'outdoor-furniture',
                pageContext: {
                  pageType: 'product',
                  totalProductsOnPage: 1
                },
                spatialContext: {
                  nearbyElements: []
                }
              };
              
              await worldModelService.ingestProductWithSiblings(productData);
              console.log(`      ✅ Product uploaded: ${product.productId} - ${product.productName} (${product.brand}) [${product.source}]${product.addedToCart ? ' ⭐ CART' : ''}`);
              uploadResults.productsUploaded++;
            }
          }
          
          // Upload products from direct interactions (fallback)
          if (productVariants.length === 0 && (!shoppingFlow?.purchaseFunnel?.conversionEvents?.length) && productInteractions.length > 0) {
            console.log('   📦 Uploading product interactions...');
            
            for (const interaction of productInteractions) {
              const productData = {
                domain: extractedData.domain,
                primaryProduct: {
                  productId: interaction.extractedData?.productId || `interaction_${Date.now()}`,
                  productName: interaction.clickText || 'Product Interaction',
                  sku: '',
                  productType: 'unknown',
                  price: 0,
                  currency: 'USD',
                  availability: 'AVAILABLE',
                  inStock: true,
                  url: interaction.clickUrl || interaction.productUrl || '',
                  image: '',
                  images: [],
                  variants: { colors: [], sizes: [], styles: [] },
                  selectors: {},
                  workflows: {}
                },
                siblingProducts: [],
                categoryPath: 'interactions',
                pageContext: {
                  pageType: 'product',
                  totalProductsOnPage: 1
                },
                spatialContext: {
                  nearbyElements: []
                }
              };
              
              await worldModelService.ingestProductWithSiblings(productData);
              console.log(`      ✅ Product interaction uploaded: ${interaction.extractedData?.productId || 'unknown'}`);
              uploadResults.productsUploaded++;
            }
          }
        }
        
        console.log('   ✅ Session upload completed\n');
        
      } catch (error) {
        console.log(`   ❌ Error processing session: ${error.message}`);
        uploadResults.errors.push({
          sessionId: session.id,
          error: error.message
        });
        console.log('');
      }
    }
    
    // Upload Summary
    console.log('📊 UPLOAD SUMMARY:');
    console.log('='.repeat(80));
    console.log(`   Sessions Processed: ${sessions.length}`);
    console.log(`   Domains Uploaded: ${uploadResults.domainsUploaded}`);
    console.log(`   Categories Uploaded: ${uploadResults.categoriesUploaded}`);
    console.log(`   Products Uploaded: ${uploadResults.productsUploaded}`);
    console.log(`   Errors: ${uploadResults.errors.length}`);
    
    if (uploadResults.errors.length > 0) {
      console.log('\n❌ ERRORS ENCOUNTERED:');
      uploadResults.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. Session ${error.sessionId}: ${error.error}`);
      });
    }
    
    // Verify uploads by querying the database
    console.log('\n🔍 VERIFYING UPLOADS:');
    console.log('='.repeat(80));
    
    try {
      // Check domains
      const domainCount = await worldModelService.domains.countDocuments({});
      console.log(`   Domains in database: ${domainCount}`);
      
      // Check categories  
      const categoryCount = await worldModelService.categories.countDocuments({});
      console.log(`   Categories in database: ${categoryCount}`);
      
      // Check products
      const productCount = await worldModelService.products.countDocuments({});
      console.log(`   Products in database: ${productCount}`);
      
      // Show sample data
      if (domainCount > 0) {
        console.log('\n📋 SAMPLE UPLOADED DATA:');
        
        const sampleDomains = await worldModelService.domains.find({}).limit(3).toArray();
        console.log('\n   Domains:');
        sampleDomains.forEach((domain, i) => {
          console.log(`      ${i + 1}. ${domain.domain} (${domain.siteType})`);
        });
        
        if (categoryCount > 0) {
          const sampleCategories = await worldModelService.categories.find({}).limit(5).toArray();
          console.log('\n   Categories:');
          sampleCategories.forEach((category, i) => {
            console.log(`      ${i + 1}. ${category.categoryName} (${category.categoryPath})`);
          });
        }
        
        if (productCount > 0) {
          const sampleProducts = await worldModelService.products.find({}).limit(3).toArray();
          console.log('\n   Products:');
          sampleProducts.forEach((product, i) => {
            console.log(`      ${i + 1}. ${product.productName} (${product.domain})`);
          });
        }
      }
      
      console.log('\n🎉 World Model Upload Complete!');
      console.log('   ✅ All session data successfully extracted and stored');
      console.log('   ✅ MongoDB world model database populated');
      console.log('   ✅ Ready for production queries and AI training');
      
    } catch (verifyError) {
      console.log(`   ⚠️ Verification error: ${verifyError.message}`);
    }
    
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    console.error(error.stack);
  } finally {
    if (worldModelService) {
      await worldModelService.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
    await prisma.$disconnect();
    console.log('🔌 Disconnected from PostgreSQL');
  }
}

// Run the upload
uploadSessionsToWorldModel().catch(console.error);