import { PrismaClient } from '@prisma/client';

// Test database setup
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/codesight_test'
    }
  }
});

// Global test setup
beforeAll(async () => {
  // Clean up test database
  await cleanupTestDatabase();
});

afterAll(async () => {
  // Clean up and disconnect
  await cleanupTestDatabase();
  await prisma.$disconnect();
});

async function cleanupTestDatabase() {
  try {
    // Delete in reverse dependency order
    await prisma.visionAnalysisCache.deleteMany();
    await prisma.contextEnhancement.deleteMany();
    await prisma.psychologyProfile.deleteMany();
    await prisma.qualityReport.deleteMany();
    await prisma.trainingData.deleteMany();
    await prisma.sessionArchive.deleteMany();
    await prisma.screenshot.deleteMany();
    await prisma.interaction.deleteMany();
    await prisma.unifiedSession.deleteMany();
    await prisma.systemConfig.deleteMany();
  } catch (error) {
    console.warn('Test database cleanup failed:', error);
  }
}

export { prisma };