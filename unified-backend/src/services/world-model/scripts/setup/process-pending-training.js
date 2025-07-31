/**
 * Update pending training records to COMPLETED status and run ingestion
 */

import { PrismaClient } from '@prisma/client';

async function processPendingTraining() {
  console.log('🔄 Processing Pending Training Data...\n');
  
  const prisma = new PrismaClient();

  try {
    // Update all pending records with JSONL data to COMPLETED
    const updateResult = await prisma.trainingData.updateMany({
      where: {
        status: 'PENDING',
        jsonlData: { not: null }
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    console.log(`✅ Updated ${updateResult.count} training records to COMPLETED status`);

    // Verify the update
    const completedCount = await prisma.trainingData.count({
      where: {
        status: 'COMPLETED',
        jsonlData: { not: null }
      }
    });

    console.log(`📊 Total COMPLETED records with JSONL data: ${completedCount}`);

    if (completedCount > 0) {
      console.log('\n🎯 Ready to populate world model!');
      console.log('   The world model ingester can now process this training data.');
    }

  } catch (error) {
    console.error('❌ Error processing training data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

processPendingTraining().catch(console.error);