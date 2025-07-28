/**
 * Validate that training examples include both semantic journey understanding 
 * AND rich technical execution data as required
 */

const { SequenceAwareTrainer } = require('./dist/services/training/sequence-aware-trainer.js');

async function validateSemanticTechnicalTraining() {
  console.log('🔍 VALIDATING SEMANTIC + TECHNICAL TRAINING DATA');
  console.log('='.repeat(80));
  
  // Use the exact working pattern from debug test
  const mockInteractions = [
    {
      context: { url: 'https://www2.hm.com/en_us/men/sale/t-shirts-tank-tops.html' },
      element: { text: 'Sale', attributes: {} },
      interaction: { type: 'click' },
      selectors: { primary: 'a', reliability: { primary: 0.9 } },
      visual: { boundingBox: { x: 100, y: 50, width: 50, height: 30 } },
      state: {}
    },
    {
      context: { url: 'https://www2.hm.com/en_us/productpage.1234567890.html' },
      element: { text: 'Cotton T-shirt', attributes: {} },
      interaction: { type: 'click' },
      selectors: { primary: '.product', reliability: { primary: 0.9 } },
      visual: { boundingBox: { x: 200, y: 150, width: 250, height: 300 } },
      state: {}
    },
    {
      context: { 
        url: 'https://www2.hm.com/en_us/productpage.1234567890.html',
        pageTitle: 'Regular-Fit Cotton T-shirt - Dark blue/White striped | H&M US'
      },
      element: { 
        text: 'M', 
        attributes: { 'data-size': 'M', class: 'size-selector-btn', type: 'button' }
      },
      interaction: { type: 'click' },
      selectors: { 
        primary: 'button[data-size="M"]', 
        reliability: { primary: 0.95 }
      },
      visual: { 
        boundingBox: { x: 100, y: 400, width: 40, height: 40 }
      },
      state: {}
    },
    {
      context: { 
        url: 'https://www2.hm.com/en_us/productpage.1234567890.html',
        pageTitle: 'Regular-Fit Cotton T-shirt - Dark blue/White striped | H&M US'
      },
      element: { 
        text: 'Add to bag', 
        attributes: { class: 'add-to-cart-btn primary-btn', type: 'button' }
      },
      interaction: { type: 'click' },
      selectors: { 
        primary: '.add-to-cart-btn', 
        reliability: { primary: 0.98 }
      },
      visual: { 
        boundingBox: { x: 250, y: 500, width: 120, height: 45 }
      },
      state: {}
    }
  ];
  
  const trainer = new SequenceAwareTrainer();
  const examples = trainer.generateSequenceTrainingExamples(mockInteractions);
  
  console.log(`✅ Generated ${examples.length} training examples\n`);
  
  if (examples.length > 0) {
    const example = examples[0];
    
    console.log('📋 VALIDATION ANALYSIS:');
    console.log('-'.repeat(60));
    
    // Check for SEMANTIC JOURNEY context
    const hasSemanticJourney = example.prompt.includes('[SEMANTIC JOURNEY]');
    console.log(`✓ Has Semantic Journey Context: ${hasSemanticJourney ? '✅ YES' : '❌ NO'}`);
    
    // Check for SHOPPING FLOW context  
    const hasShoppingFlow = example.prompt.includes('[SHOPPING FLOW]');
    console.log(`✓ Has Shopping Flow Context: ${hasShoppingFlow ? '✅ YES' : '❌ NO'}`);
    
    // Check for technical execution details in completion
    const hasTechnicalDetails = example.completion.includes('Selector:') && 
                               example.completion.includes('Position:');
    console.log(`✓ Has Technical Execution Details: ${hasTechnicalDetails ? '✅ YES' : '❌ NO'}`);
    
    // Check for semantic reasoning in completion
    const hasSemanticReasoning = example.completion.includes('Configure product') || 
                                example.completion.includes('Select color') ||
                                example.completion.includes('Complete purchase');
    console.log(`✓ Has Semantic Action Reasoning: ${hasSemanticReasoning ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n📝 EXAMPLE BREAKDOWN:');
    console.log('-'.repeat(60));
    
    // Show semantic journey part
    const journeyMatch = example.prompt.match(/\[SEMANTIC JOURNEY\](.*?)\[/);
    if (journeyMatch) {
      console.log('🧠 SEMANTIC JOURNEY:', journeyMatch[1].trim());
    }
    
    // Show first completion line with both semantic + technical
    const firstCompletion = example.completion.split('\n').find(line => line.includes('//'));
    if (firstCompletion) {
      console.log('🔧 SEMANTIC + TECHNICAL COMPLETION:', firstCompletion.trim());
    }
    
    // Show if we have rich context preservation
    const hasRichContext = example.context && 
                          (example.context.userJourney || example.context.businessContext);
    console.log(`✓ Preserves Rich Context: ${hasRichContext ? '✅ YES' : '❌ NO'}`);
    
    console.log('\n🎯 VALIDATION RESULT:');
    console.log('-'.repeat(60));
    
    const allValidationsPassed = hasSemanticJourney && hasShoppingFlow && 
                                hasTechnicalDetails && hasSemanticReasoning && hasRichContext;
    
    if (allValidationsPassed) {
      console.log('🎉 SUCCESS: Training data includes BOTH semantic journey understanding AND rich technical execution details!');
      console.log('✓ AI will understand WHY to take actions (semantic journey)');
      console.log('✓ AI will know HOW to take actions (technical selectors/positions)');
      console.log('✓ All existing rich context is preserved for fine-tuning');
    } else {
      console.log('❌ VALIDATION FAILED: Missing required semantic or technical components');
    }
    
    return allValidationsPassed;
  } else {
    console.log('❌ No training examples generated');
    return false;
  }
}

validateSemanticTechnicalTraining();