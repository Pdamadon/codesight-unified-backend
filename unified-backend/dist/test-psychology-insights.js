#!/usr/bin/env ts-node
"use strict";
/**
 * Test script for Psychology Insights Service
 * This demonstrates the psychology extraction functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPsychologyInsights = testPsychologyInsights;
const client_1 = require("@prisma/client");
const psychology_insights_1 = require("./services/psychology-insights");
const openai_integration_1 = require("./services/openai-integration");
async function testPsychologyInsights() {
    const prisma = new client_1.PrismaClient();
    const openaiService = new openai_integration_1.OpenAIIntegrationService(prisma);
    const psychologyService = new psychology_insights_1.PsychologyInsightsService(prisma, openaiService);
    try {
        console.log('🧠 Testing Psychology Insights Service...\n');
        // Create a test session with sample data
        const testSessionId = 'test-psychology-session-' + Date.now();
        console.log('📝 Creating test session...');
        const session = await prisma.unifiedSession.create({
            data: {
                id: testSessionId,
                type: 'HUMAN',
                status: 'COMPLETED',
                startTime: new Date(Date.now() - 300000), // 5 minutes ago
                endTime: new Date(),
                duration: 300,
                qualityScore: 85,
                completeness: 90,
                reliability: 80,
                trainingValue: 75
            }
        });
        console.log('✅ Test session created:', session.id);
        // Create sample interactions that demonstrate different psychology patterns
        console.log('📱 Creating sample interactions...');
        const interactions = [
            {
                id: 'int-1',
                sessionId: testSessionId,
                type: 'NAVIGATION',
                timestamp: BigInt(Date.now() - 250000),
                sessionTime: 50000,
                primarySelector: 'body',
                elementTag: 'body',
                elementText: 'Amazon - Online Shopping',
                url: 'https://amazon.com',
                pageTitle: 'Amazon.com: Online Shopping for Electronics, Apparel, Computers, Books, DVDs & more',
                boundingBox: JSON.stringify({ x: 0, y: 0, width: 1920, height: 1080 }),
                viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 0 }),
                confidence: 95
            },
            {
                id: 'int-2',
                sessionId: testSessionId,
                type: 'INPUT',
                timestamp: BigInt(Date.now() - 200000),
                sessionTime: 100000,
                primarySelector: '#twotabsearchtextbox',
                elementTag: 'input',
                elementText: '',
                elementValue: 'wireless headphones',
                url: 'https://amazon.com',
                pageTitle: 'Amazon.com: Online Shopping for Electronics, Apparel, Computers, Books, DVDs & more',
                boundingBox: JSON.stringify({ x: 300, y: 100, width: 400, height: 40 }),
                viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 0 }),
                confidence: 90
            },
            {
                id: 'int-3',
                sessionId: testSessionId,
                type: 'CLICK',
                timestamp: BigInt(Date.now() - 180000),
                sessionTime: 120000,
                primarySelector: '[data-component-type="s-search-result"]',
                elementTag: 'div',
                elementText: 'Sony WH-1000XM4 Wireless Premium Noise Canceling Overhead Headphones',
                url: 'https://amazon.com/s?k=wireless+headphones',
                pageTitle: 'Amazon.com: wireless headphones',
                boundingBox: JSON.stringify({ x: 200, y: 300, width: 600, height: 200 }),
                viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 0 }),
                confidence: 88
            },
            {
                id: 'int-4',
                sessionId: testSessionId,
                type: 'CLICK',
                timestamp: BigInt(Date.now() - 120000),
                sessionTime: 180000,
                primarySelector: '#customerReviews',
                elementTag: 'div',
                elementText: 'Customer Reviews (4.5 out of 5 stars)',
                url: 'https://amazon.com/dp/B0863TXGM3',
                pageTitle: 'Sony WH-1000XM4 Wireless Premium Noise Canceling Overhead Headphones',
                boundingBox: JSON.stringify({ x: 100, y: 800, width: 800, height: 100 }),
                viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 400 }),
                confidence: 92
            },
            {
                id: 'int-5',
                sessionId: testSessionId,
                type: 'CLICK',
                timestamp: BigInt(Date.now() - 60000),
                sessionTime: 240000,
                primarySelector: '#add-to-cart-button',
                elementTag: 'input',
                elementText: 'Add to Cart',
                url: 'https://amazon.com/dp/B0863TXGM3',
                pageTitle: 'Sony WH-1000XM4 Wireless Premium Noise Canceling Overhead Headphones',
                boundingBox: JSON.stringify({ x: 400, y: 600, width: 200, height: 50 }),
                viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 200 }),
                confidence: 95
            }
        ];
        for (const interaction of interactions) {
            await prisma.interaction.create({ data: interaction });
        }
        console.log('✅ Sample interactions created');
        // Create sample screenshots
        console.log('📸 Creating sample screenshots...');
        const screenshots = [
            {
                id: 'screenshot-1',
                sessionId: testSessionId,
                interactionId: 'int-1',
                timestamp: BigInt(Date.now() - 250000),
                eventType: 'navigation',
                format: 'webp',
                fileSize: 45000,
                viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 0 }),
                quality: 85,
                visionAnalysis: JSON.stringify({
                    analysis: 'Amazon homepage with prominent search bar, navigation menu, and product recommendations. Clean, professional design with blue and orange color scheme.',
                    psychology: {
                        trustSignals: ['secure checkout', 'customer reviews', 'return policy'],
                        urgencyFactors: ['limited time deals', 'lightning deals'],
                        socialProof: ['bestseller badges', 'customer ratings']
                    }
                })
            },
            {
                id: 'screenshot-2',
                sessionId: testSessionId,
                interactionId: 'int-3',
                timestamp: BigInt(Date.now() - 180000),
                eventType: 'click',
                format: 'webp',
                fileSize: 52000,
                viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 0 }),
                quality: 90,
                visionAnalysis: JSON.stringify({
                    analysis: 'Search results page showing wireless headphones with product images, prices, ratings, and Prime shipping badges. User clicked on Sony headphones.',
                    psychology: {
                        trustSignals: ['prime shipping', 'high ratings', 'brand recognition'],
                        urgencyFactors: ['limited quantity', 'fast shipping'],
                        socialProof: ['customer reviews', 'bestseller rank']
                    }
                })
            },
            {
                id: 'screenshot-3',
                sessionId: testSessionId,
                interactionId: 'int-5',
                timestamp: BigInt(Date.now() - 60000),
                eventType: 'click',
                format: 'webp',
                fileSize: 48000,
                viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 200 }),
                quality: 88,
                visionAnalysis: JSON.stringify({
                    analysis: 'Product detail page with large product images, detailed specifications, customer reviews, and prominent Add to Cart button. Price and shipping information clearly displayed.',
                    psychology: {
                        trustSignals: ['detailed specifications', 'customer reviews', 'return policy'],
                        urgencyFactors: ['in stock', 'fast shipping'],
                        socialProof: ['4.5 star rating', '15,000 reviews', 'frequently bought together']
                    }
                })
            }
        ];
        for (const screenshot of screenshots) {
            await prisma.screenshot.create({ data: screenshot });
        }
        console.log('✅ Sample screenshots created');
        // Now test the psychology insights extraction
        console.log('\n🔍 Extracting psychology insights...');
        const psychologyProfile = await psychologyService.extractUserPsychologyInsights(testSessionId);
        console.log('\n📊 Psychology Profile Results:');
        console.log('================================');
        console.log(`Session ID: ${psychologyProfile.sessionId}`);
        console.log(`Dominant Personality: ${psychologyProfile.dominantPersonality}`);
        console.log(`Emotional State: ${psychologyProfile.emotionalState}`);
        console.log(`Decision Making Style: ${psychologyProfile.decisionMakingStyle}`);
        console.log(`Trust Level: ${psychologyProfile.trustLevel}%`);
        console.log(`Urgency Level: ${psychologyProfile.urgencyLevel}%`);
        console.log(`Price Sensitivity: ${psychologyProfile.pricesensitivity}%`);
        console.log(`Social Influence: ${psychologyProfile.socialInfluence}%`);
        console.log(`Confidence: ${psychologyProfile.confidence}%`);
        console.log('\n🔍 Detailed Insights:');
        console.log('=====================');
        psychologyProfile.insights.forEach((insight, index) => {
            console.log(`${index + 1}. ${insight.category.toUpperCase()}: ${insight.factor}`);
            console.log(`   Impact: ${insight.impact} | Confidence: ${insight.confidence}%`);
            console.log(`   Description: ${insight.description}`);
            console.log(`   Evidence: ${insight.evidence.join(', ')}`);
            console.log('');
        });
        console.log('🎯 Behavior Predictions:');
        console.log('========================');
        psychologyProfile.behaviorPredictions.forEach((prediction, index) => {
            console.log(`${index + 1}. ${prediction}`);
        });
        console.log('\n💡 Recommendations:');
        console.log('===================');
        psychologyProfile.recommendations.forEach((recommendation, index) => {
            console.log(`${index + 1}. ${recommendation}`);
        });
        // Test psychology-based training data generation
        console.log('\n🤖 Generating psychology-based training data...');
        const trainingData = await psychologyService.generatePsychologyTrainingData(testSessionId);
        console.log('\n📚 Training Data Results:');
        console.log('=========================');
        console.log(`Training Value: ${trainingData.metadata.trainingValue}%`);
        console.log(`Profile Confidence: ${trainingData.metadata.profileConfidence}%`);
        console.log(`Training Examples Generated: ${trainingData.trainingExamples.length}`);
        trainingData.trainingExamples.forEach((example, index) => {
            console.log(`\nExample ${index + 1} (${example.type}):`);
            console.log(`Input: ${JSON.stringify(example.input, null, 2)}`);
            console.log(`Output: ${JSON.stringify(example.output, null, 2)}`);
        });
        // Test batch processing
        console.log('\n📦 Testing batch psychology insights extraction...');
        const batchResults = await psychologyService.batchExtractPsychologyInsights([testSessionId]);
        console.log(`✅ Batch processing completed: ${batchResults.size} sessions processed`);
        // Get psychology statistics
        console.log('\n📈 Psychology Statistics:');
        console.log('========================');
        const stats = await psychologyService.getPsychologyStats();
        console.log(`Total Profiles: ${stats.summary.totalProfiles}`);
        console.log(`Average Confidence: ${stats.summary.averageConfidence}%`);
        console.log(`Average Trust Level: ${stats.summary.averageTrustLevel}%`);
        console.log(`Average Urgency Level: ${stats.summary.averageUrgencyLevel}%`);
        console.log(`Average Price Sensitivity: ${stats.summary.averagePriceSensitivity}%`);
        console.log(`Average Social Influence: ${stats.summary.averageSocialInfluence}%`);
        console.log('\nPersonality Distribution:');
        stats.distributions.personality.forEach(dist => {
            console.log(`  ${dist.dominantPersonality}: ${dist._count} sessions`);
        });
        console.log('\nEmotional State Distribution:');
        stats.distributions.emotionalState.forEach(dist => {
            console.log(`  ${dist.emotionalState}: ${dist._count} sessions`);
        });
        console.log('\n🎉 Psychology Insights Service test completed successfully!');
        // Cleanup test data
        console.log('\n🧹 Cleaning up test data...');
        await prisma.psychologyProfile.deleteMany({ where: { sessionId: testSessionId } });
        await prisma.screenshot.deleteMany({ where: { sessionId: testSessionId } });
        await prisma.interaction.deleteMany({ where: { sessionId: testSessionId } });
        await prisma.unifiedSession.delete({ where: { id: testSessionId } });
        console.log('✅ Test data cleaned up');
    }
    catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
    finally {
        await prisma.$disconnect();
    }
}
// Run the test
if (require.main === module) {
    testPsychologyInsights()
        .then(() => {
        console.log('\n✨ All tests passed!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Test failed:', error);
        process.exit(1);
    });
}
