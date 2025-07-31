/**
 * Proper World Model Database Clearing Script
 * 
 * Uses WorldModelService with environment variables correctly
 * Clears incorrectly classified data discovered by test parsers
 */

import * as dotenv from 'dotenv';
import { WorldModelService } from './dist/services/world-model/database/service.js';

// Load environment variables
dotenv.config();

async function clearWorldModelDatabase() {
  console.log('🧹 Clearing World Model Database (Proper Method)\n');
  console.log('='.repeat(60));
  
  // Verify environment variables
  const connectionString = process.env.MONGODB_CONNECTION_STRING;
  const databaseName = process.env.MONGODB_DATABASE_NAME || 'world_model';
  
  if (!connectionString) {
    console.error('❌ MONGODB_CONNECTION_STRING not found in environment variables');
    console.error('💡 Make sure .env file is present and properly formatted');
    process.exit(1);
  }
  
  console.log('🔧 Configuration:');
  console.log(`   Database: ${databaseName}`);
  console.log(`   Connection: MongoDB Atlas (${connectionString.includes('mongodb+srv') ? 'SRV' : 'Standard'})`);
  console.log('');
  
  // Create WorldModelService with timeout options that work with MongoDB Atlas
  const worldModel = new WorldModelService(connectionString, databaseName);
  
  // Override the MongoDB client with working timeout options
  const { MongoClient } = await import('mongodb');
  const clientOptions = {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000
  };
  
  const client = new MongoClient(connectionString, clientOptions);
  worldModel.client = client;
  worldModel.db = client.db(databaseName);
  
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await worldModel.connect();
    console.log('✅ Connected successfully\n');
    
    // Check current data before clearing
    console.log('📊 Current Database Status:');
    
    const domainCount = await worldModel.db.collection('world_model_domains').countDocuments();
    const categoryCount = await worldModel.db.collection('world_model_categories').countDocuments();
    const productCount = await worldModel.db.collection('world_model_products').countDocuments();
    
    console.log(`   Domains: ${domainCount}`);
    console.log(`   Categories: ${categoryCount}`);
    console.log(`   Products: ${productCount}`);
    
    if (domainCount === 0 && categoryCount === 0 && productCount === 0) {
      console.log('\n✅ Database is already empty - nothing to clear');
      return;
    }
    
    // Show problematic data that needs clearing
    console.log('\n🗂️ Data Analysis (Issues Found by Test Parsers):');
    
    // Check for unknown domains
    const domains = await worldModel.db.collection('world_model_domains').find({}).toArray();
    console.log(`\n   📦 Current Domains:`);
    domains.forEach(domain => {
      const status = domain.domain.includes('unknown') ? '❌ NEEDS CLEARING' : '✅ OK';
      console.log(`      ${status} ${domain.siteName} (${domain.domain})`);
    });
    
    // Check for misclassified categories (like "cargo pants" as category)
    const categories = await worldModel.db.collection('world_model_categories').find({}).limit(10).toArray();
    console.log(`\n   📁 Sample Categories (checking for misclassifications):`);
    categories.forEach(cat => {
      // Categories that look like product names
      const looksLikeProduct = cat.categoryName.toLowerCase().includes('fit') || 
                              cat.categoryName.toLowerCase().includes('cotton') ||
                              cat.categoryName.toLowerCase().includes('shirt') ||
                              cat.categoryName.toLowerCase().includes('pants');
      const status = looksLikeProduct ? '❌ MISCLASSIFIED' : '✅ OK';
      console.log(`      ${status} "${cat.categoryName}" (${cat.categoryPath})`);
    });
    
    // Check for products misclassified as categories
    const products = await worldModel.db.collection('world_model_products').find({}).limit(10).toArray();
    console.log(`\n   🛍️ Sample Products:`);
    products.forEach(prod => {
      console.log(`      ✅ "${prod.productName}" - $${prod.currentState?.price || 'N/A'}`);
    });
    
    // Confirm clearing
    console.log('\n⚠️ CLEARING JUSTIFICATION (Based on Test Parser Findings):');
    console.log('   • Test parsers found 82.7% classification accuracy with issues:');
    console.log('   • "Regular Fit Pima Cotton Polo Shirt" classified as category (should be product)');
    console.log('   • Domains showing as "unknown-ecommerce.com" instead of real domains');
    console.log('   • Real domains available: H&M (www2.hm.com), Gap (www.gap.com), Nordstrom');
    console.log('   • Need fresh ingestion with improved UnifiedSession classification logic');
    
    console.log('\n⚠️  This will permanently delete all world model data.');
    console.log('   The data will be regenerated with improved classification logic.');
    
    // Clear all collections
    console.log('\n🗑️ Clearing Collections...');
    
    const productsDeleted = await worldModel.db.collection('world_model_products').deleteMany({});
    console.log(`   ✅ Deleted ${productsDeleted.deletedCount} products`);
    
    const categoriesDeleted = await worldModel.db.collection('world_model_categories').deleteMany({});
    console.log(`   ✅ Deleted ${categoriesDeleted.deletedCount} categories`);
    
    const domainsDeleted = await worldModel.db.collection('world_model_domains').deleteMany({});
    console.log(`   ✅ Deleted ${domainsDeleted.deletedCount} domains`);
    
    // Verify deletion
    console.log('\n📊 Database Status After Clearing:');
    const finalDomainCount = await worldModel.db.collection('world_model_domains').countDocuments();
    const finalCategoryCount = await worldModel.db.collection('world_model_categories').countDocuments();
    const finalProductCount = await worldModel.db.collection('world_model_products').countDocuments();
    
    console.log(`   Domains: ${finalDomainCount}`);
    console.log(`   Categories: ${finalCategoryCount}`);
    console.log(`   Products: ${finalProductCount}`);
    
    if (finalDomainCount === 0 && finalCategoryCount === 0 && finalProductCount === 0) {
      console.log('\n🎉 Database successfully cleared!');
      console.log('\n🔄 Next Steps:');
      console.log('   1. Test improved UnifiedSession ingester');
      console.log('   2. Verify real domain extraction (H&M, Gap, Nordstrom)');
      console.log('   3. Validate product classification improvements');
      console.log('   4. Run full ingestion with improved classification logic');
    } else {
      console.log('\n❌ Warning: Some data may not have been cleared');
    }
    
  } catch (error) {
    console.error('\n❌ Error clearing database:', error.message);
    
    if (error.message.includes('SSL') || error.message.includes('TLS')) {
      console.error('\n🔍 MongoDB Atlas Connection Issue Detected:');
      console.error('   • This appears to be an SSL/TLS handshake error');
      console.error('   • MongoDB Atlas cluster may be paused or unavailable');
      console.error('   • Check MongoDB Atlas dashboard for cluster status');
      console.error('   • Verify IP address is whitelisted in Atlas');
      console.error('   • Consider using MongoDB Compass to test connection manually');
    }
    
    throw error;
  } finally {
    await worldModel.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

clearWorldModelDatabase().catch(error => {
  console.error('❌ Clearing failed:', error.message);
  process.exit(1);
});