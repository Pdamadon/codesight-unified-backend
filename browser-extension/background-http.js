// CodeSight Background Service Worker - HTTP Version
class CodeSightBackground {
  constructor() {
    this.isConnected = false;
    this.sessionId = null;
    this.eventQueue = [];
    this.codesightUrl = 'https://codesight-crowdsource-collector-production.up.railway.app'; // Railway backend
    
    this.initializeBackground();
  }

  initializeBackground() {
    // Listen for messages from content scripts and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Handle extension installation
    chrome.runtime.onInstalled.addListener(() => {
      console.log('CodeSight Shopping Tracker installed');
    });

    // Handle tab navigation
    chrome.webNavigation.onCompleted.addListener((details) => {
      if (details.frameId === 0 && this.sessionId) {
        this.sendNavigationEvent(details);
      }
    });
  }

  async handleMessage(message, sender, sendResponse) {
    switch (message.action) {
      case 'CONNECT_WEBSOCKET':
        await this.testConnection(message.url || this.codesightUrl);
        sendResponse({ success: this.isConnected });
        break;

      case 'START_SESSION':
        this.sessionId = message.sessionId;
        await this.startSession(message.sessionId);
        sendResponse({ success: true, sessionId: this.sessionId });
        break;

      case 'STOP_SESSION':
        await this.stopSession();
        sendResponse({ success: true });
        break;

      case 'EVENT_CAPTURED':
        this.sendEvent(message.event);
        sendResponse({ success: true });
        break;

      case 'TRACKING_COMPLETE':
        await this.sendSessionComplete(message.sessionId, message.events);
        sendResponse({ success: true });
        break;

      case 'GET_STATUS':
        sendResponse({
          isConnected: this.isConnected,
          sessionId: this.sessionId,
          queueLength: this.eventQueue.length
        });
        break;
    }
  }

  async testConnection(url) {
    try {
      this.codesightUrl = url.replace('wss://', 'https://').replace('ws://', 'http://');
      
      const response = await fetch(`${this.codesightUrl}/api/health`);
      const data = await response.json();
      
      if (data.status && data.status.includes('healthy')) {
        console.log('CodeSight backend connected via HTTP');
        this.isConnected = true;
        return true;
      } else {
        this.isConnected = false;
        return false;
      }
    } catch (error) {
      console.error('Failed to connect to CodeSight backend:', error);
      this.isConnected = false;
      return false;
    }
  }

  async startSession(sessionId) {
    this.sessionId = sessionId;
    
    const sessionData = {
      sessionId: sessionId,
      status: 'active',
      userAgent: navigator.userAgent,
      extensionData: {
        name: 'CodeSight Shopping Tracker',
        version: '1.0.0',
        startTime: new Date().toISOString()
      }
    };

    // Store session start (we'll create a simple endpoint for this)
    await this.sendHttpRequest('/api/extension/session-start', sessionData);

    // Notify all content scripts to start tracking
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'START_TRACKING',
        sessionId: sessionId
      }).catch(() => {
        // Tab might not have content script injected yet
      });
    }
  }

  async stopSession() {
    if (!this.sessionId) return;

    const sessionData = {
      sessionId: this.sessionId,
      status: 'completed',
      endTime: new Date().toISOString()
    };

    await this.sendHttpRequest('/api/extension/session-stop', sessionData);

    // Notify all content scripts to stop tracking
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'STOP_TRACKING'
      }).catch(() => {
        // Tab might not have content script
      });
    }

    this.sessionId = null;
  }

  async sendEvent(event) {
    if (!this.sessionId) return;

    const eventData = {
      sessionId: this.sessionId,
      eventType: event.type,
      eventData: event.data,
      timestamp: new Date().toISOString()
    };

    await this.sendHttpRequest('/api/extension/event', eventData);
  }

  sendNavigationEvent(details) {
    const event = {
      type: 'navigation',
      data: {
        url: details.url,
        tabId: details.tabId,
        timestamp: Date.now(),
        transitionType: details.transitionType
      }
    };

    this.sendEvent(event);
  }

  async sendSessionComplete(sessionId, events) {
    const completeData = {
      sessionId: sessionId,
      events: events,
      summary: {
        totalEvents: events.length,
        eventTypes: this.summarizeEvents(events),
        duration: events.length > 0 ? 
          Math.max(...events.map(e => e.data.sessionTime || 0)) : 0
      },
      completedAt: new Date().toISOString()
    };

    await this.sendHttpRequest('/api/extension/session-complete', completeData);
  }

  async sendHttpRequest(endpoint, data) {
    if (!this.isConnected) {
      console.log('Not connected, queuing request:', endpoint);
      this.eventQueue.push({ endpoint, data });
      return;
    }

    try {
      const response = await fetch(`${this.codesightUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Request successful:', endpoint, result);
      return result;

    } catch (error) {
      console.error('HTTP request failed:', endpoint, error);
      // Queue for retry
      this.eventQueue.push({ endpoint, data });
    }
  }

  summarizeEvents(events) {
    const summary = {};
    events.forEach(event => {
      summary[event.type] = (summary[event.type] || 0) + 1;
    });
    return summary;
  }
}

// Initialize background service
const codesightBackground = new CodeSightBackground();