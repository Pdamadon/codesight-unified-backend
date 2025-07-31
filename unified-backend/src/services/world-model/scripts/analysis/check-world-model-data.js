/**
 * Check what data was actually ingested into the world model
 */

import { WorldModelService } from './dist/services/world-model/database/service.js';

async function checkData() {
  console.log('🔍 Checking World Model Database Contents...\n');
  
  const worldModel = new WorldModelService(
    "mongodb+srv://pdamadon:Locoman123@codesight-worldmodel.rt7hek9.mongodb.net/?retryWrites=true&w=majority&appName=codesight-worldmodel",
    "codesight-worldmodel"
  );

  await worldModel.connect();

  try {
    // Check domains
    console.log('📦 DOMAINS:');
    const domains = await worldModel.db.collection('world_model_domains').find({}).toArray();
    console.log(`   Found ${domains.length} domains:`);
    domains.forEach(domain => {
      console.log(`   • ${domain.siteName} (${domain.domain}) - ${domain.siteType}`);
    });

    // Check categories
    console.log('\n📁 CATEGORIES:');
    const categories = await worldModel.db.collection('world_model_categories').find({}).toArray();
    console.log(`   Found ${categories.length} categories:`);
    categories.forEach(category => {
      console.log(`   • ${category.categoryName} (${category.categoryPath})`);
      console.log(`     Domain: ${category.domainId}`);
      console.log(`     Discovery contexts: ${category.discoveryContexts?.length || 0}`);
    });

    // Check products
    console.log('\n🏷️ PRODUCTS:');
    const products = await worldModel.db.collection('world_model_products').find({}).toArray();
    console.log(`   Found ${products.length} products:`);
    products.forEach(product => {
      console.log(`   • ${product.productName} - $${product.currentState.price}`);
      console.log(`     Domain: ${product.domain}`);
      console.log(`     Product ID: ${product.productId}`);
      console.log(`     Discovery contexts: ${product.discoveryContexts?.length || 0}`);
    });

    // Check training data availability
    console.log('\n📊 TRAINING DATA CHECK:');
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const trainingRecords = await prisma.trainingData.findMany({
      where: {
        status: 'COMPLETED',
        jsonlData: { not: null }
      },
      select: {
        id: true,
        sessionId: true,
        createdAt: true,
        status: true
      }
    });

    console.log(`   Found ${trainingRecords.length} completed training records:`);
    trainingRecords.slice(0, 5).forEach(record => {
      console.log(`   • Record ${record.id} - Session: ${record.sessionId}`);
      console.log(`     Created: ${record.createdAt.toISOString()}`);
    });
    
    if (trainingRecords.length > 5) {
      console.log(`   ... and ${trainingRecords.length - 5} more records`);
    }

    await prisma.$disconnect();

  } finally {
    await worldModel.disconnect();
  }
}

checkData().catch(console.error);