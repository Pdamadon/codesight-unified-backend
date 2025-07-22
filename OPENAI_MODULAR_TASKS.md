# OpenAI Integration Modular Refactor - Detailed Task Lists

## Phase 1 Tasks: Foundation Setup

### Task List 1.1: Directory Structure Setup
- [ ] Create `src/services/vision/` directory
- [ ] Create `src/services/training/` directory  
- [ ] Create `src/services/selectors/` directory
- [ ] Create `src/services/context/` directory
- [ ] Create `src/services/psychology/` directory
- [ ] Create `src/services/quality/` directory
- [ ] Create `src/services/fine-tuning/` directory
- [ ] Create `src/services/cache/` directory
- [ ] Create `__tests__/` subdirectories for each module
- [ ] Update `.gitignore` if needed for test files

### Task List 1.2: Shared Types Extraction
- [ ] Create `src/types/openai-integration.ts`
- [ ] Extract `VisionAnalysisResult` interface
- [ ] Extract `UserPsychology` interface
- [ ] Extract `TrainingData` interface  
- [ ] Extract `TrainingConfig` interface
- [ ] Extract `QualityMetrics` interface
- [ ] Extract `PageContext` interface
- [ ] Extract `ConversionContext` interface
- [ ] Extract all enum types
- [ ] Verify no circular dependencies

### Task List 1.3: Module Barrel Exports
- [ ] Create `src/services/openai-modules/index.ts`
- [ ] Set up barrel exports for all services
- [ ] Create dependency injection container setup
- [ ] Add service factory functions
- [ ] Configure service lifecycle management

---

## Phase 2 Tasks: Pure Logic Modules

### Task List 2.1: Selector Strategy Service
- [ ] Create `src/services/selectors/selector-strategy.ts`
- [ ] Copy `getBestSelector()` method from monolith
- [ ] **FIX CRITICAL BUG**: Implement reliability score-based selection
- [ ] Copy `getBackupSelectors()` method
- [ ] Copy `getPlaywrightAction()` method  
- [ ] Add `calculateSelectorReliability()` method
- [ ] Create comprehensive interface `SelectorStrategyService`
- [ ] **Unit Tests**:
  - [ ] Test reliability score-based selection with real data
  - [ ] Test fallback selector generation
  - [ ] Test Playwright action mapping for each action type
  - [ ] Test edge cases (empty selectors, null reliability)
  - [ ] Test priority order when reliability scores are equal
- [ ] **Integration Tests**:
  - [ ] Test with real Nordstrom interaction data
  - [ ] Verify XPath selectors get highest priority when reliability > 0.5
  - [ ] Test selector strategy with missing fields
- [ ] **Validation**: Compare outputs with current monolith

### Task List 2.2: Psychology Extractor Service  
- [ ] Create `src/services/psychology/psychology-extractor.ts`
- [ ] Copy `extractPsychologyInsights()` method
- [ ] Copy `detectPersonality()` method
- [ ] Copy `detectEmotionalState()` method
- [ ] Copy `detectDecisionStyle()` method
- [ ] Copy all psychology scoring methods (`extractTrustLevel`, etc.)
- [ ] Copy `extractInsights()` method
- [ ] Copy `generateBehaviorPredictions()` method
- [ ] Copy `getDefaultPsychology()` method
- [ ] Create `PsychologyExtractorService` interface
- [ ] **Unit Tests**:
  - [ ] Test each personality detection with keyword variations
  - [ ] Test emotional state detection accuracy
  - [ ] Test decision style inference
  - [ ] Test psychology scoring algorithms (trust, urgency, price sensitivity)
  - [ ] Test insight extraction from real analysis text
  - [ ] Test behavior prediction generation
  - [ ] Test edge cases (empty analysis, malformed text)
- [ ] **Validation**: Test with real vision analysis results

### Task List 2.3: Quality Scorer Service
- [ ] Create `src/services/quality/quality-scorer.ts`
- [ ] Copy `calculateQualityMetrics()` method
- [ ] Copy `calculateVisionQualityScore()` method
- [ ] Copy `calculateConfidence()` method
- [ ] Add individual quality dimension methods:
  - [ ] `calculateSpatialQuality()`
  - [ ] `calculateDomComplexity()`
  - [ ] `calculateSelectorQuality()`
  - [ ] `calculateModalRelevance()`
  - [ ] `calculateJourneyClarity()`
  - [ ] `calculateBusinessValue()`
  - [ ] `calculateSiteValue()`
- [ ] Create `QualityScorerService` interface
- [ ] **Unit Tests**:
  - [ ] Test each quality dimension with known good/bad examples
  - [ ] Test overall quality score calculation
  - [ ] Test quality thresholds for training inclusion
  - [ ] Test site-specific value calculation (Nike, Amazon, etc.)
  - [ ] Test business value scoring for conversion actions
  - [ ] Test edge cases (missing data, extreme values)
- [ ] **Validation**: Compare quality scores with current implementation

