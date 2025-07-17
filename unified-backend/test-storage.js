const { PrismaClient } = require('@prisma/client');
const { StorageManager } = require('./dist/services/storage-manager');

async function testStorage() {
  const prisma = new PrismaClient();
  const storageManager = new StorageManager(prisma);
  
  console.log('Testing Storage Manager...\n');
  
  try {
    // Test 1: Health Check
    console.log('1. Testing health check...');
    const health = await storageManager.healthCheck();
    console.log('   Health status:', health);
    
    // Test 2: Storage Stats
    console.log('\n2. Testing storage stats...');
    const stats = await storageManager.getStorageStats();
    console.log('   Storage stats:', JSON.stringify(stats, null, 2));
    
    // Test 3: List Archives
    console.log('\n3. Testing list archives...');
    const archives = await storageManager.listArchives();
    console.log('   Archives found:', archives.length);
    
    // Test 4: S3 Health
    console.log('\n4. Testing S3 health...');
    const s3Health = await storageManager.checkS3Health();
    console.log('   S3 Health:', JSON.stringify(s3Health, null, 2));
    
    // Test 5: Storage Cost Analysis
    console.log('\n5. Testing storage cost analysis...');
    const costAnalysis = await storageManager.getStorageCostAnalysis();
    console.log('   Cost Analysis:', JSON.stringify(costAnalysis, null, 2));
    
    console.log('\nAll tests completed successfully!');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testStorage();