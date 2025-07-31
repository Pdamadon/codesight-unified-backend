/**
 * Monitor OpenAI Fine-Tuning Job Progress
 * Usage: node monitor-finetuning.js [jobId]
 */

const { OpenAIIntegrationService } = require('./dist/services/openai-integration-clean');
const { PrismaClient } = require('@prisma/client');

async function monitorFineTuning(jobId) {
  const prisma = new PrismaClient();
  
  if (!jobId) {
    console.log('❌ Usage: node monitor-finetuning.js <jobId>');
    return;
  }
  
  try {
    console.log(`🔍 Monitoring Fine-Tuning Job: ${jobId}\n`);
    
    // Initialize OpenAI service
    const openaiService = new OpenAIIntegrationService();
    
    // Get current status
    const status = await openaiService.monitorTraining(jobId);
    
    console.log('📊 CURRENT STATUS:');
    console.log('=' .repeat(60));
    console.log(`Status: ${status.status}`);
    console.log(`Trained Tokens: ${status.trainedTokens || 0}`);
    
    if (status.estimatedFinish) {
      console.log(`Estimated Finish: ${new Date(status.estimatedFinish * 1000).toLocaleString()}`);
    }
    
    if (status.hyperparameters) {
      console.log(`\n⚙️  HYPERPARAMETERS:`);
      console.log(`Epochs: ${status.hyperparameters.n_epochs}`);
      console.log(`Batch Size: ${status.hyperparameters.batch_size}`);
      console.log(`Learning Rate: ${status.hyperparameters.learning_rate_multiplier}`);
    }
    
    // Status-specific information
    console.log(`\n📋 STATUS DETAILS:`);
    switch (status.status) {
      case 'validating_files':
        console.log('🔍 OpenAI is validating your training file...');
        console.log('   This usually takes 1-2 minutes');
        break;
        
      case 'queued':
        console.log('⏳ Job is queued and waiting to start training...');
        console.log('   Training will begin when compute resources are available');
        break;
        
      case 'running':
        console.log('🏃 Training is actively running!');
        if (status.trainedTokens) {
          console.log(`   Progress: ${status.trainedTokens} tokens processed`);
        }
        break;
        
      case 'succeeded':
        console.log('✅ Training completed successfully!');
        if (status.resultFiles && status.resultFiles.length > 0) {
          console.log(`   Result files: ${status.resultFiles.length} files available`);
        }
        break;
        
      case 'failed':
        console.log('❌ Training failed');
        if (status.error) {
          console.log(`   Error: ${status.error.message}`);
          console.log(`   Code: ${status.error.code}`);
        }
        break;
        
      case 'cancelled':
        console.log('🛑 Training was cancelled');
        break;
        
      default:
        console.log(`Unknown status: ${status.status}`);
    }
    
    // Update database if possible
    try {
      await prisma.fineTuningJob.updateMany({
        where: { jobId: jobId },
        data: {
          status: status.status,
          trainedTokens: status.trainedTokens || 0,
          updatedAt: new Date()
        }
      });
      console.log(`\n💾 Database updated with current status`);
    } catch (error) {
      console.log(`\n⚠️  Database update skipped (${error.message.includes('Unknown arg') ? 'model not deployed yet' : error.message})`);
    }
    
    // Show next steps based on status
    console.log(`\n📋 NEXT STEPS:`);
    console.log('=' .repeat(60));
    
    if (status.status === 'succeeded') {
      console.log('🎉 Your custom model is ready!');
      console.log('');
      console.log('Model name format:');
      console.log('   gpt-4o-mini-2024-07-18:ft-personal:codesight-semantic-v1-[timestamp]');
      console.log('');
      console.log('You can now use this model in your applications by:');
      console.log('1. Updating your model configuration');
      console.log('2. Testing with the enhanced semantic understanding');
      console.log('3. Deploying to production');
      
    } else if (['validating_files', 'queued', 'running'].includes(status.status)) {
      console.log('⏳ Training still in progress...');
      console.log('');
      console.log('Check again in a few minutes:');
      console.log(`   node monitor-finetuning.js ${jobId}`);
      console.log('');
      console.log('Or monitor via OpenAI dashboard:');
      console.log(`   https://platform.openai.com/finetune/${jobId}`);
      
    } else if (status.status === 'failed') {
      console.log('🔧 Troubleshooting steps:');
      console.log('1. Check the error message above');
      console.log('2. Verify training data format');
      console.log('3. Try with different hyperparameters');
      console.log('4. Contact OpenAI support if the error persists');
      
    } else if (status.status === 'cancelled') {
      console.log('🔄 To restart training:');
      console.log('1. Run setup-openai-finetuning.js again');
      console.log('2. Or create a new job with different parameters');
    }
    
    console.log('');
    
  } catch (error) {
    console.error('❌ Monitoring failed:', error.message);
    
    if (error.message.includes('No such FineTuning job')) {
      console.log('\n💡 Possible issues:');
      console.log('   • Job ID might be incorrect');
      console.log('   • Job might not exist or was deleted');
      console.log('   • Check your OpenAI dashboard for active jobs');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Get job ID from command line arguments
const jobId = process.argv[2];
monitorFineTuning(jobId);