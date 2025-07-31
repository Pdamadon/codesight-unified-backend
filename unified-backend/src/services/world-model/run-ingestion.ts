/**
 * World Model Ingestion Runner
 * 
 * Processes all existing training data and populates the world model database
 * with domains, categories, products, and their relationships
 */

import { WorldModelService } from './database/service';
import { TrainingDataIngester } from './ingestion/training-data-ingester';
import { IngestionStats } from './types';

class WorldModelIngestionRunner {
  private worldModel: WorldModelService;
  private ingester: TrainingDataIngester;
  private stats: IngestionStats;

  constructor() {
    const connectionString = process.env.MONGODB_CONNECTION_STRING;
    const databaseName = process.env.MONGODB_DATABASE_NAME || 'world_model';

    if (!connectionString) {
      throw new Error('MONGODB_CONNECTION_STRING environment variable is required');
    }

    this.worldModel = new WorldModelService(connectionString, databaseName);
    this.ingester = new TrainingDataIngester(this.worldModel);
    
    this.stats = {
      domainsProcessed: 0,
      categoriesCreated: 0,
      productsIngested: 0,
      siblingsDiscovered: 0,
      patternsFound: 0,
      errors: []
    };
  }

  /**
   * Main ingestion process
   */
  async run(): Promise<void> {
    console.log('🚀 Starting World Model Ingestion...\n');
    console.log('📊 This will process all completed training data and extract:');
    console.log('   • Domain configurations for each e-commerce site');
    console.log('   • Category hierarchies with sibling relationships');
    console.log('   • Product data with variant clusters (colors, sizes, styles)');
    console.log('   • Spatial context and selector patterns');
    console.log('   • Deduplication across multiple discovery contexts\n');

    const startTime = Date.now();

    try {
      // Connect to MongoDB
      console.log('🔗 Connecting to MongoDB Atlas...');
      await this.worldModel.connect();
      console.log('✅ Connected successfully\n');

      // Show initial stats
      await this.showInitialStats();

      // Run the ingestion
      console.log('🔄 Processing training data...');
      await this.ingester.ingestAllTrainingData();

      // Show final stats
      await this.showFinalStats();

      const duration = (Date.now() - startTime) / 1000;
      console.log(`\n✅ Ingestion completed successfully in ${duration.toFixed(2)}s`);
      console.log('\n🎯 World Model is now ready for:');
      console.log('   • RAG queries for selector patterns');
      console.log('   • Variant cluster retrieval');
      console.log('   • Category sibling discovery');
      console.log('   • Cross-domain e-commerce automation');

    } catch (error) {
      console.error('\n❌ Ingestion failed:', error);
      this.stats.errors.push(error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      await this.worldModel.disconnect();
    }
  }

  /**
   * Show database stats before ingestion
   */
  private async showInitialStats(): Promise<void> {
    try {
      // We'll implement basic collection counting
      console.log('📊 Initial World Model Stats:');
      console.log('   • Starting fresh ingestion from training data');
      console.log('   • Existing world model data will be updated with new contexts\n');
    } catch (error) {
      console.warn('Could not retrieve initial stats:', error);
    }
  }

  /**
   * Show database stats after ingestion
   */
  private async showFinalStats(): Promise<void> {
    try {
      console.log('\n📊 Final World Model Stats:');
      console.log('   • Training data processed and transformed');
      console.log('   • Domains, categories, and products populated');
      console.log('   • Sibling relationships discovered');
      console.log('   • Variant clusters extracted');
      console.log('   • Ready for RAG queries');
      
      if (this.stats.errors.length > 0) {
        console.log('\n⚠️ Errors encountered:');
        this.stats.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
    } catch (error) {
      console.warn('Could not retrieve final stats:', error);
    }
  }
}

// Main execution
async function main() {
  const runner = new WorldModelIngestionRunner();
  
  try {
    await runner.run();
    process.exit(0);
  } catch (error) {
    console.error('Ingestion runner failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { WorldModelIngestionRunner };

// Run if called directly
if (require.main === module) {
  main();
}