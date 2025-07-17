# Design Document

## Overview

The Unified CodeSight System consolidates the existing crowdsource collector and training collector into a single, efficient pipeline. The system captures human shopping behavior through an enhanced browser extension, processes it in real-time through a unified backend, and automatically generates high-quality training data for OpenAI fine-tuning.

Key design principles:
- **Single Source of Truth**: One database, one API, one processing pipeline
- **Extension-First**: Eliminate video recording, rely on intelligent screenshot capture
- **Real-time Processing**: Stream data processing with immediate feedback
- **Cost Optimization**: 90%+ storage reduction through compression and smart archiving
- **Quality Focus**: Automated validation and quality scoring throughout the pipeline

## Architecture

### High-Level System Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Browser Extension │    │   Unified Backend   │    │   External Services │
│                     │    │                     │    │                     │
│ ┌─────────────────┐ │    │ ┌─────────────────┐ │    │ ┌─────────────────┐ │
│ │ Enhanced Content│ │    │ │ WebSocket Server│ │    │ │   OpenAI API    │ │
│ │ Script          │ │◄──►│ │                 │ │◄──►│ │ Fine-tuning     │ │
│ └─────────────────┘ │    │ └─────────────────┘ │    │ └─────────────────┘ │
│ ┌─────────────────┐ │    │ ┌─────────────────┐ │    │ ┌─────────────────┐ │
│ │ Background      │ │    │ │ Data Processing │ │    │ │   AWS S3        │ │
│ │ Service Worker  │ │    │ │ Pipeline        │ │    │ │ Compressed      │ │
│ └─────────────────┘ │    │ └─────────────────┘ │    │ │ Archives        │ │
│ ┌─────────────────┐ │    │ ┌─────────────────┐ │    │ └─────────────────┘ │
│ │ Screenshot      │ │    │ │ Quality Control │ │    │ ┌─────────────────┐ │
│ │ Capture         │ │    │ │ & Validation    │ │    │ │   PostgreSQL    │ │
│ └─────────────────┘ │    │ └─────────────────┘ │    │ │ Unified Schema  │ │
└─────────────────────┘    └─────────────────────┘    │ └─────────────────┘ │
                                                      └─────────────────────┘
```

### Data Flow Architecture

```
1. User Interaction
   ↓
2. Extension Capture (Screenshots + Context)
   ↓
3. Real-time WebSocket Stream
   ↓
4. Backend Processing Pipeline
   ├── Data Validation
   ├── Quality Scoring
   ├── Context Enhancement
   └── Training Data Generation
   ↓
5. Storage & Archiving
   ├── Compressed Archives → S3
   ├── Metadata → PostgreSQL
   └── Training Files → OpenAI
   ↓
6. Model Training & Deployment
```

## Components and Interfaces

### 1. Enhanced Browser Extension

#### Content Script Enhancement
```typescript
interface EnhancedTracker {
  // Core tracking capabilities
  captureInteraction(event: InteractionEvent): Promise<EnhancedInteractionData>;
  captureScreenshot(trigger: ScreenshotTrigger): Promise<Screenshot>;
  analyzePageContext(): PageContext;
  
  // Advanced features
  generateMultipleSelectors(element: Element): SelectorSet;
  detectPageStructure(): PageStructure;
  captureFormInteractions(form: HTMLFormElement): FormData;
  
  // Quality control
  validateDataQuality(): QualityMetrics;
  compressData(): CompressedData;
}

interface EnhancedInteractionData {
  // Basic interaction data
  type: 'click' | 'input' | 'scroll' | 'navigation';
  timestamp: number;
  coordinates: Coordinates;
  
  // Enhanced selector data
  selectors: {
    primary: string;
    alternatives: string[];
    xpath: string;
    cssPath: string;
    reliability: SelectorReliability[];
  };
  
  // Rich context
  context: {
    pageStructure: PageStructure;
    nearbyElements: NearbyElement[];
    domHierarchy: DOMHierarchy;
    visualContext: VisualContext;
  };
  
  // Screenshots
  screenshots: {
    before: Screenshot;
    after?: Screenshot;
    burst?: Screenshot[];
  };
  
  // State tracking
  stateChanges: StateChange[];
  userIntent: string;
}
```

#### Background Service Worker
```typescript
interface UnifiedBackgroundService {
  // WebSocket management
  connectToBackend(url: string): Promise<boolean>;
  streamData(data: InteractionData): void;
  handleBackendMessages(message: BackendMessage): void;
  
