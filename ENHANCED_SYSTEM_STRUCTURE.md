# Enhanced CodeSight Tracker System - Complete Structure & Implementation Guide

## Project Structure

```
codesight-enhanced/
├── enhanced-backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── railway.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── server.ts
│   │   ├── database/
│   │   │   ├── connection.ts
│   │   │   └── models.ts
│   │   ├── services/
│   │   │   ├── session-manager.ts
│   │   │   ├── data-processor.ts
│   │   │   ├── quality-controller.ts
│   │   │   ├── training-exporter.ts
│   │   │   └── websocket-server.ts
│   │   ├── routes/
│   │   │   ├── sessions.ts
│   │   │   ├── interactions.ts
│   │   │   ├── training.ts
│   │   │   └── health.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   ├── validators.ts
│   │   │   └── types.ts
│   │   └── middleware/
│   │       ├── auth.ts
│   │       ├── cors.ts
│   │       └── rate-limit.ts
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   └── docs/
│       ├── api.md
│       └── deployment.md
├── enhanced-extension/
│   ├── manifest.json
│   ├── background.js
│   ├── content-script.js
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.js
│   │   └── popup.css
│   ├── assets/
│   │   ├── icons/
│   │   └── images/
│   └── utils/
│       ├── element-analyzer.js
│       ├── context-collector.js
│       └── training-builder.js
├── shared/
│   ├── types/
│   │   ├── session.ts
│   │   ├── interaction.ts
│   │   └── training.ts
│   └── constants/
│       ├── events.ts
│       └── config.ts
├── docs/
│   ├── README.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   └── COMPARISON.md
└── scripts/
    ├── setup.sh
    ├── deploy.sh
    └── migrate.sh
```

## Database Schema Design

### Enhanced Tables Structure

#### enhanced_sessions
```sql
-- Core session tracking
id UUID PRIMARY KEY
type VARCHAR(20) DEFAULT 'AUTOMATED'
status VARCHAR(20) DEFAULT 'ACTIVE'
start_time TIMESTAMP DEFAULT NOW()
end_time TIMESTAMP
duration INTEGER  -- seconds
config JSON DEFAULT '{}'
quality_score FLOAT DEFAULT 0
training_value FLOAT DEFAULT 0
completeness FLOAT DEFAULT 0
interaction_count INTEGER DEFAULT 0
screenshot_count INTEGER DEFAULT 0
metadata JSON DEFAULT '{}'
created_at TIMESTAMP DEFAULT NOW()
updated_at TIMESTAMP DEFAULT NOW()
```

#### enhanced_interactions
```sql
-- Main training data table
id UUID PRIMARY KEY
session_id UUID REFERENCES enhanced_sessions(id)
timestamp BIGINT NOT NULL
sequence_number INTEGER
action_type VARCHAR(20) NOT NULL  -- 'click', 'input', 'scroll', 'navigate'

-- Element Data (JSON)
element_data JSON NOT NULL
-- {
--   "selector": "button[data-action='add-to-cart']",
--   "text": "Add to Cart",
--   "tag": "button",
--   "attributes": {...},
--   "position": {"x": 350, "y": 200},
--   "size": {"width": 120, "height": 40},
--   "styles": {...}
-- }

-- Context Data (JSON)
context_data JSON NOT NULL
-- {
--   "page_type": "product_detail",
--   "url": "https://example.com/product/123",
--   "title": "Product Name",
--   "viewport": {"width": 1920, "height": 1080},
--   "scroll_position": {"x": 0, "y": 500},
--   "nearby_elements": [...],
--   "parent_chain": [...],
--   "siblings": [...],
--   "dom_snapshot": "...",
--   "user_intent": "purchase"
-- }

-- Training Data (JSON)
training_data JSON NOT NULL
-- {
--   "prompt": "Navigate to checkout from product page",
--   "completion": {
--     "action": "click",
--     "element": {...},
--     "reasoning": "User wants to purchase, clicking add to cart button"
--   },
--   "metadata": {
--     "difficulty": "easy",
--     "pattern_type": "ecommerce_purchase",
--     "training_value": 85
--   }
-- }

-- Quality Metrics
quality_score FLOAT DEFAULT 0
training_value FLOAT DEFAULT 0
completeness FLOAT DEFAULT 0
confidence FLOAT DEFAULT 0

-- Indexes
INDEX(session_id, timestamp)
INDEX(action_type)
INDEX(quality_score)
INDEX(training_value)
INDEX(timestamp)
```

