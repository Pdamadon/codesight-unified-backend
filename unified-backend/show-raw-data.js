const { PrismaClient } = require('@prisma/client');

async function showRawTrainingData() {
  const prisma = new PrismaClient();
  
  try {
    const sessionId = 'session_1753726406409_do0hixp2m';
    
    const trainingData = await prisma.trainingData.findFirst({
      where: { sessionId: sessionId }
    });
    
    if (!trainingData) {
      console.log('No training data found');
      return;
    }
    
    // Split JSONL and show first few complete examples
    const lines = trainingData.jsonlData.split('\n').filter(line => line.trim());
    
    console.log('RAW TRAINING DATA EXAMPLES:');
    console.log('='.repeat(100));
    
    // Show first 3 complete examples
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      try {
        const example = JSON.parse(lines[i]);
        console.log(`\nEXAMPLE ${i + 1}:`);
        console.log('-'.repeat(50));
        console.log('PROMPT:');
        console.log(example.prompt);
        console.log('\nCOMPLETION:');
        console.log(example.completion);
        console.log('\n' + '='.repeat(100));
      } catch (e) {
        console.log(`Example ${i + 1}: Error parsing - ${e.message}`);
        console.log('Raw line:', lines[i].substring(0, 200) + '...');
      }
    }
    
    console.log(`\nTOTAL EXAMPLES: ${lines.length}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

showRawTrainingData();