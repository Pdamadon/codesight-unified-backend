"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinimalQualityReportingService = void 0;
// Minimal version to test the basic structure
class MinimalQualityReportingService {
    constructor() {
        console.log("MinimalQualityReportingService created");
    }
    async generateReport() {
        return {
            id: "test-report",
            title: "Test Report",
            data: { summary: { totalSessions: 0 } }
        };
    }
}
exports.MinimalQualityReportingService = MinimalQualityReportingService;
// Test the minimal service
async function testMinimal() {
    try {
        const service = new MinimalQualityReportingService();
        const report = await service.generateReport();
        console.log("✅ Minimal service works:", report.title);
        return true;
    }
    catch (error) {
        console.error("❌ Minimal service failed:", error);
        return false;
    }
}
testMinimal();
