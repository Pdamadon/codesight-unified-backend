# OpenAI Integration Modular Refactor - Requirements Document

## Overview
Break down the monolithic `openai-integration-clean.ts` (1,225 lines) into focused, testable modules while maintaining all existing functionality.

## Current Monolith Analysis
The current file handles 8+ major responsibilities:
- Vision analysis (75 lines)
- Training data transformation (300+ lines) 
- Selector reliability logic (50 lines)
- Context analysis (200+ lines)
- Psychology extraction (150 lines)
- Fine-tuning management (100 lines)
- Cache management (50 lines)
- Quality metrics calculation (200+ lines)

---

## Module 1: Vision Analysis Service
**File**: `src/services/vision/vision-analysis.ts`

### Requirements
- **Single Responsibility**: Screenshot analysis using OpenAI Vision API only
- **Input**: Screenshot objects with dataUrl/s3Url
- **Output**: `VisionAnalysisResult` with analysis, psychology, quality score
- **Features**:
  - Batch screenshot processing
  - Cache integration (read from existing cache service)
  - Error handling with fallback responses
  - Configurable analysis prompts
- **Dependencies**: OpenAI client, cache service (external)
- **Testing**: Unit tests for single/batch analysis, error scenarios

### Interface
```typescript
interface VisionAnalysisService {
  analyzeScreenshot(screenshot: Screenshot): Promise<VisionAnalysisResult>
  analyzeScreenshots(screenshots: Screenshot[]): Promise<VisionAnalysisResult[]>
  healthCheck(): Promise<string>
}
```

---

## Module 2: Training Data Transformer
**File**: `src/services/training/training-data-transformer.ts`

### Requirements
- **Single Responsibility**: Transform rich interaction data into training examples
- **Input**: Enhanced interaction objects, task context
- **Output**: Structured training examples with input/output pairs
- **Features**:
  - 13+ training example types (spatial, DOM, sequence, etc.)
  - Quality-based filtering and prioritization
  - Site-specific pattern recognition
  - Fallback strategy generation
  - Rich context extraction (visual, spatial, business)
- **Dependencies**: Selector strategy service, context analyzer
- **Testing**: Unit tests for each example type, quality filtering

### Interface
```typescript
interface TrainingDataTransformer {
  transformSession(session: UnifiedSession, taskContext?: TaskContext): Promise<TrainingData>
  createFineTuningExamples(interaction: EnhancedInteraction): TrainingExample[]
  createSequenceExamples(interactions: EnhancedInteraction[]): TrainingExample[]
  calculateTrainingValue(sessionData: SessionData): number
}
```

---

## Module 3: Selector Strategy Service
**File**: `src/services/selectors/selector-strategy.ts`

### Requirements
- **Single Responsibility**: Selector reliability analysis and selection
- **Input**: Selector objects with reliability scores
- **Output**: Best selector, fallback strategies, Playwright actions
- **Features**:
  - Reliability score-based selection (primary feature!)
  - Fallback selector generation
  - Playwright action mapping
  - Selector quality assessment
- **Dependencies**: None (pure logic)
- **Testing**: Extensive unit tests for reliability scoring, edge cases

### Interface
```typescript
interface SelectorStrategyService {
  getBestSelector(selectors: SelectorData): string
  getBackupSelectors(selectors: SelectorData, exclude?: string): string[]
  getPlaywrightAction(actionType: string, selector: string): string
  calculateSelectorReliability(selectors: SelectorData): Record<string, number>
}
```

---

## Module 4: Context Analyzer Service
**File**: `src/services/context/context-analyzer.ts`

### Requirements
- **Single Responsibility**: Page context, user journey, and business stage analysis
- **Input**: Interaction data, page information
- **Output**: Page context, user journey stage, conversion context
- **Features**:
  - Page type detection (homepage, search, product, cart, checkout)
  - User journey stage inference
  - Business conversion context
  - Site-specific design system detection
  - Visual positioning analysis
- **Dependencies**: None (pure analysis logic)
- **Testing**: Unit tests for each analysis type, edge cases

### Interface
```typescript
interface ContextAnalyzerService {
  analyzePageContext(interaction: EnhancedInteraction, hostname: string): PageContext
  inferUserJourneyStage(interaction: EnhancedInteraction, pageContext: PageContext): string
  getConversionContext(interaction: EnhancedInteraction, pageContext: PageContext): ConversionContext
  getVisualPosition(boundingBox: BoundingBox): string
}
```

