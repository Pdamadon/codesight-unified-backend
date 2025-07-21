# Shopping Scenario Integration Implementation Plan

## Project Overview
**Objective:** Transform random click tracking into purposeful AI training scenarios by integrating OpenAI-generated shopping tasks with our enhanced 6-group data collection system.

**Current State:** Enhanced data collection working ✅, but data flows to wrong table (interactions vs unified sessions) and lacks training context  
**Target State:** Scenario-driven data collection with complete training examples stored in unified sessions ✅

## Success Criteria
- [ ] Enhanced data flows to unified sessions (not interactions table)
- [ ] Shopping scenarios integrated into session structure  
- [ ] OpenAI generates realistic shopping tasks
- [ ] Complete training examples with intent labels
- [ ] Scenario success tracking and metrics
- [ ] No regression in existing enhanced data collection

## Architecture Requirements

### Data Structure Requirements
Must implement the **Enhanced Unified Session Structure**:

1. **Session Metadata** - Duration, quality, completion status
2. **Scenario Data** - AI-generated task, success criteria, difficulty  
3. **Enhanced Interactions** - 6-group structure per interaction
4. **Outcome Tracking** - Success metrics, efficiency, completion rate
5. **Training Export** - Ready-to-use AI training examples

### Integration Requirements
- **Backward Compatibility:** Current session management must continue working
- **Data Flow:** Enhanced data → Unified Sessions (not interactions table)
- **Performance:** No significant impact on data collection speed
- **Scalability:** Support multiple scenario types and complexity levels
- **Quality:** Built-in scenario completion validation

---

## Implementation Phases

## Phase 1: Data Flow Correction & Session Structure
**Duration:** 1-2 hours  
**Priority:** CRITICAL  
**Dependencies:** Current enhanced data collection (✅ Complete)

### Phase 1 Tasks:

#### Task 1.1: Fix Enhanced Data Routing
**Objective:** Route enhanced interactions to unified sessions instead of interactions table

**Implementation Steps:**
1. Update background script `sendDataToBackend()` to target unified sessions
2. Modify WebSocket message type from `interaction_event` to `session_update`
3. Update backend WebSocket handler to store in unified sessions
4. Add enhanced interaction append logic (not replace)

**Testing Criteria:**
- [ ] Enhanced interactions appear in unified sessions table
- [ ] No more errors about missing interaction table columns
- [ ] Multiple interactions accumulate within single session
- [ ] All 6 data groups properly stored in session record

**Validation Commands:**
```sql
-- Test in Railway database:
SELECT id, interactionData FROM unifiedSession 
WHERE id = 'latest_session_id';
```

#### Task 1.2: Enhanced Session Structure Design
**Objective:** Update unified session to handle enhanced interaction arrays

**Implementation Steps:**
1. Design enhanced session schema with interaction arrays
2. Update backend session creation to initialize interaction storage
3. Add session completion logic to calculate quality metrics
4. Implement session validation for enhanced data

**Testing Criteria:**
- [ ] Sessions store arrays of enhanced interactions
- [ ] Session quality scores calculated from interaction data
- [ ] Session completion properly aggregates all collected data
- [ ] Enhanced validation system works with new structure

#### Task 1.3: Scenario Infrastructure Preparation  
**Objective:** Add scenario fields to unified session (prepare for AI integration)

**Implementation Steps:**
1. Add scenario fields to unified session schema:
   ```javascript
   {
     scenarioId: string,
     scenario: {
       task: string,
       targetSite: string, 
       expectedSteps: array,
       successCriteria: object,
       difficulty: string
     },
     outcome: {
       completed: boolean,
       itemsFound: array,
       efficiency: number,
       completionTime: number
     }
   }
   ```
2. Update session initialization to handle scenario data
3. Add scenario validation logic
4. Prepare scenario success tracking methods

**Testing Criteria:**
- [ ] Sessions can store scenario data without errors
- [ ] Scenario fields properly initialized (null for non-scenario sessions)
- [ ] Backward compatibility maintained for existing sessions
- [ ] Schema ready for OpenAI integration

### Phase 1 Integration Test:
**Test Scenario:** Start session, click elements, verify enhanced data in unified sessions

**Expected Results:**
- [ ] Enhanced interactions stored in unifiedSession.interactionData array
- [ ] All 6 data groups present and complete
- [ ] No errors about interactions table structure
- [ ] Session quality metrics calculated correctly

---

## Phase 2: Scenario Generation System  
**Duration:** 2-3 hours  
**Priority:** HIGH  
**Dependencies:** Phase 1 Complete + Tested

### Phase 2 Tasks:

#### Task 2.1: Extension UI for Scenarios
**Objective:** Add scenario generation to extension popup

