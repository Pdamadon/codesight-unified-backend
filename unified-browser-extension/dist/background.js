// Unified CodeSight Background Service Worker v2.0
// Advanced screenshot capture and data management

class UnifiedBackgroundService {
  constructor() {
    this.activeSessions = new Map();
    this.screenshotQueue = [];
    this.dataQueue = [];
    this.isProcessingQueue = false;
    this.websocketConnection = null;
    this.reconnectAttempts = 0;
    this.config = {
      backendUrl: 'wss://gentle-vision-production.up.railway.app/ws',
      apiKey: 'test-key-dev', // Development API key
      maxScreenshotSize: 2 * 1024 * 1024, // 2MB
      compressionQuality: 0.8,
      burstModeDelay: 300,
      maxQueueSize: 100
    };
    
    this.initializeService();
  }

  initializeService() {
    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    // Listen for tab updates (navigation detection)
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      this.handleTabUpdate(tabId, changeInfo, tab);
    });

    // Listen for tab activation
    chrome.tabs.onActivated.addListener((activeInfo) => {
      this.handleTabActivation(activeInfo);
    });
    
    // Listen for tab removal to cleanup sessions
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.handleTabRemoved(tabId);
    });

    // Cleanup on extension startup
    this.cleanupOldData();
    
    // Start periodic cleanup
    this.startPeriodicCleanup();
    
    // Load settings and auto-connect to WebSocket on startup
    this.loadSettingsAndConnect();
    
    // Clear storage to fix quota issues
    this.clearStorageQuota();
    
    console.log('Unified Background Service initialized v2.0');
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.action) {
        case 'CAPTURE_SCREENSHOT':
          const screenshot = await this.captureScreenshot(sender.tab.id, message.data);
          sendResponse({ success: true, screenshotId: screenshot?.id });
          break;

        case 'START_SESSION':
          await this.startSession(sender.tab.id, message.sessionId, message.config);
          sendResponse({ success: true });
          break;

        case 'STOP_SESSION':
          const sessionData = await this.stopSession(sender.tab.id);
          sendResponse({ success: true, data: sessionData });
          break;

        case 'CONNECT_WEBSOCKET':
          await this.connectWebSocket(message.url);
          sendResponse({ success: true, connected: !!this.websocketConnection });
          break;

        case 'SEND_DATA':
          await this.sendDataToBackend(message.data);
          sendResponse({ success: true });
          break;

        case 'BURST_CAPTURE':
          await this.startBurstCapture(sender.tab.id, message.trigger, message.count);
          sendResponse({ success: true });
          break;

        case 'GET_SESSION_STATUS':
          const status = this.getSessionStatus(sender.tab.id);
          sendResponse({ success: true, status });
          break;

        case 'START_BACKEND_SESSION':
          await this.startBackendSession(message.sessionId, message.config);
          sendResponse({ success: true });
          break;

        case 'STOP_BACKEND_SESSION':
          await this.stopBackendSession(message.sessionId);
          sendResponse({ success: true });
          break;

        case 'ping':
          sendResponse({ success: true, message: 'Background script is working', connected: !!this.websocketConnection });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background: Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  // Advanced screenshot capture with WebP compression
  async captureScreenshot(tabId, data = {}) {
    try {
      // Capture the visible tab
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'png',
        quality: 100
      });

      if (!dataUrl) {
        throw new Error('Failed to capture screenshot');
      }

      // Convert to WebP for better compression
      const webpDataUrl = await this.convertToWebP(dataUrl, this.config.compressionQuality);
      
      // Generate screenshot metadata
      const screenshot = {
        id: this.generateId(),
        tabId,
        timestamp: Date.now(),
        trigger: data.trigger || 'manual',
        url: data.url,
        viewport: data.viewport,
        dataUrl: webpDataUrl,
        originalSize: dataUrl.length,
        compressedSize: webpDataUrl.length,
        compressionRatio: (1 - webpDataUrl.length / dataUrl.length) * 100
      };

      // Add to queue for processing
      this.addToScreenshotQueue(screenshot);

      // Store temporarily in chrome.storage
      await this.storeScreenshot(screenshot);

      console.log('Background: Screenshot captured', {
        id: screenshot.id,
        trigger: screenshot.trigger,
        compressionRatio: `${screenshot.compressionRatio.toFixed(1)}%`
      });

      return screenshot;

    } catch (error) {
      console.error('Background: Screenshot capture failed:', error);
      return null;
    }
  }

  // Convert PNG to WebP for better compression
  async convertToWebP(pngDataUrl, quality = 0.8) {
    try {
      // For service workers, we'll skip WebP conversion and return original
      // as Image and OffscreenCanvas are not available in service worker context
      console.log('Background: WebP conversion skipped in service worker, using original PNG');
      return pngDataUrl;
    } catch (error) {
      console.log('Background: WebP conversion failed, using original PNG');
      return pngDataUrl;
    }
  }

  // Burst mode screenshot capture
  async startBurstCapture(tabId, trigger, count = 5) {
    const burstId = this.generateId();
    console.log('Background: Starting burst capture', { burstId, trigger, count });

    for (let i = 0; i < count; i++) {
      setTimeout(async () => {
        try {
          await this.captureScreenshot(tabId, {
            trigger: `burst_${trigger}_${i + 1}`,
            burstId,
            burstIndex: i + 1,
            burstTotal: count
          });
        } catch (error) {
          console.error(`Background: Burst capture ${i + 1} failed:`, error);
        }
      }, i * this.config.burstModeDelay);
    }
  }

  // Modal and overlay detection
  async detectAndCaptureModals(tabId) {
    try {
      // Inject script to detect modals
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        func: () => {
          const modals = [];
          
          // Common modal selectors
          const modalSelectors = [
            '[role="dialog"]',
            '[role="alertdialog"]',
            '.modal',
            '.popup',
            '.overlay',
            '[data-modal]',
            '[aria-modal="true"]'
          ];

          modalSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
              const rect = element.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                const computedStyle = window.getComputedStyle(element);
                if (computedStyle.display !== 'none' && computedStyle.visibility !== 'hidden') {
                  modals.push({
                    selector,
                    rect: {
                      x: rect.x,
                      y: rect.y,
                      width: rect.width,
                      height: rect.height
                    },
                    zIndex: computedStyle.zIndex,
                    isVisible: true
                  });
                }
              }
            });
          });

          return modals;
        }
      });

      const modals = results[0]?.result || [];
      
      if (modals.length > 0) {
        console.log('Background: Detected modals:', modals.length);
        
        // Capture screenshot with modal context
        await this.captureScreenshot(tabId, {
          trigger: 'modal_detected',
          modalCount: modals.length,
          modals: modals
        });
      }

      return modals;

    } catch (error) {
      console.error('Background: Modal detection failed:', error);
      return [];
    }
  }

  // Screenshot queue management
  addToScreenshotQueue(screenshot) {
    if (this.screenshotQueue.length >= this.config.maxQueueSize) {
      console.warn('Background: Screenshot queue full, removing oldest');
      this.screenshotQueue.shift();
    }

    this.screenshotQueue.push(screenshot);
    
    // Additional cleanup if queue is getting too large
    if (this.screenshotQueue.length > this.config.maxQueueSize / 2) {
      this.cleanupOldScreenshotsFromQueue();
    }
    
    this.processScreenshotQueue();
  }
  
  cleanupOldScreenshotsFromQueue() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    this.screenshotQueue = this.screenshotQueue.filter(screenshot => {
      return (now - screenshot.timestamp) < maxAge;
    });
  }

  async processScreenshotQueue() {
    if (this.isProcessingQueue || this.screenshotQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.screenshotQueue.length > 0) {
        const screenshot = this.screenshotQueue.shift();
        await this.processScreenshot(screenshot);
      }
    } catch (error) {
      console.error('Background: Queue processing error:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  async processScreenshot(screenshot) {
    try {
      // Send to backend if connected
      if (this.websocketConnection && this.websocketConnection.readyState === WebSocket.OPEN) {
        await this.sendScreenshotToBackend(screenshot);
      }

      // Clean up old screenshots from storage
      await this.cleanupOldScreenshots();

    } catch (error) {
      console.error('Background: Screenshot processing failed:', error);
    }
  }

  // WebSocket connection management
  async connectWebSocket(url = this.config.backendUrl) {
    try {
      if (this.websocketConnection) {
        this.websocketConnection.close();
      }

      this.websocketConnection = new WebSocket(url);

      this.websocketConnection.onopen = () => {
        console.log('Background: WebSocket connected');
        this.reconnectAttempts = 0; // Reset reconnection counter
        
        // Wait for connection to be fully ready before authenticating
        setTimeout(() => {
          if (this.websocketConnection && this.websocketConnection.readyState === WebSocket.OPEN) {
            this.authenticateConnection();
          }
        }, 100);
      };

      this.websocketConnection.onmessage = (event) => {
        this.handleWebSocketMessage(event);
      };

      this.websocketConnection.onclose = (event) => {
        console.log('Background: WebSocket disconnected', event.code, event.reason);
        this.websocketConnection = null;
        
        // Attempt reconnection after delay (exponential backoff)
        const delay = Math.min(5000 * Math.pow(2, this.reconnectAttempts || 0), 30000);
        this.reconnectAttempts = (this.reconnectAttempts || 0) + 1;
        
        console.log(`Background: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        setTimeout(() => {
          this.connectWebSocket(url);
        }, delay);
      };

      this.websocketConnection.onerror = (error) => {
        console.error('Background: WebSocket error:', error);
      };

    } catch (error) {
      console.error('Background: WebSocket connection failed:', error);
    }
  }

  async authenticateConnection() {
    if (!this.websocketConnection) {
      console.log('Background: No WebSocket connection available for authentication');
      return;
    }

    if (this.websocketConnection.readyState !== WebSocket.OPEN) {
      console.log('Background: WebSocket not ready for authentication, state:', this.websocketConnection.readyState);
      return;
    }

    try {
      const authMessage = {
        type: 'authenticate',
        data: {
          apiKey: this.config.apiKey,
          clientType: 'extension',
          extensionVersion: '2.0.0',
          browser: this.getBrowserInfo()
        },
        timestamp: Date.now()
      };

      console.log('Background: Sending authentication message');
      this.websocketConnection.send(JSON.stringify(authMessage));
    } catch (error) {
      console.error('Background: Failed to send authentication message:', error);
    }
  }

  // Removed sendConnectionInfo - authentication provides this info

  async sendScreenshotToBackend(screenshot) {
    if (!this.websocketConnection || this.websocketConnection.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      // Send screenshot data directly (backend expects 'screenshot_data' type)

      // Send screenshot data with proper backend format
      if (screenshot.compressedSize < this.config.maxScreenshotSize) {
        const imageData = {
          type: 'screenshot_data',
          sessionId: this.currentSessionId || 'unknown',
          data: {
            id: screenshot.id,
            dataUrl: screenshot.dataUrl,
            timestamp: screenshot.timestamp,
            metadata: {
              ...screenshot,
              dataUrl: null // Metadata without image data
            }
          },
          timestamp: Date.now()
        };

        this.websocketConnection.send(JSON.stringify(imageData));
      }

    } catch (error) {
      console.error('Background: Failed to send screenshot to backend:', error);
    }
  }

  handleWebSocketMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'authentication_success':
          console.log('Background: Authentication successful');
          this.processQueuedData(); // Send any queued data
          break;

        case 'authentication_failed':
          console.error('Background: Authentication failed:', message.data);
          break;

        case 'capture_request':
          this.handleCaptureRequest(message);
          break;
          
        case 'burst_request':
          this.handleBurstRequest(message);
          break;
          
        case 'config_update':
          this.updateConfig(message.config);
          break;
          
        default:
          console.log('Background: Unknown WebSocket message:', message.type);
      }
    } catch (error) {
      console.error('Background: WebSocket message handling error:', error);
    }
  }

  async handleCaptureRequest(message) {
    const { tabId, trigger } = message;
    
    if (tabId) {
      await this.captureScreenshot(tabId, { trigger });
    } else {
      // Capture all active tabs
      const tabs = await chrome.tabs.query({ active: true });
      for (const tab of tabs) {
        await this.captureScreenshot(tab.id, { trigger });
      }
    }
  }

  async handleBurstRequest(message) {
    const { tabId, trigger, count } = message;
    await this.startBurstCapture(tabId, trigger, count);
  }

  // Session management
  async startSession(tabId, sessionId, config = {}) {
    const session = {
      id: sessionId,
      tabId,
      startTime: Date.now(),
      config: { ...this.config, ...config },
      screenshots: [],
      events: []
    };

    this.activeSessions.set(tabId, session);
    
    // Notify backend
    if (this.websocketConnection) {
      this.websocketConnection.send(JSON.stringify({
        type: 'session_start',
        sessionId,
        data: {
          tabId,
          url: session.url,
          title: session.title
        },
        timestamp: Date.now()
      }));
    }

    console.log('Background: Session started', { sessionId, tabId });
  }

  async stopSession(tabId) {
    const session = this.activeSessions.get(tabId);
    if (!session) {
      return null;
    }

    session.endTime = Date.now();
    session.duration = session.endTime - session.startTime;

    // Collect all session data
    const sessionData = {
      ...session,
      screenshots: await this.getSessionScreenshots(session.id),
      finalScreenshot: await this.captureScreenshot(tabId, { trigger: 'session_end' })
    };

    // Notify backend
    if (this.websocketConnection) {
      this.websocketConnection.send(JSON.stringify({
        type: 'session_stop',
        sessionId: session.id,
        data: {
          tabId,
          duration: session.duration,
          eventCount: session.eventCount || 0
        },
        timestamp: Date.now()
      }));
    }

    this.activeSessions.delete(tabId);
    
    console.log('Background: Session stopped', { 
      sessionId: session.id, 
      duration: `${Math.round(session.duration / 1000)}s` 
    });

    return sessionData;
  }

  getSessionStatus(tabId) {
    const session = this.activeSessions.get(tabId);
    if (!session) {
      return { active: false };
    }

    return {
      active: true,
      sessionId: session.id,
      duration: Date.now() - session.startTime,
      screenshotCount: session.screenshots.length,
      eventCount: session.events.length
    };
  }

  // Tab event handling
  async handleTabUpdate(tabId, changeInfo, tab) {
    const session = this.activeSessions.get(tabId);
    if (!session) return;

    // Capture screenshot on navigation
    if (changeInfo.status === 'complete' && changeInfo.url) {
      await this.startBurstCapture(tabId, 'navigation', 3);
      
      // Detect modals after page load
      setTimeout(() => {
        this.detectAndCaptureModals(tabId);
      }, 1000);
    }
  }

  async handleTabActivation(activeInfo) {
    const session = this.activeSessions.get(activeInfo.tabId);
    if (!session) return;

    // Capture screenshot when tab becomes active
    await this.captureScreenshot(activeInfo.tabId, { trigger: 'tab_activated' });
  }
  
  handleTabRemoved(tabId) {
    // Clean up session when tab is closed
    const session = this.activeSessions.get(tabId);
    if (session) {
      console.log('Background: Tab closed, cleaning up session', { tabId, sessionId: session.id });
      this.activeSessions.delete(tabId);
      
      // Skip automatic backend notification for tab closure to prevent race conditions
      // Manual session management is preferred for proper database synchronization
      console.log('Background: Session cleaned up locally (no backend notification for tab closure)');
    }
  }
  
  startPeriodicCleanup() {
    // Run cleanup every 30 minutes
    setInterval(() => {
      this.performPeriodicCleanup();
    }, 30 * 60 * 1000);
  }
  
  async performPeriodicCleanup() {
    const now = Date.now();
    const maxSessionAge = 2 * 60 * 60 * 1000; // 2 hours
    
    // Clean up old sessions
    for (const [tabId, session] of this.activeSessions) {
      if (now - session.startTime > maxSessionAge) {
        console.log('Background: Cleaning up old session', { tabId, sessionId: session.id });
        this.activeSessions.delete(tabId);
      }
    }
    
    // Clean up old screenshots from queue
    this.cleanupOldScreenshotsFromQueue();
    
    // Clean up storage
    await this.cleanupOldScreenshots();
    
    // Log cleanup stats
    console.log('Background: Periodic cleanup completed', {
      activeSessions: this.activeSessions.size,
      queueSize: this.screenshotQueue.length
    });
  }

  // Storage management
  async storeScreenshot(screenshot) {
    try {
      // Skip local storage to avoid quota issues - send directly to backend
      console.log('Background: Screenshot captured, sending to backend immediately');
      await this.sendScreenshotToBackend(screenshot);
    } catch (error) {
      console.error('Background: Screenshot processing failed:', error);
    }
  }

  async getSessionScreenshots(sessionId) {
    try {
      const storage = await chrome.storage.local.get();
      const screenshots = [];

      for (const [key, value] of Object.entries(storage)) {
        if (key.startsWith('screenshot_') && !key.endsWith('_data')) {
          if (value.sessionId === sessionId) {
            // Get full image data if available
            const dataKey = `${key}_data`;
            if (storage[dataKey]) {
              value.dataUrl = storage[dataKey];
            }
            screenshots.push(value);
          }
        }
      }

      return screenshots.sort((a, b) => a.timestamp - b.timestamp);

    } catch (error) {
      console.error('Background: Failed to get session screenshots:', error);
      return [];
    }
  }

  async cleanupOldScreenshots() {
    try {
      const storage = await chrome.storage.local.get();
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      const keysToRemove = [];

      for (const [key, value] of Object.entries(storage)) {
        if (key.startsWith('screenshot_')) {
          if (value.timestamp && value.timestamp < cutoffTime) {
            keysToRemove.push(key);
            keysToRemove.push(`${key}_data`);
          }
        }
      }

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log('Background: Cleaned up', keysToRemove.length, 'old screenshots');
      }

    } catch (error) {
      console.error('Background: Screenshot cleanup failed:', error);
    }
  }

  async cleanupOldData() {
    await this.cleanupOldScreenshots();
    
    // Clean up other old data
    try {
      const storage = await chrome.storage.local.get();
      const keysToRemove = [];
      const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days

      for (const [key, value] of Object.entries(storage)) {
        if (value.timestamp && value.timestamp < cutoffTime) {
          keysToRemove.push(key);
        }
      }

      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log('Background: Cleaned up', keysToRemove.length, 'old data entries');
      }

    } catch (error) {
      console.error('Background: Data cleanup failed:', error);
    }
  }

  // Utility methods
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    console.log('Background: Config updated:', newConfig);
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  getBrowserInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };
  }

  async loadSettingsAndConnect() {
    try {
      // Load settings from storage
      const settings = await chrome.storage.sync.get({
        backendUrl: this.config.backendUrl,
        apiKey: this.config.apiKey
      });
      
      // Update config with loaded settings
      this.config.backendUrl = settings.backendUrl;
      if (settings.apiKey) {
        this.config.apiKey = settings.apiKey;
      }
      
      console.log('Background: Loaded settings, connecting to:', this.config.backendUrl);
      
      // Connect to WebSocket
      this.connectWebSocket();
      
    } catch (error) {
      console.error('Background: Failed to load settings:', error);
      // Use default settings and connect anyway
      this.connectWebSocket();
    }
  }

  async sendDataToBackend(data) {
    if (!this.websocketConnection || this.websocketConnection.readyState !== WebSocket.OPEN) {
      console.warn('Background: WebSocket not connected, queuing data');
      // Queue the data for later sending
      if (!this.dataQueue) this.dataQueue = [];
      this.dataQueue.push(data);
      
      // Try to reconnect if not already trying
      if (!this.websocketConnection) {
        this.connectWebSocket();
      }
      return false;
    }

    try {
      const message = {
        type: 'interaction_event',
        data,
        timestamp: Date.now(),
        sessionId: data.sessionId || 'unknown'
      };
      
      console.log('Background: Sending interaction data to backend:', data.type);
      this.websocketConnection.send(JSON.stringify(message));
      
      // Process any queued data
      this.processQueuedData();
      
      return true;
    } catch (error) {
      console.error('Background: Failed to send data to backend:', error);
      return false;
    }
  }

  processQueuedData() {
    if (!this.dataQueue || this.dataQueue.length === 0) return;
    
    console.log(`Background: Processing ${this.dataQueue.length} queued items`);
    
    const queue = [...this.dataQueue];
    this.dataQueue = [];
    
    queue.forEach(data => {
      this.sendDataToBackend(data);
    });
  }

  async startBackendSession(sessionId, config) {
    if (!this.websocketConnection || this.websocketConnection.readyState !== WebSocket.OPEN) {
      console.warn('Background: Cannot start backend session - WebSocket not connected');
      return;
    }

    try {
      const message = {
        type: 'session_start',
        sessionId,
        data: config,
        timestamp: Date.now()
      };

      console.log('Background: Starting backend session:', sessionId);
      this.websocketConnection.send(JSON.stringify(message));
    } catch (error) {
      console.error('Background: Failed to start backend session:', error);
    }
  }

  async stopBackendSession(sessionId) {
    if (!this.websocketConnection || this.websocketConnection.readyState !== WebSocket.OPEN) {
      console.warn('Background: Cannot stop backend session - WebSocket not connected');
      return;
    }

    try {
      const message = {
        type: 'session_stop',
        sessionId,
        timestamp: Date.now()
      };

      console.log('Background: Stopping backend session:', sessionId);
      this.websocketConnection.send(JSON.stringify(message));
    } catch (error) {
      console.error('Background: Failed to stop backend session:', error);
    }
  }

  async clearStorageQuota() {
    try {
      // Clear all screenshot data to fix quota exceeded error
      const storage = await chrome.storage.local.get();
      const keysToRemove = [];
      
      for (const key of Object.keys(storage)) {
        if (key.startsWith('screenshot_')) {
          keysToRemove.push(key);
        }
      }
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
        console.log(`Background: Cleared ${keysToRemove.length} screenshot entries from storage`);
      }
    } catch (error) {
      console.error('Background: Failed to clear storage:', error);
    }
  }
}

// Initialize the background service
const backgroundService = new UnifiedBackgroundService();

// Keep service worker alive
chrome.runtime.onStartup.addListener(() => {
  console.log('Background: Extension startup');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Background: Extension installed/updated');
});