import { PrismaClient } from '@prisma/client';

// Singleton PrismaClient instance with proper connection pooling
class DatabaseConnection {
  private static instance: PrismaClient | null = null;

  static getInstance(): PrismaClient {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new PrismaClient({
        log: ['error', 'warn'],
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      });

      // Handle connection errors gracefully
      DatabaseConnection.instance.$on('error' as any, (error) => {
        console.error('Database connection error:', error);
      });
    }
    return DatabaseConnection.instance;
  }

  static async disconnect(): Promise<void> {
    if (DatabaseConnection.instance) {
      await DatabaseConnection.instance.$disconnect();
      DatabaseConnection.instance = null;
    }
  }

  static async reconnect(): Promise<PrismaClient> {
    await DatabaseConnection.disconnect();
    return DatabaseConnection.getInstance();
  }
}

// Export the singleton instance
export const prisma = DatabaseConnection.getInstance();

// Export the class for manual connection management if needed
export { DatabaseConnection };

// Graceful shutdown handlers
process.on('beforeExit', async () => {
  await DatabaseConnection.disconnect();
});

process.on('SIGINT', async () => {
  await DatabaseConnection.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await DatabaseConnection.disconnect();
  process.exit(0);
});