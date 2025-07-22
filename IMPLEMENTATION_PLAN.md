# IMPLEMENTATION PLAN: Unified CodeSight Pipeline Hardening & Refactor

## 1. Security & Privacy
### 1.1 Backend Privacy Filtering
- **Steps:**
  - Create `src/services/privacy-filter.ts` with robust PII detection (use `pii-redact` or similar)
  - Integrate privacy filter into all ingestion endpoints (HTTP, WebSocket)
  - Add unit tests for all redaction cases
- **Dependencies:** None
- **Validation:** Test with known PII payloads, verify redaction in DB and logs

### 1.2 Schema Validation
- **Steps:**
  - Define Joi/Zod schemas for all event/session types in `src/schemas/`
  - Add validation middleware to all routes and WebSocket handlers
  - Add tests for invalid/malformed payloads
- **Dependencies:** None
- **Validation:** All invalid payloads are rejected with clear errors

### 1.3 API Key Management & Rate Limiting
- **Steps:**
  - Implement API key storage/rotation in DB
  - Add middleware to check API key and enforce rate limits
  - Add brute-force protection (e.g., express-rate-limit)
- **Dependencies:** None
- **Validation:** Test with valid/invalid keys, verify rate limiting

### 1.4 CORS & Logging
- **Steps:**
  - Restrict CORS origins in production config
  - Update logger to mask/redact PII fields
- **Dependencies:** None
- **Validation:** Only trusted origins allowed; logs never contain PII

### 1.5 Encryption at Rest
- **Steps:**
  - Ensure DB and S3 buckets use encryption
  - Audit code for plaintext storage of sensitive data
- **Dependencies:** None
- **Validation:** All sensitive data is encrypted at rest

## 2. Backend Reliability & Scalability
### 2.1 Persistent Job Queue
- **Steps:**
  - Integrate BullMQ/Redis for job queueing (`src/queue/`)
  - Refactor pipeline to use persistent queue
  - Add queue size limits and backpressure
- **Dependencies:** Redis
- **Validation:** Jobs survive restarts, queue never grows unbounded

### 2.2 Circuit Breakers & Retries
- **Steps:**
  - Wrap all external service calls (OpenAI, S3) with retry/circuit breaker logic (use `opossum` or similar)
- **Dependencies:** None
- **Validation:** Simulate failures, verify fallback/retry

### 2.3 Database Indexes
- **Steps:**
  - Add missing indexes in `prisma/schema.prisma`
  - Run migrations
- **Dependencies:** None
- **Validation:** Query performance improves, no slow queries

### 2.4 Refactor Large Services
- **Steps:**
  - Split `openai-integration.ts`, `data-processing-pipeline.ts` into smaller modules
  - Update imports and tests
- **Dependencies:** None
- **Validation:** Code is modular, easier to test/maintain

### 2.5 Error Response & Config
- **Steps:**
  - Standardize error response format in all routes
  - Centralize config in `src/config.ts`, validate at startup
- **Dependencies:** None
- **Validation:** All errors are consistent, misconfigurations fail fast

### 2.6 Health Checks & Metrics
- **Steps:**
  - Add `/metrics` endpoint (Prometheus format)
  - Add health checks for all dependencies
- **Dependencies:** None
- **Validation:** Monitoring tools can scrape metrics

## 3. Extension Robustness
### 3.1 Persistent Event Queue
- **Steps:**
  - Implement persistent queue in background script using `chrome.storage.local`
  - Add retry logic and offline support
- **Dependencies:** None
- **Validation:** No data loss on network failure or browser restart

### 3.2 Session State Management
- **Steps:**
  - Refactor to make background script the source of truth
  - Sync state with content scripts on load
- **Dependencies:** None
- **Validation:** No state desync between scripts

### 3.3 Privacy Filtering & CSP
- **Steps:**
  - Strengthen privacy filtering in content script
  - Add strict CSP to manifest
- **Dependencies:** None
- **Validation:** No PII leaves browser; extension passes CSP audits

### 3.4 Error Handling & Feedback
- **Steps:**
  - Add user feedback for failed transmissions
  - Log errors for diagnostics
- **Dependencies:** None
- **Validation:** Users are notified of issues, errors are traceable

## 4. Testing & Monitoring
### 4.1 Automated Testing
- **Steps:**
  - Add unit/integration tests for all new logic
  - Add e2e tests for full data flow
- **Dependencies:** Jest, Playwright
- **Validation:** All tests pass, coverage >90%

### 4.2 Monitoring & Alerting
- **Steps:**
  - Integrate with monitoring/alerting (e.g., Prometheus, Grafana, Sentry)
  - Set up alerts for queue overflows, critical errors
- **Dependencies:** Monitoring stack
- **Validation:** Alerts fire on issues

## 5. Documentation & DevOps
### 5.1 Documentation
- **Steps:**
  - Document all config/env vars in `README.md` or `CONFIG.md`
  - Document queueing/error handling strategies
  - Add runbooks for common failures
- **Dependencies:** None
- **Validation:** Onboarding is easy, ops can handle incidents 