  // Screenshot management
  captureScreenshot(trigger: ScreenshotTrigger): Promise<Screenshot>;
  compressScreenshots(screenshots: Screenshot[]): Promise<CompressedScreenshots>;
  manageScreenshotQueue(): void;
  
  // Session management
  startSession(config: SessionConfig): Promise<string>;
  stopSession(sessionId: string): Promise<SessionSummary>;
  syncSessionData(): Promise<void>;
}
```

### 2. Unified Backend Service

#### WebSocket Server
```typescript
interface UnifiedWebSocketServer {
  // Connection management
  handleConnection(socket: WebSocket): void;
  authenticateConnection(socket: WebSocket): Promise<boolean>;
  manageSessionState(sessionId: string): SessionState;
  
  // Data streaming
  processIncomingData(data: StreamData): Promise<void>;
  validateStreamData(data: StreamData): ValidationResult;
  broadcastUpdates(sessionId: string, update: Update): void;
  
  // Real-time processing
  triggerDataProcessing(sessionId: string): Promise<void>;
  streamProcessingUpdates(sessionId: string): void;
}
```

#### Data Processing Pipeline
```typescript
interface DataProcessingPipeline {
  // Core processing
  processSession(sessionId: string): Promise<ProcessingResult>;
  validateData(sessionData: SessionData): ValidationResult;
  enhanceContext(interactions: Interaction[]): EnhancedInteraction[];
  
  // Quality control
  calculateQualityScore(session: SessionData): QualityScore;
  identifyDataGaps(session: SessionData): DataGap[];
  suggestImprovements(session: SessionData): Improvement[];
  
  // Training data generation
  generateTrainingData(session: SessionData): TrainingData;
  formatForOpenAI(trainingData: TrainingData): JSONLData;
  validateTrainingFormat(data: JSONLData): boolean;
  
  // Vision analysis
  analyzeScreenshots(screenshots: Screenshot[]): VisionAnalysis;
  extractUserIntent(visionAnalysis: VisionAnalysis): UserIntent;
  identifyNavigationPatterns(interactions: Interaction[]): NavigationPattern[];
}
```

#### Storage Management
```typescript
interface UnifiedStorageManager {
  // Archive management
  createSessionArchive(sessionId: string): Promise<Archive>;
  compressArchive(archive: Archive): Promise<CompressedArchive>;
  uploadToS3(archive: CompressedArchive): Promise<S3Location>;
  
  // Database operations
  storeSessionMetadata(session: SessionMetadata): Promise<void>;
  updateProcessingStatus(sessionId: string, status: ProcessingStatus): Promise<void>;
  querySessionData(filters: QueryFilters): Promise<SessionData[]>;
  
  // Lifecycle management
  archiveOldSessions(cutoffDate: Date): Promise<ArchiveResult>;
  cleanupTempFiles(): Promise<void>;
  optimizeStorage(): Promise<OptimizationResult>;
}
```

### 3. OpenAI Integration Service

```typescript
interface OpenAIIntegrationService {
  // File management
  uploadTrainingFile(data: JSONLData, metadata: FileMetadata): Promise<string>;
  validateTrainingFile(fileId: string): Promise<ValidationResult>;
  
  // Model training
  createFineTuningJob(fileId: string, config: TrainingConfig): Promise<string>;
  monitorTraining(jobId: string): Promise<TrainingStatus>;
  handleTrainingCompletion(jobId: string): Promise<ModelInfo>;
  
  // Model testing
  testModel(modelId: string, testCases: TestCase[]): Promise<TestResults>;
  benchmarkPerformance(modelId: string): Promise<BenchmarkResults>;
  
  // Vision analysis
  analyzeScreenshots(screenshots: Screenshot[]): Promise<VisionAnalysis>;
  extractUserPsychology(analysis: VisionAnalysis): Promise<UserPsychology>;
}
```

## Data Models

### Unified Session Schema
```typescript
interface UnifiedSession {
  // Core identification
  id: string;
  type: 'human' | 'automated' | 'hybrid';
  status: 'active' | 'processing' | 'completed' | 'failed';
  
  // Session metadata
  startTime: Date;
  endTime?: Date;
  duration?: number;
  
  // Data references
  archiveUrl?: string;
  trainingFileId?: string;
  modelId?: string;
  
  // Quality metrics
  qualityScore: number;
  completeness: number;
  reliability: number;
  
  // Processing status
  processingSteps: ProcessingStep[];
  errors: ProcessingError[];
  
  // Training results
  trainingMetrics?: TrainingMetrics;
  modelPerformance?: ModelPerformance;
}

