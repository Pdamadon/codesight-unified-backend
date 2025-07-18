# CodeSight Enhanced Tracker System - Technical Architecture Plan

## System Overview

The Enhanced CodeSight Tracker System is a complete rewrite optimized for AI training data collection, featuring a streamlined architecture that eliminates the complexity of the current system while maintaining all functional capabilities.

## Architecture Comparison

### Current System Issues
```
Browser Extension (2400 lines)
    ↓ (complex nested objects)
WebSocket Server
    ↓ (payload transformation)
Data Processing Pipeline (8 services)
    ↓ (nested-to-flat conversion)
PostgreSQL (flat schema)
    ↓ (complex queries)
Training Data Export (post-processing)
```

### Enhanced System Architecture
```
Enhanced Extension (600 lines)
    ↓ (native JSON objects)
Enhanced WebSocket Server
    ↓ (direct storage)
Enhanced Database (JSON schema)
    ↓ (simple queries)
Training Data Export (native format)
```

## Technical Components

### 1. Enhanced Database Schema

**Primary Tables:**
```sql
-- Enhanced Sessions
CREATE TABLE enhanced_sessions (
  id UUID PRIMARY KEY,
  type VARCHAR(20) DEFAULT 'AUTOMATED',
  status VARCHAR(20) DEFAULT 'ACTIVE',
  start_time TIMESTAMP DEFAULT NOW(),
  end_time TIMESTAMP,
  config JSON DEFAULT '{}',
  quality_score FLOAT DEFAULT 0,
  training_value FLOAT DEFAULT 0,
  metadata JSON DEFAULT '{}'
);

-- Enhanced Interactions (Core Training Data)
CREATE TABLE enhanced_interactions (
  id UUID PRIMARY KEY,
  session_id UUID REFERENCES enhanced_sessions(id),
  timestamp BIGINT,
  sequence_number INTEGER,
  
  -- Core Action Data
  action_type VARCHAR(20), -- 'click', 'input', 'scroll', 'navigate'
  element_data JSON, -- Complete element information
  context_data JSON, -- Page and surrounding context
  
  -- Training-Specific Data
  training_prompt TEXT,
  training_completion JSON,
  training_metadata JSON,
  
  -- Quality Metrics
  quality_score FLOAT DEFAULT 0,
  training_value FLOAT DEFAULT 0,
  
  -- Indexes
  INDEX(session_id, timestamp),
  INDEX(action_type),
  INDEX(quality_score),
  INDEX(training_value)
);
```

**Key Differences from Current Schema:**
- **JSON-First Design**: All complex data stored as JSON objects
- **Training-Optimized**: Direct prompt/completion storage
- **Simplified Structure**: Fewer tables with richer data
- **Performance-Focused**: Optimized indexes for common queries

### 2. Enhanced Browser Extension

**Architecture:**
```
enhanced-extension/
├── manifest.json (v3)
├── background.js (service worker)
├── content-script.js (600 lines)
├── popup/
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
└── assets/
    └── icons/
```

**Content Script Structure:**
```javascript
class EnhancedTracker {
  constructor() {
    this.sessionId = null;
    this.websocket = null;
    this.isTracking = false;
    this.sequenceNumber = 0;
    this.elementAnalyzer = new ElementAnalyzer();
    this.contextCollector = new ContextCollector();
    this.trainingDataBuilder = new TrainingDataBuilder();
  }

  // Core Methods (simplified)
  async startTracking(sessionId) { /* ... */ }
  async stopTracking() { /* ... */ }
  handleInteraction(event) { /* ... */ }
  collectElementData(element) { /* ... */ }
  buildTrainingData(interaction) { /* ... */ }
  sendData(data) { /* ... */ }
}
```

**Key Features:**
- **Simplified Event Handling**: Direct JSON data collection
- **Native Training Data**: Built-in prompt/completion generation
- **Memory Efficient**: Minimal state management
- **Clean API**: Simple method interfaces

### 3. Enhanced Backend Services

**Service Architecture:**
```
enhanced-backend/
├── src/
│   ├── server.ts (Express + WebSocket)
│   ├── database/
│   │   ├── connection.ts
│   │   └── models.ts
│   ├── services/
│   │   ├── session-manager.ts
│   │   ├── data-processor.ts
│   │   ├── quality-controller.ts
│   │   └── training-exporter.ts
│   ├── routes/
│   │   ├── sessions.ts
│   │   ├── interactions.ts
│   │   └── training.ts
│   └── utils/
│       ├── logger.ts
│       └── validators.ts
├── package.json
└── tsconfig.json
```

