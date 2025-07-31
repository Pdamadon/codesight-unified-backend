/**
 * Check what training data exists in PostgreSQL database
 */

import { PrismaClient } from '@prisma/client';

async function checkTrainingData() {
  console.log('🔍 Checking PostgreSQL Training Data...\n');
  
  const prisma = new PrismaClient();

  try {
    // Check total training records
    const totalRecords = await prisma.trainingData.count();
    console.log(`📊 Total training records: ${totalRecords}`);

    // Check completed records with JSONL data
    const completedRecords = await prisma.trainingData.count({
      where: {
        status: 'COMPLETED',
        jsonlData: { not: null }
      }
    });
    console.log(`✅ Completed records with JSONL data: ${completedRecords}`);

    if (completedRecords > 0) {
      console.log('\n📋 Sample completed records:');
      const sampleRecords = await prisma.trainingData.findMany({
        where: {
          status: 'COMPLETED',
          jsonlData: { not: null }
        },
        select: {
          id: true,
          sessionId: true,
          createdAt: true,
          status: true,
          jsonlData: true
        },
        take: 3,
        orderBy: { createdAt: 'desc' }
      });

      sampleRecords.forEach((record, index) => {
        console.log(`\n${index + 1}. Record ID: ${record.id}`);
        console.log(`   Session: ${record.sessionId}`);
        console.log(`   Created: ${record.createdAt.toISOString()}`);
        console.log(`   Status: ${record.status}`);
        
        // Show first few characters of JSONL data
        const jsonlPreview = record.jsonlData ? record.jsonlData.substring(0, 200) + '...' : 'No data';
        console.log(`   JSONL Preview: ${jsonlPreview}`);
      });
    }

    // Check status distribution
    console.log('\n📊 Status Distribution:');
    const statusCounts = await prisma.trainingData.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    statusCounts.forEach(statusCount => {
      console.log(`   ${statusCount.status}: ${statusCount._count.status} records`);
    });

    if (completedRecords > 0) {
      console.log('\n🎯 Ready to populate world model with this training data!');
      console.log('   Run: node dist/services/world-model/run-ingestion.js');
    } else {
      console.log('\n⚠️  No completed training records found.');
      console.log('   Generate some training data with the browser extension first.');
    }

  } catch (error) {
    console.error('❌ Error checking training data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTrainingData().catch(console.error);