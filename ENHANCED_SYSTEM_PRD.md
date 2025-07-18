# CodeSight Enhanced Tracker System - Product Requirements Document

## Executive Summary

The Enhanced CodeSight Tracker System is a streamlined, AI-training-optimized parallel system designed to collect high-quality web interaction data for GPT-4o-mini fine-tuning. This system addresses architectural complexity issues in the current system while maintaining all functional capabilities.

## Problem Statement

### Current System Issues
1. **Architectural Complexity**: 2400-line content script with complex nested-to-flat data transformations
2. **Data Transformation Overhead**: Complex pipeline converting JSON objects to flat database fields
3. **Payload Mismatch Issues**: Frequent conflicts between extension data format and database schema
4. **Processing Bottlenecks**: Complex multi-service pipeline causing performance issues
5. **Training Data Quality**: Suboptimal data structure for GPT-4o-mini training

### Current System Strengths
1. **Reliable WebSocket Communication**: Stable connection handling with ping/pong
2. **Database Connection Management**: Proper connection pooling and throttling
3. **Comprehensive Data Collection**: Rich element context and DOM analysis
4. **Quality Control**: Robust quality scoring and validation
5. **Privacy Protection**: Strong sensitive data filtering

## Product Vision

Create a clean, efficient AI training data collection system that:
- Reduces architectural complexity by 75% (600 lines vs 2400 lines)
- Eliminates data transformation bottlenecks
- Produces superior GPT-4o-mini training data
- Maintains all security and privacy protections
- Operates independently alongside current system

## Target Users

**Primary**: AI/ML Engineers fine-tuning GPT-4o-mini for web automation
**Secondary**: QA Engineers validating training data quality
**Tertiary**: Product Managers monitoring system performance

## Core Requirements

### Functional Requirements

#### F1: Streamlined Data Collection
- **F1.1**: Collect web interactions with native JSON structure
- **F1.2**: Capture element selectors, context, and DOM snapshots
- **F1.3**: Record user actions with structured metadata
- **F1.4**: Generate training-ready data formats

#### F2: AI Training Optimization
- **F2.1**: Structure data specifically for GPT-4o-mini prompt/completion pairs
- **F2.2**: Include comprehensive context for pattern recognition
- **F2.3**: Provide element relationship mapping (parents, siblings, nearby elements)
- **F2.4**: Generate structured action descriptions for training

#### F3: Independent Operation
- **F3.1**: Operate on separate database (codesight_enhanced)
- **F3.2**: Deploy to separate Railway instance
- **F3.3**: Use independent browser extension
- **F3.4**: Maintain separate data processing pipeline

#### F4: Quality Assurance
- **F4.1**: Implement data quality scoring
- **F4.2**: Validate training data completeness
- **F4.3**: Detect and flag low-quality sessions
- **F4.4**: Generate quality reports for comparison

### Non-Functional Requirements

#### NF1: Performance
- **NF1.1**: Process interactions in <500ms
- **NF1.2**: Handle 1000+ interactions per session
- **NF1.3**: Support concurrent multi-tab tracking
- **NF1.4**: Maintain <10MB memory footprint

#### NF2: Reliability
- **NF2.1**: 99.9% uptime for data collection
- **NF2.2**: Zero data loss during collection
- **NF2.3**: Automatic recovery from connection failures
- **NF2.4**: Graceful degradation under load

#### NF3: Scalability
- **NF3.1**: Handle 100+ concurrent sessions
- **NF3.2**: Process 10,000+ interactions per hour
- **NF3.3**: Support horizontal scaling
- **NF3.4**: Efficient database utilization

#### NF4: Security
- **NF4.1**: Maintain all current privacy protections
- **NF4.2**: Secure WebSocket communications
- **NF4.3**: Encrypted data transmission
- **NF4.4**: Sensitive data filtering

## Key Features

### 1. Simplified Architecture
- **Single-purpose content script**: 600 lines focused on data collection
- **Direct JSON storage**: No complex transformations
- **Streamlined pipeline**: Minimal processing overhead
- **Clean API design**: RESTful endpoints for all operations

### 2. AI Training Data Structure
```json
{
  "prompt": "Navigate to product page from category listing",
  "completion": {
    "action": "click",
    "element": {
      "selector": "a[data-product-id='123']",
      "text": "Premium Wireless Headphones",
      "position": {"x": 350, "y": 200}
    },
    "context": {
      "page_type": "category_listing",
      "nearby_elements": [...],
      "user_intent": "product_discovery"
    }
  }
}
```