### Task List 2.4: Context Analyzer Service
- [ ] Create `src/services/context/context-analyzer.ts`
- [ ] Copy `analyzePageContext()` method
- [ ] Copy `inferUserJourneyStage()` method  
- [ ] Copy `getConversionContext()` method
- [ ] Copy `getVisualPosition()` method
- [ ] Copy `createEnvironmentSnapshot()` method
- [ ] Copy design system detection logic
- [ ] Create `ContextAnalyzerService` interface
- [ ] **Unit Tests**:
  - [ ] Test page type detection (homepage, search, product, cart, checkout)
  - [ ] Test user journey stage inference for each stage
  - [ ] Test conversion context mapping
  - [ ] Test visual position calculation with different viewport sizes
  - [ ] Test design system detection for different sites
  - [ ] Test environment snapshot creation
  - [ ] Test edge cases (unknown URLs, missing context)
- [ ] **Validation**: Test with real interaction data from multiple sites

---

## Phase 3 Tasks: External Dependency Modules

### Task List 3.1: Cache Manager Service
- [ ] Create `src/services/cache/cache-manager.ts`
- [ ] Copy `getCachedAnalysis()` method
- [ ] Copy `cacheAnalysis()` method
- [ ] Add `cleanupExpiredCache()` method
- [ ] Add `getCacheStats()` method
- [ ] Create `CacheManagerService` interface
- [ ] Set up Prisma client injection
- [ ] **Unit Tests**:
  - [ ] Test cache storage and retrieval
  - [ ] Test TTL expiration behavior
  - [ ] Test hit count incrementing
  - [ ] Test cache cleanup functionality  
  - [ ] Test cache statistics calculation
  - [ ] Test error handling for database failures
- [ ] **Integration Tests**:
  - [ ] Test with real database connection
  - [ ] Test cache performance under load
  - [ ] Test concurrent cache operations
- [ ] **Validation**: Ensure no cache misses during transition

### Task List 3.2: Vision Analysis Service
- [ ] Create `src/services/vision/vision-analysis.ts`
- [ ] Copy `analyzeScreenshots()` method
- [ ] Copy `analyzeScreenshot()` method
- [ ] Copy `analyzeScreenshotWithVision()` method
- [ ] Copy `analyzeScreenshotsAdvanced()` method
- [ ] Copy `healthCheck()` method
- [ ] Set up OpenAI client injection
- [ ] Set up cache manager dependency injection
- [ ] Create `VisionAnalysisService` interface
- [ ] **Unit Tests**:
  - [ ] Test single screenshot analysis
  - [ ] Test batch screenshot processing
  - [ ] Test cache integration (hit/miss scenarios)
  - [ ] Test OpenAI API error handling
  - [ ] Test vision analysis prompt customization
  - [ ] Test fallback response generation
- [ ] **Integration Tests**:
  - [ ] Test with real OpenAI API (mocked for CI)
  - [ ] Test with actual screenshot data
  - [ ] Test rate limiting handling
  - [ ] Test API key validation
- [ ] **Validation**: Compare analysis results with monolith

### Task List 3.3: Fine-Tuning Manager Service
- [ ] Create `src/services/fine-tuning/fine-tuning-manager.ts`
- [ ] Copy `uploadTrainingFile()` method
- [ ] Copy `createFineTuningJob()` method
- [ ] Copy `monitorTraining()` method
- [ ] Add `listFineTunedModels()` method
- [ ] Add `cancelTrainingJob()` method
- [ ] Set up OpenAI client injection
- [ ] Create `FineTuningManagerService` interface
- [ ] **Unit Tests**:
  - [ ] Test JSONL file creation and upload
  - [ ] Test fine-tuning job creation with various configs
  - [ ] Test training job monitoring and status updates
  - [ ] Test model listing functionality
  - [ ] Test error handling for API failures
  - [ ] Test file format validation
- [ ] **Integration Tests** (with API mocking):
  - [ ] Test complete fine-tuning workflow
  - [ ] Test job cancellation
  - [ ] Test large file upload handling
  - [ ] Test API rate limiting
- [ ] **Validation**: Ensure no disruption to existing fine-tuning jobs

---

## Phase 4 Tasks: Complex Orchestration Module

### Task List 4.1: Training Data Transformer Service
- [ ] Create `src/services/training/training-data-transformer.ts`
- [ ] Copy `generateTrainingData()` method
- [ ] Copy `formatForOpenAI()` method
- [ ] Copy `createFineTuningExamples()` method - **CRITICAL**
- [ ] Copy `createTaskDrivenExamples()` method
- [ ] Copy `createSequenceExamples()` method
- [ ] Copy `calculateTrainingValue()` method
- [ ] Copy `calculateComplexity()` method
- [ ] Set up dependency injection for:
  - [ ] SelectorStrategyService
  - [ ] ContextAnalyzerService  
  - [ ] QualityScorerService
  - [ ] PsychologyExtractorService
