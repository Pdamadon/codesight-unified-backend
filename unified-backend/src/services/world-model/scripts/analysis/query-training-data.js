#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL || 'postgresql://postgres:najZqhoAVxKXadShnHIwCsEmOQfFNpeB@nozomi.proxy.rlwy.net:19563/railway'
});

async function queryTrainingData() {
  try {
    console.log('🔌 Connecting to Railway database...');
    
    // Get all training data records to find ones with content
    const allTraining = await prisma.trainingData.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });
    
    if (allTraining.length === 0) {
      console.log('❌ No training data found in database');
      return;
    }
    
    console.log(`📊 FOUND ${allTraining.length} TRAINING DATA RECORDS:`);
    
    for (let i = 0; i < allTraining.length; i++) {
      const training = allTraining[i];
      console.log(`\n${i + 1}. Session: ${training.sessionId}`);
      console.log(`   Created: ${training.createdAt}`);
      console.log(`   Quality: ${training.trainingQuality}`);
      console.log(`   File Size: ${training.fileSize}`);
      console.log(`   Status: ${training.status}`);
      console.log(`   Has JSONL: ${training.jsonlContent ? 'YES' : 'NO'}`);
      
      if (training.jsonlContent) {
        const lines = training.jsonlContent.split('\n').filter(line => line.trim());
        console.log(`   JSONL Lines: ${lines.length}`);
        
        // Show first example from this record
        if (lines.length > 0) {
          try {
            const firstExample = JSON.parse(lines[0]);
            console.log('\n🔍 EXAMPLE STRUCTURE FROM THIS RECORD:');
            console.log(JSON.stringify(firstExample, null, 2));
            
            // Only show first one with content, then break
            break;
            
          } catch (parseError) {
            console.log('❌ Error parsing example:', parseError.message);
            console.log('Raw line:', lines[0].substring(0, 200) + '...');
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

queryTrainingData();