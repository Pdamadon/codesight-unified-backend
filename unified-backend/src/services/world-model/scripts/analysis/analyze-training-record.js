/**
 * Analyze the content of the processed training record
 */

import { PrismaClient } from '@prisma/client';

async function analyzeTrainingRecord() {
  console.log('🔍 Analyzing Training Record Content...\n');
  
  const prisma = new PrismaClient();

  try {
    const record = await prisma.trainingData.findUnique({
      where: {
        id: '8a6dd30d-b583-40e2-8ad7-e348255d51f0'
      },
      select: {
        id: true,
        sessionId: true,
        jsonlData: true,
        trainingQuality: true,
        fileSize: true
      }
    });

    if (!record || !record.jsonlData) {
      console.log('❌ Record not found or no JSONL data');
      return;
    }

    console.log(`📊 Record Analysis:`);
    console.log(`   ID: ${record.id}`);
    console.log(`   Session: ${record.sessionId}`);
    console.log(`   Quality: ${record.trainingQuality}`);
    console.log(`   Size: ${record.fileSize} characters\n`);

    // Parse JSONL data to understand structure
    const lines = record.jsonlData.split('\n').filter(line => line.trim());
    console.log(`📝 JSONL Structure:`);
    console.log(`   Total examples: ${lines.length}`);

    if (lines.length > 0) {
      // Analyze first few examples
      console.log('\n🔍 Sample Examples:');
      
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        try {
          const example = JSON.parse(lines[i]);
          console.log(`\nExample ${i + 1}:`);
          console.log(`   Keys: ${Object.keys(example).join(', ')}`);
          
          if (example.prompt) {
            // Look for domain information in prompt
            const domainMatch = example.prompt.match(/Site:\s*([^\n]+)/);
            const urlMatch = example.prompt.match(/URL:\s*([^\n]+)/);
            const pageTypeMatch = example.prompt.match(/Page Type:\s*([^\n]+)/);
            
            if (domainMatch) console.log(`   Domain: ${domainMatch[1].trim()}`);
            if (urlMatch) console.log(`   URL: ${urlMatch[1].trim()}`);
            if (pageTypeMatch) console.log(`   Page Type: ${pageTypeMatch[1].trim()}`);
          }
          
          if (example.completion) {
            const completionPreview = example.completion.substring(0, 100) + '...';
            console.log(`   Completion: ${completionPreview}`);
          }
          
        } catch (e) {
          console.log(`   ❌ Example ${i + 1}: Invalid JSON`);
        }
      }

      // Look for unique domains across all examples
      console.log('\n🌐 Domain Analysis:');
      const domains = new Set();
      const pageTypes = new Set();
      
      for (const line of lines.slice(0, 50)) { // Check first 50 examples
        try {
          const example = JSON.parse(line);
          if (example.prompt) {
            const domainMatch = example.prompt.match(/Site:\s*([^\n]+)/);
            const pageTypeMatch = example.prompt.match(/Page Type:\s*([^\n]+)/);
            
            if (domainMatch) domains.add(domainMatch[1].trim());
            if (pageTypeMatch) pageTypes.add(pageTypeMatch[1].trim());
          }
        } catch (e) {
          // Skip invalid JSON
        }
      }
      
      console.log(`   Unique domains found: ${Array.from(domains).join(', ')}`);
      console.log(`   Page types found: ${Array.from(pageTypes).join(', ')}`);
    }

  } catch (error) {
    console.error('❌ Error analyzing training record:', error);
  } finally {
    await prisma.$disconnect();
  }
}

analyzeTrainingRecord().catch(console.error);