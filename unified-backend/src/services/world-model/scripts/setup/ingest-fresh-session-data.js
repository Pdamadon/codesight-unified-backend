/**
 * Ingest fresh session data with our enhanced HybridJourneyTracker integration
 */

const { PrismaClient } = require('@prisma/client');
const { TrainingDataTransformerImpl } = require('./dist/services/training/training-data-transformer');
const { SelectorStrategyServiceImpl } = require('./dist/services/selectors/selector-strategy');

async function ingestFreshSessionData() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 Fresh Data Ingestion with Enhanced HybridJourneyTracker\n');
    
    // Get the second session (fresh data we haven't used yet)
    const session = await prisma.unifiedSession.findFirst({
      where: { 
        id: 'session_1753801892179_psnx5dzwk' // The $100 casual outfit task
      }
    });
    
    if (!session) {
      console.log('❌ Session not found');
      return;
    }
    
    console.log(`📊 Processing Fresh Session: ${session.id}`);
    console.log(`📊 User Task: "${session.config?.generatedTask?.title}"`);
    console.log(`📊 Total Interactions: ${session.enhancedInteractions?.length || 0}`);
    console.log(`📊 Created: ${session.createdAt.toLocaleString()}\n`);
    
    // Initialize enhanced transformer
    const selectorStrategy = new SelectorStrategyServiceImpl();
    const transformer = new TrainingDataTransformerImpl(selectorStrategy);
    
    // Process a good sample of interactions (10-15 for variety)
    const sampleInteractions = session.enhancedInteractions?.slice(10, 25) || [];
    console.log(`🔄 Processing ${sampleInteractions.length} interactions with enhanced format...\n`);
    
    // Generate training data with our enhanced format
    const result = await transformer.generateTrainingData(
      session.id,
      sampleInteractions,
      session
    );
    
    console.log('✅ Enhanced Training Data Generation Results:');
    console.log(`📊 Total Examples Generated: ${result.examples?.length || 0}`);
    console.log(`📊 Success Rate: ${((result.examples?.length || 0) / sampleInteractions.length * 100).toFixed(1)}%`);
    
    if (result.examples && result.examples.length > 0) {
      // Find the best structured example
      const structuredExample = result.examples.find(ex => 
        ex.prompt && ex.prompt.includes('[USER GOAL]') && ex.prompt.includes('[JOURNEY]')
      );
      
      if (structuredExample) {
        console.log('\n🎯 Enhanced AI-Generated Training Example:');
        console.log('=' .repeat(100));
        
        console.log('📝 USER PROMPT (Enhanced Format):');
        console.log(structuredExample.prompt);
        
        console.log('\n' + '=' .repeat(100));
        console.log('🤖 ASSISTANT COMPLETION:');
        console.log(structuredExample.completion);
        
        console.log('\n' + '=' .repeat(100));
        
        // Analyze the enhancements
        const prompt = structuredExample.prompt;
        const completion = structuredExample.completion;
        
        console.log('\n✅ Enhanced Features Validation:');
        console.log('🎯 USER GOAL ENHANCEMENTS:');
        console.log(`  - Real task title: ${prompt.includes('Casual Everyday Outfit Under $100') ? '✅' : '❌'}`);
        console.log(`  - Task progress tracking: ${prompt.includes('Task Progress:') ? '✅' : '❌'}`);
        console.log(`  - Completed/remaining tasks: ${prompt.includes('Completed:') || prompt.includes('Remaining:') ? '✅' : '❌'}`);
        
        console.log('\n🛤️ JOURNEY ENHANCEMENTS:');
        console.log(`  - Real session steps: ${prompt.includes('Step:') && prompt.includes('/') ? '✅' : '❌'}`);
        console.log(`  - Evidence-based intent: ${prompt.includes('Current Intent:') && prompt.includes('confidence:') ? '✅' : '❌'}`);
        console.log(`  - Navigation flow: ${prompt.includes('Navigation Flow:') ? '✅' : '❌'}`);
        console.log(`  - User focus context: ${prompt.includes('User Focus:') ? '✅' : '❌'}`);
        console.log(`  - Decision factors: ${prompt.includes('Decision Factors:') ? '✅' : '❌'}`);
        
        console.log('\n🏗️ DOM ENHANCEMENTS:');
        console.log(`  - Complete hierarchy: ${prompt.includes('[DOM HIERARCHY]') ? '✅' : '❌'}`);
        console.log(`  - Siblings context: ${prompt.includes('[SIBLINGS CONTEXT]') ? '✅' : '❌'}`);
        console.log(`  - Selector strategies: ${prompt.includes('[SELECTOR STRATEGIES]') ? '✅' : '❌'}`);
        console.log(`  - Form relationships: ${prompt.includes('[FORM CONTEXT]') ? '✅' : '❌'}`);
        
        console.log('\n🎯 COMPLETION ENHANCEMENTS:');
        console.log(`  - Task context: ${completion.includes('[TASK CONTEXT]') ? '✅' : '❌'}`);
        console.log(`  - Multiple confidence: ${completion.includes('(selector)') && completion.includes('(intent)') ? '✅' : '❌'}`);
        console.log(`  - Next predictions: ${completion.includes('Next Predicted:') ? '✅' : '❌'}`);
        console.log(`  - Real reasoning: ${completion.includes('User Focus:') ? '✅' : '❌'}`);
        
        console.log('\n🎉 TRANSFORMATION SUCCESS:');
        console.log('From generic "Step: X/Y" → Rich contextual task progression');
        console.log('From "click(selector)" → Evidence-based intentional actions');
        console.log('From isolated interactions → Session-wide state awareness');
        
      } else {
        console.log('\n⚠️ No structured examples found - showing first available example:');
        console.log('Type:', typeof result.examples[0]);
        console.log('Keys:', Object.keys(result.examples[0]));
      }
    } else {
      console.log('\n❌ No training examples generated - may need to adjust quality thresholds');
    }
    
  } catch (error) {
    console.error('❌ Error during fresh data ingestion:', error.message);
    console.error('Stack:', error.stack?.split('\n').slice(0, 5).join('\n'));
  } finally {
    await prisma.$disconnect();
  }
}

ingestFreshSessionData();