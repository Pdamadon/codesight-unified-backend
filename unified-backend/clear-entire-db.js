#!/usr/bin/env node

/**
 * Clear entire PostgreSQL database except Prisma migrations
 * Run with: node clear-entire-db.js
 */

const { PrismaClient } = require('@prisma/client');

async function clearEntireDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🗄️ [CLEAR DB] Connecting to database...');
    
    // Get counts of all tables before deletion
    console.log('📊 [CLEAR DB] Getting current data counts...');
    const counts = {
      unifiedSessions: await prisma.unifiedSession.count(),
      interactions: await prisma.interaction.count(),
      screenshots: await prisma.screenshot.count(),
      sessionArchives: await prisma.sessionArchive.count(),
      trainingData: await prisma.trainingData.count(),
      systemConfigs: await prisma.systemConfig.count(),
      qualityReports: await prisma.qualityReport.count(),
      psychologyProfiles: await prisma.psychologyProfile.count(),
      contextEnhancements: await prisma.contextEnhancement.count(),
      visionAnalysisCache: await prisma.visionAnalysisCache.count(),
      generatedTasks: await prisma.generatedTask.count(),
      taskAssignments: await prisma.taskAssignment.count()
    };
    
    console.log('📈 [CLEAR DB] Current data counts:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count} records`);
    });
    
    const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
    console.log(`📊 [CLEAR DB] Total records to delete: ${totalRecords}`);
    
    if (totalRecords === 0) {
      console.log('✅ [CLEAR DB] No data to delete - database is already empty');
      return;
    }
    
    console.log('⚠️ [CLEAR DB] This will permanently delete ALL data except Prisma migrations');
    console.log('🔄 [CLEAR DB] Proceeding with deletion...');
    
    // Delete in dependency order to avoid foreign key constraints
    const deletionOrder = [
      { name: 'taskAssignments', fn: () => prisma.taskAssignment.deleteMany({}) },
      { name: 'generatedTasks', fn: () => prisma.generatedTask.deleteMany({}) },
      { name: 'visionAnalysisCache', fn: () => prisma.visionAnalysisCache.deleteMany({}) },
      { name: 'contextEnhancements', fn: () => prisma.contextEnhancement.deleteMany({}) },
      { name: 'psychologyProfiles', fn: () => prisma.psychologyProfile.deleteMany({}) },
      { name: 'qualityReports', fn: () => prisma.qualityReport.deleteMany({}) },
      { name: 'systemConfigs', fn: () => prisma.systemConfig.deleteMany({}) },
      { name: 'trainingData', fn: () => prisma.trainingData.deleteMany({}) },
      { name: 'sessionArchives', fn: () => prisma.sessionArchive.deleteMany({}) },
      { name: 'screenshots', fn: () => prisma.screenshot.deleteMany({}) },
      { name: 'interactions', fn: () => prisma.interaction.deleteMany({}) },
      { name: 'unifiedSessions', fn: () => prisma.unifiedSession.deleteMany({}) }
    ];
    
    console.log('🗑️ [CLEAR DB] Deleting data in dependency order...');
    
    for (const { name, fn } of deletionOrder) {
      try {
        const result = await fn();
        console.log(`✅ [CLEAR DB] Deleted ${result.count} records from ${name}`);
      } catch (error) {
        console.log(`⚠️ [CLEAR DB] ${name}: ${error.message} (may be empty or no foreign key constraints)`);
      }
    }
    
    // Verify all tables are empty
    console.log('🔍 [CLEAR DB] Verifying deletion...');
    const finalCounts = {
      unifiedSessions: await prisma.unifiedSession.count(),
      interactions: await prisma.interaction.count(),
      screenshots: await prisma.screenshot.count(),
      sessionArchives: await prisma.sessionArchive.count(),
      trainingData: await prisma.trainingData.count(),
      systemConfigs: await prisma.systemConfig.count(),
      qualityReports: await prisma.qualityReport.count(),
      psychologyProfiles: await prisma.psychologyProfile.count(),
      contextEnhancements: await prisma.contextEnhancement.count(),
      visionAnalysisCache: await prisma.visionAnalysisCache.count(),
      generatedTasks: await prisma.generatedTask.count(),
      taskAssignments: await prisma.taskAssignment.count()
    };
    
    console.log('📊 [CLEAR DB] Final verification counts:');
    Object.entries(finalCounts).forEach(([table, count]) => {
      const status = count === 0 ? '✅' : '⚠️';
      console.log(`   ${status} ${table}: ${count} records`);
    });
    
    const remainingRecords = Object.values(finalCounts).reduce((sum, count) => sum + count, 0);
    
    if (remainingRecords === 0) {
      console.log('🎉 [CLEAR DB] All data successfully cleared! Database is now empty (except migrations)');
    } else {
      console.log(`⚠️ [CLEAR DB] Warning: ${remainingRecords} records still remain`);
    }
    
  } catch (error) {
    console.error('❌ [CLEAR DB] Error clearing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('🔌 [CLEAR DB] Database connection closed');
  }
}

// Run the script
clearEntireDatabase()
  .then(() => {
    console.log('🏁 [CLEAR DB] Database clearing completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 [CLEAR DB] Database clearing failed:', error);
    process.exit(1);
  });