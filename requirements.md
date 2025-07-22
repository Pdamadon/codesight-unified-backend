# REQUIREMENTS: Unified CodeSight Data Pipeline

## 1. Security & Privacy
- All incoming data must be validated against strict schemas (backend and extension).
- Backend must enforce privacy filtering/redaction of PII (emails, passwords, credit cards, etc.) regardless of client-side filtering.
- API keys and secrets must be managed securely (never hardcoded, use secret management).
- All sensitive data must be encrypted at rest and in transit.
- CORS must be strictly limited to trusted origins in production.
- All logs must redact or mask PII.
- Rate limiting and brute-force protection must be enforced on all authentication endpoints.

## 2. Data Integrity & Reliability
- All event and session data must be persisted reliably (no in-memory-only queues for critical data).
- Persistent, retryable queues must be used for all data transmission (extension <-> backend, backend <-> S3/OpenAI).
- All database writes must use transactions where appropriate.
- Circuit breakers and retries must be implemented for all external service calls (OpenAI, S3, etc.).
- All data must be versioned and auditable.

## 3. Scalability & Performance
- All job queues must have size limits and backpressure handling.
- Database must have indexes on all frequently queried fields.
- Large file uploads must be streamed, not buffered in memory.
- All services must expose health checks and metrics endpoints.

## 4. Code Quality & Maintainability
- All large files/services must be split into focused modules.
- All business logic must be covered by unit and integration tests.
- All error responses must be standardized.
- All configuration must be centralized and validated at startup.

## 5. Extension-Specific
- All captured data must be privacy-filtered before leaving the browser.
- The extension must persist unsent data locally and retry transmission until successful.
- The background script must be the single source of truth for session state.
- The extension must use a strict Content Security Policy.

## 6. Monitoring & Alerting
- All critical errors and security events must be logged and trigger alerts.
- All queues, storage, and external service usage must be monitored.