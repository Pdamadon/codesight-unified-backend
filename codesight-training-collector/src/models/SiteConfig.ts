export interface SiteConfig {
  name: string;
  baseUrl: string;
  framework: string;
  selectors: {
    search: string;
    navigation: string[];
    products: string[];
    pagination: string;
    filters?: string[];
    categoryMenu?: string;
    productGrid?: string;
    productCard?: string;
  };
  categories: string[];
  commonGoals: string[];
  extractionTargets: string[];
  rateLimit?: {
    requestsPerMinute: number;
    delayBetweenRequests: number;
  };
  userAgent?: string;
  headers?: Record<string, string>;
}

export interface CollectorConfig {
  maxExamplesPerDifficulty: number;
  screenshotEnabled: boolean;
  validateExtraction: boolean;
  retryAttempts: number;
  timeoutMs: number;
}