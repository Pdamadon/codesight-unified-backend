/**
 * Analyze Product Variants Detection
 * 
 * Show what specific text is triggering product variant detection
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeVariants() {
  console.log('🔍 Analyzing Product Variant Detection\n');
  
  try {
    // Get the test session
    const session = await prisma.unifiedSession.findFirst({
      where: {
        enhancedInteractions: { not: null },
        qualityScore: { gte: 70 }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    if (!session) {
      console.log('❌ No test session found');
      return;
    }
    
    console.log(`📋 Analyzing session: ${session.id}\n`);
    
    // Parse the interactions
    let interactions;
    try {
      if (typeof session.enhancedInteractions === 'string') {
        interactions = JSON.parse(session.enhancedInteractions);
      } else {
        interactions = session.enhancedInteractions;
      }
    } catch (e) {
      console.log('❌ Could not parse interactions');
      return;
    }
    
    console.log(`📊 Total interactions: ${interactions.length}\n`);
    
    // Analyze what text would trigger variant detection
    const sizePatterns = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'small', 'medium', 'large', 'extra'];
    const colorPatterns = ['red', 'blue', 'green', 'black', 'white', 'navy', 'gray', 'brown', 'pink', 'purple', 'yellow', 'orange'];
    
    const detectedVariants = [];
    
    interactions.forEach((interaction, index) => {
      const text = interaction.element?.text || '';
      const url = interaction.context?.url || '';
      
      if (text && text.trim().length > 0) {
        const lowerText = text.toLowerCase();
        
        // Check for size patterns
        const matchedSize = sizePatterns.find(pattern => lowerText.includes(pattern));
        if (matchedSize) {
          detectedVariants.push({
            index,
            text,
            type: 'size',
            pattern: matchedSize,
            url: url.substring(0, 80) + '...'
          });
        }
        
        // Check for color patterns
        const matchedColor = colorPatterns.find(pattern => lowerText.includes(pattern));
        if (matchedColor) {
          detectedVariants.push({
            index,
            text,
            type: 'color',
            pattern: matchedColor,
            url: url.substring(0, 80) + '...'
          });
        }
      }
    });
    
    console.log(`🎨 Found ${detectedVariants.length} variant triggers:\n`);
    
    detectedVariants.forEach((variant, i) => {
      console.log(`${i + 1}. "${variant.text}" → ${variant.type} (pattern: "${variant.pattern}")`);
      console.log(`   Interaction ${variant.index} on: ${variant.url}`);
      console.log('');
    });
    
    // Summary by type
    const byType = detectedVariants.reduce((acc, variant) => {
      acc[variant.type] = (acc[variant.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📊 Summary:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} triggers`);
    });
    
    // Show some examples of text that might be false positives
    console.log('\n🔍 Potential Issues:');
    const questionable = detectedVariants.filter(v => 
      v.text.length > 50 || 
      v.text.toLowerCase().includes('click') ||
      v.text.toLowerCase().includes('button') ||
      v.text.toLowerCase().includes('link')
    );
    
    if (questionable.length > 0) {
      console.log('   These might be false positives (UI elements, not actual variants):');
      questionable.slice(0, 3).forEach(variant => {
        console.log(`   - "${variant.text}" (${variant.type})`);
      });
    } else {
      console.log('   No obvious false positives detected');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
analyzeVariants().catch(console.error);