// Debug import issue with CommonJS require
console.log("🔍 Debugging import issue...");

try {
  // Try requiring the compiled module
  const qualityReporting = require('./services/quality-reporting.ts');
  console.log("📦 Module loaded:", Object.keys(qualityReporting));
  
  if (qualityReporting.QualityReportingService) {
    console.log("✅ QualityReportingService found as named export");
    console.log("🔧 Type:", typeof qualityReporting.QualityReportingService);
  }
  
  if (qualityReporting.default) {
    console.log("✅ Default export found");
    console.log("🔧 Type:", typeof qualityReporting.default);
  }
  
} catch (error) {
  console.error("❌ Error loading module:", error.message);
}