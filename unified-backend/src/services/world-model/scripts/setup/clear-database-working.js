/**
 * Clear World Model Database - Working Version
 * 
 * Uses the working connection configuration with proper timeouts
 * Clears incorrectly classified data discovered by test parsers
 */

import * as dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function clearWorldModelDatabase() {
  console.log('🧹 Clearing World Model Database\n');
  console.log('='.repeat(60));
  
  const connectionString = process.env.MONGODB_CONNECTION_STRING;
  const databaseName = process.env.MONGODB_DATABASE_NAME || 'codesight-worldmodel';
  
  if (!connectionString) {
    console.error('❌ MONGODB_CONNECTION_STRING not found in environment variables');
    process.exit(1);
  }
  
  console.log('🔧 Configuration:');
  console.log(`   Database: ${databaseName}`);
  console.log(`   Connection: MongoDB Atlas`);
  console.log(`   Your IP: 73.35.224.38 (should be whitelisted)`);
  console.log('');
  
  // Use working connection options
  const clientOptions = {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000
  };
  
  const client = new MongoClient(connectionString, clientOptions);
  
  try {
    console.log('🔗 Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected successfully\n');
    
    const db = client.db(databaseName);
    
    // Check current data before clearing
    console.log('📊 Current Database Status:');
    
    const domainCount = await db.collection('world_model_domains').countDocuments();
    const categoryCount = await db.collection('world_model_categories').countDocuments();
    const productCount = await db.collection('world_model_products').countDocuments();
    
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
    const domains = await db.collection('world_model_domains').find({}).toArray();
    console.log(`\n   📦 Current Domains:`);
    domains.forEach(domain => {
      const status = domain.domain.includes('unknown') ? '❌ NEEDS CLEARING' : '✅ OK';
      console.log(`      ${status} ${domain.siteName} (${domain.domain})`);
    });
    
    // Check for misclassified categories (like "cargo pants" as category)
    const categories = await db.collection('world_model_categories').find({}).limit(10).toArray();
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
    const products = await db.collection('world_model_products').find({}).limit(10).toArray();
    console.log(`\n   🛍️ Sample Products:`);
    products.forEach(prod => {
      console.log(`      ✅ "${prod.productName}" - $${prod.currentState?.price || 'N/A'}`);
    });
    
    // Confirm clearing based on test parser findings
    console.log('\n⚠️ CLEARING JUSTIFICATION (Based on Test Parser Findings):');
    console.log('   • Test parsers found 82.7% classification accuracy with issues:');
    console.log('     - "Regular Fit Pima Cotton Polo Shirt" classified as category (should be product)');
    console.log('     - Domains showing as "unknown-ecommerce.com" instead of real domains');
    console.log('     - Real domains available: H&M (www2.hm.com), Gap (www.gap.com), Nordstrom');
    console.log('   • Need fresh ingestion with improved UnifiedSession classification logic');
    console.log('   • Improved ingester addresses URL + text + context hybrid classification');
    
    console.log('\n⚠️  This will permanently delete all world model data.');
    console.log('   The data will be regenerated with improved classification logic.');
    
    // Clear all collections
    console.log('\n🗑️ Clearing Collections...');
    
    const productsDeleted = await db.collection('world_model_products').deleteMany({});
    console.log(`   ✅ Deleted ${productsDeleted.deletedCount} products`);
    
    const categoriesDeleted = await db.collection('world_model_categories').deleteMany({});
    console.log(`   ✅ Deleted ${categoriesDeleted.deletedCount} categories`);
    
    const domainsDeleted = await db.collection('world_model_domains').deleteMany({});
    console.log(`   ✅ Deleted ${domainsDeleted.deletedCount} domains`);
    
    // Verify deletion
    console.log('\n📊 Database Status After Clearing:');
    const finalDomainCount = await db.collection('world_model_domains').countDocuments();
    const finalCategoryCount = await db.collection('world_model_categories').countDocuments();
    const finalProductCount = await db.collection('world_model_products').countDocuments();
    
    console.log(`   Domains: ${finalDomainCount}`);
    console.log(`   Categories: ${finalCategoryCount}`);
    console.log(`   Products: ${finalProductCount}`);
    
    if (finalDomainCount === 0 && finalCategoryCount === 0 && finalProductCount === 0) {
      console.log('\n🎉 Database successfully cleared!');
      console.log('\n🔄 Next Steps:');
      console.log('   1. Test improved UnifiedSession ingester');
      console.log('   2. Verify real domain extraction (H&M, Gap, Nordstrom)');
      console.log('   3. Validate product classification improvements');
      console.log('   4. Run: node test-improved-unified-session-ingester.js');
    } else {
      console.log('\n❌ Warning: Some data may not have been cleared');
    }
    
  } catch (error) {
    console.error('\n❌ Error clearing database:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

clearWorldModelDatabase().catch(error => {
  console.error('❌ Clearing failed:', error.message);
  process.exit(1);
});