/**
 * Show full training example to understand format
 */

import { PrismaClient } from '@prisma/client';

async function showTrainingExample() {
  console.log('📋 Full Training Example Analysis...\n');
  
  const prisma = new PrismaClient();

  try {
    const record = await prisma.trainingData.findUnique({
      where: {
        id: '8a6dd30d-b583-40e2-8ad7-e348255d51f0'
      },
      select: {
        jsonlData: true
      }
    });

    if (!record || !record.jsonlData) {
      console.log('❌ Record not found or no JSONL data');
      return;
    }

    const lines = record.jsonlData.split('\n').filter(line => line.trim());
    
    if (lines.length > 0) {
      const example = JSON.parse(lines[0]);
      
      console.log('🔍 FULL EXAMPLE STRUCTURE:\n');
      console.log('Keys:', Object.keys(example));
      console.log('\n📝 PROMPT:');
      console.log(example.prompt);
      console.log('\n✅ COMPLETION:'); 
      console.log(example.completion);
      
      if (example.context) {
        console.log('\n🔧 CONTEXT:');
        console.log(JSON.stringify(example.context, null, 2));
      }
      
      console.log('\n📊 QUALITY:', example.quality);
    }

  } catch (error) {
    console.error('❌ Error showing training example:', error);
  } finally {
    await prisma.$disconnect();
  }
}

showTrainingExample().catch(console.error);