#### enhanced_quality_reports
```sql
-- Quality assessment results
id UUID PRIMARY KEY
session_id UUID REFERENCES enhanced_sessions(id)
overall_score FLOAT NOT NULL
completeness_score FLOAT NOT NULL
accuracy_score FLOAT NOT NULL
training_value_score FLOAT NOT NULL
quality_issues JSON DEFAULT '[]'
recommendations JSON DEFAULT '[]'
generated_at TIMESTAMP DEFAULT NOW()
```

#### enhanced_training_exports
```sql
-- Training data export tracking
id UUID PRIMARY KEY
session_ids JSON NOT NULL  -- Array of session IDs
export_format VARCHAR(20) DEFAULT 'jsonl'
file_size BIGINT
record_count INTEGER
quality_threshold FLOAT DEFAULT 75
export_data TEXT  -- JSONL or JSON content
created_at TIMESTAMP DEFAULT NOW()
```

## Backend Services Architecture

### Core Services

#### SessionManager
```typescript
interface SessionConfig {
  type: 'AUTOMATED' | 'MANUAL';
  quality_threshold: number;
  max_interactions: number;
  max_duration: number;
  metadata: Record<string, any>;
}

class SessionManager {
  async createSession(config: SessionConfig): Promise<EnhancedSession>
  async updateSession(sessionId: string, updates: Partial<EnhancedSession>): Promise<EnhancedSession>
  async getSession(sessionId: string): Promise<EnhancedSession | null>
  async listSessions(filters?: SessionFilters): Promise<EnhancedSession[]>
  async deleteSession(sessionId: string): Promise<void>
  async getSessionStats(sessionId: string): Promise<SessionStats>
}
```

#### DataProcessor
```typescript
class DataProcessor {
  async processInteraction(data: InteractionData): Promise<ProcessedInteraction>
  async generateTrainingData(interaction: InteractionData): Promise<TrainingData>
  async calculateQualityScore(interaction: InteractionData): Promise<number>
  async batchProcess(interactions: InteractionData[]): Promise<ProcessedInteraction[]>
  async enrichContext(interaction: InteractionData): Promise<EnrichedContext>
}
```

#### QualityController
```typescript
class QualityController {
  async assessInteraction(interaction: InteractionData): Promise<QualityScore>
  async assessSession(sessionId: string): Promise<SessionQualityReport>
  async generateQualityReport(sessionId: string): Promise<QualityReport>
  async validateTrainingData(data: TrainingData): Promise<ValidationResult>
  async setQualityThresholds(thresholds: QualityThresholds): Promise<void>
}
```

#### TrainingExporter
```typescript
class TrainingExporter {
  async exportSession(sessionId: string, format: 'jsonl' | 'json'): Promise<ExportResult>
  async exportMultipleSessions(sessionIds: string[], format: 'jsonl' | 'json'): Promise<ExportResult>
  async exportDateRange(startDate: Date, endDate: Date, format: 'jsonl' | 'json'): Promise<ExportResult>
  async generateOpenAITrainingFile(sessionIds: string[]): Promise<string>
  async validateExportData(data: string): Promise<ValidationResult>
}
```

### WebSocket Server
```typescript
class EnhancedWebSocketServer {
  async handleConnection(socket: WebSocket): Promise<void>
  async handleMessage(socket: WebSocket, message: WebSocketMessage): Promise<void>
  async broadcastToSession(sessionId: string, message: any): Promise<void>
  async authenticateConnection(socket: WebSocket, auth: AuthData): Promise<boolean>
  async handleDisconnection(socket: WebSocket): Promise<void>
}
```

