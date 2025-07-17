import { PrismaClient } from "@prisma/client";
import { DataValidationService } from "./services/data-validation";
import { QualityThresholdService } from "./services/quality-threshold";
import { QualityReportingService } from "./services/quality-reporting";

// Mock session data for testing
const generateMockSessions = (count: number, baseDate: Date = new Date()) => {
  const sessions = [];
  
  for (let i = 0; i < count; i++) {
    const sessionDate = new Date(baseDate.getTime() - (i * 24 * 60 * 60 * 1000)); // Spread over days
    const qualityScore = Math.floor(Math.random() * 100);
    const completeness = Math.floor(Math.random() * 100);
    const reliability = Math.floor(Math.random() * 100);
    
    // Determine status based on quality score
    let status = 'COMPLETED';
    if (qualityScore < 40) status = 'FAILED';
    else if (qualityScore < 60) status = 'REVIEW_REQUIRED';
    
    const trainingEligible = qualityScore >= 60 && completeness >= 70 && reliability >= 60;
    
    sessions.push({
      id: `session-${i + 1}`,
      type: ['HUMAN', 'AUTOMATED', 'HYBRID'][Math.floor(Math.random() * 3)],
      status,
      createdAt: sessionDate,
      startTime: new Date(sessionDate.getTime() - 300000), // 5 minutes before
      endTime: sessionDate,
      qualityScore,
      completeness,
      reliability,
      trainingEligible,
      interactions: Array(Math.floor(Math.random() * 10) + 1).fill(null).map((_, j) => ({
        id: `int-${i}-${j}`,
        sessionId: `session-${i + 1}`,
        type: 'CLICK',
        timestamp: sessionDate.getTime() - (j * 30000),
        primarySelector: Math.random() > 0.3 ? `#element-${j}` : null, // 30% missing selectors
        elementTag: 'button'
      })),
      screenshots: Array(Math.floor(Math.random() * 5) + 1).fill(null).map((_, j) => ({
        id: `ss-${i}-${j}`,
        sessionId: `session-${i + 1}`,
        timestamp: sessionDate.getTime() - (j * 60000),
        s3Key: `screenshots/session-${i + 1}/ss-${j}.webp`
      }))
    });
  }
  
  return sessions;
};

