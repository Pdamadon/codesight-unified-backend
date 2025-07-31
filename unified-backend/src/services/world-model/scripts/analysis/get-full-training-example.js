#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasourceUrl: 'postgresql://postgres:najZqhoAVxKXadShnHIwCsEmOQfFNpeB@nozomi.proxy.rlwy.net:19563/railway'
});

async function getFullTrainingExample() {
  try {
    console.log('🔌 Getting full training example...');
    
    const trainingData = await prisma.trainingData.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { jsonlData: true }
    });
    
    if (!trainingData?.jsonlData) {
      console.log('❌ No JSONL data found');
      return;
    }
    
    const lines = trainingData.jsonlData.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      console.log('❌ No training examples found');
      return;
    }
    
    // Get first example
    const firstExample = JSON.parse(lines[0]);
    
    console.log('🔍 COMPLETE TRAINING EXAMPLE:');
    console.log('═'.repeat(80));
    console.log('PROMPT:');
    console.log(firstExample.prompt);
    console.log('\n' + '─'.repeat(80));
    console.log('COMPLETION:');
    console.log(firstExample.completion);
    console.log('\n' + '─'.repeat(80));
    console.log('CONTEXT KEYS:', Object.keys(firstExample.context || {}));
    if (firstExample.context?.journeyContext) {
      console.log('JOURNEY CONTEXT:', JSON.stringify(firstExample.context.journeyContext, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getFullTrainingExample();