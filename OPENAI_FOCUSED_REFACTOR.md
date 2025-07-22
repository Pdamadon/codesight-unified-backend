# OpenAI Integration - Focused 4-Module Refactor

## Revised Strategy: 4 Core Modules + Thin Facade

Based on actual usage analysis, we'll focus on **4 active modules** instead of 8, keeping embedded logic where it belongs.

---

## Core Module 1: Training Data Transformer
**File**: `src/services/training/training-data-transformer.ts`
**Priority**: 🔴 **CRITICAL** - This is the broken part

### Current Issues
- Generic training examples instead of rich contextual data
- Selector reliability bug (not using scores)
- Missing spatial/visual/business context

### Responsibilities
- Transform enhanced interaction data into rich training examples
- Use selector reliability scores properly
- Generate 10+ example types per interaction (spatial, DOM, sequence, etc.)
- Quality-based filtering and prioritization
- **Keep embedded**: Psychology extraction, context analysis, quality scoring as helper methods

### Interface
```typescript
interface TrainingDataTransformer {
  transformSession(session: UnifiedSession, taskContext?: TaskContext): Promise<TrainingData>
  createFineTuningExamples(interaction: EnhancedInteraction): TrainingExample[]
  createSequenceExamples(interactions: EnhancedInteraction[]): TrainingExample[]
}
```

---

## Core Module 2: Selector Strategy Service  
**File**: `src/services/selectors/selector-strategy.ts`
**Priority**: 🟠 **HIGH** - Critical reliability bug

### Current Issues
- Ignores reliability scores completely
- Defaults to 'element' for empty selectors
- No fallback strategy logic

### Responsibilities
- Use reliability scores from rich data (xpath: 0.7, css: 0.4, etc.)
- Generate best selector + fallback options
- Playwright action mapping
- Pure logic - no external dependencies

### Interface
```typescript
interface SelectorStrategyService {
  getBestSelector(selectors: SelectorData): string
  getBackupSelectors(selectors: SelectorData): string[]
  getPlaywrightAction(actionType: string, selector: string): string
}
```

---

## Core Module 3: Vision Analysis Service
**File**: `src/services/vision/vision-analysis.ts` 
**Priority**: 🟡 **MEDIUM** - Already working, just extract cleanly

### Current Status
- Already functional
- Just needs clean extraction from monolith

### Responsibilities  
- Screenshot analysis using OpenAI Vision API
- Batch processing
- Cache integration
- Error handling with fallback responses

### Interface
```typescript
interface VisionAnalysisService {
  analyzeScreenshot(screenshot: Screenshot): Promise<VisionAnalysisResult>
  analyzeScreenshots(screenshots: Screenshot[]): Promise<VisionAnalysisResult[]>
}
```

---

## Core Module 4: Cache Manager Service
**File**: `src/services/cache/cache-manager.ts`
**Priority**: 🟡 **MEDIUM** - Already working

### Current Status
- Already functional
- Just needs clean extraction

### Responsibilities
- Vision analysis result caching
- TTL management
- Hit count tracking

### Interface  
```typescript
interface CacheManagerService {
  getCachedAnalysis(screenshotId: string, analysisType: string): Promise<any>
  cacheAnalysis(screenshotId: string, analysisType: string, analysis: any): Promise<void>
}
```

---

## Thin Facade: OpenAI Integration Service
**File**: `src/services/openai-integration-clean.ts` (keep existing file)
**Priority**: 🟢 **LOW** - Simple delegation

### Transformation
- **Before**: 1,225 lines of monolithic code
- **After**: ~100 lines of delegation logic

### Responsibilities
- Maintain exact same public API (zero breaking changes)
- Delegate to appropriate modules
- Service composition and dependency injection
- **Eventually delete** once callers are updated

### Implementation
```typescript
export class OpenAIIntegrationService {
  constructor(
    private trainingTransformer: TrainingDataTransformer,
    private selectorStrategy: SelectorStrategyService, 
    private visionService: VisionAnalysisService,
    private cacheManager: CacheManagerService
  ) {}

  // Delegate to TrainingDataTransformer
  async generateTrainingData(session: any): Promise<TrainingData> {
    return this.trainingTransformer.transformSession(session);
  }

  // Delegate to VisionAnalysisService  
  async analyzeScreenshots(screenshots: any[]): Promise<VisionAnalysisResult[]> {
    return this.visionService.analyzeScreenshots(screenshots);
  }

  // Keep fine-tuning methods directly (if used)
  async uploadTrainingFile(data: any, metadata: any): Promise<string> {
    // Keep existing implementation - not used enough to extract
  }
}
```

---

## Implementation Plan

### Phase 1: Extract Selector Strategy (Day 1)
- ✅ **SAFE**: Pure logic, no external dependencies
- **FIX CRITICAL BUG**: Use reliability scores properly
- Add comprehensive unit tests
- **Immediate Impact**: Better training data selectors

### Phase 2: Extract Training Data Transformer (Day 1-2)  
- 🚨 **HIGH RISK**: Complex logic with many dependencies
- **CRITICAL**: This fixes the poor training data quality
- Use new SelectorStrategy service
- Keep psychology/context/quality as embedded helper methods
- **Massive Impact**: Rich contextual training examples

### Phase 3: Extract Vision Analysis + Cache (Day 2)
- ⚠️ **MODERATE RISK**: External API dependencies
- Extract existing working code cleanly
- Maintain same interfaces

### Phase 4: Create Thin Facade (Day 2-3)
- 🟢 **LOW RISK**: Simple delegation
- Maintain exact same public API
- Update dependency injection

### Phase 5: Validation & Testing (Day 3)
- Compare training data output before/after
- Verify selector reliability is working
- **SUCCESS METRIC**: Training examples show rich context instead of generic patterns

---

## Expected Results

### Before Refactor
```
"WWW.NORDSTROM.COM: \"\" focus, homepage" -> "await page.hover('element')"
```

### After Refactor  
```
{
  "input": "CONTEXT: Nordstrom search page, scroll y=452, user typed 'jeans'. ELEMENT: 'Quick View' button (reliability: xpath=0.7). SPATIAL: Near '20' (12px below), 'Set Your Store' (97px left). INTENT: Product exploration in e-commerce funnel",
  "output": {
    "primary": "await page.click('//div[@class=\"product-tile\"]/button')",
    "fallbacks": ["await page.click('.tmRsy.psaSN')", "await page.click('button:has-text(\"Quick View\")')"],
    "verification": "await expect(page.locator('[role=\"dialog\"]')).toBeVisible()",
    "reliability": 0.7
  }
}
```

**Bottom Line**: 4 focused modules that solve actual problems, thin facade for compatibility, and dramatically improved training data quality.