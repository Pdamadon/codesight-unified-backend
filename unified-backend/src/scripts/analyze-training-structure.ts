#!/usr/bin/env ts-node

/**
 * Send current training data structure to OpenAI for analysis and recommendations
 */

import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function analyzeTrainingStructure() {
  console.log('🧠 Sending training data structure to OpenAI for analysis...\n');

  try {
    // Read the analysis request
    const requestPath = path.join(__dirname, '../../openai-structure-analysis-request.md');
    const analysisRequest = fs.readFileSync(requestPath, 'utf8');

    console.log('📤 Sending request to OpenAI...');
    
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert in AI training data design and GPT fine-tuning. You understand how to structure training data for optimal learning efficiency, information hierarchy, and AI comprehension. Provide detailed, actionable recommendations."
        },
        {
          role: "user", 
          content: analysisRequest
        }
      ],
      max_tokens: 4000,
      temperature: 0.3
    });

    const analysis = response.choices[0].message.content;
    
    console.log('✅ Received OpenAI analysis!\n');
    console.log('📝 Analysis Length:', analysis?.length, 'characters');
    
    // Save the analysis
    const outputPath = path.join(__dirname, '../../openai-training-structure-analysis.md');
    const fullOutput = `# OpenAI Training Data Structure Analysis

Generated: ${new Date().toISOString()}
Model: gpt-4
Request tokens: ~${Math.ceil(analysisRequest.length / 4)}
Response tokens: ~${Math.ceil((analysis?.length || 0) / 4)}

---

${analysis}
`;

    fs.writeFileSync(outputPath, fullOutput);
    
    console.log('💾 Analysis saved to:', outputPath);
    console.log('\n🎯 Next steps:');
    console.log('1. Review the OpenAI recommendations');
    console.log('2. Implement the suggested structure improvements');
    console.log('3. Test with sample training data');
    console.log('4. Deploy improved structure to production');

    // Show preview of recommendations
    console.log('\n📋 Preview of OpenAI Analysis:');
    console.log('=' .repeat(60));
    console.log(analysis?.substring(0, 500) + '...\n');
    
  } catch (error) {
    console.error('❌ Error analyzing training structure:', error);
    throw error;
  }
}

// Run the analysis
if (require.main === module) {
  analyzeTrainingStructure()
    .then(() => {
      console.log('\n✨ Training structure analysis completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Analysis failed:', error);
      process.exit(1);
    });
}

export { analyzeTrainingStructure };