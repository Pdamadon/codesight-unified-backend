/**
 * World Model Types
 * 
 * Shared types and interfaces used across world model components
 */

// Re-export all types from schema for convenience
export * from '../database/schema';

// Additional utility types for the world model system
export interface WorldModelConfig {
  mongoConnectionString: string;
  databaseName: string;
  enableSiblingDiscovery: boolean;
  maxSiblingsPerPage: number;
  patternRecognitionThreshold: number;
}

export interface IngestionStats {
  domainsProcessed: number;
  categoriesCreated: number;
  productsIngested: number;
  siblingsDiscovered: number;
  patternsFound: number;
  errors: string[];
}

export interface RAGQuery {
  domain: string;
  categoryPath?: string;
  pageType?: string;
  intent?: string;
  productType?: string;
}

export interface RAGResponse {
  selectors: Record<string, any>;
  variantClusters: any[];
  workflows: any[];
  reliability: number;
  lastUpdated: Date;
}