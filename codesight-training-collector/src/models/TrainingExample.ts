export interface NavigationExample {
  site: string;
  goal: string;
  startUrl: string;
  steps: NavigationStep[];
  expectedProducts: number;
  metadata: {
    category: string;
    difficulty: 'easy' | 'medium' | 'hard';
    timestamp: Date;
    collector: string;
  };
}

export interface ExtractionExample {
  site: string;
  url: string;
  targets: string[];
  extractionCode: string;
  expectedData: ProductData[];
  metadata: {
    framework: string;
    complexity: number;
    timestamp: Date;
  };
}

export interface NavigationStep {
  action: 'click' | 'type' | 'wait' | 'scroll';
  selector: string;
  value?: string;
  description: string;
  screenshot?: string;
}

export interface ProductData {
  title: string;
  price?: string;
  rating?: number;
  availability?: string;
  imageUrl?: string;
  productUrl?: string;
  sku?: string;
  brand?: string;
  description?: string;
}

export type TrainingExample = NavigationExample | ExtractionExample;

export interface TrainingDataset {
  site: string;
  examples: TrainingExample[];
  metadata: {
    version: string;
    createdAt: Date;
    totalExamples: number;
    difficultyDistribution: {
      easy: number;
      medium: number;
      hard: number;
    };
  };
}