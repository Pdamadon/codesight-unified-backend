"use strict";
// Debug what's actually being imported
const qualityReportingModule = require("./services/quality-reporting.ts");
// Simple test to verify the class can be imported and instantiated
async function testImport() {
    console.log("🧪 Testing Quality Reporting Service Import");
    console.log("📦 Module contents:", Object.keys(qualityReportingModule));
    console.log("🔧 QualityReportingService type:", typeof qualityReportingModule.QualityReportingService);
    try {
        const QualityReportingService = qualityReportingModule.QualityReportingService;
        if (!QualityReportingService) {
            throw new Error("QualityReportingService is undefined");
        }
        // Mock minimal dependencies
        const mockPrisma = {};
        const mockThresholdService = {
            getAllThresholds: () => []
        };
        const mockValidationService = {};
        // Try to create instance
        const reportingService = new QualityReportingService(mockPrisma, mockThresholdService, mockValidationService);
        console.log("✅ QualityReportingService imported and instantiated successfully");
        console.log("📊 Service ready for quality reporting");
        return true;
    }
    catch (error) {
        console.error("❌ Failed to import/instantiate QualityReportingService:", error);
        return false;
    }
}
testImport().then(success => {
    if (success) {
        console.log("\n🎉 Quality Reporting Service is working correctly!");
    }
    else {
        console.log("\n💥 Quality Reporting Service has issues");
    }
});
