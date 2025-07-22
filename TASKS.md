# TASKS: Unified CodeSight Pipeline Hardening & Refactor

## 1. Security & Privacy
- [ ] Implement backend privacy filtering/redaction utility and integrate into all ingestion endpoints
- [ ] Enforce schema validation (Joi/Zod) on all incoming data (HTTP and WebSocket)
- [ ] Implement API key management and rate limiting for all sensitive endpoints
- [ ] Audit and restrict CORS configuration for production
- [ ] Ensure all logs redact/mask PII
- [ ] Enforce encryption at rest for all sensitive data (DB, S3)

## 2. Backend Reliability & Scalability
- [ ] Replace in-memory job queues with persistent queue (e.g., Redis/BullMQ)
- [ ] Add queue size limits and backpressure handling
- [ ] Add circuit breakers and retries for all external service calls (OpenAI, S3)
- [ ] Add database indexes for all frequently queried fields
- [ ] Refactor large service files into smaller modules
- [ ] Standardize error response format across all endpoints
- [ ] Centralize and validate all configuration at startup
- [ ] Add health check and metrics endpoints for all services

## 3. Extension Robustness
- [ ] Implement persistent, retryable queue for event data in background script
- [ ] Make background script the single source of truth for session state
- [ ] Enforce privacy filtering in content script before sending data
- [ ] Add strict Content Security Policy to manifest
- [ ] Add error handling and user feedback for failed transmissions

## 4. Testing & Monitoring
- [ ] Add unit and integration tests for all business logic (privacy, validation, queueing)
- [ ] Add end-to-end tests simulating full data flow (extension -> backend -> S3/OpenAI)
- [ ] Add monitoring and alerting for all critical errors and queue overflows

## 5. Documentation & DevOps
- [ ] Document all configuration and environment variables
- [ ] Document new queueing and error handling strategies
- [ ] Add runbooks for common failure scenarios 