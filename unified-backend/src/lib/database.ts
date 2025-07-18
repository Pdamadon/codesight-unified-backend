import { PrismaClient } from '@prisma/client';

// Singleton PrismaClient instance with proper connection pooling
class DatabaseConnection {
  private static instance: PrismaClient | null = null;

  static getInstance(): PrismaClient {
    if (!DatabaseConnection.instance) {
      // Configure DATABASE_URL with PostgreSQL connection pool parameters
      const databaseUrl = process.env.DATABASE_URL;
      const enhancedDatabaseUrl = databaseUrl?.includes('connection_limit') 
        ? databaseUrl 
        : `${databaseUrl}?connection_limit=20&idle_timeout=600000&pool_timeout=10&connect_timeout=20`;

      DatabaseConnection.instance = new PrismaClient({
        log: ['error', 'warn', 'info'],
        datasources: {
          db: {
            url: enhancedDatabaseUrl
          }
        }
      });

      // Log connection pool configuration
      console.log('🗄️ PrismaClient initialized with enhanced connection pool:', {
        connectionLimit: 20,
        idleTimeout: '10min',
        poolTimeout: 10,
        connectTimeout: 20,
        url: enhancedDatabaseUrl?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') // Hide credentials
      });

      // Connection error handling is built into Prisma
      // No need for manual error listeners
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