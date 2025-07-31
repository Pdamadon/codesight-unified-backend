/**
 * Check training data records with correct schema
 */

import { PrismaClient } from '@prisma/client';

async function checkTrainingStatus() {
  console.log('🔍 Checking Training Data Status...\n');
  
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
        jsonlData: true,
        completedAt: true,
        fileSize: true,
        trainingQuality: true
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📋 Found ${pendingRecords.length} pending training records:\n`);

    for (let i = 0; i < pendingRecords.length; i++) {
      const record = pendingRecords[i];
      console.log(`${i + 1}. Record ID: ${record.id}`);
      console.log(`   Session: ${record.sessionId}`);
      console.log(`   Created: ${record.createdAt.toISOString()}`);
      console.log(`   Status: ${record.status}`);
      console.log(`   JSONL Data: ${record.jsonlData ? 'Yes (' + record.jsonlData.length + ' chars)' : 'No'}`);
      console.log(`   File Size: ${record.fileSize || 'Not set'}`);
      console.log(`   Training Quality: ${record.trainingQuality}`);
      
      // Check if this record has actual data we can use
      if (record.jsonlData && record.jsonlData.length > 100) {
        console.log('   ✅ Has usable JSONL data');
        
        // Show a preview of the JSONL structure
        try {
          const lines = record.jsonlData.split('\n').filter(line => line.trim());
          if (lines.length > 0) {
            const firstExample = JSON.parse(lines[0]);
            console.log(`   📝 JSONL Preview: ${Object.keys(firstExample).join(', ')}`);
          }
        } catch (e) {
          console.log('   ⚠️ JSONL format seems invalid');
        }
      } else {
        console.log('   ❌ No usable JSONL data');
      }
      console.log('');
    }

    // Check if we have any records with JSONL data that could be processed
    const recordsWithData = pendingRecords.filter(r => r.jsonlData && r.jsonlData.length > 100);
    
    if (recordsWithData.length > 0) {
      console.log(`🎯 Found ${recordsWithData.length} records with JSONL data that could be ingested!`);
      console.log('\nOptions:');
      console.log('1. Update status to COMPLETED and run world model ingestion');
      console.log('2. Run the data processing pipeline to properly complete them');
      console.log('3. Manually trigger world model ingestion with current data');
    } else {
      console.log('⚠️ No records have usable JSONL data yet.');
      console.log('The training data processing pipeline needs to run first.');
    }

  } catch (error) {
    console.error('❌ Error checking training data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTrainingStatus().catch(console.error);