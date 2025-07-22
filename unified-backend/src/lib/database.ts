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
        : `${databaseUrl}?connection_limit=5&idle_timeout=300000&pool_timeout=20&connect_timeout=30`;

      DatabaseConnection.instance = new PrismaClient({
        log: ['error', 'warn', 'info'],
        datasources: {
          db: {
            url: enhancedDatabaseUrl
          }
        }
      });

      // Log connection pool configuration
      console.log('🗄️ PrismaClient initialized with conservative connection pool:', {
        connectionLimit: 5,
        idleTimeout: '5min',
        poolTimeout: 20,
        connectTimeout: 30,
        url: enhancedDatabaseUrl?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@') // Hide credentials
      });

      // Keep-alive ping to prevent idle timeout on hosted Postgres
      setInterval(async () => {
        try {
          if (DatabaseConnection.instance) {
            await DatabaseConnection.instance.$executeRaw`SELECT 1`;
            console.log('🟢 Database keep-alive ping successful');
          }
        } catch (error) {
          console.warn('🔴 Database keep-alive ping failed:', error);
          // Don't recreate connection immediately, let Prisma handle reconnection
        }
      }, 2 * 60 * 1000); // Every 2 minutes (more frequent)

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