# 🎯 Improved AI Training Data Structure

## Current Issues:
- Information scattered across multiple nested objects
- Duplicate data in different formats
- Complex JSON completion format
- Poor readability for AI training

## Proposed Structure:

### PROMPT (Clean Sections):
```
=== USER TASK ===
Find designer sneakers under $150 and add to cart

=== CURRENT ACTION ===
Click "Athletic & Sneakers" to navigate to sneaker section

=== WEBPAGE CONTEXT ===
Site: nordstrom.com
Page: Homepage - Men's Navigation Menu
Current URL: https://www.nordstrom.com/

=== TARGET ELEMENT ===
Text: "Athletic & Sneakers" 
Type: Navigation Link
HTML: <a href="/browse/men/shoes/sneakers-athletic" class="ZDzTL _3njsS ayGrI">Athletic & Sneakers</a>
Position: (501, 247) - 135x24px

=== SELECTORS (Best to Worst) ===
1. //nav[@id='GlobalDesktopNavFlyout']//a[contains(text(),'Athletic & Sneakers')] (0.90)
2. .ZDzTL._3njsS.ayGrI (0.70)  
3. [href*="sneakers-athletic"] (0.60)

=== NEARBY ELEMENTS ===
Left: "Shoes" (57px away)
Left: "Boots" (58px away) 
Below: "Comfort" (78px away)
Above: "Men" (88px away)

=== JOURNEY PROGRESS ===
Step 2 of 5: Homepage → [Navigation] → Category → Product → Cart
Progress: 40% complete
```

### COMPLETION (Simple & Clear):
```
ACTION: click
SELECTOR: //nav[@id='GlobalDesktopNavFlyout']//a[contains(text(),'Athletic & Sneakers')]  
REASONING: Text-based XPath is most reliable for navigation links. This advances user toward finding designer sneakers under $150.
CONFIDENCE: 90%
EXPECTED_RESULT: Navigate to athletic shoes category page
FALLBACK: .ZDzTL._3njsS.ayGrI
```

## Benefits:
1. **Clear Sections** - Easy for AI to understand different context types
2. **Hierarchical Info** - Most important info first
3. **Simple Completion** - Easy to generate and parse
4. **Reduced Duplication** - Each piece of info appears once
5. **Action-Focused** - Everything relates to the specific action needed

## Implementation:
- Redesign training-data-transformer.ts prompt generation
- Simplify completion format
- Group related information together
- Use consistent formatting and terminology