**Core Services:**

#### SessionManager
```typescript
class SessionManager {
  async createSession(config: SessionConfig): Promise<Session>
  async updateSession(sessionId: string, updates: Partial<Session>): Promise<Session>
  async getSession(sessionId: string): Promise<Session>
  async listSessions(filters?: SessionFilters): Promise<Session[]>
}
```

#### DataProcessor
```typescript
class DataProcessor {
  async processInteraction(interaction: InteractionData): Promise<ProcessedInteraction>
  async generateTrainingData(interaction: InteractionData): Promise<TrainingData>
  async calculateQualityScore(interaction: InteractionData): Promise<number>
  async batchProcess(interactions: InteractionData[]): Promise<ProcessedInteraction[]>
}
```

#### QualityController
```typescript
class QualityController {
  async assessInteraction(interaction: InteractionData): Promise<QualityScore>
  async assessSession(sessionId: string): Promise<SessionQuality>
  async generateQualityReport(sessionId: string): Promise<QualityReport>
}
```

#### TrainingExporter
```typescript
class TrainingExporter {
  async exportSession(sessionId: string, format: 'jsonl' | 'json'): Promise<string>
  async exportDateRange(startDate: Date, endDate: Date): Promise<string>
  async generateOpenAITrainingFile(sessionIds: string[]): Promise<string>
}
```

### 4. Data Flow Architecture

**Interaction Capture Flow:**
```
User Action → Content Script → WebSocket → Backend → Database
     ↓
Element Analysis → Context Collection → Training Data Generation → Quality Assessment
```

**Training Data Generation:**
```typescript
// Example training data structure
interface TrainingData {
  prompt: string;
  completion: {
    action: string;
    element: {
      selector: string;
      text: string;
      position: { x: number, y: number };
      attributes: Record<string, string>;
    };
    context: {
      page_type: string;
      nearby_elements: Element[];
      user_intent: string;
      dom_snapshot: string;
    };
    reasoning: string;
  };
  metadata: {
    session_id: string;
    timestamp: number;
    quality_score: number;
    training_value: number;
  };
}
```

## Performance Optimizations

### 1. Database Optimizations
- **JSON Indexing**: GIN indexes on JSON columns for fast queries
- **Connection Pooling**: Optimized pool size for Railway PostgreSQL
- **Query Optimization**: Simplified queries with direct JSON access
- **Batch Operations**: Bulk inserts for high-throughput scenarios

### 2. Memory Management
- **Streaming Data**: Process interactions as they arrive
- **Garbage Collection**: Automatic cleanup of processed data
- **Memory Limits**: Configurable memory thresholds
- **Efficient Serialization**: Optimized JSON serialization

### 3. WebSocket Optimization
- **Connection Pooling**: Reuse connections across sessions
- **Message Compression**: Gzip compression for large payloads
- **Heartbeat Monitoring**: Automatic reconnection on failures
- **Queue Management**: Ordered message processing

## Quality Assurance

### 1. Data Quality Metrics
```typescript
interface QualityMetrics {
  completeness: number;      // 0-100, required fields present
  accuracy: number;          // 0-100, data accuracy assessment
  consistency: number;       // 0-100, data consistency check
  training_value: number;    // 0-100, ML training utility
  overall_score: number;     // 0-100, weighted average
}
```

### 2. Quality Gates
- **Minimum Completeness**: 80% required fields
- **Minimum Accuracy**: 75% data accuracy
- **Minimum Training Value**: 70% ML utility score
- **Overall Threshold**: 75% overall quality score

### 3. Automated Testing
- **Unit Tests**: Individual component testing
- **Integration Tests**: End-to-end data flow testing
- **Performance Tests**: Load and stress testing
- **Quality Tests**: Data quality validation

## Deployment Architecture

### 1. Railway Deployment
```yaml
# railway.json
{
  "version": 2,
  "build": {
    "command": "npm run build"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/health"
  },
  "env": {
    "DATABASE_URL": "${{ Postgres.DATABASE_URL }}",
    "NODE_ENV": "production"
  }
}
```