interface InteractionData {
  // Core data
  sessionId: string;
  timestamp: number;
  type: InteractionType;
  
  // Element identification
  selectors: SelectorSet;
  element: ElementData;
  
  // Context
  pageContext: PageContext;
  visualContext: VisualContext;
  userContext: UserContext;
  
  // Screenshots
  screenshots: Screenshot[];
  
  // Quality metrics
  confidence: number;
  reliability: number;
}

interface TrainingData {
  // OpenAI format
  messages: OpenAIMessage[];
  
  // Enhanced data
  visionAnalysis: VisionAnalysis;
  userPsychology: UserPsychology;
  navigationStrategy: NavigationStrategy;
  
  // Technical data
  selectorReliability: SelectorTest[];
  pageStructure: PageStructure;
  
  // Quality metrics
  trainingValue: number;
  complexity: number;
}
```

### Archive Format
```typescript
interface SessionArchive {
  // Metadata
  sessionId: string;
  version: string;
  createdAt: Date;
  
  // Core data files
  interactions: 'interactions.json';
  screenshots: 'screenshots/';
  audio?: 'audio.webm';
  
  // Processed data
  trainingData: 'training.jsonl';
  visionAnalysis: 'vision-analysis.json';
  qualityReport: 'quality-report.json';
  
  // Manifest
  manifest: {
    files: FileManifest[];
    checksums: Record<string, string>;
    compression: CompressionInfo;
  };
}
```

## Error Handling

### Error Categories
1. **Data Collection Errors**
   - Extension failures
   - Network connectivity issues
   - Browser compatibility problems

2. **Processing Errors**
   - Data validation failures
   - Quality threshold violations
   - Storage/upload failures

3. **Training Errors**
   - OpenAI API failures
   - Training data format issues
   - Model training failures

### Error Recovery Strategy
```typescript
interface ErrorRecoveryStrategy {
  // Retry logic
  retryWithBackoff(operation: Operation, maxRetries: number): Promise<Result>;
  
  // Graceful degradation
  fallbackToBasicCapture(error: CaptureError): BasicCaptureMode;
  
  // Data recovery
  recoverPartialSession(sessionId: string): Promise<RecoveryResult>;
  
  // User notification
  notifyUserOfIssues(issues: Issue[]): void;
}
```

## Testing Strategy

### Unit Testing
- Individual component functionality
- Data validation logic
- Error handling scenarios
- Performance benchmarks

### Integration Testing
- End-to-end data flow
- WebSocket communication
- OpenAI API integration
- Storage operations

### Performance Testing
- Concurrent session handling
- Large data processing
- Memory usage optimization
- Network efficiency

### Quality Assurance
- Data accuracy validation
- Training data quality
- Model performance testing
- User experience validation

## Security Considerations

### Data Protection
- Automatic PII detection and masking
- Encrypted data transmission (WSS/HTTPS)
- Encrypted storage at rest
- Access control and authentication

### Privacy Compliance
- GDPR compliance for EU users
- CCPA compliance for California users
- Data retention policies
- User consent management

### Security Monitoring
- Intrusion detection
- Anomaly monitoring
- Audit logging
- Incident response procedures

## Performance Optimization

### Storage Optimization
- WebP screenshot compression (60-80% size reduction)
- ZIP archive compression (additional 20-30% reduction)
- S3 intelligent tiering for cost optimization
- Automatic cleanup of temporary files

### Processing Optimization
- Parallel processing of multiple sessions
- Streaming data processing to reduce memory usage
- Caching of frequently accessed data
- Database query optimization

### Network Optimization
- WebSocket connection pooling
- Data compression for transmission
- CDN usage for static assets
- Efficient retry mechanisms

## Monitoring and Observability

### Key Metrics
- Session completion rates
- Data quality scores
- Processing times
- Storage costs
- Model training success rates

### Alerting
- System health monitoring
- Error rate thresholds
- Performance degradation alerts
- Cost optimization opportunities

### Logging
- Structured logging with correlation IDs
- Performance metrics collection
- Error tracking and analysis
- User behavior analytics

## Deployment Strategy

### Infrastructure
- Containerized services using Docker
- Kubernetes orchestration for scalability
- Auto-scaling based on demand
- Multi-region deployment for reliability

### CI/CD Pipeline
- Automated testing on all commits
- Staged deployment (dev → staging → production)
- Blue-green deployment for zero downtime
- Automated rollback on failures

### Configuration Management
- Environment-specific configurations
- Secret management using secure vaults
- Feature flags for gradual rollouts
- A/B testing capabilities