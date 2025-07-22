const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupPendingSessions() {
  try {
    console.log('🧹 Starting cleanup of PENDING sessions...');
    
    // First, get a count of current PENDING sessions
    const pendingCount = await prisma.unifiedSession.count({
      where: {
        processingStatus: 'PENDING'
      }
    });
    
    console.log(`📊 Found ${pendingCount} PENDING sessions`);
    
    if (pendingCount === 0) {
      console.log('✅ No PENDING sessions to clean up');
      return;
    }
    
    // Get some details about the pending sessions
    const oldestPending = await prisma.unifiedSession.findFirst({
      where: {
        processingStatus: 'PENDING'
      },
      orderBy: {
        startTime: 'asc'
      },
      select: {
        id: true,
        startTime: true,
        processingStatus: true
      }
    });
    
    const newestPending = await prisma.unifiedSession.findFirst({
      where: {
        processingStatus: 'PENDING'
      },
      orderBy: {
        startTime: 'desc'
      },
      select: {
        id: true,
        startTime: true,
        processingStatus: true
      }
    });
    
    console.log(`📅 Oldest PENDING: ${oldestPending?.startTime} (${oldestPending?.id})`);
    console.log(`📅 Newest PENDING: ${newestPending?.startTime} (${newestPending?.id})`);
    
    // Delete all PENDING sessions older than 1 hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    console.log(`🗑️  Deleting PENDING sessions older than ${oneHourAgo}...`);
    
    const deleteResult = await prisma.unifiedSession.deleteMany({
      where: {
        processingStatus: 'PENDING',
        startTime: {
          lt: oneHourAgo
        }
      }
    });
    
    console.log(`✅ Deleted ${deleteResult.count} old PENDING sessions`);
    
    // Get remaining counts by status
    const statusCounts = await prisma.unifiedSession.groupBy({
      by: ['processingStatus'],
      _count: {
        id: true
      }
    });
    
    console.log('📊 Remaining sessions by status:');
    statusCounts.forEach(status => {
      console.log(`   ${status.processingStatus}: ${status._count.id}`);
    });
    
    // Also clean up orphaned screenshots and interactions
    console.log('🧹 Cleaning up orphaned data...');
    
    // Note: We can't easily clean up screenshots/interactions because they might be 
    // referenced by sessions that aren't PENDING. Would need more complex cleanup.
    
    console.log('✅ Cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupPendingSessions();