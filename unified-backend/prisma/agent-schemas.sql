-- Agent 1 & Agent 2 Database Schemas
-- Add these to your existing Prisma schema.prisma file

-- =============================================
-- AGENT 1: SITE COMPREHENSION DATA
-- =============================================

model Agent1SiteModel {
  id              String   @id @default(uuid())
  
  -- Site identification
  domain          String   
  subdomain       String?
  siteType        SiteType @default(UNKNOWN)
  
  -- Site architecture analysis
  urlPatterns     Json     @default("[]")     -- Common URL structures
  pageTypes       Json     @default("[]")     -- Available page types
  navigationFlows Json     @default("[]")     -- Common user flows
  
  -- Page classification patterns  
  pageTypeRules   Json     @default("{}")     -- Rules for classifying pages
  layoutPatterns  Json     @default("{}")     -- Common layout structures
  semanticZones   Json     @default("{}")     -- Identified semantic areas
  
  -- Business understanding
  conversionFlows Json     @default("[]")     -- Purchase/signup flows
  businessGoals   Json     @default("[]")     -- Site objectives
  userIntentTypes Json     @default("[]")     -- Common user goals
  
  -- Performance metrics
  analysisCount   Int      @default(0)       -- How many times analyzed
  successRate     Float    @default(0)       -- Navigation success rate
  lastAnalyzed    DateTime @default(now())
  confidence      Float    @default(0)       -- Overall model confidence
  
  -- Relationships
  pageAnalyses    Agent1PageAnalysis[]
  journeyPlans    Agent1JourneyPlan[]
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@unique([domain, subdomain])
  @@index([siteType])
  @@index([confidence])
  @@map("agent1_site_models")
}

model Agent1PageAnalysis {
  id              String   @id @default(uuid())
  siteModelId     String
  
  -- Page identification
  url             String
  pageType        String   -- homepage, category, product, checkout, etc.
  pageTitle       String?
  
  -- Page analysis results
  semanticZones   Json     @default("[]")     -- Navigation, content, sidebar zones
  keyElements     Json     @default("[]")     -- Important interactive elements
  contentStructure Json   @default("{}")     -- How content is organized
  
  -- Navigation context
  entryPoints     Json     @default("[]")     -- How users typically arrive
  exitPoints      Json     @default("[]")     -- Where users typically go next
  conversionOps   Json     @default("[]")     -- Available conversion actions
  
  -- Quality metrics
  analysisScore   Float    @default(0)
  completeness    Float    @default(0)
  reliability     Float    @default(0)
  
  analyzedAt      DateTime @default(now())
  siteModel       Agent1SiteModel @relation(fields: [siteModelId], references: [id], onDelete: Cascade)
  
  @@index([siteModelId, pageType])
  @@index([url])
  @@map("agent1_page_analyses")
}

model Agent1JourneyPlan {
  id              String   @id @default(uuid())
  siteModelId     String
  
  -- Journey definition
  userIntent      String   -- What user wants to accomplish
  goalType        GoalType -- purchase, research, browse, account
  startingPage    String?  -- Where journey typically begins
  
  -- Navigation plan
  plannedSteps    Json     @default("[]")     -- Step-by-step navigation plan
  alternativePaths Json    @default("[]")     -- Backup routes
  successCriteria Json     @default("[]")     -- How to know if successful
  
  -- Performance tracking
  planUsedCount   Int      @default(0)
  successCount    Int      @default(0)
  failureCount    Int      @default(0)
  avgDuration     Float?   -- Average completion time
  
  -- Quality metrics
  planConfidence  Float    @default(0)
  lastUsed        DateTime?
  
  createdAt       DateTime @default(now())
  siteModel       Agent1SiteModel @relation(fields: [siteModelId], references: [id], onDelete: Cascade)
  
  @@index([siteModelId, goalType])
  @@index([userIntent])
  @@map("agent1_journey_plans")
}

-- =============================================
-- AGENT 2: CLICK EXECUTION DATA  
-- =============================================

model Agent2ElementMap {
  id              String   @id @default(uuid())
  
  -- Element identification
  domain          String
  pageType        String   -- product, category, checkout, etc.
  elementPurpose  String   -- add-to-cart, navigation, filter, etc.
  
  -- Selector strategies
  primarySelector String   -- Most reliable selector
  backupSelectors Json     @default("[]")     -- Fallback options
  selectorType    SelectorType @default(XPATH) -- xpath, css, text, etc.
  
  -- Reliability tracking
  reliability     Float    @default(0)        -- Success rate (0-1)
  usageCount      Int      @default(0)        -- How many times tried
  successCount    Int      @default(0)        -- How many times worked
  failureCount    Int      @default(0)        -- How many times failed
  
  -- Context requirements
  spatialContext  Json     @default("{}")     -- Required nearby elements
  stateContext    Json     @default("{}")     -- Required page state
  timingContext   Json     @default("{}")     -- Timing requirements
  
  -- Element details
  elementType     String   -- button, input, link, etc.
  expectedText    String?  -- Expected element text
  visualProps     Json     @default("{}")     -- Size, position patterns
  
  -- Performance metrics
  avgResponseTime Float?   -- Average click response time
  lastUsed        DateTime?
  lastUpdated     DateTime @default(now())
  
  -- Relationships
  interactions    Agent2Interaction[]
  
  @@index([domain, pageType, elementPurpose])
  @@index([reliability])
  @@index([usageCount])
  @@map("agent2_element_maps")
}