**Implementation Steps:**
1. Update popup.html with scenario section:
   ```html
   <div id="scenario-section">
     <button id="generate-scenario">Generate Shopping Task</button>
     <div id="scenario-display"></div>
     <button id="start-scenario-tracking">Start Scenario</button>
   </div>
   ```
2. Add scenario state management to popup.js
3. Create scenario display formatting
4. Add scenario tracking controls

**Testing Criteria:**
- [ ] "Generate Shopping Task" button appears in popup
- [ ] Scenario display area shows generated tasks
- [ ] "Start Scenario" button initiates tracking with scenario context
- [ ] UI updates properly based on scenario state

#### Task 2.2: OpenAI Integration
**Objective:** Generate realistic shopping scenarios using OpenAI API

**Implementation Steps:**
1. Add OpenAI API integration to background script
2. Create scenario generation prompts:
   ```javascript
   const scenarioPrompt = `Generate a realistic shopping scenario...
   Format: "Find X items with Y requirements and add to cart"
   Include: target site, difficulty level, success criteria`;
   ```
3. Implement scenario parsing and validation
4. Add error handling for API failures

**Testing Criteria:**
- [ ] OpenAI API calls successful with valid scenarios
- [ ] Generated scenarios are realistic and specific
- [ ] Scenario parsing extracts task, site, criteria correctly
- [ ] Error handling works for API failures/rate limits

#### Task 2.3: Scenario-Session Integration
**Objective:** Link generated scenarios to tracking sessions

**Implementation Steps:**
1. Update session creation to include scenario data
2. Modify tracking start to associate scenario with session
3. Add scenario completion detection logic
4. Implement real-time scenario progress tracking

**Testing Criteria:**
- [ ] Sessions created with scenario data attached
- [ ] Scenario progress tracked during interactions
- [ ] Scenario completion detected automatically
- [ ] Success metrics calculated based on scenario criteria

### Phase 2 Integration Test:
**Test Scenario:** Generate scenario, start tracking, complete task, verify results

**Expected Results:**
- [ ] OpenAI generates realistic shopping scenario
- [ ] Session starts with scenario context attached
- [ ] Enhanced interactions collected with scenario labels
- [ ] Scenario completion detected and success metrics calculated

---

## Phase 3: Advanced Scenario Features
**Duration:** 1-2 hours  
**Priority:** MEDIUM  
**Dependencies:** Phase 2 Complete + Tested

### Phase 3 Tasks:

#### Task 3.1: Scenario Success Tracking
**Objective:** Implement comprehensive scenario completion metrics

**Implementation Steps:**
1. Add success detection algorithms for different scenario types
2. Implement efficiency calculations (time, steps, accuracy)
3. Create scenario completion scoring system
4. Add failure analysis and partial completion tracking

**Testing Criteria:**
- [ ] Scenario success accurately detected
- [ ] Efficiency metrics calculated (completion time, step count)
- [ ] Scoring system provides meaningful feedback
- [ ] Partial completion tracked for failed attempts

#### Task 3.2: Training Data Export
**Objective:** Format complete training examples for AI model fine-tuning

**Implementation Steps:**
1. Create training data export format:
   ```javascript
   {
     input: {
       scenario: "Find 2 blue shirts...",
       website: "amazon.com", 
       interactions: [/* enhanced 6-group data */]
     },
     output: {
       success: true,
       completion_time: 120000,
       efficiency_score: 0.85,
       user_path: ["search", "filter", "add_to_cart"]
     }
   }
   ```
2. Add export functionality to extension
3. Implement batch export for multiple sessions
4. Create training data validation

**Testing Criteria:**
- [ ] Training examples properly formatted for AI training
- [ ] Export includes all necessary context and labels
- [ ] Batch export handles multiple sessions efficiently
- [ ] Exported data validates against training requirements

#### Task 3.3: Scenario Difficulty & Variety
**Objective:** Implement multiple scenario types and difficulty levels

**Implementation Steps:**
1. Create scenario templates for different shopping types:
   - Simple: "Find 1 specific item"
   - Medium: "Find multiple items with requirements"  
   - Complex: "Compare options and make decision"
2. Add difficulty-based success criteria
3. Implement scenario randomization and variety
4. Add scenario category tracking

**Testing Criteria:**
- [ ] Multiple scenario types generate correctly
- [ ] Difficulty levels provide appropriate challenge
- [ ] Scenario variety ensures diverse training data
- [ ] Category tracking enables analysis by scenario type

### Phase 3 Integration Test:
**Test Scenario:** Complete multiple scenarios of varying difficulty and export training data

**Expected Results:**
- [ ] Different scenario types generate and complete successfully
- [ ] Success metrics adapt to scenario difficulty
- [ ] Training data export includes complete examples
- [ ] Variety in scenarios ensures rich training dataset

---

## Testing & Validation Framework

