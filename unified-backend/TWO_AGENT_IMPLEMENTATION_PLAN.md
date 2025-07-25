# Two-Agent Training Data Architecture Implementation Plan

## Project Overview
Transform existing unified session data into specialized training formats for a two-agent AI system:
- **Agent 1**: Site Comprehension Agent (World Model Builder)
- **Agent 2**: Click Execution Agent (Precise Action Taker)

## Requirements Analysis

### Functional Requirements

#### FR-1: Data Augmentation System
- **FR-1.1**: Auto-classify page types from DOM structure and URL patterns
- **FR-1.2**: Extract semantic zones (productGrid, filterSidebar, topNav, etc.)
- **FR-1.3**: Group individual clicks into journey sequences
- **FR-1.4**: Enrich context with non-clicked sibling elements

#### FR-2: Agent 1 Training Data Generator
- **FR-2.1**: Generate site comprehension training pairs
- **FR-2.2**: Create world model schema for reusable site patterns
- **FR-2.3**: Export journey-level navigation understanding
- **FR-2.4**: Include page flow and semantic layout patterns

#### FR-3: Agent 2 Training Data Generator
- **FR-3.1**: Generate precise click execution training pairs
- **FR-3.2**: Include rich DOM context and visual positioning
- **FR-3.3**: Focus on selector accuracy and action validation
- **FR-3.4**: Maintain element relationship understanding

#### FR-4: Validation & Quality Assurance
- **FR-4.1**: Verify page type classification accuracy
- **FR-4.2**: Ensure journey step logical flow
- **FR-4.3**: Validate complementary (non-overlapping) agent training data
- **FR-4.4**: Implement data quality scoring system

### Non-Functional Requirements

#### NFR-1: Performance
- Process existing unified sessions without re-collection
- Handle large session datasets efficiently
- Maintain sub-second response times for data generation

#### NFR-2: Scalability
- Support multiple site architectures (e-commerce, SaaS, content)
- Extensible pattern recognition system
- Configurable augmentation rules

#### NFR-3: Data Quality
- Maintain >90% page type classification accuracy
- Preserve original data integrity during augmentation
- Ensure reproducible data generation

## Technical Architecture

### Core Components

#### 1. Session Analyzer (`session-analyzer.js`)
```javascript
class SessionAnalyzer {
  analyzePage(domSnapshot, url, metadata)
  classifyPageType(pageData)
  extractSemanticZones(domSnapshot)
  identifyNavigationPatterns(sessionFlow)
}
```

#### 2. Journey Reconstructor (`journey-reconstructor.js`)
```javascript
class JourneyReconstructor {
  groupInteractionsIntoSteps(interactions)
  buildNavigationFlow(steps)
  extractUserIntent(journeyData)
  validateJourneyCompleteness(journey)
}
```

#### 3. World Model Builder (`world-model-builder.js`)
```javascript
class WorldModelBuilder {
  buildSiteSchema(sessionData)
  extractReusablePatterns(multipleJourneys)
  createSemanticMappings(pageTypes)
  exportWorldModel(schema)
}
```

#### 4. Agent Training Data Generators
```javascript
class Agent1DataGenerator {
  generateSiteComprehensionPairs(worldModel, journeys)
  createNavigationPlanningData(siteFlows)
  exportTrainingJSONL(trainingPairs)
}

class Agent2DataGenerator {
  generateClickExecutionPairs(interactions, context)
  createSelectorTrainingData(domData)
  exportTrainingJSONL(trainingPairs)
}
```

## Implementation Plan

### Phase 1: Foundation (Week 1)
**Milestone**: Basic data augmentation system operational

#### Tasks:
1. **Session Data Analysis**
   - [ ] Create `SessionAnalyzer` class
   - [ ] Implement page type classification algorithm
   - [ ] Build DOM pattern recognition system
   - [ ] Test on existing unified session data

2. **Page Type Classification**
   - [ ] Define page type taxonomy (homepage, category, product, cart, etc.)
   - [ ] Create rule-based classifier using DOM selectors
   - [ ] Implement URL pattern matching
   - [ ] Add fallback classification logic

3. **Semantic Zone Detection**
   - [ ] Define common web page zones
   - [ ] Create zone detection algorithms
   - [ ] Map parent/child element relationships
   - [ ] Validate zone accuracy on sample data

**Deliverables:**
- `session-analyzer.js` with page classification
- Page type classification report (>85% accuracy target)
- Zone detection validation results

### Phase 2: Journey Reconstruction (Week 2)
**Milestone**: Complete journey tracking and flow analysis

#### Tasks:
1. **Journey Step Grouping**
   - [ ] Create `JourneyReconstructor` class
   - [ ] Implement interaction clustering algorithm
   - [ ] Define step transition logic
   - [ ] Handle edge cases (back navigation, page refreshes)

2. **Navigation Flow Analysis**
   - [ ] Build journey flow tracker
   - [ ] Identify common navigation patterns
   - [ ] Extract user intent from journey sequences
   - [ ] Create journey validation system

3. **Context Enrichment**
   - [ ] Extract sibling element information
   - [ ] Identify available but unused options
   - [ ] Build element relationship maps
   - [ ] Create context scoring system

**Deliverables:**
- `journey-reconstructor.js` with flow analysis
- Journey validation report
- Context enrichment metrics

### Phase 3: World Model Construction (Week 3)
**Milestone**: Functional world model for site comprehension

#### Tasks:
1. **Site Schema Generation**
   - [ ] Create `WorldModelBuilder` class
   - [ ] Define world model JSON schema
   - [ ] Implement pattern extraction algorithms
   - [ ] Build reusable component library