### 2. Database Setup
```sql
-- Create enhanced database
CREATE DATABASE codesight_enhanced;

-- Set up connection parameters
ALTER DATABASE codesight_enhanced SET 
  shared_preload_libraries = 'pg_stat_statements';
```

### 3. Environment Configuration
```bash
# Production environment
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@host:5432/codesight_enhanced
WEBSOCKET_PORT=8080
API_PORT=3000
LOG_LEVEL=info
QUALITY_THRESHOLD=75
```

## Security Considerations

### 1. Data Privacy
- **PII Filtering**: Automatic detection and removal of sensitive data
- **Encryption**: TLS encryption for all data transmission
- **Access Control**: Role-based access to training data
- **Data Retention**: Configurable data retention policies

### 2. API Security
- **Authentication**: JWT-based authentication
- **Rate Limiting**: Request rate limiting per client
- **Input Validation**: Strict input validation on all endpoints
- **Error Handling**: Secure error messages without data leakage

### 3. Extension Security
- **Content Security Policy**: Strict CSP for extension
- **Secure Origins**: HTTPS-only WebSocket connections
- **Permission Minimization**: Minimal required permissions
- **Code Obfuscation**: Minified and obfuscated production code

## Migration Strategy

### 1. Parallel Deployment
- **Phase 1**: Deploy enhanced system alongside current system
- **Phase 2**: A/B test data quality comparison
- **Phase 3**: Gradual traffic migration
- **Phase 4**: Full cutover with current system as backup

### 2. Data Compatibility
- **Export Tools**: Tools to export current system data
- **Import Tools**: Tools to import into enhanced system
- **Quality Comparison**: Side-by-side quality assessment
- **Training Validation**: ML model performance comparison

### 3. Rollback Plan
- **Quick Rollback**: Immediate switch back to current system
- **Data Preservation**: Maintain both systems during transition
- **Monitoring**: Comprehensive monitoring during migration
- **Success Criteria**: Clear metrics for migration success

## Monitoring & Observability

### 1. Application Metrics
- **Interaction Processing Rate**: Interactions per second
- **Data Quality Scores**: Average quality metrics
- **Training Data Generation**: Successful exports per hour
- **System Health**: Service availability and performance

### 2. Infrastructure Metrics
- **Database Performance**: Query response times
- **WebSocket Health**: Connection success rates
- **Memory Usage**: Application memory consumption
- **Error Rates**: Application and system error rates

### 3. Business Metrics
- **Training Data Quality**: ML model performance improvements
- **System Efficiency**: Cost per interaction processed
- **User Experience**: Extension performance impact
- **Data Completeness**: Successful capture rates

## Implementation Timeline

### Week 1: Foundation
- [ ] Set up enhanced database schema
- [ ] Create basic backend structure
- [ ] Implement WebSocket server
- [ ] Build browser extension skeleton

### Week 2: Core Features
- [ ] Complete content script implementation
- [ ] Build data processing pipeline
- [ ] Implement quality control system
- [ ] Create training data export functionality

### Week 3: Testing & Optimization
- [ ] Comprehensive testing suite
- [ ] Performance optimization
- [ ] Quality metric validation
- [ ] Security audit

### Week 4: Deployment & Validation
- [ ] Railway deployment
- [ ] A/B testing setup
- [ ] Data quality comparison
- [ ] Production readiness assessment

## Risk Mitigation

### Technical Risks
- **Performance**: Comprehensive load testing before deployment
- **Data Quality**: Extensive quality validation during development
- **Compatibility**: Browser testing across different environments
- **Scalability**: Horizontal scaling architecture from day one

### Business Risks
- **Training Effectiveness**: A/B testing to validate improved training data
- **Migration Complexity**: Parallel deployment to reduce migration risk
- **User Impact**: Minimal user-facing changes during transition
- **Cost**: Efficient resource utilization to control costs

## Success Criteria

### Technical Success
- [ ] 75% reduction in content script complexity
- [ ] 50% improvement in data processing speed
- [ ] 99.9% system uptime
- [ ] Zero data loss during operation

### Business Success
- [ ] 30% improvement in GPT-4o-mini training effectiveness
- [ ] 25% reduction in training data preparation time
- [ ] 90% data quality score achievement
- [ ] Successful parallel operation with current system

This technical plan provides a comprehensive roadmap for building the Enhanced CodeSight Tracker System with clear architecture, implementation steps, and success criteria.