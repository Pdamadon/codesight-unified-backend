/**
 * Complete OpenAI Fine-Tuning Pipeline Setup
 * Uploads training data and creates fine-tuning job
 */

const { PrismaClient } = require('@prisma/client');
const { OpenAIIntegrationService } = require('./dist/services/openai-integration-clean');

async function setupOpenAIFineTuning() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 Setting up OpenAI Fine-Tuning Pipeline\n');
    
    // Initialize OpenAI service
    const openaiService = new OpenAIIntegrationService();
    
    // Get our training data
    console.log('📥 Loading training data...');
    const trainingData = await prisma.trainingData.findUnique({
      where: { id: '9738ff9d-d123-46c3-872f-322ada4eb770' }
    });
    
    if (!trainingData || !trainingData.jsonlData) {
      console.log('❌ Training data not found');
      return;
    }
    
    // Parse training examples
    let examples = [];
    try {
      if (trainingData.jsonlData.startsWith('[')) {
        examples = JSON.parse(trainingData.jsonlData);
      } else {
        const lines = trainingData.jsonlData.split('\n').filter(line => line.trim());
        examples = lines.map(line => JSON.parse(line));
      }
    } catch (error) {
      console.log(`❌ Error parsing training data: ${error.message}`);
      return;
    }
    
    console.log(`✅ Loaded ${examples.length} training examples`);
    console.log(`📊 Data size: ${trainingData.fileSize} bytes\n`);
    
    // ========================================
    // STEP 1: Upload Training File to OpenAI
    // ========================================
    console.log('📤 Step 1: Uploading training file to OpenAI...');
    
    const uploadData = examples; // Pass examples array directly
    
    const metadata = {
      sessionId: trainingData.sessionId,
      createdAt: trainingData.createdAt,
      examples: examples.length,
      description: 'Semantic journey training data with enhanced DOM context and shopping flow understanding'
    };
    
    let fileId;
    try {
      fileId = await openaiService.uploadTrainingFile(uploadData, metadata);
      console.log(`✅ Training file uploaded successfully!`);
      console.log(`📋 File ID: ${fileId}\n`);
    } catch (error) {
      console.log(`❌ File upload failed: ${error.message}`);
      return;
    }
    
    // ========================================
    // STEP 2: Create Fine-Tuning Job
    // ========================================
    console.log('🎯 Step 2: Creating fine-tuning job...');
    
    const trainingConfig = {
      model: 'gpt-4o-mini-2024-07-18', // Most cost-effective for fine-tuning
      hyperparameters: {
        n_epochs: 3, // Standard for most datasets
        batch_size: 1, // Conservative batch size
        learning_rate_multiplier: 2.0 // Moderate learning rate
      },
      suffix: 'codesight-semantic-v1' // Identify our model
    };
    
    let jobId;
    try {
      jobId = await openaiService.createFineTuningJob(fileId, trainingConfig);
      console.log(`✅ Fine-tuning job created successfully!`);
      console.log(`🔄 Job ID: ${jobId}`);
      console.log(`🤖 Model: ${trainingConfig.model}`);
      console.log(`⚙️  Epochs: ${trainingConfig.hyperparameters.n_epochs}`);
      console.log(`📦 Batch Size: ${trainingConfig.hyperparameters.batch_size}`);
      console.log(`📈 Learning Rate: ${trainingConfig.hyperparameters.learning_rate_multiplier}\n`);
    } catch (error) {
      console.log(`❌ Job creation failed: ${error.message}`);
      return;
    }
    
    // ========================================
    // STEP 3: Store Job Information (Optional)
    // ========================================
    console.log('💾 Step 3: Storing job information...');
    
    try {
      // Try to store job info if FineTuningJob model exists
      const jobRecord = await prisma.fineTuningJob.upsert({
        where: { jobId: jobId },
        update: {
          status: 'validating_files',
          updatedAt: new Date()
        },
        create: {
          jobId: jobId,
          fileId: fileId,
          trainingDataId: trainingData.id,
          model: trainingConfig.model,
          status: 'validating_files',
          hyperparameters: trainingConfig.hyperparameters,
          suffix: trainingConfig.suffix,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      console.log(`✅ Job information stored in database`);
      console.log(`📋 Record ID: ${jobRecord.id}\n`);
    } catch (error) {
      console.log(`⚠️  Database storage skipped (${error.message.includes('Unknown arg') ? 'model not deployed yet' : error.message})`);
      console.log(`   Job is still running successfully in OpenAI\n`);
    }
    
    // ========================================
    // STEP 4: Initial Status Check
    // ========================================
    console.log('🔍 Step 4: Checking initial job status...');
    
    try {
      const status = await openaiService.monitorTraining(jobId);
      console.log(`📊 Current Status: ${status.status}`);
      console.log(`🔢 Trained Tokens: ${status.trainedTokens || 0}`);
      if (status.estimatedFinish) {
        console.log(`⏰ Estimated Finish: ${new Date(status.estimatedFinish * 1000).toLocaleString()}`);
      }
      console.log('');
    } catch (error) {
      console.log(`⚠️  Status check failed: ${error.message}\n`);
    }
    
    // ========================================
    // STEP 5: Monitoring Instructions
    // ========================================
    console.log('📋 NEXT STEPS:');
    console.log('=' .repeat(80));
    console.log(`1. Monitor job progress:`);
    console.log(`   node monitor-finetuning.js ${jobId}`);
    console.log('');
    console.log(`2. Check OpenAI dashboard:`);
    console.log(`   https://platform.openai.com/finetune/${jobId}`);
    console.log('');
    console.log(`3. Training typically takes 10-30 minutes for this dataset size`);
    console.log('');
    console.log(`4. Once complete, your custom model will be available as:`);
    console.log(`   ${trainingConfig.model}:ft-personal:codesight-semantic-v1-[timestamp]`);
    console.log('');
    console.log('🎯 The model will understand:');
    console.log('   • Semantic journey context and shopping flows');
    console.log('   • Enhanced DOM context with Playwright selectors');
    console.log('   • Product configuration states and user intent');
    console.log('   • Page state tracking and navigation patterns');
    console.log('   • Add-to-cart interactions with full context');
    console.log('');
    console.log('✅ Fine-tuning pipeline setup complete!');
    
  } catch (error) {
    console.error('❌ Pipeline setup failed:', error.message);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

setupOpenAIFineTuning();