model Agent2Interaction {
  id                String   @id @default(uuid())
  elementMapId      String
  sessionId         String?  -- Link to original session if available
  
  -- Interaction details
  actionType        ActionType @default(CLICK) -- click, input, scroll, etc.
  selectorUsed      String   -- Which selector was actually used
  coordinatesUsed   Json?    -- x,y if coordinates were used
  
  -- Context at time of interaction
  pageUrl           String
  pageState         Json     @default("{}")     -- Page state when clicked
  nearbyElements    Json     @default("[]")     -- What was around element
  
  -- Result tracking
  success           Boolean  @default(false)
  errorMessage      String?  -- If failed, what went wrong
  responseTime      Float?   -- How long click took
  stateChangeResult Json?    -- What changed after click
  
  -- Quality metrics
  confidence        Float    @default(0)
  
  executedAt        DateTime @default(now())
  elementMap        Agent2ElementMap @relation(fields: [elementMapId], references: [id], onDelete: Cascade)
  
  @@index([elementMapId, success])
  @@index([sessionId])
  @@index([executedAt])
  @@map("agent2_interactions")
}

model Agent2Strategy {
  id              String   @id @default(uuid())
  
  -- Strategy identification
  domain          String
  strategyType    StrategyType @default(STANDARD) -- standard, fallback, recovery
  contextType     String   -- page-load, after-scroll, modal-present, etc.
  
  -- Strategy definition
  name            String   -- Human readable name
  description     String?  -- What this strategy does
  conditions      Json     @default("[]")     -- When to use this strategy
  actions         Json     @default("[]")     -- Step-by-step actions
  
  -- Success metrics
  usageCount      Int      @default(0)
  successRate     Float    @default(0)
  avgDuration     Float?   -- Average execution time
  
  -- Quality tracking
  confidence      Float    @default(0)
  lastUsed        DateTime?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([domain, strategyType])
  @@index([successRate])
  @@map("agent2_strategies")
}

-- =============================================
-- SHARED AGENT DATA
-- =============================================

model AgentPerformanceLog {
  id              String   @id @default(uuid())
  
  -- Agent identification
  agentType       AgentType -- SITE_COMPREHENSION or CLICK_EXECUTION
  agentVersion    String    @default("1.0")
  
  -- Task context
  taskId          String?   -- If part of a larger task
  sessionId       String?   -- Related session
  domain          String    -- What site was this on
  
  -- Performance data
  taskType        String    -- navigation-planning, element-click, etc.
  success         Boolean   @default(false)
  duration        Float?    -- How long it took
  confidence      Float?    -- Agent's confidence in result
  
  -- Results
  inputData       Json      @default("{}")     -- What agent received
  outputData      Json      @default("{}")     -- What agent produced
  errorData       Json?     -- If failed, error details
  
  -- Quality metrics
  accuracyScore   Float?    -- If verifiable, how accurate
  userSatisfied   Boolean?  -- User feedback if available
  
  executedAt      DateTime  @default(now())
  
  @@index([agentType, domain])
  @@index([success, executedAt])
  @@index([taskType])
  @@map("agent_performance_logs")
}

-- =============================================
-- ENUMS FOR AGENT SYSTEM
-- =============================================

enum SiteType {
  ECOMMERCE
  SAAS  
  CONTENT
  CORPORATE
  MARKETPLACE
  SOCIAL
  UNKNOWN
}

enum GoalType {
  PURCHASE
  RESEARCH  
  BROWSE
  ACCOUNT
  SUPPORT
  ONBOARDING
  COMPARISON
  UNKNOWN
}

enum SelectorType {
  XPATH
  CSS
  TEXT
  ARIA_LABEL
  DATA_TESTID
  ID
  CLASS
  COORDINATES
}

enum ActionType {
  CLICK
  INPUT
  SCROLL
  HOVER
  DRAG
  DROP
  KEY_PRESS
  FORM_SUBMIT
  WAIT
}

enum StrategyType {
  STANDARD
  FALLBACK
  RECOVERY
  EXPERIMENTAL
}

enum AgentType {
  SITE_COMPREHENSION
  CLICK_EXECUTION
}

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Additional composite indexes for common queries
-- @@index([domain, siteType, confidence]) on Agent1SiteModel
-- @@index([domain, pageType, reliability]) on Agent2ElementMap  
-- @@index([agentType, domain, success]) on AgentPerformanceLog