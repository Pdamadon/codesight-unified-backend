#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getDetailedTrainingData() {
  try {
    const latest = await prisma.trainingData.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { 
        id: true,
        sessionId: true,
        fileSize: true,
        trainingQuality: true,
        jsonlData: true 
      }
    });
    
    if (latest) {
      console.log('📊 Latest Training Data:');
      console.log('ID:', latest.id);
      console.log('Session:', latest.sessionId);
      console.log('File Size:', latest.fileSize, 'characters');
      console.log('Quality:', latest.trainingQuality);
      console.log('');
      
      const lines = latest.jsonlData.split('\n').filter(line => line.trim());
      const examples = lines.map(line => JSON.parse(line));
      
      console.log('🔍 Looking for individual examples with rich spatial context...\n');
      
      // Find examples that are not journey-sequence (individual interactions)
      const individualExamples = examples.filter(ex => 
        ex.context && ex.context.pageType !== 'journey-sequence'
      );
      
      console.log(`📊 Found ${individualExamples.length} individual examples out of ${examples.length} total\n`);
      
      // Show first 2 individual examples with enhanced context
      individualExamples.slice(0, 2).forEach((example, index) => {
        console.log(`\n🎯 === INDIVIDUAL EXAMPLE ${index + 1} ===`);
        console.log('📝 Prompt:');
        console.log(example.prompt);
        console.log('\n✅ Completion:');
        console.log(example.completion);
        
        if (example.context && example.context.element) {
          console.log('\n📊 Context Info:');
          console.log('- Page Type:', example.context.pageType || 'unknown');
          console.log('- Reliability:', example.context.reliability || 'unknown');
          
          if (example.context.element.allNearbySelectors) {
            console.log(`\n🎯 ALL NEARBY SELECTORS (${example.context.element.allNearbySelectors.length} elements):`);
            example.context.element.allNearbySelectors.forEach((el, i) => {
              console.log(`  ${i+1}. ${el.text} [${el.selector}] (${el.tagName}, ${el.distance}px ${el.direction}, interactive: ${el.interactive})`);
            });
          }
          
          if (example.context.element.completeElementMap) {
            console.log('\n📍 Complete Element Map Keys:', Object.keys(example.context.element.completeElementMap));
          }
          
          if (example.context.element.nearbyElementsComplete) {
            console.log('\n🌐 Enhanced Spatial Summary:');
            console.log(example.context.element.nearbyElementsComplete);
          }
        }
        
        if (example.quality) {
          console.log('\n⭐ Quality Score:', example.quality.score);
          console.log('📈 Quality Factors (showing key ones):');
          const importantFactors = [
            'hasReliableSelector',
            'hasSpatialContext', 
            'hasCompleteNearbyElements',
            'hasVisualContext',
            'hasBusinessContext'
          ];
          importantFactors.forEach(factor => {
            if (example.quality.factors[factor] !== undefined) {
              console.log(`   - ${factor}: ${example.quality.factors[factor]}`);
            }
          });
        }
        
        console.log('\n' + '='.repeat(80));
      });
      
      // Show a summary of what we enhanced
      console.log('\n📈 ENHANCEMENT SUMMARY:');
      const examplesWithNearbySelectors = examples.filter(ex => 
        ex.context && ex.context.element && ex.context.element.allNearbySelectors
      ).length;
      
      console.log(`- Examples with nearby selectors: ${examplesWithNearbySelectors}/${examples.length}`);
      console.log(`- Total file size: ${latest.fileSize} characters`);
      console.log(`- Training quality: ${latest.trainingQuality}`);
      
    } else {
      console.log('No training data found');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

getDetailedTrainingData();