## Browser Extension Architecture

### Content Script (600 lines target)
```javascript
class EnhancedTracker {
  constructor() {
    this.sessionId = null;
    this.websocket = null;
    this.isTracking = false;
    this.sequenceNumber = 0;
    this.elementAnalyzer = new ElementAnalyzer();
    this.contextCollector = new ContextCollector();
    this.trainingBuilder = new TrainingDataBuilder();
  }

  // Core tracking methods
  async startTracking(sessionId, config) { /* ... */ }
  async stopTracking() { /* ... */ }
  handleInteraction(event) { /* ... */ }
  
  // Data collection methods
  collectElementData(element) { /* ... */ }
  collectContextData() { /* ... */ }
  buildTrainingData(interaction) { /* ... */ }
  
  // Communication methods
  sendInteraction(data) { /* ... */ }
  handleWebSocketMessage(message) { /* ... */ }
  
  // Utility methods
  generateSelector(element) { /* ... */ }
  isElementVisible(element) { /* ... */ }
  filterSensitiveData(data) { /* ... */ }
}
```

### Background Script
```javascript
class EnhancedBackground {
  constructor() {
    this.activeSessions = new Map();
    this.websocketConnection = null;
  }

  // Session management
  async startSession(config) { /* ... */ }
  async stopSession(sessionId) { /* ... */ }
  
  // Message handling
  handleContentScriptMessage(message, sender, sendResponse) { /* ... */ }
  handlePopupMessage(message, sender, sendResponse) { /* ... */ }
  
  // WebSocket management
  async connectWebSocket() { /* ... */ }
  handleWebSocketMessage(message) { /* ... */ }
  
  // Storage management
  async saveSessionData(sessionId, data) { /* ... */ }
  async loadSessionData(sessionId) { /* ... */ }
}
```

## Data Types & Interfaces

### Core Types
```typescript
interface EnhancedSession {
  id: string;
  type: 'AUTOMATED' | 'MANUAL';
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  config: SessionConfig;
  qualityScore: number;
  trainingValue: number;
  completeness: number;
  interactionCount: number;
  metadata: Record<string, any>;
}

interface EnhancedInteraction {
  id: string;
  sessionId: string;
  timestamp: number;
  sequenceNumber: number;
  actionType: 'click' | 'input' | 'scroll' | 'navigate' | 'hover' | 'focus';
  elementData: ElementData;
  contextData: ContextData;
  trainingData: TrainingData;
  qualityScore: number;
  trainingValue: number;
  completeness: number;
  confidence: number;
}

interface ElementData {
  selector: string;
  text: string;
  tag: string;
  attributes: Record<string, string>;
  position: { x: number; y: number };
  size: { width: number; height: number };
  styles: Record<string, string>;
  isVisible: boolean;
  isInViewport: boolean;
}

interface ContextData {
  pageType: string;
  url: string;
  title: string;
  viewport: { width: number; height: number };
  scrollPosition: { x: number; y: number };
  nearbyElements: ElementData[];
  parentChain: ElementData[];
  siblings: ElementData[];
  domSnapshot: string;
  userIntent: string;
}

interface TrainingData {
  prompt: string;
  completion: {
    action: string;
    element: ElementData;
    reasoning: string;
  };
  metadata: {
    difficulty: 'easy' | 'medium' | 'hard';
    patternType: string;
    trainingValue: number;
  };
}
```

## Configuration Files

### package.json (Backend)
```json
{
  "name": "codesight-enhanced-backend",
  "version": "1.0.0",
  "description": "Enhanced CodeSight Backend for AI Training Data",
  "main": "dist/server.js",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "jest",
    "migrate": "prisma migrate dev",
    "generate": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "express": "^4.18.0",
    "ws": "^8.13.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "express-rate-limit": "^6.7.0",
    "jsonwebtoken": "^9.0.0",
    "zod": "^3.21.0",
    "winston": "^3.8.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "@types/ws": "^8.5.0",
    "typescript": "^5.0.0",
    "tsx": "^3.12.0",
    "jest": "^29.0.0",
    "prisma": "^5.0.0"
  }
}
```

