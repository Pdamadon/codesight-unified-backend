#!/usr/bin/env node

/**
 * Analyze DOM Context in Training Data
 * 
 * Check what DOM information is currently included vs what's needed for Playwright
 */

console.log('🔍 ANALYZING DOM CONTEXT IN TRAINING DATA\n');

console.log('📋 CURRENT DOM INFORMATION INCLUDED:');
console.log('═'.repeat(60));
console.log('[DOM CONTEXT]');
console.log('✅ Element: <button class="size-selector" data-size="M">M</button>');
console.log('✅ Text Content: "M"');
console.log('✅ Element Type: Size Selector Button'); 
console.log('✅ Bounding Box: {x: 320, y: 180, width: 45, height: 45}');
console.log('✅ Visibility: Visible, Clickable');
console.log('✅ Accessibility: role: button, aria-label: Select size Medium');
console.log('');
console.log('[SPATIAL CONTEXT]');
console.log('✅ Nearby Elements: button:S (left, 50px), button:L (right, 50px)');
console.log('✅ Parent Container: .size-selection-container');
console.log('');
console.log('[SELECTORS]');
console.log('✅ Primary: button[data-size="M"].size-selector (0.95)');
console.log('✅ Backup: //div[@class=\'size-selection-container\']/button[@data-size=\'M\']');
console.log('✅ CSS: .size-selection-container > button:nth-child(2)');

console.log('\n❌ MISSING DOM INFORMATION FOR PLAYWRIGHT:');
console.log('═'.repeat(60));
console.log('❌ Complete DOM hierarchy (parents, grandparents)');
console.log('❌ Sibling elements with full context');
console.log('❌ Element IDs and data attributes for all nearby elements');
console.log('❌ Form context and input relationships');
console.log('❌ Full selector paths for all nearby elements');
console.log('❌ Element state (disabled, checked, selected)');
console.log('❌ Complex DOM structure for context understanding');

console.log('\n🎯 WHAT PLAYWRIGHT CODE GENERATION NEEDS:');
console.log('═'.repeat(60));
console.log('🔧 await page.locator("button[data-size=\'M\']").click()');
console.log('🔧 await page.getByRole("button", { name: "Select size Medium" }).click()');
console.log('🔧 await page.locator(".size-selection-container").getByText("M").click()');
console.log('🔧 await page.locator("form").getByLabel("Size").selectOption("M")');
console.log('');
console.log('💡 To generate these selectors, AI needs:');
console.log('   • Complete DOM hierarchy understanding');
console.log('   • Parent-child relationships');
console.log('   • Sibling context for disambiguation');
console.log('   • Form structure and label associations');
console.log('   • Alternative selector strategies');

console.log('\n📊 ENHANCED DOM CONTEXT PROPOSAL:');
console.log('═'.repeat(60));

const enhancedDomContext = `
[DOM CONTEXT]
Target Element: <button class="size-selector" data-size="M" aria-label="Select size Medium">M</button>
Text Content: "M"
Element Type: Size Selector Button
Bounding Box: {x: 320, y: 180, width: 45, height: 45}
Visibility: Visible, Clickable
State: enabled, not-selected
Accessibility: role: button, aria-label: Select size Medium

[DOM HIERARCHY]
Grandparent: <div class="product-details-container" id="product-123">
Parent: <div class="size-selection-container" data-testid="size-selector">
  <label for="size-options">Choose Size:</label>
  <div class="size-options" role="radiogroup" aria-label="Available sizes">
Target: →  <button class="size-selector" data-size="M" aria-label="Select size Medium">M</button>
  </div>
</div>

[SIBLINGS CONTEXT]
Previous Sibling: <button class="size-selector" data-size="S">S</button> (selected: false)
Next Sibling: <button class="size-selector" data-size="L">L</button> (selected: false)
All Siblings: [S, M, L, XL, XXL] (5 size options available)

[FORM CONTEXT]
Form Container: <form id="product-config-form" data-product="shirt-12345">
Related Fields: 
  - Color: <select name="color" value="blue"> (already selected)
  - Quantity: <input name="quantity" value="1" type="number">
  - Size: <div class="size-options"> (current selection target)

[SELECTOR STRATEGIES]
1. Data Attribute: page.locator('button[data-size="M"]')
2. Accessibility: page.getByRole('button', { name: 'Select size Medium' })
3. Parent Context: page.locator('.size-selection-container').getByText('M')
4. Form Context: page.locator('form[data-product="shirt-12345"]').getByRole('button', { name: 'M' })
5. Test ID: page.getByTestId('size-selector').getByText('M')
6. XPath: //div[@data-testid='size-selector']//button[@data-size='M']

[PLAYWRIGHT GENERATION CONTEXT]
Recommended Strategy: Data attribute (most reliable)
Alternative Strategy: Accessibility role (most semantic)
Fallback Strategy: Parent container + text (visual context)
Complex Strategy: Form context + role (comprehensive)
`;

console.log(enhancedDomContext);

console.log('🚀 BENEFITS OF ENHANCED DOM CONTEXT:');
console.log('═'.repeat(60));
console.log('✅ AI can choose optimal Playwright selector strategy');
console.log('✅ Understanding of form relationships and context');
console.log('✅ Sibling awareness for disambiguation');
console.log('✅ Multiple fallback strategies for reliability');
console.log('✅ Semantic understanding of element purpose');
console.log('✅ State awareness (selected, disabled, etc.)');

console.log('\n💡 IMPLEMENTATION NEEDED:');
console.log('═'.repeat(60));
console.log('1. Enhance [DOM CONTEXT] section with hierarchy');
console.log('2. Add [DOM HIERARCHY] section with parent/child structure');
console.log('3. Add [SIBLINGS CONTEXT] section with related elements');
console.log('4. Add [FORM CONTEXT] section with form relationships');
console.log('5. Expand [SELECTOR STRATEGIES] with Playwright-specific options');
console.log('6. Add element state information (disabled, selected, etc.)');

console.log('\n🎯 This will enable AI to generate sophisticated Playwright code!');