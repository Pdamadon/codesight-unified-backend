/**
 * Search for H&M specific data in world model
 */

import { WorldModelService } from './dist/services/world-model/database/service.js';

async function searchHMData() {
  console.log('🔍 Searching for H&M Data in World Model...\n');
  
  const worldModel = new WorldModelService(
    "mongodb+srv://pdamadon:Locoman123@codesight-worldmodel.rt7hek9.mongodb.net/?retryWrites=true&w=majority&appName=codesight-worldmodel",
    "world_model"
  );

  await worldModel.connect();

  try {
    // Search for domains containing 'unknown' or 'hm'
    console.log('🌐 All Domains:');
    const allDomains = await worldModel.db.collection('world_model_domains').find({}).toArray();
    allDomains.forEach(domain => {
      console.log(`   • ${domain.siteName} (${domain.domain}) - ${domain.siteType}`);
      console.log(`     Created: ${domain.createdAt}`);
      console.log(`     ID: ${domain._id}`);
    });

    // Search for categories with 'sale', 'shoes', 'sneakers'
    console.log('\n👟 Search Results - Categories:');
    const hmCategories = await worldModel.db.collection('world_model_categories').find({
      $or: [
        { categoryName: { $regex: /(sale|shoes|sneakers)/i } },
        { categoryPath: { $regex: /(sale|shoes|sneakers)/i } }
      ]
    }).toArray();
    
    console.log(`   Found ${hmCategories.length} H&M-related categories:`);
    hmCategories.forEach(category => {
      console.log(`   • ${category.categoryName} (${category.categoryPath})`);
      console.log(`     Domain ID: ${category.domainId}`);
      console.log(`     Created: ${category.createdAt}`);
    });

    // Search for products with polo, cargo, sneakers
    console.log('\n👕 Search Results - Products:');
    const hmProducts = await worldModel.db.collection('world_model_products').find({
      $or: [
        { productName: { $regex: /(polo|cargo|sneakers|cotton|fit)/i } },
        { productId: { $regex: /(polo|cargo|sneakers|cotton|fit)/i } }
      ]
    }).toArray();
    
    console.log(`   Found ${hmProducts.length} H&M-related products:`);
    hmProducts.forEach(product => {
      console.log(`   • ${product.productName} - $${product.currentState.price}`);
      console.log(`     Domain: ${product.domain}`);
      console.log(`     Product ID: ${product.productId}`);
      console.log(`     Created: ${product.createdAt}`);
    });

    // Check total counts
    const totalDomains = await worldModel.db.collection('world_model_domains').countDocuments();
    const totalCategories = await worldModel.db.collection('world_model_categories').countDocuments();
    const totalProducts = await worldModel.db.collection('world_model_products').countDocuments();
    
    console.log('\n📊 Total Counts:');
    console.log(`   Domains: ${totalDomains}`);
    console.log(`   Categories: ${totalCategories}`);
    console.log(`   Products: ${totalProducts}`);

  } finally {
    await worldModel.disconnect();
  }
}

searchHMData().catch(console.error);