2. **Cross-Journey Pattern Recognition**
   - [ ] Analyze multiple journey sessions
   - [ ] Extract common site patterns
   - [ ] Build semantic mapping system
   - [ ] Create pattern confidence scoring

3. **World Model Validation**
   - [ ] Test model accuracy on new sessions
   - [ ] Validate pattern reusability
   - [ ] Measure comprehension effectiveness
   - [ ] Implement model update mechanisms

**Deliverables:**
- `world-model-builder.js` with pattern recognition
- World model JSON schema and sample data
- Pattern recognition accuracy report (>80% target)

### Phase 4: Agent Training Data Generation (Week 4)
**Milestone**: Specialized training data for both agents

#### Tasks:
1. **Agent 1 Data Generator**
   - [ ] Create `Agent1DataGenerator` class
   - [ ] Generate site comprehension training pairs
   - [ ] Build navigation planning datasets
   - [ ] Export JSONL format for fine-tuning

2. **Agent 2 Data Generator**
   - [ ] Create `Agent2DataGenerator` class
   - [ ] Generate click execution training pairs
   - [ ] Focus on selector precision and context
   - [ ] Export JSONL format for fine-tuning

3. **Training Data Validation**
   - [ ] Verify data quality and consistency
   - [ ] Ensure complementary (non-overlapping) training sets
   - [ ] Implement data balance checking
   - [ ] Create training data metrics dashboard

**Deliverables:**
- `agent1-worldmodel.jsonl` training dataset
- `agent2-executor.jsonl` training dataset
- Training data quality report
- Data generation pipeline documentation

### Phase 5: Integration & Testing (Week 5)
**Milestone**: Complete two-agent training pipeline

#### Tasks:
1. **Pipeline Integration**
   - [ ] Create master orchestration script
   - [ ] Implement end-to-end data processing
   - [ ] Add error handling and recovery
   - [ ] Build monitoring and logging

2. **Quality Assurance**
   - [ ] Comprehensive testing on multiple session types
   - [ ] Performance optimization
   - [ ] Memory usage optimization
   - [ ] Create benchmark datasets

3. **Documentation & Deployment**
   - [ ] Complete API documentation
   - [ ] Create usage examples and tutorials
   - [ ] Build deployment scripts
   - [ ] Create maintenance procedures

**Deliverables:**
- Complete two-agent training pipeline
- Performance benchmarks and optimization report
- Comprehensive documentation
- Deployment and maintenance guides

## Success Metrics

### Data Quality Metrics
- **Page Type Classification**: >90% accuracy
- **Journey Reconstruction**: >85% step accuracy
- **World Model Patterns**: >80% reusability
- **Training Data Quality**: >95% valid pairs

### Performance Metrics
- **Processing Speed**: <5s per session
- **Memory Usage**: <2GB for 1000 sessions
- **Data Generation**: 10,000+ training pairs/hour
- **Error Rate**: <2% processing failures

### Business Impact Metrics
- **Agent 1 Training**: Site comprehension accuracy improvement
- **Agent 2 Training**: Click execution precision improvement
- **Model Performance**: A/B test showing superior results
- **Scalability**: Support for 10+ different site architectures

## Risk Analysis & Mitigation

### High Risk Items
1. **Page Type Classification Accuracy**
   - *Risk*: Insufficient accuracy for diverse sites
   - *Mitigation*: Machine learning backup classifier, manual validation dataset

2. **Journey Reconstruction Complexity**
   - *Risk*: Complex user flows not properly captured
   - *Mitigation*: Incremental complexity approach, extensive testing

3. **Data Quality Degradation**
   - *Risk*: Augmentation process introduces errors
   - *Mitigation*: Comprehensive validation, original data preservation

### Medium Risk Items
1. **Performance at Scale**
   - *Risk*: Processing becomes too slow for large datasets
   - *Mitigation*: Streaming processing, incremental updates

2. **Pattern Recognition Limitations**
   - *Risk*: Site-specific patterns don't generalize
   - *Mitigation*: Configurable pattern rules, site-specific overrides

## Resource Requirements

### Development Resources
- **Senior Developer**: 1 FTE for 5 weeks
- **Data Scientist**: 0.5 FTE for validation and metrics
- **QA Engineer**: 0.25 FTE for testing

### Infrastructure Requirements
- **Development Environment**: Local/cloud development setup
- **Storage**: 10GB for sample datasets and generated training data
- **Compute**: Medium-tier processing for data generation

## Timeline Summary

| Phase | Duration | Key Deliverable |
|-------|----------|----------------|
| Phase 1 | Week 1 | Session analysis and page classification |
| Phase 2 | Week 2 | Journey reconstruction and flow analysis |
| Phase 3 | Week 3 | World model construction and validation |
| Phase 4 | Week 4 | Agent training data generation |
| Phase 5 | Week 5 | Integration, testing, and deployment |

**Total Duration**: 5 weeks
**Go-Live Date**: End of Week 5

## Next Steps (Tomorrow's Priority Tasks)

1. **Start Phase 1**: Begin with `SessionAnalyzer` class implementation
2. **Define Page Types**: Create comprehensive page type taxonomy
3. **Build Classification Rules**: Implement DOM-based page type detection
4. **Test on Sample Data**: Validate approach with existing unified sessions
5. **Iterate and Refine**: Adjust based on initial results

---

*This implementation plan provides a comprehensive roadmap for transforming existing unified session data into a two-agent training architecture, with clear milestones, success metrics, and risk mitigation strategies.*