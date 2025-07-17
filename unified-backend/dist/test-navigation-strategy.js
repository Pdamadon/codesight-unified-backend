#!/usr/bin/env ts-node
"use strict";
/**
 * Test script for Navigation Strategy Service
 * This demonstrates the navigation strategy identification functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.testNavigationStrategy = testNavigationStrategy;
const client_1 = require("@prisma/client");
const navigation_strategy_1 = require("./services/navigation-strategy");
const openai_integration_1 = require("./services/openai-integration");
async function testNavigationStrategy() {
    const prisma = new client_1.PrismaClient();
    const openaiService = new openai_integration_1.OpenAIIntegrationService();
    const navigationService = new navigation_strategy_1.NavigationStrategyService(prisma, openaiService);
    try {
        console.log('🧭 Testing Navigation Strategy Service...\n');
        // Create test sessions with different navigation patterns
        const testSessions = [
            {
                id: 'nav-test-search-first-' + Date.now(),
                name: 'Search-First Navigator',
                pattern: 'search_first'
            },
            {
                id: 'nav-test-category-browser-' + (Date.now() + 1),
                name: 'Category Browser',
                pattern: 'category_browser'
            },
            {
                id: 'nav-test-comparison-shopper-' + (Date.now() + 2),
                name: 'Comparison Shopper',
                pattern: 'comparison_shopper'
            }
        ];
        for (const testCase of testSessions) {
            console.log(`📝 Creating test session: ${testCase.name}...`);
            // Create session
            const session = await prisma.unifiedSession.create({
                data: {
                    id: testCase.id,
                    type: 'HUMAN',
                    status: 'COMPLETED',
                    startTime: new Date(Date.now() - 600000), // 10 minutes ago
                    endTime: new Date(),
                    duration: 600,
                    qualityScore: 85,
                    completeness: 90,
                    reliability: 80,
                    trainingValue: 75
                }
            });
            // Create psychology profile for this session
            await prisma.psychologyProfile.create({
                data: {
                    sessionId: testCase.id,
                    dominantPersonality: testCase.pattern === 'search_first' ? 'ANALYTICAL' :
                        testCase.pattern === 'category_browser' ? 'SOCIAL' : 'CAUTIOUS',
                    emotionalState: 'CONFIDENT',
                    decisionMakingStyle: testCase.pattern === 'comparison_shopper' ? 'RESEARCH_DRIVEN' : 'DELIBERATE',
                    trustLevel: 75,
                    urgencyLevel: 50,
                    priceSensitivity: 60,
                    socialInfluence: testCase.pattern === 'category_browser' ? 80 : 40,
                    insights: JSON.stringify([]),
                    behaviorPredictions: JSON.stringify([]),
                    recommendations: JSON.stringify([]),
                    confidence: 85
                }
            });
            // Create interactions based on navigation pattern
            const interactions = generateInteractionsForPattern(testCase.id, testCase.pattern);
            for (const interaction of interactions) {
                await prisma.interaction.create({ data: interaction });
            }
            console.log(`✅ Test session created: ${testCase.name} (${interactions.length} interactions)`);
        }
        console.log('\n🔍 Testing navigation strategy identification...\n');
        // Test each session
        for (const testCase of testSessions) {
            console.log(`\n🎯 Analyzing ${testCase.name}:`);
            console.log('='.repeat(50));
            const analysis = await navigationService.identifyNavigationStrategy(testCase.id);
            console.log(`Session ID: ${analysis.sessionId}`);
            console.log(`Site Type: ${analysis.siteType}`);
            console.log(`Site Domain: ${analysis.siteDomain}`);
            console.log(`Identified Strategy: ${analysis.identifiedStrategy.strategyName}`);
            console.log(`Strategy Description: ${analysis.identifiedStrategy.description}`);
            console.log(`Confidence: ${analysis.confidence}%`);
            console.log('\n📊 Navigation Pattern:');
            console.log(`  Pattern Type: ${analysis.navigationPattern.patternType}`);
            console.log(`  Efficiency: ${analysis.navigationPattern.efficiency}%`);
            console.log(`  Complexity: ${analysis.navigationPattern.complexity}%`);
            console.log(`  Backtracking Count: ${analysis.navigationPattern.backtrackingCount}`);
            console.log(`  Unique Pages Visited: ${analysis.navigationPattern.uniquePagesVisited}`);
            console.log(`  Average Time Per Page: ${Math.round(analysis.navigationPattern.averageTimePerPage / 1000)}s`);
            console.log(`  Exit Pattern: ${analysis.navigationPattern.exitPattern}`);
            console.log('\n👤 User Preferences:');
            console.log(`  Preferred Starting Point: ${analysis.userPreferences.preferredStartingPoint}`);
            console.log(`  Information Gathering Style: ${analysis.userPreferences.informationGatheringStyle}`);
            console.log(`  Comparison Behavior: ${analysis.userPreferences.comparisonBehavior}`);
            console.log(`  Decision Making Speed: ${analysis.userPreferences.decisionMakingSpeed}`);
            console.log(`  Trust Building Needs: ${analysis.userPreferences.trustBuildingNeeds}`);
            console.log(`  Social Proof Dependency: ${analysis.userPreferences.socialProofDependency}`);
            console.log('\n🎯 Strategy Details:');
            console.log(`  Personality Alignment: ${analysis.identifiedStrategy.personalityAlignment.join(', ')}`);
            console.log(`  Emotional State Alignment: ${analysis.identifiedStrategy.emotionalStateAlignment.join(', ')}`);
            console.log(`  Conversion Probability: ${analysis.identifiedStrategy.conversionProbability}%`);
            console.log('\n🔑 Key Characteristics:');
            analysis.identifiedStrategy.keyCharacteristics.forEach((char, index) => {
                console.log(`  ${index + 1}. ${char}`);
            });
            console.log('\n✅ Success Factors:');
            analysis.identifiedStrategy.successFactors.forEach((factor, index) => {
                console.log(`  ${index + 1}. ${factor}`);
            });
            console.log('\n⚠️ Common Obstacles:');
            analysis.identifiedStrategy.commonObstacles.forEach((obstacle, index) => {
                console.log(`  ${index + 1}. ${obstacle}`);
            });
            console.log('\n💡 Optimization Recommendations:');
            analysis.identifiedStrategy.optimizationRecommendations.forEach((rec, index) => {
                console.log(`  ${index + 1}. ${rec}`);
            });
            if (analysis.alternativeStrategies.length > 0) {
                console.log('\n🔄 Alternative Strategies:');
                analysis.alternativeStrategies.forEach((alt, index) => {
                    console.log(`  ${index + 1}. ${alt.strategyName} (${alt.conversionProbability}% conversion)`);
                });
            }
            if (analysis.siteSpecificInsights.length > 0) {
                console.log('\n🌐 Site-Specific Insights:');
                analysis.siteSpecificInsights.forEach((insight, index) => {
                    console.log(`  ${index + 1}. ${insight}`);
                });
            }
            console.log('\n🚀 Improvement Suggestions:');
            analysis.improvementSuggestions.forEach((suggestion, index) => {
                console.log(`  ${index + 1}. ${suggestion}`);
            });
        }
        // Test batch processing
        console.log('\n📦 Testing batch navigation strategy identification...');
        const sessionIds = testSessions.map(t => t.id);
        const batchResults = await navigationService.batchIdentifyNavigationStrategies(sessionIds);
        console.log(`✅ Batch processing completed: ${batchResults.size} sessions analyzed`);
        // Test navigation training data generation
        console.log('\n🤖 Testing navigation training data generation...');
        for (const testCase of testSessions) {
            const trainingData = await navigationService.generateNavigationTrainingData(testCase.id);
            console.log(`\n📚 Training Data for ${testCase.name}:`);
            console.log(`  Training Value: ${trainingData.metadata.trainingValue}%`);
            console.log(`  Analysis Confidence: ${trainingData.metadata.analysisConfidence}%`);
            console.log(`  Training Examples: ${trainingData.trainingExamples.length}`);
            trainingData.trainingExamples.forEach((example, index) => {
                console.log(`\n  Example ${index + 1} (${example.type}):`);
                console.log(`    Input: ${JSON.stringify(example.input, null, 6)}`);
                console.log(`    Output: ${JSON.stringify(example.output, null, 6)}`);
            });
        }
        // Test navigation statistics
        console.log('\n📈 Navigation Strategy Statistics:');
        console.log('='.repeat(40));
        const stats = await navigationService.getNavigationStats();
        console.log(`Total Analyses: ${stats.totalAnalyses}`);
        console.log(`Average Navigation Efficiency: ${stats.averageNavigationEfficiency}%`);
        console.log('\nStrategy Distribution:');
        Object.entries(stats.strategyDistribution).forEach(([strategy, count]) => {
            console.log(`  ${strategy}: ${count} sessions`);
        });
        console.log('\nTop Strategies:');
        stats.topStrategies.forEach(([strategy, count], index) => {
            console.log(`  ${index + 1}. ${strategy}: ${count} sessions`);
        });
        console.log('\n🎉 Navigation Strategy Service test completed successfully!');
        // Cleanup test data
        console.log('\n🧹 Cleaning up test data...');
        for (const testCase of testSessions) {
            await prisma.psychologyProfile.deleteMany({ where: { sessionId: testCase.id } });
            await prisma.interaction.deleteMany({ where: { sessionId: testCase.id } });
            await prisma.unifiedSession.delete({ where: { id: testCase.id } });
        }
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
// Generate interactions based on navigation pattern
function generateInteractionsForPattern(sessionId, pattern) {
    const baseTimestamp = Date.now() - 600000; // 10 minutes ago
    const interactions = [];
    if (pattern === 'search_first') {
        // Search-first pattern: Quick navigation to search, then focused browsing
        interactions.push({
            id: `int-${sessionId}-1`,
            sessionId,
            type: 'NAVIGATION',
            timestamp: BigInt(baseTimestamp),
            sessionTime: 0,
            primarySelector: 'body',
            elementTag: 'body',
            elementText: 'Amazon.com',
            url: 'https://amazon.com',
            pageTitle: 'Amazon.com: Online Shopping',
            boundingBox: JSON.stringify({ x: 0, y: 0, width: 1920, height: 1080 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 0 }),
            confidence: 95
        }, {
            id: `int-${sessionId}-2`,
            sessionId,
            type: 'CLICK',
            timestamp: BigInt(baseTimestamp + 5000),
            sessionTime: 5000,
            primarySelector: '#twotabsearchtextbox',
            elementTag: 'input',
            elementText: '',
            url: 'https://amazon.com',
            pageTitle: 'Amazon.com: Online Shopping',
            boundingBox: JSON.stringify({ x: 300, y: 100, width: 400, height: 40 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 0 }),
            confidence: 90
        }, {
            id: `int-${sessionId}-3`,
            sessionId,
            type: 'INPUT',
            timestamp: BigInt(baseTimestamp + 8000),
            sessionTime: 8000,
            primarySelector: '#twotabsearchtextbox',
            elementTag: 'input',
            elementText: '',
            elementValue: 'wireless headphones',
            url: 'https://amazon.com',
            pageTitle: 'Amazon.com: Online Shopping',
            boundingBox: JSON.stringify({ x: 300, y: 100, width: 400, height: 40 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 0 }),
            confidence: 95
        }, {
            id: `int-${sessionId}-4`,
            sessionId,
            type: 'CLICK',
            timestamp: BigInt(baseTimestamp + 15000),
            sessionTime: 15000,
            primarySelector: '[data-component-type="s-search-result"]',
            elementTag: 'div',
            elementText: 'Sony WH-1000XM4 Wireless Headphones',
            url: 'https://amazon.com/s?k=wireless+headphones',
            pageTitle: 'Amazon.com: wireless headphones',
            boundingBox: JSON.stringify({ x: 200, y: 300, width: 600, height: 200 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 0 }),
            confidence: 88
        }, {
            id: `int-${sessionId}-5`,
            sessionId,
            type: 'CLICK',
            timestamp: BigInt(baseTimestamp + 45000),
            sessionTime: 45000,
            primarySelector: '#add-to-cart-button',
            elementTag: 'input',
            elementText: 'Add to Cart',
            url: 'https://amazon.com/dp/B0863TXGM3',
            pageTitle: 'Sony WH-1000XM4 Wireless Headphones',
            boundingBox: JSON.stringify({ x: 400, y: 600, width: 200, height: 50 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 200 }),
            confidence: 95
        });
    }
    else if (pattern === 'category_browser') {
        // Category browser pattern: Extended exploration through categories
        interactions.push({
            id: `int-${sessionId}-1`,
            sessionId,
            type: 'NAVIGATION',
            timestamp: BigInt(baseTimestamp),
            sessionTime: 0,
            primarySelector: 'body',
            elementTag: 'body',
            elementText: 'Target.com',
            url: 'https://target.com',
            pageTitle: 'Target : Expect More. Pay Less.',
            boundingBox: JSON.stringify({ x: 0, y: 0, width: 1920, height: 1080 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 0 }),
            confidence: 95
        }, {
            id: `int-${sessionId}-2`,
            sessionId,
            type: 'CLICK',
            timestamp: BigInt(baseTimestamp + 15000),
            sessionTime: 15000,
            primarySelector: '[data-test="@web/GlobalHeader/CategoryMenu"]',
            elementTag: 'button',
            elementText: 'Categories',
            url: 'https://target.com',
            pageTitle: 'Target : Expect More. Pay Less.',
            boundingBox: JSON.stringify({ x: 100, y: 50, width: 120, height: 40 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 0 }),
            confidence: 90
        }, {
            id: `int-${sessionId}-3`,
            sessionId,
            type: 'CLICK',
            timestamp: BigInt(baseTimestamp + 25000),
            sessionTime: 25000,
            primarySelector: '[data-category="electronics"]',
            elementTag: 'a',
            elementText: 'Electronics',
            url: 'https://target.com',
            pageTitle: 'Target : Expect More. Pay Less.',
            boundingBox: JSON.stringify({ x: 150, y: 200, width: 200, height: 60 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 0 }),
            confidence: 88
        }, {
            id: `int-${sessionId}-4`,
            sessionId,
            type: 'CLICK',
            timestamp: BigInt(baseTimestamp + 40000),
            sessionTime: 40000,
            primarySelector: '[data-subcategory="headphones"]',
            elementTag: 'a',
            elementText: 'Headphones & Earbuds',
            url: 'https://target.com/c/electronics',
            pageTitle: 'Electronics : Target',
            boundingBox: JSON.stringify({ x: 200, y: 300, width: 250, height: 50 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 100 }),
            confidence: 85
        }, {
            id: `int-${sessionId}-5`,
            sessionId,
            type: 'CLICK',
            timestamp: BigInt(baseTimestamp + 80000),
            sessionTime: 80000,
            primarySelector: '[data-test="product-title"]',
            elementTag: 'a',
            elementText: 'Apple AirPods Pro (2nd generation)',
            url: 'https://target.com/c/headphones-electronics',
            pageTitle: 'Headphones & Earbuds : Target',
            boundingBox: JSON.stringify({ x: 300, y: 400, width: 400, height: 100 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 200 }),
            confidence: 92
        }, {
            id: `int-${sessionId}-6`,
            sessionId,
            type: 'CLICK',
            timestamp: BigInt(baseTimestamp + 150000),
            sessionTime: 150000,
            primarySelector: '[data-test="chooseOptionsButton"]',
            elementTag: 'button',
            elementText: 'Add to cart',
            url: 'https://target.com/p/apple-airpods-pro-2nd-generation',
            pageTitle: 'Apple AirPods Pro (2nd generation) : Target',
            boundingBox: JSON.stringify({ x: 400, y: 700, width: 180, height: 50 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 300 }),
            confidence: 95
        });
    }
    else if (pattern === 'comparison_shopper') {
        // Comparison shopper pattern: Multiple product views with backtracking
        interactions.push({
            id: `int-${sessionId}-1`,
            sessionId,
            type: 'NAVIGATION',
            timestamp: BigInt(baseTimestamp),
            sessionTime: 0,
            primarySelector: 'body',
            elementTag: 'body',
            elementText: 'Best Buy',
            url: 'https://bestbuy.com',
            pageTitle: 'Best Buy | Official Online Store',
            boundingBox: JSON.stringify({ x: 0, y: 0, width: 1920, height: 1080 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 0 }),
            confidence: 95
        }, {
            id: `int-${sessionId}-2`,
            sessionId,
            type: 'INPUT',
            timestamp: BigInt(baseTimestamp + 10000),
            sessionTime: 10000,
            primarySelector: '#gh-search-input',
            elementTag: 'input',
            elementValue: 'laptop',
            url: 'https://bestbuy.com',
            pageTitle: 'Best Buy | Official Online Store',
            boundingBox: JSON.stringify({ x: 300, y: 80, width: 400, height: 40 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 0 }),
            confidence: 90
        }, 
        // First product view
        {
            id: `int-${sessionId}-3`,
            sessionId,
            type: 'CLICK',
            timestamp: BigInt(baseTimestamp + 20000),
            sessionTime: 20000,
            primarySelector: '.product-title',
            elementTag: 'a',
            elementText: 'MacBook Air 13-inch',
            url: 'https://bestbuy.com/site/searchpage.jsp?st=laptop',
            pageTitle: 'laptop - Best Buy',
            boundingBox: JSON.stringify({ x: 200, y: 300, width: 500, height: 80 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 0 }),
            confidence: 88
        }, 
        // Back to search results
        {
            id: `int-${sessionId}-4`,
            sessionId,
            type: 'NAVIGATION',
            timestamp: BigInt(baseTimestamp + 80000),
            sessionTime: 80000,
            primarySelector: '.breadcrumb',
            elementTag: 'a',
            elementText: 'Back to results',
            url: 'https://bestbuy.com/site/searchpage.jsp?st=laptop',
            pageTitle: 'laptop - Best Buy',
            boundingBox: JSON.stringify({ x: 50, y: 150, width: 120, height: 30 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 0 }),
            confidence: 85
        }, 
        // Second product view
        {
            id: `int-${sessionId}-5`,
            sessionId,
            type: 'CLICK',
            timestamp: BigInt(baseTimestamp + 90000),
            sessionTime: 90000,
            primarySelector: '.product-title',
            elementTag: 'a',
            elementText: 'Dell XPS 13',
            url: 'https://bestbuy.com/site/searchpage.jsp?st=laptop',
            pageTitle: 'laptop - Best Buy',
            boundingBox: JSON.stringify({ x: 200, y: 500, width: 500, height: 80 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 200 }),
            confidence: 88
        }, 
        // Back again
        {
            id: `int-${sessionId}-6`,
            sessionId,
            type: 'NAVIGATION',
            timestamp: BigInt(baseTimestamp + 150000),
            sessionTime: 150000,
            primarySelector: '.breadcrumb',
            elementTag: 'a',
            elementText: 'Back to results',
            url: 'https://bestbuy.com/site/searchpage.jsp?st=laptop',
            pageTitle: 'laptop - Best Buy',
            boundingBox: JSON.stringify({ x: 50, y: 150, width: 120, height: 30 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 0 }),
            confidence: 85
        }, 
        // Third product view
        {
            id: `int-${sessionId}-7`,
            sessionId,
            type: 'CLICK',
            timestamp: BigInt(baseTimestamp + 160000),
            sessionTime: 160000,
            primarySelector: '.product-title',
            elementTag: 'a',
            elementText: 'HP Pavilion 15',
            url: 'https://bestbuy.com/site/searchpage.jsp?st=laptop',
            pageTitle: 'laptop - Best Buy',
            boundingBox: JSON.stringify({ x: 200, y: 700, width: 500, height: 80 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 400 }),
            confidence: 88
        }, 
        // Final decision
        {
            id: `int-${sessionId}-8`,
            sessionId,
            type: 'CLICK',
            timestamp: BigInt(baseTimestamp + 300000),
            sessionTime: 300000,
            primarySelector: '.add-to-cart-button',
            elementTag: 'button',
            elementText: 'Add to Cart',
            url: 'https://bestbuy.com/site/hp-pavilion-15',
            pageTitle: 'HP Pavilion 15 - Best Buy',
            boundingBox: JSON.stringify({ x: 400, y: 600, width: 200, height: 50 }),
            viewport: JSON.stringify({ width: 1920, height: 1080, scrollX: 0, scrollY: 200 }),
            confidence: 95
        });
    }
    return interactions;
}
// Run the test
if (require.main === module) {
    testNavigationStrategy()
        .then(() => {
        console.log('\n✨ All navigation strategy tests passed!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('\n💥 Navigation strategy test failed:', error);
        process.exit(1);
    });
}
