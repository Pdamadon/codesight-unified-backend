/**
 * Trace Men Category Processing
 * 
 * Follow the "Men" interaction through the entire classification pipeline
 * to see where it gets lost or transformed
 */

import * as dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { BehaviorBasedIngester } from './dist/services/world-model/ingestion/behavior-based-ingester.js';

dotenv.config();

class MenCategoryTracer {
  constructor() {
    const connectionString = process.env.MONGODB_CONNECTION_STRING;
    const databaseName = process.env.MONGODB_DATABASE_NAME || 'codesight-worldmodel';
    
    const clientOptions = {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000
    };
    
    this.mongoClient = new MongoClient(connectionString, clientOptions);
    this.db = this.mongoClient.db(databaseName);
    
    this.mockWorldModelService = {
      client: this.mongoClient,
      db: this.db,
      connect: async () => {
        await this.mongoClient.connect();
      },
      disconnect: async () => {
        await this.mongoClient.close();
      },
      getDomain: async (domain) => {
        return await this.db.collection('world_model_domains').findOne({ domain });
      },
      getCategory: async (domainId, categoryPath) => {
        return await this.db.collection('world_model_categories').findOne({ 
          domainId, 
          categoryPath 
        });
      },
      upsertDomain: async (domainData) => {
        const result = await this.db.collection('world_model_domains').replaceOne(
          { domain: domainData.domain },
          domainData,
          { upsert: true }
        );
        return result.upsertedId || domainData.domain;
      },
      upsertCategory: async (categoryData) => {
        console.log(`🏷️ UPSERTING CATEGORY: "${categoryData.categoryName}" -> path: "${categoryData.categoryPath}" -> URL: ${categoryData.canonicalUrl?.substring(0, 80)}...`);
        
        if (categoryData.categoryName === 'Men' || categoryData.categoryPath === 'men' || categoryData.categoryPath === 'women') {
          console.log(`🎯 MEN/WOMEN CATEGORY DETECTED!`);
          console.log(`   Name: "${categoryData.categoryName}"`);
          console.log(`   Path: "${categoryData.categoryPath}"`); 
          console.log(`   URL: ${categoryData.canonicalUrl}`);
        }
        
        await this.db.collection('world_model_categories').replaceOne(
          { domainId: categoryData.domainId, categoryPath: categoryData.categoryPath },
          categoryData,
          { upsert: true }
        );
      },
      ingestProductWithSiblings: async (productData) => {
        // No products expected in category-only test
      }
    };
    
    this.ingester = new BehaviorBasedIngester(this.mockWorldModelService);
  }

  async trace() {
    console.log('🕵️ Tracing Men Category Processing\n');
    
    try {
      await this.mockWorldModelService.connect();
      console.log('✅ Connected to databases');
      
      console.log('🔄 Running ingestion with detailed Men category tracing...');
      await this.ingester.ingestAllSessions();
      
      // Check final results
      console.log('\n📊 Final Database State:');
      const categories = await this.db.collection('world_model_categories').find({}).toArray();
      
      console.log(`\n📁 Found ${categories.length} categories:`);
      categories.forEach(cat => {
        const isTarget = cat.categoryName === 'Men' || cat.categoryPath === 'men' || cat.categoryPath === 'women';
        const prefix = isTarget ? '🎯' : '  ';
        console.log(`${prefix} "${cat.categoryName}" (path: ${cat.categoryPath}) -> ${cat.canonicalUrl?.substring(0, 80)}...`);
      });
      
    } catch (error) {
      console.error('❌ Trace error:', error.message);
    } finally {
      await this.mockWorldModelService.disconnect();
    }
  }
}

// Run the trace
const tracer = new MenCategoryTracer();
tracer.trace().catch(console.error);