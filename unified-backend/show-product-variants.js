/**
 * Show Product Variants Detected
 * 
 * Display the specific product variants found by our refactored parser
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showProductVariants() {
  console.log('🎨 Product Variants Detected by Refactored Parser\n');
  
  try {
    // Get the same test session
    const sessions = await prisma.unifiedSession.findMany({
      where: {
        enhancedInteractions: { not: null },
        qualityScore: { gte: 70 }
      },
      orderBy: { createdAt: 'desc' },
      take: 1
    });
    
    if (sessions.length === 0) {
      console.log('❌ No test sessions found');
      return;
    }
    
    const session = sessions[0];
    console.log(`📋 Session: ${session.id} (${session.domain})\n`);
    
    // Import and run the parser
    const { DirectSessionParser } = await import('./dist/direct-session-parser.js');
    const parser = new DirectSessionParser();
    const result = parser.parseSession(session);
    
    if (result && result.productVariants.length > 0) {
      console.log(`🎨 Found ${result.productVariants.length} Product Variants:\n`);
      
      result.productVariants.forEach((variant, i) => {
        console.log(`${i + 1}. Variant ID: ${variant.variantId}`);
        console.log(`   Product ID: ${variant.productId}`);
        console.log(`   Type: ${variant.variantType}`);
        console.log(`   Associated with: ${variant.productId}`);
        console.log('');
      });
      
      // Group by type
      const byType = result.productVariants.reduce((acc, variant) => {
        acc[variant.variantType] = (acc[variant.variantType] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📊 Variants by Type:');
      Object.entries(byType).forEach(([type, count]) => {
        console.log(`   ${type}: ${count} variants`);
      });
      
      // Show some examples of the actual text that triggered variant detection
      console.log('\n🔍 Sample Variant Detection:');
      console.log('Looking at session interactions to show what triggered variant detection...\n');
      
      // Parse interactions to show examples
      const interactions = JSON.parse(session.enhancedInteractions);
      let examples = 0;
      
      interactions.slice(0, 20).forEach((interaction, index) => {
        const text = interaction.element?.text || '';
        if (text && examples < 5) {
          const isSize = /xs|s|m|l|xl|xxl|small|medium|large|extra/i.test(text.toLowerCase());
          const isColor = /red|blue|green|black|white|navy|gray|brown|pink|purple|yellow|orange/i.test(text.toLowerCase());
          
          if (isSize || isColor) {
            console.log(`   Example ${examples + 1}: "${text}" → ${isSize ? 'size' : 'color'} variant`);
            examples++;
          }
        }
      });
      
    } else {
      console.log('❌ No product variants found in this session');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the analysis
showProductVariants().catch(console.error);