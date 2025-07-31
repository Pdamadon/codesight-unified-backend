const { PrismaClient } = require('@prisma/client');

async function showTrainingDataComparison() {
  const prisma = new PrismaClient();
  
  try {
    // Get the new training data we just generated
    const newTrainingData = await prisma.trainingData.findUnique({
      where: { id: 'training_1753725443027_new_journey_tracker' }
    });
    
    if (!newTrainingData) {
      console.error('❌ New training data not found');
      return;
    }
    
    console.log('🎯 TRAINING DATA STORAGE ANALYSIS');
    console.log('='.repeat(80));
    console.log('');
    
    console.log('📊 DATABASE STORAGE:');
    console.log('- Table: training_data');
    console.log('- Format: JSONL (JSON Lines)');
    console.log('- Storage: PostgreSQL TEXT field');
    console.log('- Size:', newTrainingData.fileSize, 'bytes');
    console.log('- Examples:', newTrainingData.jsonlData.split('\\n').length);
    console.log('');
    
    console.log('🏗️ TRAINING CONFIG:');
    const config = newTrainingData.trainingConfig;
    console.log('- Format:', config.format);
    console.log('- Version:', config.version);
    console.log('- User Task:', config.sessionInfo.userTask);
    console.log('- User Steps:', config.sessionInfo.userSteps);
    console.log('- Total Interactions:', config.sessionInfo.totalInteractions);
    console.log('');
    
    // Parse and show each JSONL example
    const examples = newTrainingData.jsonlData.split('\\n').filter(line => line.trim());
    
    console.log('📄 COMPLETE JSONL EXAMPLES:');
    console.log('='.repeat(80));
    
    examples.forEach((jsonLine, index) => {
      const example = JSON.parse(jsonLine);
      
      console.log(`\\n--- EXAMPLE ${index + 1} ---`);
      console.log('PROMPT:');
      console.log(example.prompt);
      console.log('\\nCOMPLETION:');
      console.log(example.completion);
      console.log('\\n' + '-'.repeat(40));
    });
    
    console.log('\\n🔄 HOW IT\'S BEING SAVED:');
    console.log('='.repeat(80));
    console.log('');
    console.log('1. SAME TABLE: Uses existing training_data table');
    console.log('2. SAME FORMAT: JSONL (one JSON object per line)');
    console.log('3. ENHANCED DATA: Real journey tracking instead of fake templates');
    console.log('4. VERSIONED: trainingConfig.version = "2.0-hybrid-tracker"');
    console.log('5. COMPATIBLE: OpenAI fine-tuning can use this format directly');
    console.log('');
    
    console.log('📈 KEY IMPROVEMENTS IN NEW DATA:');
    console.log('✅ Step: 5/133 (real) vs Step: 3/4 (fake)');
    console.log('✅ Task Progress: "Search for graphic tees (1/3)" vs generic');
    console.log('✅ Current Focus: "Working on: Search for graphic tees"');
    console.log('✅ Navigation: Real page flow tracking');
    console.log('✅ Journey Impact: Real task progression and budget tracking');
    console.log('');
    
    console.log('🎯 USAGE:');
    console.log('- This JSONL data can be uploaded to OpenAI for fine-tuning');
    console.log('- Each line is a complete training example');
    console.log('- The AI learns real user journey patterns');
    console.log('- Better task decomposition and progress tracking');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

showTrainingDataComparison();