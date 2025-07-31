/**
 * Update specific record 4 to COMPLETED and run world model ingestion
 */

import { PrismaClient } from '@prisma/client';

async function ingestRecord4() {
  console.log('🎯 Processing Record 4 (Highest Quality: 0.76)...\n');
  
  const prisma = new PrismaClient();

  try {
    // Update only record 4 to COMPLETED status
    const recordId = '8a6dd30d-b583-40e2-8ad7-e348255d51f0';
    
    const updateResult = await prisma.trainingData.update({
      where: {
        id: recordId
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    console.log(`✅ Updated record ${recordId} to COMPLETED status`);
    console.log(`   Session: ${updateResult.sessionId}`);
    console.log(`   JSONL Size: ${updateResult.jsonlData?.length || 0} characters`);
    console.log(`   Quality Score: ${updateResult.trainingQuality}`);

    // Verify we now have completed data
    const completedCount = await prisma.trainingData.count({
      where: {
        status: 'COMPLETED',
        jsonlData: { not: null }
      }
    });

    console.log(`\n📊 Total COMPLETED records ready for ingestion: ${completedCount}`);
    console.log('\n🚀 Now ready to run world model ingestion!');

  } catch (error) {
    console.error('❌ Error updating record:', error);
  } finally {
    await prisma.$disconnect();
  }
}

ingestRecord4().catch(console.error);