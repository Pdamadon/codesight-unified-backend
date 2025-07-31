/**
 * World Model Setup Script
 * 
 * Sets up MongoDB connection, creates indexes, and tests the world model system
 * Run this after creating your MongoDB Atlas cluster
 */

import { WorldModelService } from './database/service';
import { TrainingDataIngester } from './ingestion/training-data-ingester';
import { WorldModelConfig, IngestionStats } from './types';

class WorldModelSetup {
  private config: WorldModelConfig;
  private worldModel: WorldModelService;

  constructor() {
    this.config = {
      mongoConnectionString: process.env.MONGODB_CONNECTION_STRING || '',
      databaseName: process.env.MONGODB_DATABASE_NAME || 'world_model',
      enableSiblingDiscovery: true,
      maxSiblingsPerPage: 50,
      patternRecognitionThreshold: 0.7
    };

    this.worldModel = new WorldModelService(
      this.config.mongoConnectionString,
      this.config.databaseName
    );
  }

  /**
   * Main setup process
   */
  async setup(): Promise<void> {
    console.log('🚀 Starting World Model Setup...\n');

    try {
      // Step 1: Test connection
      await this.testConnection();

      // Step 2: Create indexes
      await this.createIndexes();

      // Step 3: Test basic operations
      await this.testBasicOperations();

      // Step 4: Offer to run ingestion
      await this.offerIngestion();

      console.log('\n✅ World Model setup completed successfully!');

    } catch (error) {
      console.error('\n❌ Setup failed:', error);
      throw error;
    } finally {
      await this.worldModel.disconnect();
    }
  }

  /**
   * Test MongoDB Atlas connection
   */
  private async testConnection(): Promise<void> {
    console.log('🔗 Testing MongoDB Atlas connection...');
    
    if (!this.config.mongoConnectionString) {
      throw new Error('MONGODB_CONNECTION_STRING environment variable is required');
    }

    await this.worldModel.connect();
    console.log('✅ Connected to MongoDB Atlas successfully');
  }

  /**
   * Create database indexes
   */
  private async createIndexes(): Promise<void> {
    console.log('📊 Creating database indexes...');
    // Indexes are created automatically in the connect() method
    console.log('✅ Indexes created successfully');
  }

  /**
   * Test basic CRUD operations
   */
  private async testBasicOperations(): Promise<void> {
    console.log('🧪 Testing basic operations...');

    // Test domain creation
    const domainId = await this.worldModel.upsertDomain({
      domain: 'test-site.com',
      siteType: 'ecommerce' as any,
      siteName: 'Test Site',
      globalSelectors: {},
      layoutPatterns: {
        hasTopNavigation: true,
        hasSideNavigation: false,
        responsiveBreakpoints: [768, 1024]
      },
      urlPatterns: {
        category: [],
        product: [],
        search: [],
        sale: []
      },
      reliability: {
        overallSuccessRate: 0.5,
        totalInteractions: 0,
        lastValidated: new Date()
      }
    });

    // Test category creation
    await this.worldModel.upsertCategory({
      domainId,
      categoryPath: 'test/category',
      categoryName: 'Test Category',
      categoryType: 'regular' as any,
      urlPatterns: [],
      canonicalUrl: '',
      spatialNavigationContext: {
        spatialRelationships: [],
        navigationLevel: 1,
        breadcrumbs: ['test', 'category']
      },
      productDiscoveryRules: {
        expectedProductTypes: [],
        siblingContext: 'unknown' as any,
        averageProductsPerPage: 24,
        paginationPattern: 'numbered'
      },
      priceRange: {
        min: 0,
        max: 1000,
        currency: 'USD'
      },
      reliability: {
        successRate: 0.5,
        totalAttempts: 0,
        lastVerified: new Date()
      }
    });

    // Test product creation with sibling discovery
    await this.worldModel.ingestProductWithSiblings({
      domain: 'test-site.com',
      categoryPath: 'test/category',
      primaryProduct: {
        productId: 'test-product-1',
        productName: 'Test Product',
        price: 29.99,
        url: 'https://test-site.com/product/1',
        selector: '.product-card-1',
        position: 1
      },
      siblingProducts: [
        {
          productId: 'test-product-2',
          productName: 'Test Product 2',
          price: 39.99,
          url: 'https://test-site.com/product/2',
          selector: '.product-card-2',
          position: 2
        }
      ],
      pageContext: {
        pageType: 'category' as any,
        url: 'https://test-site.com/test/category',
        totalProductsOnPage: 2
      },
      spatialContext: { nearbyElements: [] },
      siblingsContext: { siblings: [] }
    });

    console.log('✅ Basic operations test completed successfully');
  }

  /**
   * Offer to run training data ingestion
   */
  private async offerIngestion(): Promise<void> {
    console.log('\n📥 Training Data Ingestion Available');
    console.log('   To populate the world model with your existing training data:');
    console.log('   1. Run: node dist/services/world-model/run-ingestion.js');
    console.log('   2. Or call: await ingester.ingestAllTrainingData()');
    console.log('   3. This will process all training records and extract sibling data');
  }

  /**
   * Show current world model stats
   */
  async showStats(): Promise<void> {
    await this.worldModel.connect();
    
    try {
      const domains = await this.worldModel.getCategoriesForDomain('test-site.com');
      const products = await this.worldModel.getProductsForCategory('test-site.com', 'test/category');
      
      console.log('\n📊 World Model Stats:');
      console.log(`   Domains: 1 (test domain created)`);
      console.log(`   Categories: ${domains.length}`);
      console.log(`   Products: ${products.length}`);
      console.log(`   Ready for training data ingestion!`);
      
    } finally {
      await this.worldModel.disconnect();
    }
  }
}

// Main execution
async function main() {
  const setup = new WorldModelSetup();
  
  try {
    await setup.setup();
    await setup.showStats();
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

// Export for programmatic use
export { WorldModelSetup };

// Run if called directly
if (require.main === module) {
  main();
}