---

## Module 5: Psychology Extractor Service
**File**: `src/services/psychology/psychology-extractor.ts`

### Requirements
- **Single Responsibility**: Extract user psychology insights from analysis text
- **Input**: Vision analysis text, interaction patterns
- **Output**: `UserPsychology` with personality, emotional state, decision style
- **Features**:
  - Keyword-based psychology detection
  - Behavior prediction generation
  - Trust/urgency/price sensitivity scoring
  - Insight extraction from analysis
- **Dependencies**: None (text analysis logic)
- **Testing**: Unit tests for each psychology type, scoring accuracy

### Interface
```typescript
interface PsychologyExtractorService {
  extractPsychologyInsights(analysis: string): UserPsychology
  generateBehaviorPredictions(analysis: string): string[]
  calculatePsychologyScores(analysis: string): PsychologyScores
  getDefaultPsychology(): UserPsychology
}
```

---

## Module 6: Quality Scorer Service
**File**: `src/services/quality/quality-scorer.ts`

### Requirements
- **Single Responsibility**: Calculate quality metrics for training data filtering
- **Input**: Interaction data, task context, hostname
- **Output**: Comprehensive quality metrics object
- **Features**:
  - 8 quality dimensions (spatial, DOM complexity, selector quality, etc.)
  - Business value assessment
  - Site-specific value calculation
  - Overall quality scoring
- **Dependencies**: None (scoring logic)
- **Testing**: Unit tests for each quality metric, threshold testing

### Interface
```typescript
interface QualityScorerService {
  calculateQualityMetrics(interaction: EnhancedInteraction, taskContext?: TaskContext, hostname?: string): QualityMetrics
  calculateVisionQualityScore(analysis: string): number
  calculateConfidence(analysis: string): number
  shouldIncludeInTraining(qualityMetrics: QualityMetrics): boolean
}
```

---

## Module 7: Fine-Tuning Manager Service
**File**: `src/services/fine-tuning/fine-tuning-manager.ts`

### Requirements
- **Single Responsibility**: OpenAI file uploads and fine-tuning job management
- **Input**: Training data, configuration
- **Output**: File IDs, job IDs, status information
- **Features**:
  - JSONL file creation and upload
  - Fine-tuning job creation and monitoring
  - Training status tracking
  - Model listing and management
- **Dependencies**: OpenAI client
- **Testing**: Integration tests with OpenAI API mocking

### Interface
```typescript
interface FineTuningManagerService {
  uploadTrainingFile(data: TrainingData, metadata: any): Promise<string>
  createFineTuningJob(fileId: string, config: TrainingConfig): Promise<string>
  monitorTraining(jobId: string): Promise<TrainingJobStatus>
  listFineTunedModels(): Promise<FineTunedModel[]>
}
```

---

## Module 8: Cache Manager Service (Enhancement)
**File**: `src/services/cache/cache-manager.ts`

### Requirements
- **Single Responsibility**: Analysis result caching with TTL and hit counting
- **Input**: Screenshot IDs, analysis types, results
- **Output**: Cached results or null
- **Features**:
  - Vision analysis cache storage/retrieval
  - TTL-based expiration
  - Hit count tracking
  - Cache cleanup utilities
- **Dependencies**: Prisma client
- **Testing**: Unit tests for cache operations, TTL behavior

### Interface
```typescript
interface CacheManagerService {
  getCachedAnalysis(screenshotId: string, analysisType: string): Promise<any>
  cacheAnalysis(screenshotId: string, analysisType: string, analysis: any): Promise<void>
  cleanupExpiredCache(): Promise<number>
  getCacheStats(): Promise<CacheStats>
}
```

---

## Cross-Module Dependencies
1. **Training Data Transformer** depends on:
   - Selector Strategy Service
   - Context Analyzer Service 
   - Quality Scorer Service
   - Psychology Extractor Service

2. **Vision Analysis Service** depends on:
   - Cache Manager Service

3. All services use shared interfaces and types

---

## Success Criteria
- ✅ All existing functionality preserved
- ✅ Each module has single responsibility
- ✅ Comprehensive unit test coverage (>90%)
- ✅ Clear interfaces and dependency injection
- ✅ Improved maintainability and testability
- ✅ No performance regression
- ✅ Existing API contracts maintained