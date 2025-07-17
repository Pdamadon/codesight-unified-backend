# CodeSight Fix Checklist

## 🚨 CRITICAL - Fix Immediately (Blocks Functionality)

### Browser Extension
- [ ] **Remove duplicate code block** in content-script.js (lines 1869-2274)
- [ ] **Create missing files:**
  - [ ] popup.html
  - [ ] options.html  
  - [ ] icons/icon-16.png
  - [ ] icons/icon-32.png
  - [ ] icons/icon-48.png
  - [ ] icons/icon-128.png
  - [ ] injected-script.js
- [ ] **Fix manifest.json module type** - remove `"type": "module"` from line 25
- [ ] **Add package.json** for browser extension

### Backend
- [ ] **Fix duplicate imports** in openai-integration.ts
- [ ] **Fix websocketServer variable** - declared after use in server.ts
- [ ] **Remove hardcoded JWT secret** in auth.ts (line 163) - require env var
- [ ] **Fix missing PrismaClient singleton** - multiple instances created

## 🔴 HIGH PRIORITY - Security Vulnerabilities

### Authentication & Authorization
- [ ] Remove hardcoded JWT fallback ('your-secret-key')
- [ ] Add JWT_SECRET validation on startup
- [ ] Implement refresh token mechanism
- [ ] Add rate limiting to auth endpoints

### Browser Extension Security
- [ ] **Narrow host permissions** - replace `"https://*/*"` with specific domains
- [ ] **Add Content Security Policy** to manifest.json
- [ ] **Enhance sensitive data detection** - add more selectors for:
  - [ ] Bank account numbers
  - [ ] Routing numbers
  - [ ] API keys
  - [ ] OAuth tokens

### API Security
- [ ] **Add input validation middleware** for all endpoints
- [ ] **Sanitize error messages** to prevent info leakage
- [ ] **Add request size limits**
- [ ] **Implement CORS properly** with specific origins
- [ ] **Add API rate limiting** per user/IP

## 🟠 HIGH PRIORITY - Memory Leaks & Performance

### WebSocket Memory Leaks
- [ ] Implement proper client cleanup in websocket-server.ts
- [ ] Add connection timeout handling
- [ ] Implement max connections limit
- [ ] Clean up event listeners on disconnect

### Browser Extension Memory Issues
- [ ] **Add limits to arrays:**
  - [ ] screenshotQueue (max 100)
  - [ ] activeSessions (max 50)
  - [ ] events array (max 1000)
- [ ] **Implement periodic cleanup** for chrome.storage
- [ ] **Fix event listener cleanup** on page navigation
- [ ] **Add memory monitoring**

### Backend Memory Management
- [ ] Fix in-memory rate limiter cleanup
- [ ] Add connection pooling limits for Prisma
- [ ] Implement queue size limits
- [ ] Add memory usage monitoring

## 🟡 MEDIUM PRIORITY - Error Handling & Reliability

### Missing Error Boundaries
- [ ] Add try-catch to all async route handlers
- [ ] Implement error timeouts for external services
- [ ] Add circuit breakers for:
  - [ ] OpenAI API calls
  - [ ] S3 operations
  - [ ] Database queries
- [ ] Implement retry logic with exponential backoff

### Database Issues
- [ ] **Add transaction boundaries** for multi-step operations
- [ ] **Implement proper rollback handling**
- [ ] **Add connection retry logic**
- [ ] **Create missing indexes** for frequently queried fields

### WebSocket Reliability
- [ ] Implement reconnection logic
- [ ] Add heartbeat/ping-pong mechanism
- [ ] Handle connection state properly
- [ ] Add message acknowledgment system

## 🔵 MEDIUM PRIORITY - Code Quality

### TypeScript Issues
- [ ] Fix all `any` types - add proper typing
- [ ] Enable strict TypeScript mode
- [ ] Add return type annotations
- [ ] Fix type assertion issues

### Build System
- [ ] Add build configuration for browser extension
- [ ] Implement bundling with webpack/rollup
- [ ] Add source maps
- [ ] Implement hot reload for development

### Testing
- [ ] Add unit tests for critical functions
- [ ] Add integration tests for API endpoints
- [ ] Add E2E tests for browser extension
- [ ] Implement test coverage reporting

## 🟢 LOW PRIORITY - Best Practices

### Configuration
- [ ] Create .env.example files
- [ ] Add environment validation on startup
- [ ] Implement configuration service
- [ ] Add feature flags system

### Logging & Monitoring
- [ ] Implement structured logging
- [ ] Add performance metrics
- [ ] Implement distributed tracing
- [ ] Add health check endpoints

### Documentation
- [ ] Create API documentation
- [ ] Add JSDoc comments
- [ ] Create development guide
- [ ] Add deployment instructions

### Code Organization
- [ ] Extract magic numbers to constants
- [ ] Implement dependency injection
- [ ] Create shared types package
- [ ] Standardize error codes

## ✅ Quick Wins (< 30 min each)

1. [ ] Remove duplicate code in content-script.js
2. [ ] Fix JWT secret hardcoding
3. [ ] Create missing HTML files (basic versions)
4. [ ] Fix websocketServer variable ordering
5. [ ] Remove module type from manifest.json
6. [ ] Add basic .env.example
7. [ ] Fix duplicate imports
8. [ ] Add basic error messages sanitization
9. [ ] Implement array size limits
10. [ ] Add startup validation for env vars

## 📊 Estimated Timeline

- **Critical Issues**: 1-2 days
- **Security Fixes**: 2-3 days  
- **Memory & Performance**: 2-3 days
- **Error Handling**: 3-4 days
- **Code Quality**: 1 week
- **Best Practices**: 2 weeks

**Total Estimated Time**: 3-4 weeks for comprehensive fixes

## 🎯 Recommended Fix Order

1. Start with Critical Issues (extension won't work without these)
2. Fix Security Vulnerabilities (protect user data)
3. Address Memory Leaks (prevent crashes)
4. Improve Error Handling (increase reliability)
5. Enhance Code Quality (maintainability)
6. Implement Best Practices (long-term health)

## 🛠️ Tools Needed

- [ ] ESLint configuration
- [ ] Prettier configuration  
- [ ] TypeScript strict config
- [ ] Jest configuration
- [ ] Webpack/Rollup for bundling
- [ ] Husky for pre-commit hooks
- [ ] GitHub Actions for CI/CD