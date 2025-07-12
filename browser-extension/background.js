// CodeSight Background Service Worker
class CodeSightBackground {
  constructor() {
    this.websocket = null;
    this.isConnected = false;
    this.sessionId = null;
    this.eventQueue = [];
    this.codesightUrl = 'ws://localhost:3001/extension-ws'; // Will be configurable
    
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
        await this.connectWebSocket(message.url || this.codesightUrl);
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

  async connectWebSocket(url) {
    try {
      console.log('Attempting to connect to:', url);
      
      if (this.websocket) {
        this.websocket.close();
      }

      // Validate URL format
      if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
        throw new Error('Invalid WebSocket URL format. Must start with ws:// or wss://');
      }

      this.websocket = new WebSocket(url);
      
      this.websocket.onopen = () => {
        console.log('CodeSight WebSocket connected');
        this.isConnected = true;
        this.flushEventQueue();
      };

      this.websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      };

      this.websocket.onclose = () => {
        console.log('CodeSight WebSocket disconnected');
        this.isConnected = false;
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (!this.isConnected) {
            this.connectWebSocket(url);
          }
        }, 5000);
      };

      this.websocket.onerror = (error) => {
        console.error('CodeSight WebSocket error:', error);
        this.isConnected = false;
      };

      return new Promise((resolve) => {
        const checkConnection = () => {
          if (this.websocket.readyState === WebSocket.OPEN) {
            resolve(true);
          } else if (this.websocket.readyState === WebSocket.CLOSED) {
            resolve(false);
          } else {
            setTimeout(checkConnection, 100);
          }
        };
        checkConnection();
      });

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.isConnected = false;
      return false;
    }
  }

  handleWebSocketMessage(data) {
    switch (data.type) {
      case 'session_started':
        console.log('Session started:', data.sessionId);
        break;
      case 'session_stopped':
        console.log('Session stopped:', data.sessionId);
        this.sessionId = null;
        break;
      case 'ping':
        this.sendWebSocketMessage({ type: 'pong' });
        break;
    }
  }

  async startSession(sessionId) {
    this.sessionId = sessionId;
    
    const message = {
      type: 'session_start',
      sessionId: sessionId,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      extension: {
        name: 'CodeSight Shopping Tracker',
        version: '1.0.0'
      }
    };

    this.sendWebSocketMessage(message);

    // Notify all content scripts to start tracking
    const tabs = await chrome.tabs.query({ active: true });
    for (const tab of tabs) {
      try {
        // First try to inject content script if not already there
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content-script.js']
        });
        console.log('CodeSight: Content script injected into tab', tab.id);
      } catch (error) {
        console.log('CodeSight: Content script already exists or injection failed:', error.message);
      }
      
      // Then send the start message
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'START_TRACKING',
          sessionId: sessionId
        }).catch((error) => {
          console.error('CodeSight: Failed to send START_TRACKING message:', error);
        });
      }, 500);
    }
  }

  async stopSession() {
    if (!this.sessionId) return;

    const message = {
      type: 'session_stop',
      sessionId: this.sessionId,
      timestamp: Date.now()
    };

    this.sendWebSocketMessage(message);

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

  sendEvent(event) {
    const message = {
      type: 'interaction_event',
      sessionId: this.sessionId,
      event: event,
      timestamp: Date.now()
    };

    this.sendWebSocketMessage(message);
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
    const message = {
      type: 'session_complete',
      sessionId: sessionId,
      events: events,
      summary: {
        totalEvents: events.length,
        eventTypes: this.summarizeEvents(events),
        duration: events.length > 0 ? 
          Math.max(...events.map(e => e.data.sessionTime)) : 0
      },
      timestamp: Date.now()
    };

    this.sendWebSocketMessage(message);
  }

  sendWebSocketMessage(message) {
    if (this.isConnected && this.websocket.readyState === WebSocket.OPEN) {
      try {
        this.websocket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.eventQueue.push(message);
      }
    } else {
      // Queue message for later
      this.eventQueue.push(message);
      console.log('WebSocket not connected, queued message:', message.type);
    }
  }

  flushEventQueue() {
    if (!this.isConnected) return;

    console.log(`Flushing ${this.eventQueue.length} queued messages`);
    
    while (this.eventQueue.length > 0) {
      const message = this.eventQueue.shift();
      try {
        this.websocket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to flush queued message:', error);
        this.eventQueue.unshift(message); // Put it back
        break;
      }
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