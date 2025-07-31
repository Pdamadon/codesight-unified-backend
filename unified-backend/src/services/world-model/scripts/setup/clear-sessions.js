#!/usr/bin/env node

/**
 * Clear all unified sessions from PostgreSQL database
 * Run with: node clear-sessions.js
 */

const { PrismaClient } = require('@prisma/client');

async function clearUnifiedSessions() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🗄️ [CLEAR SESSIONS] Connecting to database...');
    
    // Get current count
    const currentCount = await prisma.unifiedSession.count();
    console.log(`📊 [CLEAR SESSIONS] Found ${currentCount} unified sessions to delete`);
    
    if (currentCount === 0) {
      console.log('✅ [CLEAR SESSIONS] No sessions to delete - table is already empty');
      return;
    }
    
    // Confirm deletion
    console.log('⚠️ [CLEAR SESSIONS] This will permanently delete ALL unified sessions');
    console.log('🔄 [CLEAR SESSIONS] Proceeding with deletion...');
    
    // Delete all unified sessions
    const deleteResult = await prisma.unifiedSession.deleteMany({});
    console.log(`✅ [CLEAR SESSIONS] Successfully deleted ${deleteResult.count} unified sessions`);
    
    // Verify deletion
    const verifyCount = await prisma.unifiedSession.count();
    console.log(`📊 [CLEAR SESSIONS] Verification: ${verifyCount} sessions remaining`);
    
    if (verifyCount === 0) {
      console.log('🎉 [CLEAR SESSIONS] All unified sessions successfully cleared!');
    } else {
      console.log('⚠️ [CLEAR SESSIONS] Warning: Some sessions may still remain');
    }
    
  } catch (error) {
    console.error('❌ [CLEAR SESSIONS] Error clearing sessions:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    console.log('🔌 [CLEAR SESSIONS] Database connection closed');
  }
}

// Run the script
clearUnifiedSessions()
  .then(() => {
    console.log('🏁 [CLEAR SESSIONS] Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 [CLEAR SESSIONS] Script failed:', error);
    process.exit(1);
  });