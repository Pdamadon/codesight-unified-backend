/**
 * Check pending training data records
 */

import { PrismaClient } from '@prisma/client';

async function checkPendingTraining() {
  console.log('🔍 Checking Pending Training Data...\n');
  
  const prisma = new PrismaClient();

  try {
    const pendingRecords = await prisma.trainingData.findMany({
      where: {
        status: 'PENDING'
      },
      select: {
        id: true,
        sessionId: true,
        createdAt: true,
        status: true,
        rawData: true,
        jsonlData: true,
        processingStartedAt: true,
        processingCompletedAt: true,
        errorMessage: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📋 Found ${pendingRecords.length} pending records:\n`);

    pendingRecords.forEach((record, index) => {
      console.log(`${index + 1}. Record ID: ${record.id}`);
      console.log(`   Session: ${record.sessionId}`);
      console.log(`   Created: ${record.createdAt.toISOString()}`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Processing Started: ${record.processingStartedAt || 'Not started'}`);
      console.log(`   Processing Completed: ${record.processingCompletedAt || 'Not completed'}`);
      console.log(`   Error: ${record.errorMessage || 'None'}`);
      
      // Check if raw data exists
      console.log(`   Raw Data: ${record.rawData ? 'Yes (' + record.rawData.length + ' chars)' : 'No'}`);
      console.log(`   JSONL Data: ${record.jsonlData ? 'Yes (' + record.jsonlData.length + ' chars)' : 'No'}`);
      console.log('');
    });

    if (pendingRecords.length > 0) {
      console.log('🎯 Options:');
      console.log('   1. Process pending records: Run the data processing pipeline');
      console.log('   2. Check why processing stopped: Look at server logs');
      console.log('   3. Manual processing: Update status to COMPLETED if data looks good');
      
      // Show a sample of raw data if available
      const recordWithData = pendingRecords.find(r => r.rawData);
      if (recordWithData) {
        console.log('\n📝 Sample Raw Data Preview:');
        const preview = recordWithData.rawData.substring(0, 300) + '...';
        console.log(preview);
      }
    }

  } catch (error) {
    console.error('❌ Error checking pending training data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPendingTraining().catch(console.error);