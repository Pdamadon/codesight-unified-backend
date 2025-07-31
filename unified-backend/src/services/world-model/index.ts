/**
 * World Model Service - Main Export
 * 
 * Centralized export for all world model components:
 * - Database layer (schema, service)
 * - Data ingestion (training data, sibling discovery)
 * - RAG retrieval system
 */

// Database layer
export { WorldModelService } from './database/service';
export * from './database/schema';

// Data ingestion
export { TrainingDataIngester } from './ingestion/training-data-ingester';

// RAG retrieval (to be implemented)
// export { RAGService } from './retrieval/rag-service';

// Types
export * from './types';