### Continuous Testing Requirements
Each phase must pass its integration test before proceeding to the next phase.

### Test Environment Setup
```bash
# Extension testing
1. Load enhanced extension from dist/ folder
2. Open extension popup and background script consoles  
3. Use test websites (Amazon, Target, etc.) for scenarios
4. Monitor data flow to unified sessions

# Backend testing
1. Monitor Railway logs for session updates
2. Query database for unified session data validation
3. Check enhanced interaction storage and scenario data
```

### Validation Scripts
```javascript
// Extension validation
window.testScenarioIntegration = () => {
  console.log('Testing scenario-enhanced data collection...');
  // Test scenario generation, session tracking, completion detection
};

// Database validation  
SELECT 
  id, scenario, interactionData, outcome 
FROM unifiedSession 
WHERE scenarioId IS NOT NULL;
```

### Rollback Criteria
If any phase fails its integration test:
- [ ] Revert to previous working state
- [ ] Fix identified issues
- [ ] Re-test before proceeding

## Success Metrics

### Functional Requirements
- [ ] Enhanced data flows to unified sessions (not interactions table)
- [ ] OpenAI generates realistic, varied shopping scenarios
- [ ] Scenario success tracking provides meaningful metrics
- [ ] Complete training examples ready for AI fine-tuning

### Performance Requirements  
- [ ] < 200ms added latency for scenario generation
- [ ] No impact on enhanced data collection performance
- [ ] Scenario completion detection works in real-time
- [ ] Training data export handles large session volumes

### Quality Requirements
- [ ] > 90% scenario generation success rate
- [ ] Scenario completion detection > 95% accuracy
- [ ] Training data validation passes for all exports
- [ ] No regression in existing enhanced data collection

## Risk Mitigation

### High-Risk Areas
1. **Data Flow Changes:** Routing data to unified sessions could break existing storage
   - *Mitigation:* Phased implementation with validation at each step
   - *Rollback:* Revert to interactions table if unified sessions fail

2. **OpenAI API Dependencies:** API failures could block scenario generation
   - *Mitigation:* Implement fallback scenarios and error handling
   - *Rollback:* Manual scenario input if API unavailable

3. **Session Schema Changes:** Database schema updates could cause compatibility issues
   - *Mitigation:* Backward compatible schema design
   - *Rollback:* Schema migration rollback procedures

### Contingency Plans
- Maintain current enhanced data collection throughout implementation
- Phase-by-phase rollback capability for each major change
- Scenario system can be disabled while preserving enhanced tracking
- Training data export works with or without scenarios

## Timeline & Resources

### Estimated Timeline: 4-6 hours total
- **Phase 1:** 1-2 hours (Data flow and session structure)
- **Phase 2:** 2-3 hours (Scenario generation and integration)  
- **Phase 3:** 1-2 hours (Advanced features and export)

### Required Resources
- Chrome browser with developer tools
- OpenAI API access and key
- Railway backend with database access
- Test e-commerce websites for scenario validation

### Success Dependencies
- Current enhanced data collection remains stable
- Database schema can be updated for unified sessions
- OpenAI API quota sufficient for testing and usage
- Backend can handle enhanced session storage

---

## Acceptance Criteria

This implementation is considered complete and successful when:

- [ ] All 3 phases completed and tested
- [ ] Enhanced data flows to unified sessions instead of interactions table
- [ ] OpenAI generates realistic shopping scenarios
- [ ] Scenario completion tracking provides accurate metrics
- [ ] Training data export produces AI-ready examples
- [ ] No regression in existing enhanced data collection functionality
- [ ] System handles both scenario and non-scenario sessions

**Final Validation:** Complete scenario-driven session demonstrating: AI-generated shopping task → enhanced 6-group data collection → scenario completion detection → training data export ready for AI model fine-tuning.

---

## Progress Tracking

### Phase 1: Data Flow Correction & Session Structure
- [ ] Task 1.1: Fix Enhanced Data Routing
- [ ] Task 1.2: Enhanced Session Structure Design  
- [ ] Task 1.3: Scenario Infrastructure Preparation
- [ ] Phase 1 Integration Test

### Phase 2: Scenario Generation System
- [ ] Task 2.1: Extension UI for Scenarios
- [ ] Task 2.2: OpenAI Integration
- [ ] Task 2.3: Scenario-Session Integration
- [ ] Phase 2 Integration Test

### Phase 3: Advanced Scenario Features
- [ ] Task 3.1: Scenario Success Tracking
- [ ] Task 3.2: Training Data Export
- [ ] Task 3.3: Scenario Difficulty & Variety
- [ ] Phase 3 Integration Test

### Overall Implementation
- [ ] All phases completed successfully
- [ ] Final validation passed
- [ ] System ready for AI training data collection