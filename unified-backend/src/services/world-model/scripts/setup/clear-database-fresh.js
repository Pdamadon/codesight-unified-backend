/**
 * Clear Database for Fresh Enhanced Product Attribute Test
 * 
 * Clears the MongoDB Atlas world model collections to test the enhanced
 * product attribute system from scratch
 */

import * as dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();

async function clearDatabaseFresh() {
  console.log('🧹 Clearing Database for Fresh Enhanced Product Attribute Test\n');
  
  const connectionString = process.env.MONGODB_CONNECTION_STRING;
  const databaseName = process.env.MONGODB_DATABASE_NAME || 'codesight-worldmodel';
  
  console.log(`🔗 Connecting to: ${databaseName}`);
  
  const clientOptions = {
    serverSelectionTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    socketTimeoutMS: 30000
  };
  
  const mongoClient = new MongoClient(connectionString, clientOptions);
  
  try {
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = mongoClient.db(databaseName);
    
    // Show current state
    console.log('\n📊 Current Database State:');
    const domainCount = await db.collection('world_model_domains').countDocuments();
    const categoryCount = await db.collection('world_model_categories').countDocuments();
    const productCount = await db.collection('world_model_products').countDocuments();
    
    console.log(`   Domains: ${domainCount}`);
    console.log(`   Categories: ${categoryCount}`);
    console.log(`   Products: ${productCount}`);
    
    // Clear all collections
    console.log('\n🗑️ Clearing collections...');
    
    const domainsDeleted = await db.collection('world_model_domains').deleteMany({});
    console.log(`   ✅ Domains: ${domainsDeleted.deletedCount} deleted`);
    
    const categoriesDeleted = await db.collection('world_model_categories').deleteMany({});
    console.log(`   ✅ Categories: ${categoriesDeleted.deletedCount} deleted`);
    
    const productsDeleted = await db.collection('world_model_products').deleteMany({});
    console.log(`   ✅ Products: ${productsDeleted.deletedCount} deleted`);
    
    // Verify clean state
    console.log('\n📊 After Cleanup:');
    const newDomainCount = await db.collection('world_model_domains').countDocuments();
    const newCategoryCount = await db.collection('world_model_categories').countDocuments();
    const newProductCount = await db.collection('world_model_products').countDocuments();
    
    console.log(`   Domains: ${newDomainCount}`);
    console.log(`   Categories: ${newCategoryCount}`);
    console.log(`   Products: ${newProductCount}`);
    
    if (newDomainCount === 0 && newCategoryCount === 0 && newProductCount === 0) {
      console.log('\n🎉 Database successfully cleared!');
      console.log('   Ready for fresh enhanced product attribute ingestion');
    } else {
      console.log('\n⚠️ Database not completely cleared');
    }
    
  } catch (error) {
    console.error('❌ Error clearing database:', error.message);
    throw error;
  } finally {
    await mongoClient.close();
    console.log('\n🔌 Disconnected from MongoDB Atlas');
  }
}

// Run the cleanup
clearDatabaseFresh().catch(console.error);