### 3. Enhanced Context Collection
- **DOM Snapshots**: Lightweight HTML structure capture
- **Element Relationships**: Parent/child/sibling mapping
- **Nearby Elements**: Clickable elements within 100px radius
- **Page Context**: Title, URL, viewport, scroll position
- **User Intent**: Inferred from interaction patterns

### 4. Quality Metrics
- **Training Value Score**: 0-100 rating for AI training utility
- **Data Completeness**: Required fields coverage percentage
- **Selector Reliability**: Selector stability across page changes
- **Context Richness**: Depth of contextual information

## Success Metrics

### Primary KPIs
1. **Code Reduction**: 75% reduction in content script size
2. **Processing Speed**: 50% faster data processing
3. **Training Data Quality**: 30% improvement in GPT-4o-mini training effectiveness
4. **System Reliability**: 99.9% uptime with zero data loss

### Secondary KPIs
1. **Memory Usage**: <10MB per browser tab
2. **Database Efficiency**: 50% reduction in query complexity
3. **Development Velocity**: 2x faster feature development
4. **Error Rate**: <0.1% data collection failures

## Technical Constraints

### Infrastructure
- **Database**: PostgreSQL with JSON column support
- **Deployment**: Railway.app platform
- **Browser**: Chrome extension manifest v3
- **Backend**: Node.js with TypeScript

### Data Storage
- **Session Data**: JSON objects in PostgreSQL
- **Training Export**: JSONL format for OpenAI
- **Quality Reports**: Structured analytics data
- **Archive Storage**: Compressed session data

### Integration
- **OpenAI API**: GPT-4o-mini fine-tuning
- **WebSocket**: Real-time data streaming
- **REST API**: System management and queries
- **Chrome Extension**: User interaction capture

## Risk Assessment

### High Risk
1. **Data Quality**: New system might miss edge cases
2. **Performance**: Untested under production load
3. **Training Effectiveness**: Unknown impact on GPT-4o-mini performance

### Medium Risk
1. **Migration Complexity**: Moving from current system
2. **Browser Compatibility**: Extension compatibility issues
3. **Database Performance**: JSON query optimization

### Low Risk
1. **Development Timeline**: Well-defined scope
2. **Technology Stack**: Proven technologies
3. **Team Expertise**: Familiar with current system

## Implementation Timeline

### Phase 1: Foundation (Week 1)
- Set up enhanced database schema
- Create basic backend structure
- Implement WebSocket server
- Build browser extension skeleton

### Phase 2: Core Features (Week 2)
- Implement content script data collection
- Build data processing pipeline
- Create quality control system
- Add training data export

### Phase 3: Testing & Optimization (Week 3)
- Comprehensive testing suite
- Performance optimization
- Quality metric validation
- Documentation completion

### Phase 4: Deployment & Validation (Week 4)
- Railway deployment
- A/B testing against current system
- Training data quality comparison
- Production readiness assessment

## Dependencies

### Internal
- Current system architecture knowledge
- Database schema design
- WebSocket implementation patterns
- Quality control methodologies

### External
- Railway.app deployment platform
- PostgreSQL database hosting
- OpenAI API for training data validation
- Chrome extension store policies

## Acceptance Criteria

### System Performance
- [ ] Content script loads in <100ms
- [ ] Interactions processed in <500ms
- [ ] WebSocket reconnection in <3 seconds
- [ ] Quality reports generated in <10 seconds

### Data Quality
- [ ] 99% of interactions captured with complete data
- [ ] 95% of selectors remain stable across page changes
- [ ] 90% of sessions meet training quality threshold
- [ ] Zero sensitive data leakage

### Training Data
- [ ] Export format compatible with OpenAI fine-tuning
- [ ] Structured prompt/completion pairs
- [ ] Comprehensive context information
- [ ] Measurable improvement in GPT-4o-mini performance

## Appendix

### A. Current System Architecture Analysis
- Complex nested data transformations
- Multiple service dependencies
- Extensive validation pipeline
- High memory usage patterns

### B. Enhanced System Architecture
- Direct JSON storage approach
- Simplified service architecture
- Streamlined validation
- Memory-efficient design

### C. Comparison Matrix
| Feature | Current System | Enhanced System |
|---------|---------------|-----------------|
| Content Script Size | 2400 lines | 600 lines |
| Data Transformation | Complex | None |
| Database Schema | Flat fields | JSON objects |
| Processing Pipeline | Multi-service | Single service |
| Training Readiness | Post-processing | Native |