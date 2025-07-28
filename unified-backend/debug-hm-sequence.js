/**
 * Debug H&M sequence detection
 */
const { SequenceAwareTrainer } = require('./dist/services/training/sequence-aware-trainer.js');

async function debugHMSequence() {
  console.log('🔍 DEBUGGING H&M SEQUENCE DETECTION');
  console.log('='.repeat(80));
  
  // Mock H&M interactions
  const mockHMInteractions = [
    {
      context: { url: 'https://www2.hm.com/en_us/index.html' },
      element: { text: 'Men', attributes: {} },
      interaction: { type: 'click' }
    },
    {
      context: { url: 'https://www2.hm.com/en_us/men/browse' },
      element: { text: 'Shirts', attributes: {} },
      interaction: { type: 'click' }
    },
    {
      context: { url: 'https://www2.hm.com/en_us/productpage.1276886002.html' },
      element: { text: 'Cotton shirt', attributes: {} },
      interaction: { type: 'click' }
    },
    {
      context: { url: 'https://www2.hm.com/en_us/productpage.1276886002.html' },
      element: { text: '38', attributes: { name: 'size-selector' } },
      interaction: { type: 'click' }
    },
    {
      context: { url: 'https://www2.hm.com/en_us/productpage.1276886002.html' },
      element: { text: 'Add to bag', attributes: {} },
      interaction: { type: 'click' }
    }
  ];
  
  // Test individual sequence detection methods
  const trainer = new SequenceAwareTrainer();
  
  console.log('Testing sequence start detection:');
  mockHMInteractions.forEach((interaction, i) => {
    const url = interaction.context?.url || '';
    const elementText = interaction.element?.text || '';
    console.log(`${i}: "${elementText}" on ${url}`);
    
    // Test if it's detected as sequence start
    // We need to access private methods, so let's test the logic manually
    const isStart = url.includes('/browse') || url.includes('/category') || 
                    elementText.toLowerCase().includes('shop') ||
                    elementText.toLowerCase().includes('browse');
    
    const isEnd = elementText.toLowerCase().includes('add to cart') ||
                  elementText.toLowerCase().includes('add to bag');
    
    console.log(`  - Sequence start: ${isStart}`);
    console.log(`  - Sequence end: ${isEnd}`);
    console.log('');
  });
  
  // Test the full sequence generation
  const examples = trainer.generateSequenceTrainingExamples(mockHMInteractions);
  console.log(`Generated ${examples.length} examples`);
  
  if (examples.length === 0) {
    console.log('No examples generated. Let me try with more explicit sequence markers...');
    
    // Try with more explicit markers
    const explicitMockInteractions = [
      {
        context: { url: 'https://www2.hm.com/en_us/browse/men' },
        element: { text: 'shop men', attributes: {} },
        interaction: { type: 'click' }
      },
      {
        context: { url: 'https://www2.hm.com/en_us/category/shirts' },
        element: { text: 'Shirts category', attributes: {} },
        interaction: { type: 'click' }
      },
      {
        context: { url: 'https://www2.hm.com/en_us/product/shirt123' },
        element: { text: 'View product', attributes: {} },
        interaction: { type: 'click' }
      },
      {
        context: { url: 'https://www2.hm.com/en_us/product/shirt123' },
        element: { text: 'Add to cart', attributes: {} },
        interaction: { type: 'click' }
      }
    ];
    
    const explicitExamples = trainer.generateSequenceTrainingExamples(explicitMockInteractions);
    console.log(`With explicit markers: ${explicitExamples.length} examples`);
    
    if (explicitExamples.length > 0) {
      console.log('✅ SUCCESS with explicit markers!');
      console.log('EXAMPLE:', explicitExamples[0].prompt.substring(0, 200) + '...');
    }
  }
}

debugHMSequence();