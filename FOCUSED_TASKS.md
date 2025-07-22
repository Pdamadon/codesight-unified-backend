# Focused 4-Module Refactor - Task List

## Phase 1: Selector Strategy Service (Priority 1)

### Setup Tasks
- [ ] Create `src/services/selectors/selector-strategy.ts`
- [ ] Create `src/services/selectors/__tests__/selector-strategy.test.ts`
- [ ] Create shared types in `src/types/selector-types.ts`

### Implementation Tasks  
- [ ] **FIX CRITICAL BUG**: Implement reliability score-based selection
  ```typescript
  // Current (BROKEN): Returns 'element' when selectors empty
  // Fixed: Use reliability scores to pick best selector
  getBestSelector(selectors: {reliability: {xpath: 0.7, css: 0.4}}) 
  // Should return xpath because 0.7 > 0.4
  ```
- [ ] Copy and fix `getBestSelector()` method  
- [ ] Copy and enhance `getBackupSelectors()` method
- [ ] Copy `getPlaywrightAction()` method
- [ ] Create `SelectorStrategyService` interface

### Testing Tasks
- [ ] Test reliability score-based selection with your Nordstrom data
- [ ] Test fallback selector generation
- [ ] Test edge cases (empty selectors, missing reliability)
- [ ] **Validation**: Verify xpath with 0.7 reliability beats generic selectors

### Integration Tasks
- [ ] Add to dependency injection container
- [ ] **NO INTEGRATION YET** - Just make it available for Phase 2

---

## Phase 2: Training Data Transformer (Priority 1) 

### Setup Tasks
- [ ] Create `src/services/training/training-data-transformer.ts`
- [ ] Create `src/services/training/__tests__/training-data-transformer.test.ts`
- [ ] Create shared types in `src/types/training-types.ts`

### Critical Implementation Tasks
- [ ] Copy `generateTrainingData()` method
- [ ] Copy and **COMPLETELY REWRITE** `createFineTuningExamples()` method
  - [ ] **INJECT** SelectorStrategyService (use reliability-based selectors!)
  - [ ] **ENHANCE** rich context extraction from your JSON data
  - [ ] **USE** spatial data (nearbyElements, boundingBox, etc.)
  - [ ] **USE** visual positioning data  
  - [ ] **USE** business context (page type, user journey)
  - [ ] **USE** DOM hierarchy and sibling relationships
- [ ] Copy `createSequenceExamples()` method
- [ ] Copy `createTaskDrivenExamples()` method
- [ ] **KEEP AS HELPER METHODS**: 
  - [ ] Psychology extraction logic (don't extract to separate module)
  - [ ] Context analysis logic (keep embedded)
  - [ ] Quality scoring logic (keep embedded)

### Rich Data Enhancement Tasks  
Using your Nordstrom JSON data as the template:
- [ ] Extract `elementDetails.text` instead of defaulting to empty
- [ ] Use `selectors.reliability` scores via SelectorStrategyService
- [ ] Use `visual.boundingBox` for positioning context
- [ ] Use `element.nearbyElements` for spatial relationships  
- [ ] Use `contextData.ancestors` for DOM hierarchy
- [ ] Use `state.before` for page state context
- [ ] Use `action.selector` as fallback if primary missing

### Testing Tasks
- [ ] Test with your real Nordstrom interaction data
- [ ] **CRITICAL**: Compare output before/after - should be dramatically richer
- [ ] Test each training example type individually
- [ ] Test quality filtering with different thresholds
- [ ] **Success metric**: No more generic "element" selectors in output

### Integration Tasks
- [ ] Inject SelectorStrategyService dependency
- [ ] Update dependency injection container
- [ ] **DO NOT UPDATE FACADE YET** - Test standalone first

---

## Phase 3: Vision Analysis Service (Priority 2)

### Setup Tasks
- [ ] Create `src/services/vision/vision-analysis.ts`
- [ ] Create `src/services/vision/__tests__/vision-analysis.test.ts`

### Implementation Tasks (Simple Extraction)
- [ ] Copy `analyzeScreenshots()` method
- [ ] Copy `analyzeScreenshot()` method  
- [ ] Copy `analyzeScreenshotWithVision()` method
- [ ] Copy OpenAI client setup
- [ ] Copy cache integration calls
- [ ] Create `VisionAnalysisService` interface

### Testing Tasks
- [ ] Test with real screenshot data
- [ ] Test cache integration (should use CacheManager from Phase 4)
- [ ] Test API error handling

---

## Phase 4: Cache Manager Service (Priority 2)

### Setup Tasks
- [ ] Create `src/services/cache/cache-manager.ts` 
- [ ] Create `src/services/cache/__tests__/cache-manager.test.ts`

### Implementation Tasks (Simple Extraction)
- [ ] Copy `getCachedAnalysis()` method
- [ ] Copy `cacheAnalysis()` method
- [ ] Copy Prisma client integration
- [ ] Create `CacheManagerService` interface

### Testing Tasks
- [ ] Test cache storage and retrieval
- [ ] Test TTL expiration behavior
- [ ] Test with real database connection

---

## Phase 5: Create Thin Facade (Priority 3)

### Implementation Tasks
- [ ] **KEEP** `src/services/openai-integration-clean.ts` file 
- [ ] **DELETE** ~1,100 lines of implementation code
- [ ] **KEEP** ~100 lines of delegation code
- [ ] Set up dependency injection for all 4 services
- [ ] Create delegation methods:
  ```typescript
  async generateTrainingData(session) {
    return this.trainingTransformer.transformSession(session);
  }
  async analyzeScreenshots(screenshots) {
    return this.visionService.analyzeScreenshots(screenshots);
  }
  ```
- [ ] **KEEP** fine-tuning methods directly (uploadTrainingFile, etc.)

### Testing Tasks  
- [ ] **CRITICAL**: All existing API calls must work identically
- [ ] Test training data pipeline end-to-end
- [ ] Test vision analysis pipeline  
- [ ] **Validation**: No breaking changes to existing callers

### Integration Tasks
- [ ] Update dependency injection in main application
- [ ] Update service lifecycle management
- [ ] **NO CHANGES to existing imports** - they should continue working

---

## Phase 6: Critical Validation (Priority 1)

### Training Data Quality Validation
- [ ] **Generate training data** with your Nordstrom session before refactor
- [ ] **Generate training data** with your Nordstrom session after refactor  
- [ ] **Compare outputs**:
  - [ ] Should see rich selectors instead of 'element'
  - [ ] Should see spatial context (nearby elements)
  - [ ] Should see visual positioning
  - [ ] Should see business context (page types, user journey)
  - [ ] Should see DOM hierarchy information

### Functionality Validation  
- [ ] All existing API endpoints work identically
- [ ] No performance regression (±5%)
- [ ] No breaking changes to existing code
- [ ] Training data reaches database correctly

### Success Metrics
- [ ] ✅ Selector reliability bug fixed (xpath 0.7 > css 0.4)
- [ ] ✅ Training examples show rich context instead of generic patterns
- [ ] ✅ File size reduced from 1,225 → ~100 lines in facade
- [ ] ✅ Modular, testable architecture
- [ ] ✅ Zero breaking changes

---

## Timeline

- **Day 1**: Phase 1 (Selector Strategy) + Start Phase 2 (Training Transformer)
- **Day 2**: Finish Phase 2, Phase 3 (Vision), Phase 4 (Cache)  
- **Day 3**: Phase 5 (Facade) + Phase 6 (Validation)

**Focus**: Fix the broken training data transformation with rich contextual examples while maintaining full backward compatibility.