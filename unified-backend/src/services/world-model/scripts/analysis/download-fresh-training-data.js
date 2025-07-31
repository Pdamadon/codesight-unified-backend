/**
 * Download and format fresh training data with enhanced HybridJourneyTracker integration
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function downloadFreshTrainingData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('📥 Downloading Fresh Training Data with Enhanced Format\n');
    
    // Get the specific training data record
    const trainingData = await prisma.trainingData.findUnique({
      where: { id: '9738ff9d-d123-46c3-872f-322ada4eb770' }
    });
    
    // Get associated session data separately
    let sessionData = null;
    if (trainingData?.sessionId) {
      sessionData = await prisma.unifiedSession.findUnique({
        where: { id: trainingData.sessionId },
        select: {
          id: true,
          config: true,
          createdAt: true,
          enhancedInteractions: true
        }
      });
    }
    
    if (!trainingData) {
      console.log('❌ Training data not found');
      return;
    }
    
    console.log('📊 Training Data Overview:');
    console.log(`ID: ${trainingData.id}`);
    console.log(`Session: ${trainingData.sessionId}`);
    console.log(`Created: ${trainingData.createdAt.toLocaleString()}`);
    console.log(`Quality: ${trainingData.quality}`);
    console.log(`Status: ${trainingData.status}`);
    console.log(`File Size: ${trainingData.fileSize} bytes`);
    
    if (sessionData?.config?.generatedTask) {
      console.log(`User Task: "${sessionData.config.generatedTask.title}"`);
    }
    
    // Parse JSONL data
    let examples = [];
    if (trainingData.jsonlData) {
      try {
        // Handle both JSON array and JSONL format
        if (trainingData.jsonlData.startsWith('[')) {
          // JSON array format
          examples = JSON.parse(trainingData.jsonlData);
        } else {
          // JSONL format (line-separated JSON objects)
          const lines = trainingData.jsonlData.split('\n').filter(line => line.trim());
          examples = lines.map(line => JSON.parse(line));
        }
        console.log(`Examples Count: ${examples.length}\n`);
      } catch (error) {
        console.log(`⚠️ Error parsing JSONL data: ${error.message}`);
        console.log(`Raw data preview: ${trainingData.jsonlData.substring(0, 200)}...`);
        return;
      }
    }
    
    // Create formatted output
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = `fresh-training-data-${timestamp}.txt`;
    
    let formattedOutput = '';
    formattedOutput += '🎯 ENHANCED AI-GENERATED TRAINING DATA\n';
    formattedOutput += '=' .repeat(80) + '\n\n';
    
    formattedOutput += `📊 METADATA:\n`;
    formattedOutput += `Training ID: ${trainingData.id}\n`;
    formattedOutput += `Session ID: ${trainingData.sessionId}\n`;
    formattedOutput += `Generated: ${trainingData.createdAt.toLocaleString()}\n`;
    formattedOutput += `Quality Score: ${trainingData.quality}\n`;
    formattedOutput += `Total Examples: ${examples.length}\n`;
    
    if (sessionData?.config?.generatedTask) {
      const task = sessionData.config.generatedTask;
      formattedOutput += `User Task: "${task.title}"\n`;
      if (task.description) {
        formattedOutput += `Task Description: "${task.description}"\n`;
      }
      if (task.steps && task.steps.length > 0) {
        formattedOutput += `Task Steps: ${task.steps.map((s, i) => `${i+1}. ${s}`).join(', ')}\n`;
      }
    }
    formattedOutput += '\n';
    
    // Format each example
    examples.forEach((example, index) => {
      formattedOutput += `🎯 TRAINING EXAMPLE ${index + 1}/${examples.length}\n`;
      formattedOutput += '=' .repeat(80) + '\n\n';
      
      // Handle both message format and prompt/completion format
      if (example.messages && example.messages.length >= 2) {
        formattedOutput += '👤 USER PROMPT (Enhanced HybridJourneyTracker Format):\n';
        formattedOutput += '-' .repeat(60) + '\n';
        formattedOutput += example.messages[0].content + '\n\n';
        
        formattedOutput += '🤖 ASSISTANT RESPONSE:\n';
        formattedOutput += '-' .repeat(60) + '\n';
        formattedOutput += example.messages[1].content + '\n\n';
      } else if (example.prompt && example.completion) {
        formattedOutput += '👤 USER PROMPT:\n';
        formattedOutput += '-' .repeat(60) + '\n';
        formattedOutput += example.prompt + '\n\n';
        
        formattedOutput += '🤖 COMPLETION:\n';
        formattedOutput += '-' .repeat(60) + '\n';
        formattedOutput += example.completion + '\n\n';
      }
      
      // Add quality and context info if available
      if (example.quality !== undefined) {
        formattedOutput += `📊 Quality Score: ${example.quality}\n`;
      }
      if (example.context) {
        formattedOutput += `🔧 Context: ${JSON.stringify(example.context, null, 2)}\n`;
      }
      
      formattedOutput += '\n' + '=' .repeat(80) + '\n\n';
    });
    
    // Feature validation summary
    formattedOutput += '✅ ENHANCED FEATURES VALIDATION SUMMARY\n';
    formattedOutput += '=' .repeat(80) + '\n\n';
    
    let enhancedFeatures = {
      userGoalWithProgress: 0,
      realJourneyIntent: 0,
      navigationFlow: 0,
      userFocus: 0,
      decisionFactors: 0,
      domHierarchy: 0,
      selectorStrategies: 0,
      taskContext: 0,
      multipleConfidence: 0,
      nextPredictions: 0
    };
    
    examples.forEach(example => {
      const content = (example.messages?.[0]?.content || example.prompt || '').toLowerCase();
      const completion = (example.messages?.[1]?.content || example.completion || '').toLowerCase();
      
      if (content.includes('task progress:')) enhancedFeatures.userGoalWithProgress++;
      if (content.includes('current intent:') && content.includes('confidence:')) enhancedFeatures.realJourneyIntent++;
      if (content.includes('navigation flow:')) enhancedFeatures.navigationFlow++;
      if (content.includes('user focus:')) enhancedFeatures.userFocus++;
      if (content.includes('decision factors:')) enhancedFeatures.decisionFactors++;
      if (content.includes('[dom hierarchy]')) enhancedFeatures.domHierarchy++;
      if (content.includes('[selector strategies]')) enhancedFeatures.selectorStrategies++;
      if (completion.includes('[task context]')) enhancedFeatures.taskContext++;
      if (completion.includes('(intent)') && completion.includes('(conversion)')) enhancedFeatures.multipleConfidence++;
      if (completion.includes('next predicted:')) enhancedFeatures.nextPredictions++;
    });
    
    Object.entries(enhancedFeatures).forEach(([feature, count]) => {
      const percentage = examples.length > 0 ? ((count / examples.length) * 100).toFixed(1) : '0.0';
      const status = count > 0 ? '✅' : '❌';
      formattedOutput += `${status} ${feature}: ${count}/${examples.length} examples (${percentage}%)\n`;
    });
    
    // Write to file
    fs.writeFileSync(outputFile, formattedOutput);
    
    console.log(`✅ Training data downloaded and formatted!`);
    console.log(`📁 Saved to: ${outputFile}`);
    console.log(`📊 File size: ${fs.statSync(outputFile).size} bytes`);
    console.log(`🎯 Enhanced features detected in ${Object.values(enhancedFeatures).reduce((a,b) => a+b, 0)} total instances`);
    
    // Also save raw JSONL for OpenAI training
    if (trainingData.jsonlData) {
      const jsonlFile = `fresh-training-data-${timestamp}.jsonl`;
      const jsonlLines = examples.map(ex => JSON.stringify(ex)).join('\n');
      fs.writeFileSync(jsonlFile, jsonlLines);
      console.log(`📋 Raw JSONL saved to: ${jsonlFile}`);
    }
    
  } catch (error) {
    console.error('❌ Error downloading training data:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

downloadFreshTrainingData();