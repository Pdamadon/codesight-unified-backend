/**
 * Debug sequence detection to understand why mock data isn't generating examples
 */

const { SequenceAwareTrainer } = require('./dist/services/training/sequence-aware-trainer.js');

async function debugSequenceDetection() {
  console.log('🔍 DEBUGGING SEQUENCE DETECTION');
  console.log('='.repeat(80));
  
  // Test with a simple, clear sequence
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
      context: { url: 'https://www2.hm.com/en_us/productpage.1234567890.html' },
      element: { text: 'M', attributes: { 'data-size': 'M' } },
      interaction: { type: 'click' },
      selectors: { primary: 'button[data-size="M"]', reliability: { primary: 0.95 } },
      visual: { boundingBox: { x: 100, y: 400, width: 40, height: 40 } },
      state: {}
    },
    {
      context: { url: 'https://www2.hm.com/en_us/productpage.1234567890.html' },
      element: { text: 'Add to bag', attributes: {} },
      interaction: { type: 'click' },
      selectors: { primary: '.add-to-cart-btn', reliability: { primary: 0.98 } },
      visual: { boundingBox: { x: 250, y: 500, width: 120, height: 45 } },
      state: {}
    }
  ];
  
  const trainer = new SequenceAwareTrainer();
  
  console.log('📊 Testing sequence detection on each interaction:');
  console.log('-'.repeat(60));
  
  mockInteractions.forEach((interaction, i) => {
    const url = interaction.context?.url || '';
    const text = interaction.element?.text || '';
    console.log(`${i + 1}. "${text}" on ${url.split('/').pop()}`);
    
    // Test if it would be detected as sequence start, continuation, or end
    // Note: These are private methods, so this is conceptual
    console.log(`   URL patterns: product=${url.includes('/product')}, sale=${url.includes('/sale')}`);
    console.log(`   Element: "${text}"`);
    
    if (text.toLowerCase().includes('add to bag')) {
      console.log('   🎯 This should be detected as sequence END');
    } else if (url.includes('/product')) {
      console.log('   🔄 This should be detected as sequence CONTINUATION');
    } else if (url.includes('/sale') || text.toLowerCase().includes('sale')) {
      console.log('   🚀 This should be detected as sequence START');
    } else {
      console.log('   ❓ Detection unclear');
    }
    console.log('');
  });
  
  // Try generating examples
  const examples = trainer.generateSequenceTrainingExamples(mockInteractions);
  console.log(`📋 Generated ${examples.length} examples`);
  
  if (examples.length > 0) {
    console.log('✅ SUCCESS! Example generated:');
    console.log('PROMPT:', examples[0].prompt.substring(0, 200) + '...');
    console.log('TYPE:', examples[0].context?.userJourney);
  } else {
    console.log('❌ No examples generated - sequence detection may not be working properly');
  }
}

debugSequenceDetection();