- [ ] **CRITICAL ENHANCEMENT**: Rewrite rich data transformation logic
- [ ] Create `TrainingDataTransformer` interface
- [ ] **Unit Tests**:
  - [ ] Test each of 13+ training example types individually
  - [ ] Test task-driven example generation with real task context
  - [ ] Test sequence example creation with interaction chains
  - [ ] Test quality-based filtering with different thresholds
  - [ ] Test rich context extraction (spatial, visual, business)
  - [ ] Test training value and complexity calculations
  - [ ] Test site-specific pattern recognition
  - [ ] Test fallback strategy generation
- [ ] **Integration Tests**:
  - [ ] Test complete session transformation with real data
  - [ ] Test with Nordstrom interaction data (from your JSON)
  - [ ] Test performance with large sessions (100+ interactions)
  - [ ] Test memory usage during transformation
- [ ] **Critical Validation**:
  - [ ] **Byte-for-byte comparison** of training output with monolith
  - [ ] **Verify rich data enhancement** shows improvement over current generic output
  - [ ] Test that reliability-based selector selection works correctly
  - [ ] Ensure no training examples are lost during transformation

---

## Phase 5 Tasks: Integration and Facade

### Task List 5.1: OpenAI Integration Facade
- [ ] Modify `src/services/openai-integration-clean.ts` to become facade
- [ ] Set up dependency injection for all new services
- [ ] **Maintain exact same public API** - CRITICAL
- [ ] Add service composition logic
- [ ] Add service health monitoring
- [ ] **No Breaking Changes Validation**:
  - [ ] `generateTrainingData()` returns identical results
  - [ ] `analyzeScreenshots()` returns identical results  
  - [ ] `uploadTrainingFile()` works identically
  - [ ] `createFineTuningJob()` works identically
  - [ ] All error scenarios handled identically

### Task List 5.2: Dependency Injection Setup
- [ ] Create service container in `src/lib/service-container.ts`
- [ ] Configure all service dependencies
- [ ] Set up service lifecycle management
- [ ] Add service health checks
- [ ] Configure environment-based service selection
- [ ] Add graceful service shutdown handling
- [ ] **Production Readiness**:
  - [ ] Service startup validation
  - [ ] Dependency health monitoring
  - [ ] Graceful failure handling
  - [ ] Service metrics collection

---

## Phase 6 Tasks: Testing and Validation

### Task List 6.1: Integration Testing
- [ ] **Critical Data Flow Test**: Session → Enhanced Interactions → Training Data
- [ ] Test with your real Nordstrom shopping data
- [ ] Compare training data output **exactly** with original monolith
- [ ] Test error scenarios and fallback behaviors
- [ ] Test service restart and recovery
- [ ] **Performance Benchmarks**:
  - [ ] Training data generation speed (target: ±5% of original)
  - [ ] Memory usage during large session processing
  - [ ] Database query efficiency
  - [ ] API response times

### Task List 6.2: End-to-End Testing
- [ ] Test complete pipeline: Browser Extension → Backend → Training Data
- [ ] Verify training data reaches `training_data` table correctly  
- [ ] Test with various interaction types (CLICK, INPUT, NAVIGATION, etc.)
- [ ] Test with different sites (Nordstrom, Amazon, Nike)
- [ ] Test error handling when services are unavailable
- [ ] **Production Simulation**:
  - [ ] Test with high interaction volume
  - [ ] Test concurrent session processing
  - [ ] Test system behavior under load

### Task List 6.3: Quality Validation
- [ ] **Training Data Quality**: Verify enhanced examples are better than generic ones
- [ ] **Selector Reliability**: Confirm XPath with 0.7 reliability beats generic selectors
- [ ] **Rich Context**: Verify spatial, visual, and business context is preserved
- [ ] **No Data Loss**: Ensure all interaction fields are utilized
- [ ] **Backward Compatibility**: All existing API consumers continue working

---

## Completion Criteria Checklist

### Functional Requirements ✅
- [ ] All 8 modules created and tested independently
- [ ] All existing API endpoints return identical responses  
- [ ] Training data transformation uses rich contextual data
- [ ] Selector reliability scoring works correctly
- [ ] No functionality regression in any area

### Quality Requirements ✅
- [ ] >90% unit test coverage per module
- [ ] >80% integration test coverage  
- [ ] All TypeScript strict mode compliance
- [ ] No ESLint warnings or errors
- [ ] Comprehensive error handling

### Performance Requirements ✅
- [ ] Training data generation: ±5% performance of original
- [ ] Memory usage: No significant regression
- [ ] API response times: ±10% of original  
- [ ] Database efficiency: No query regression

### Operational Requirements ✅
- [ ] All logging and monitoring continues working
- [ ] Health checks pass for all modules
- [ ] Graceful service startup and shutdown
- [ ] Production deployment readiness
- [ ] Rollback capability tested and verified

This modular refactor will transform the monolithic OpenAI integration into a maintainable, testable, and enhanced system while preserving all existing functionality and improving training data quality.