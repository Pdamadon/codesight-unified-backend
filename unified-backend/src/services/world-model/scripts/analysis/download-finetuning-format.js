/**
 * Download training data in the exact format that will be passed to OpenAI fine-tuning
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

async function downloadFineTuningFormat() {
  const prisma = new PrismaClient();
  
  try {
    console.log('📥 Downloading Training Data in OpenAI Fine-Tuning Format\n');
    
    // Get the specific training data record
    const trainingData = await prisma.trainingData.findUnique({
      where: { id: '9738ff9d-d123-46c3-872f-322ada4eb770' }
    });
    
    if (!trainingData || !trainingData.jsonlData) {
      console.log('❌ Training data not found or no JSONL data');
      return;
    }
    
    console.log('📊 Training Data Overview:');
    console.log(`ID: ${trainingData.id}`);
    console.log(`Session: ${trainingData.sessionId}`);
    console.log(`Created: ${trainingData.createdAt.toLocaleString()}`);
    console.log(`File Size: ${trainingData.fileSize} bytes`);
    
    // Parse JSONL data
    let examples = [];
    try {
      if (trainingData.jsonlData.startsWith('[')) {
        examples = JSON.parse(trainingData.jsonlData);
      } else {
        const lines = trainingData.jsonlData.split('\n').filter(line => line.trim());
        examples = lines.map(line => JSON.parse(line));
      }
      console.log(`Total Examples: ${examples.length}\n`);
    } catch (error) {
      console.log(`❌ Error parsing JSONL: ${error.message}`);
      return;
    }
    
    // Create timestamp for filenames
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // ========================================
    // 1. EXACT FINE-TUNING JSONL FORMAT
    // ========================================
    const fineTuningFile = `openai-finetuning-format-${timestamp}.jsonl`;
    let fineTuningLines = [];
    
    examples.forEach((example, index) => {
      let fineTuningExample = {};
      
      // Convert to OpenAI fine-tuning format
      if (example.messages && example.messages.length >= 2) {
        // Already in messages format
        fineTuningExample = {
          messages: example.messages
        };
      } else if (example.prompt && example.completion) {
        // Convert prompt/completion to messages format
        fineTuningExample = {
          messages: [
            {
              role: "user",
              content: example.prompt
            },
            {
              role: "assistant", 
              content: example.completion
            }
          ]
        };
      }
      
      fineTuningLines.push(JSON.stringify(fineTuningExample));
    });
    
    // Write JSONL file (one JSON object per line)
    fs.writeFileSync(fineTuningFile, fineTuningLines.join('\n'));
    
    // ========================================
    // 2. HUMAN-READABLE FORMATTED VERSION
    // ========================================
    const readableFile = `openai-finetuning-readable-${timestamp}.txt`;
    let readableContent = '';
    
    readableContent += '🤖 OPENCAI FINE-TUNING TRAINING DATA\n';
    readableContent += '=' .repeat(100) + '\n\n';
    readableContent += `📊 METADATA:\n`;
    readableContent += `Training Examples: ${examples.length}\n`;
    readableContent += `Generated: ${trainingData.createdAt.toLocaleString()}\n`;
    readableContent += `Format: OpenAI Messages API (user/assistant pairs)\n`;
    readableContent += `Ready for: gpt-3.5-turbo or gpt-4 fine-tuning\n\n`;
    
    examples.forEach((example, index) => {
      readableContent += `🎯 FINE-TUNING EXAMPLE ${index + 1}/${examples.length}\n`;
      readableContent += '=' .repeat(100) + '\n\n';
      
      let messages = [];
      if (example.messages && example.messages.length >= 2) {
        messages = example.messages;
      } else if (example.prompt && example.completion) {
        messages = [
          { role: "user", content: example.prompt },
          { role: "assistant", content: example.completion }
        ];
      }
      
      messages.forEach((message, msgIndex) => {
        const roleIcon = message.role === 'user' ? '👤' : '🤖';
        const roleName = message.role.toUpperCase();
        
        readableContent += `${roleIcon} ${roleName} MESSAGE:\n`;
        readableContent += '-' .repeat(80) + '\n';
        readableContent += message.content + '\n\n';
      });
      
      readableContent += '📋 JSONL FORMAT (exact fine-tuning input):\n';
      readableContent += '-' .repeat(80) + '\n';
      readableContent += JSON.stringify({
        messages: messages
      }, null, 2) + '\n\n';
      
      readableContent += '=' .repeat(100) + '\n\n';
    });
    
    // Write readable file
    fs.writeFileSync(readableFile, readableContent);
    
    // ========================================
    // 3. VALIDATION SUMMARY
    // ========================================
    console.log('✅ Fine-Tuning Files Generated:');
    console.log(`📋 JSONL Format: ${fineTuningFile}`);
    console.log(`   - Size: ${fs.statSync(fineTuningFile).size} bytes`);
    console.log(`   - Lines: ${fineTuningLines.length}`);
    console.log(`   - Ready for OpenAI fine-tuning upload`);
    
    console.log(`📖 Human-Readable: ${readableFile}`);
    console.log(`   - Size: ${fs.statSync(readableFile).size} bytes`);
    console.log(`   - Formatted for review`);
    
    // Validate JSONL format
    console.log('\n🔍 JSONL Validation:');
    try {
      const testParse = fineTuningLines.map(line => JSON.parse(line));
      const hasMessages = testParse.every(ex => ex.messages && ex.messages.length >= 2);
      const hasRoles = testParse.every(ex => 
        ex.messages.every(msg => msg.role && msg.content)
      );
      
      console.log(`✅ Valid JSON objects: ${testParse.length}/${fineTuningLines.length}`);
      console.log(`✅ Has messages format: ${hasMessages ? 'Yes' : 'No'}`);
      console.log(`✅ Has user/assistant roles: ${hasRoles ? 'Yes' : 'No'}`);
      console.log(`✅ Ready for OpenAI upload: ${hasMessages && hasRoles ? 'Yes' : 'No'}`);
      
    } catch (error) {
      console.log(`❌ JSONL validation failed: ${error.message}`);
    }
    
    // Show first example preview
    console.log('\n📝 FIRST EXAMPLE PREVIEW:');
    console.log('=' .repeat(80));
    if (fineTuningLines.length > 0) {
      const firstExample = JSON.parse(fineTuningLines[0]);
      console.log(JSON.stringify(firstExample, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error generating fine-tuning format:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

downloadFineTuningFormat();