### manifest.json (Extension)
```json
{
  "manifest_version": 3,
  "name": "CodeSight Enhanced Tracker",
  "version": "1.0.0",
  "description": "AI Training Data Collector - Enhanced Version",
  "permissions": [
    "activeTab",
    "storage",
    "background"
  ],
  "host_permissions": [
    "https://*/*",
    "http://*/*"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-script.js"],
      "run_at": "document_start"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "CodeSight Enhanced Tracker"
  },
  "web_accessible_resources": [
    {
      "resources": ["assets/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

## Implementation TODO List

### Phase 1: Foundation Setup
- [ ] Create project directory structure
- [ ] Set up enhanced-backend package.json and dependencies
- [ ] Configure TypeScript and build system
- [ ] Set up enhanced-extension manifest and structure
- [ ] Create shared types and interfaces
- [ ] Set up testing framework (Jest)
- [ ] Configure linting and formatting (ESLint, Prettier)
- [ ] Set up CI/CD pipeline configuration

### Phase 2: Database & Backend Core
- [ ] Design and implement Prisma schema for enhanced tables
- [ ] Create database connection and models
- [ ] Implement SessionManager service
- [ ] Implement DataProcessor service
- [ ] Implement QualityController service
- [ ] Implement TrainingExporter service
- [ ] Create WebSocket server with enhanced message handling
- [ ] Build REST API routes for sessions, interactions, training
- [ ] Add authentication and authorization middleware
- [ ] Implement rate limiting and security headers

### Phase 3: Browser Extension
- [ ] Create enhanced content script with ElementAnalyzer
- [ ] Implement ContextCollector for rich context data
- [ ] Build TrainingDataBuilder for prompt/completion generation
- [ ] Create background script for session management
- [ ] Implement WebSocket communication layer
- [ ] Build popup UI for session control
- [ ] Add privacy filtering and sensitive data protection
- [ ] Implement local storage for session persistence
- [ ] Add error handling and reconnection logic

### Phase 4: Data Processing & Quality
- [ ] Implement interaction data processing pipeline
- [ ] Create training data generation algorithms
- [ ] Build quality assessment scoring system
- [ ] Implement automated quality reporting
- [ ] Create training data validation system
- [ ] Add data export functionality (JSONL/JSON)
- [ ] Build quality threshold management
- [ ] Implement session analytics and reporting

### Phase 5: Testing & Validation
- [ ] Write unit tests for all backend services
- [ ] Create integration tests for data flow
- [ ] Build end-to-end tests for extension functionality
- [ ] Implement load testing for concurrent sessions
- [ ] Create quality validation test suite
- [ ] Add performance benchmarking
- [ ] Build data quality comparison tools
- [ ] Create training data effectiveness tests

### Phase 6: Deployment & Production
- [ ] Set up Railway deployment configuration
- [ ] Create production environment variables
- [ ] Implement health checks and monitoring
- [ ] Set up logging and error tracking
- [ ] Create deployment scripts and automation
- [ ] Build backup and disaster recovery procedures
- [ ] Implement database migration scripts
- [ ] Add performance monitoring and alerts

### Phase 7: Documentation & Training
- [ ] Write comprehensive API documentation
- [ ] Create deployment and setup guides
- [ ] Build troubleshooting documentation
- [ ] Create system architecture diagrams
- [ ] Write user guides for extension usage
- [ ] Document data quality standards
- [ ] Create training data format specifications
- [ ] Build comparison analysis with current system

### Phase 8: Optimization & Scaling
- [ ] Optimize database queries and indexes
- [ ] Implement caching strategies
- [ ] Add horizontal scaling capabilities
- [ ] Optimize WebSocket connection handling
- [ ] Implement data archiving and cleanup
- [ ] Add batch processing optimizations
- [ ] Create performance tuning guidelines
- [ ] Build monitoring and alerting system

This structure provides a complete roadmap for building the Enhanced CodeSight Tracker System as a parallel system optimized for AI training data collection.