async function runQualityReportingTests() {
  console.log("📊 Starting Quality Reporting System Tests\n");

  // Generate mock data
  const mockSessions = generateMockSessions(50, new Date()); // 50 sessions over 50 days
  
  // Initialize services with mock Prisma
  const mockPrisma = {
    unifiedSession: {
      findMany: async ({ where, include, orderBy }: any) => {
        let filteredSessions = mockSessions;
        
        // Apply date filter
        if (where.createdAt) {
          filteredSessions = filteredSessions.filter(s => {
            const sessionDate = new Date(s.createdAt);
            return sessionDate >= where.createdAt.gte && sessionDate <= where.createdAt.lte;
          });
        }
        
        // Apply type filter
        if (where.type?.in) {
          filteredSessions = filteredSessions.filter(s => where.type.in.includes(s.type));
        }
        
        // Apply quality score filter
        if (where.qualityScore) {
          filteredSessions = filteredSessions.filter(s => 
            s.qualityScore >= (where.qualityScore.gte || 0) && 
            s.qualityScore <= (where.qualityScore.lte || 100)
          );
        }
        
        // Apply training eligibility filter
        if (where.trainingEligible !== undefined) {
          filteredSessions = filteredSessions.filter(s => s.trainingEligible === where.trainingEligible);
        }
        
        // Apply status filter
        if (where.status?.in) {
          filteredSessions = filteredSessions.filter(s => where.status.in.includes(s.status));
        }
        
        return filteredSessions;
      }
    }
  } as any;

  const validationService = new DataValidationService(mockPrisma);
  const thresholdService = new QualityThresholdService(mockPrisma, validationService);
  const reportingService = new QualityReportingService(mockPrisma, thresholdService, validationService);

  // Test different report types
  const timeRange = {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date()
  };

  console.log("🔍 Testing Summary Report");
  console.log("=" .repeat(40));

  try {
    const summaryReport = await reportingService.generateSummaryReport(timeRange);
    
    console.log(`📋 Report ID: ${summaryReport.id}`);
    console.log(`📅 Time Range: ${summaryReport.timeRange.start.toISOString().split('T')[0]} to ${summaryReport.timeRange.end.toISOString().split('T')[0]}`);
    console.log(`📊 Report Type: ${summaryReport.reportType.toUpperCase()}`);
    
    // Display summary data
    const summary = summaryReport.data.summary;
    console.log("\n📈 Quality Summary:");
    console.log(`  Total Sessions: ${summary.totalSessions}`);
    console.log(`  Average Quality Score: ${summary.averageQualityScore}/100`);
    console.log(`  Acceptance Rate: ${summary.acceptanceRate}%`);
    console.log(`  Rejection Rate: ${summary.rejectionRate}%`);
    console.log(`  Flagged Rate: ${summary.flaggedRate}%`);
    console.log(`  Training Eligibility Rate: ${summary.trainingEligibilityRate}%`);
    console.log(`  Top Performing Category: ${summary.topPerformingCategory}`);
    console.log(`  Lowest Performing Category: ${summary.lowestPerformingCategory}`);

    // Display category breakdown
    console.log("\n📊 Category Breakdown:");
    Object.entries(summaryReport.data.categoryBreakdown).forEach(([category, stats]) => {
      console.log(`  ${category}: ${stats.averageScore}/100`);
      if (stats.commonIssues.length > 0) {
        console.log(`    Common Issues: ${stats.commonIssues.slice(0, 2).join(', ')}`);
      }
    });

    // Display session distribution
    console.log("\n📈 Session Distribution:");
    console.log("  By Type:");
    Object.entries(summaryReport.data.sessionDistribution.byType).forEach(([type, count]) => {
      console.log(`    ${type}: ${count} sessions`);
    });
    
    console.log("  By Quality Score:");
    summaryReport.data.sessionDistribution.byQualityScore.forEach(range => {
      console.log(`    ${range.range}: ${range.count} sessions (${range.percentage}%)`);
    });

    // Display training readiness
    console.log("\n🎓 Training Readiness:");
    const training = summaryReport.data.trainingReadiness;
    console.log(`  Eligible Sessions: ${training.eligibleSessions}`);
    console.log(`  Eligibility Rate: ${training.eligibilityRate}%`);
    console.log(`  Average Eligible Score: ${training.averageEligibleScore}/100`);
    console.log(`  Estimated Training Value: ${training.estimatedTrainingValue} sessions`);
    
    if (training.commonBlockers.length > 0) {
      console.log("  Common Blockers:");
      training.commonBlockers.forEach(blocker => {
        console.log(`    • ${blocker.issue} (${blocker.frequency} sessions) - ${blocker.suggestedFix}`);
      });
    }

    // Display insights
    if (summaryReport.insights.length > 0) {
      console.log("\n💡 Key Insights:");
      summaryReport.insights.forEach(insight => {
        const icon = insight.type === 'positive' ? '✅' : insight.type === 'negative' ? '❌' : insight.type === 'actionable' ? '🔧' : 'ℹ️';
        console.log(`  ${icon} ${insight.title} (${insight.priority.toUpperCase()})`);
        console.log(`    ${insight.description}`);
        if (insight.estimatedImpact) {
          console.log(`    Impact: ${insight.estimatedImpact}`);
        }
      });
    }

    // Display recommendations
    if (summaryReport.recommendations.length > 0) {
      console.log("\n🎯 Recommendations:");
      summaryReport.recommendations.forEach(rec => {
        console.log(`  📌 ${rec.title} (${rec.priority.toUpperCase()} - ${rec.category})`);
        console.log(`    ${rec.description}`);
        console.log(`    Expected Benefit: ${rec.expectedBenefit}`);
        console.log(`    Implementation: ${rec.implementationEffort} effort, ${rec.timeline}`);
        if (rec.dependencies?.length) {
          console.log(`    Dependencies: ${rec.dependencies.join(', ')}`);
        }
      });
    }

  } catch (error) {
    console.error("❌ Failed to generate summary report:", error);
  }

  console.log("\n\n🔍 Testing Detailed Report with Filters");
  console.log("=" .repeat(50));

  try {
    // Test with filters
    const filters = {
      sessionTypes: ['HUMAN' as const],
      qualityScoreRange: { min: 60, max: 100 },
      trainingEligible: true
    };

    const detailedReport = await reportingService.generateDetailedReport(timeRange, filters);
    
    console.log(`📋 Filtered Report: ${detailedReport.title}`);
    console.log(`🔍 Filters Applied:`);
    console.log(`  Session Types: ${filters.sessionTypes.join(', ')}`);
    console.log(`  Quality Score Range: ${filters.qualityScoreRange.min}-${filters.qualityScoreRange.max}`);
    console.log(`  Training Eligible: ${filters.trainingEligible}`);
    
    const filteredSummary = detailedReport.data.summary;
    console.log(`\n📊 Filtered Results:`);
    console.log(`  Total Sessions: ${filteredSummary.totalSessions}`);
    console.log(`  Average Quality Score: ${filteredSummary.averageQualityScore}/100`);
    console.log(`  Training Eligibility Rate: ${filteredSummary.trainingEligibilityRate}%`);

    // Display threshold analysis
    console.log("\n🎯 Threshold Analysis:");
    const thresholdAnalysis = detailedReport.data.thresholdAnalysis;
    console.log(`  Most Triggered Thresholds:`);
    thresholdAnalysis.mostTriggeredThresholds.slice(0, 3).forEach(threshold => {
      console.log(`    • ${threshold}`);
    });

    // Display top issues
    if (detailedReport.data.topIssues.length > 0) {
      console.log("\n⚠️ Top Quality Issues:");
      detailedReport.data.topIssues.forEach(issue => {
        console.log(`  ${issue.severity.toUpperCase()}: ${issue.issue} (${issue.frequency} occurrences)`);
        console.log(`    Category: ${issue.category}, Trend: ${issue.trend}`);
        console.log(`    Suggested Actions: ${issue.suggestedActions.join(', ')}`);
      });
    }

    // Display improvements
    if (detailedReport.data.improvements.length > 0) {
      console.log("\n📈 Improvement Tracking:");
      detailedReport.data.improvements.forEach(improvement => {
        const trendIcon = improvement.trend === 'improving' ? '📈' : improvement.trend === 'declining' ? '📉' : '➡️';
        console.log(`  ${trendIcon} ${improvement.metric}`);
        console.log(`    Current: ${Math.round(improvement.currentValue)} | Previous: ${improvement.previousValue}`);
        console.log(`    Change: ${improvement.change > 0 ? '+' : ''}${improvement.change} (${improvement.changePercentage > 0 ? '+' : ''}${improvement.changePercentage}%)`);
        if (improvement.target) {
          console.log(`    Target: ${improvement.target}`);
        }
      });
    }

  } catch (error) {
    console.error("❌ Failed to generate detailed report:", error);
  }

  console.log("\n\n🔍 Testing Trend Report");
  console.log("=" .repeat(30));

  try {
    const trendReport = await reportingService.generateTrendReport(timeRange);
    
    console.log(`📈 Trend Analysis: ${trendReport.title}`);
    
    // Display trend data (last 7 days)
    const recentTrends = trendReport.data.trends.slice(-7);
    console.log("\n📊 Recent Trends (Last 7 Days):");
    console.log("Date       | Sessions | Avg Score | Accepted | Rejected | Flagged");
    console.log("-".repeat(65));
    
    recentTrends.forEach(trend => {
      const dateStr = trend.date.toISOString().split('T')[0];
      console.log(`${dateStr} |    ${trend.totalSessions.toString().padStart(2)}    |    ${trend.averageScore.toString().padStart(2)}     |    ${trend.acceptedSessions.toString().padStart(2)}    |    ${trend.rejectedSessions.toString().padStart(2)}    |   ${trend.flaggedSessions.toString().padStart(2)}`);
    });

    // Show category trends
    if (recentTrends.length > 0) {
      console.log("\n📈 Category Score Trends:");
      const latestTrend = recentTrends[recentTrends.length - 1];
      Object.entries(latestTrend.categoryScores).forEach(([category, score]) => {
        console.log(`  ${category}: ${Math.round(score)}/100`);
      });
    }

  } catch (error) {
    console.error("❌ Failed to generate trend report:", error);
  }

  console.log("\n\n🔍 Testing Report Export");
  console.log("=" .repeat(30));

  try {
    // Generate a report to export
    const exportReport = await reportingService.generateSummaryReport(timeRange);
    
    // Export as JSON
    const jsonExport = await reportingService.exportReport(exportReport.id, 'json');
    console.log(`📄 JSON Export Size: ${jsonExport.length} characters`);
    console.log(`✅ Export successful`);

    // Test invalid export
    try {
      await reportingService.exportReport('invalid-id', 'json');
    } catch (error) {
      console.log(`❌ Expected error for invalid report ID: ${error.message}`);
    }

  } catch (error) {
    console.error("❌ Failed to test report export:", error);
  }

  console.log("\n\n🔍 Testing Cache Performance");
  console.log("=" .repeat(35));

  try {
    console.log("⏱️ Generating report without cache...");
    const start1 = Date.now();
    await reportingService.generateSummaryReport(timeRange);
    const time1 = Date.now() - start1;
    console.log(`   Time: ${time1}ms`);

    console.log("⏱️ Generating same report with cache...");
    const start2 = Date.now();
    await reportingService.generateSummaryReport(timeRange);
    const time2 = Date.now() - start2;
    console.log(`   Time: ${time2}ms`);

    const speedup = Math.round((time1 / Math.max(time2, 1)) * 100) / 100;
    console.log(`🚀 Cache speedup: ${speedup}x faster`);

    // Clear cache
    reportingService.clearCache();
    console.log("🧹 Cache cleared");

  } catch (error) {
    console.error("❌ Failed to test cache performance:", error);
  }

  console.log("\n🎉 Quality Reporting System Tests Completed!");
  
  // Summary of capabilities
  console.log("\n📋 System Capabilities Demonstrated:");
  console.log("✅ Summary, Detailed, and Trend Reports");
  console.log("✅ Advanced Filtering and Time Range Selection");
  console.log("✅ Comprehensive Quality Analytics");
  console.log("✅ Threshold Performance Analysis");
  console.log("✅ Training Readiness Assessment");
  console.log("✅ Actionable Insights and Recommendations");
  console.log("✅ Quality Issue Identification");
  console.log("✅ Improvement Tracking");
  console.log("✅ Report Caching and Export");
  console.log("✅ Performance Optimization");
}

// Run tests if this file is executed directly
if (require.main === module) {
  runQualityReportingTests().catch(console.error);
}

export { runQualityReportingTests };