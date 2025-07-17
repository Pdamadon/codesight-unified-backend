"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runQualityThresholdTests = runQualityThresholdTests;
const data_validation_1 = require("./services/data-validation");
const quality_threshold_1 = require("./services/quality-threshold");
// Mock session data for testing
const mockSessionData = {
    id: "test-session-123",
    type: "HUMAN",
    status: "PROCESSING",
    startTime: new Date(Date.now() - 300000), // 5 minutes ago
    endTime: new Date(),
    qualityScore: 0,
    completeness: 0,
    reliability: 0,
    trainingEligible: false,
    interactions: [
        {
            id: "int-1",
            sessionId: "test-session-123",
            type: "CLICK",
            timestamp: Date.now() - 250000,
            primarySelector: "#product-buy-button",
            elementTag: "button",
            elementValue: null,
            coordinates: { x: 100, y: 200 },
            pageUrl: "https://example-store.com/product/123"
        },
        {
            id: "int-2",
            sessionId: "test-session-123",
            type: "INPUT",
            timestamp: Date.now() - 200000,
            primarySelector: "input[name='quantity']",
            elementTag: "input",
            elementValue: "2",
            coordinates: { x: 150, y: 250 },
            pageUrl: "https://example-store.com/product/123"
        },
        {
            id: "int-3",
            sessionId: "test-session-123",
            type: "CLICK",
            timestamp: Date.now() - 150000,
            primarySelector: ".add-to-cart-btn",
            elementTag: "button",
            elementValue: null,
            coordinates: { x: 200, y: 300 },
            pageUrl: "https://example-store.com/product/123"
        },
        {
            id: "int-4",
            sessionId: "test-session-123",
            type: "NAVIGATION",
            timestamp: Date.now() - 100000,
            primarySelector: null,
            elementTag: null,
            elementValue: null,
            coordinates: null,
            pageUrl: "https://example-store.com/cart"
        },
        {
            id: "int-5",
            sessionId: "test-session-123",
            type: "CLICK",
            timestamp: Date.now() - 50000,
            primarySelector: "#checkout-button",
            elementTag: "button",
            elementValue: null,
            coordinates: { x: 250, y: 350 },
            pageUrl: "https://example-store.com/cart"
        }
    ],
    screenshots: [
        {
            id: "ss-1",
            sessionId: "test-session-123",
            timestamp: Date.now() - 240000,
            s3Key: "screenshots/test-session-123/ss-1.webp",
            eventType: "CLICK",
            pageUrl: "https://example-store.com/product/123"
        },
        {
            id: "ss-2",
            sessionId: "test-session-123",
            timestamp: Date.now() - 140000,
            s3Key: "screenshots/test-session-123/ss-2.webp",
            eventType: "CLICK",
            pageUrl: "https://example-store.com/product/123"
        },
        {
            id: "ss-3",
            sessionId: "test-session-123",
            timestamp: Date.now() - 90000,
            s3Key: "screenshots/test-session-123/ss-3.webp",
            eventType: "NAVIGATION",
            pageUrl: "https://example-store.com/cart"
        }
    ]
};
// Test scenarios with different quality levels
const testScenarios = [
    {
        name: "High Quality Session",
        sessionData: {
            ...mockSessionData,
            id: "high-quality-session",
            interactions: Array(8).fill(null).map((_, i) => ({
                ...mockSessionData.interactions[0],
                id: `int-${i + 1}`,
                sessionId: "high-quality-session",
                timestamp: Date.now() - (300000 - i * 30000),
                primarySelector: `#element-${i + 1}`,
                elementTag: "button"
            })),
            screenshots: Array(6).fill(null).map((_, i) => ({
                ...mockSessionData.screenshots[0],
                id: `ss-${i + 1}`,
                sessionId: "high-quality-session",
                timestamp: Date.now() - (280000 - i * 40000)
            }))
        },
        expectedAction: "accept",
        expectedTrainingEligible: true
    },
    {
        name: "Low Quality Session",
        sessionData: {
            ...mockSessionData,
            id: "low-quality-session",
            interactions: [
                {
                    ...mockSessionData.interactions[0],
                    id: "int-1",
                    sessionId: "low-quality-session",
                    primarySelector: null, // Missing selector
                    elementTag: null
                },
                {
                    ...mockSessionData.interactions[1],
                    id: "int-2",
                    sessionId: "low-quality-session",
                    timestamp: Date.now() - 400000, // Inconsistent timestamp
                    primarySelector: "body > div:nth-child(5) > div:nth-child(3) > button:nth-child(1)" // Fragile selector
                }
            ],
            screenshots: [] // No screenshots
        },
        expectedAction: "reject",
        expectedTrainingEligible: false
    },
    {
        name: "Marginal Quality Session",
        sessionData: {
            ...mockSessionData,
            id: "marginal-quality-session",
            interactions: Array(4).fill(null).map((_, i) => ({
                ...mockSessionData.interactions[0],
                id: `int-${i + 1}`,
                sessionId: "marginal-quality-session",
                timestamp: Date.now() - (200000 - i * 40000),
                primarySelector: i % 2 === 0 ? `#element-${i + 1}` : null // Some missing selectors
            })),
            screenshots: Array(2).fill(null).map((_, i) => ({
                ...mockSessionData.screenshots[0],
                id: `ss-${i + 1}`,
                sessionId: "marginal-quality-session"
            }))
        },
        expectedAction: "flag",
        expectedTrainingEligible: false
    },
    {
        name: "Short Session",
        sessionData: {
            ...mockSessionData,
            id: "short-session",
            startTime: new Date(Date.now() - 30000), // 30 seconds ago
            endTime: new Date(),
            interactions: [
                {
                    ...mockSessionData.interactions[0],
                    id: "int-1",
                    sessionId: "short-session",
                    primarySelector: "#quick-buy"
                }
            ],
            screenshots: [
                {
                    ...mockSessionData.screenshots[0],
                    id: "ss-1",
                    sessionId: "short-session"
                }
            ]
        },
        expectedAction: "flag", // Should be flagged due to short duration
        expectedTrainingEligible: false
    }
];
async function runQualityThresholdTests() {
    console.log("🧪 Starting Quality Threshold System Tests\n");
    // Initialize services (using mock Prisma for testing)
    const mockPrisma = {
        unifiedSession: {
            findUnique: async ({ where }) => {
                const scenario = testScenarios.find(s => s.sessionData.id === where.id);
                return scenario ? scenario.sessionData : null;
            },
            update: async ({ where, data }) => {
                console.log(`📝 Session ${where.id} status updated:`, {
                    status: data.status,
                    qualityScore: data.qualityScore,
                    trainingEligible: data.trainingEligible
                });
                return { id: where.id, ...data };
            }
        }
    };
    const validationService = new data_validation_1.DataValidationService(mockPrisma);
    const thresholdService = new quality_threshold_1.QualityThresholdService(mockPrisma, validationService);
    // Test each scenario
    for (const scenario of testScenarios) {
        console.log(`\n🔍 Testing: ${scenario.name}`);
        console.log("=".repeat(50));
        try {
            // Run quality assessment
            const assessment = await thresholdService.assessSessionQuality(scenario.sessionData.id);
            console.log(`📊 Overall Score: ${assessment.overallScore}/100`);
            console.log(`🎯 Final Action: ${assessment.finalAction.toUpperCase()}`);
            console.log(`📝 Reason: ${assessment.actionReason}`);
            console.log(`🎓 Training Eligible: ${assessment.trainingEligible ? 'YES' : 'NO'}`);
            // Show category scores
            console.log("\n📈 Category Scores:");
            Object.entries(assessment.categoryScores).forEach(([category, score]) => {
                console.log(`  ${category}: ${score}/100`);
            });
            // Show threshold results
            console.log("\n🎯 Threshold Results:");
            assessment.thresholdResults.forEach(result => {
                const status = result.passed ? "✅ PASS" : "❌ FAIL";
                console.log(`  ${status} ${result.thresholdName}: ${result.actualScore}/${result.requiredScore}`);
            });
            // Show recommendations
            if (assessment.recommendations.length > 0) {
                console.log("\n💡 Recommendations:");
                assessment.recommendations.forEach(rec => {
                    console.log(`  ${rec.priority.toUpperCase()}: ${rec.message} (Impact: +${rec.estimatedImpact})`);
                });
            }
            // Show improvement suggestions
            if (assessment.improvementSuggestions.length > 0) {
                console.log("\n🔧 Improvement Suggestions:");
                assessment.improvementSuggestions.forEach(suggestion => {
                    console.log(`  • ${suggestion}`);
                });
            }
            // Verify expectations
            const actionMatch = assessment.finalAction === scenario.expectedAction;
            const trainingMatch = assessment.trainingEligible === scenario.expectedTrainingEligible;
            console.log(`\n✅ Expected Action: ${scenario.expectedAction} | Actual: ${assessment.finalAction} | ${actionMatch ? 'MATCH' : 'MISMATCH'}`);
            console.log(`✅ Expected Training: ${scenario.expectedTrainingEligible} | Actual: ${assessment.trainingEligible} | ${trainingMatch ? 'MATCH' : 'MISMATCH'}`);
            if (!actionMatch || !trainingMatch) {
                console.log("⚠️  Test result doesn't match expectations!");
            }
        }
        catch (error) {
            console.error(`❌ Test failed for ${scenario.name}:`, error);
        }
    }
    // Test threshold management
    console.log("\n\n🔧 Testing Threshold Management");
    console.log("=".repeat(50));
    // Add custom threshold
    thresholdService.addThreshold({
        id: 'custom_test_threshold',
        name: 'Custom Test Threshold',
        description: 'Test threshold for demonstration',
        category: 'overall',
        minScore: 80,
        maxScore: 100,
        action: 'accept',
        priority: 5,
        enabled: true
    });
    console.log("✅ Added custom threshold");
    // List all thresholds
    const allThresholds = thresholdService.getAllThresholds();
    console.log(`📋 Total thresholds: ${allThresholds.length}`);
    // Show threshold categories
    const categories = [...new Set(allThresholds.map(t => t.category))];
    console.log(`📂 Categories: ${categories.join(', ')}`);
    // Test quality metrics
    console.log("\n📊 Testing Quality Metrics");
    console.log("=".repeat(30));
    try {
        const metrics = await thresholdService.getQualityMetrics();
        console.log(`📈 Total Sessions Analyzed: ${metrics.totalSessions}`);
        console.log(`✅ Accepted: ${metrics.acceptedSessions}`);
        console.log(`❌ Rejected: ${metrics.rejectedSessions}`);
        console.log(`🏃 Flagged: ${metrics.flaggedSessions}`);
        console.log(`📊 Average Score: ${metrics.averageScore}/100`);
        console.log("\n📊 Category Averages:");
        Object.entries(metrics.categoryAverages).forEach(([category, avg]) => {
            console.log(`  ${category}: ${Math.round(avg)}/100`);
        });
    }
    catch (error) {
        console.error("❌ Failed to get quality metrics:", error);
    }
    console.log("\n🎉 Quality Threshold System Tests Completed!");
}
// Run tests if this file is executed directly
if (require.main === module) {
    runQualityThresholdTests().catch(console.error);
}
