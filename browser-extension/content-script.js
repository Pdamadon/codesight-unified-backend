// CodeSight Shopping Behavior Tracker - Content Script
(function() {
  'use strict';
  
  // Prevent redeclaration and multiple injections
  if (window.ShoppingTracker || window.BASIC_SCRIPT_LOADED) {
    console.log('Basic tracker already loaded, skipping redefinition');
    return;
  }
  
  // Mark script as loaded
  window.BASIC_SCRIPT_LOADED = true;

class ShoppingTracker {
  constructor() {
    this.isTracking = false;
    this.sessionId = null;
    this.events = [];
    this.startTime = 0;
    this.persistentLogEntries = []; // Keep log entries across page loads
    
    this.initializeTracker();
    this.restoreState();
  }

  // Save state to session storage
  saveState() {
    if (this.sessionId) {
      sessionStorage.setItem('codesight-tracking-state', JSON.stringify({
        isTracking: this.isTracking,
        sessionId: this.sessionId,
        startTime: this.startTime,
        eventCount: this.events.length,
        logEntries: this.persistentLogEntries,
        allEvents: this.events // Save actual events too
      }));
    }
  }

  // Restore state from session storage
  restoreState() {
    const saved = sessionStorage.getItem('codesight-tracking-state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        this.isTracking = state.isTracking;
        this.sessionId = state.sessionId;
        this.startTime = state.startTime || Date.now();
        this.persistentLogEntries = state.logEntries || [];
        this.events = state.allEvents || []; // Restore actual events too!
        
        if (this.isTracking) {
          console.log(`CodeSight: Restored tracking state for session: ${this.sessionId} with ${this.events.length} events`);
          this.bindEvents();
          this.showTrackingIndicator();
          this.restoreActivityLog();
        }
      } catch (error) {
        console.log('CodeSight: Failed to restore state:', error);
      }
    }
  }

  initializeTracker() {
    // Basic tracker should always initialize its message listeners
    // The activeTracker check happens in the main initialization below
    
    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'START_TRACKING':
          this.startTracking(message.sessionId);
          sendResponse({ success: true });
          break;
        case 'STOP_TRACKING':
          this.stopTracking();
          sendResponse({ success: true, events: this.events });
          break;
        case 'GET_STATUS':
          sendResponse({ 
            isTracking: this.isTracking, 
            eventCount: this.events.length 
          });
          break;
      }
    });

    // Handle page navigation (SPA and full reloads)
    this.setupNavigationHandling();
  }

  setupNavigationHandling() {
    // For single-page applications (like many shopping sites)
    let currentUrl = window.location.href;
    
    // Check for URL changes periodically
    setInterval(() => {
      if (this.isTracking && window.location.href !== currentUrl) {
        console.log('CodeSight: Page navigation detected', currentUrl, '->', window.location.href);
        
        // Capture navigation event
        this.captureEvent('navigation', {
          from: currentUrl,
          to: window.location.href,
          title: document.title,
          timestamp: Date.now()
        });
        
        currentUrl = window.location.href;
        
        // Re-establish tracking on new page
        setTimeout(() => {
          if (this.isTracking) {
            this.rebindEventsAfterNavigation();
          }
        }, 500);
      }
    }, 1000);

    // Also listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      if (this.isTracking) {
        console.log('CodeSight: Popstate navigation detected');
        setTimeout(() => {
          this.rebindEventsAfterNavigation();
        }, 500);
      }
    });
  }

  rebindEventsAfterNavigation() {
    console.log('CodeSight: Re-establishing tracking after navigation');
    
    // Make sure indicator is still visible
    if (!document.getElementById('codesight-tracking-indicator')) {
      this.showTrackingIndicator();
    }
    
    // Events should still be bound, but let's make sure
    // (Don't re-bind if already bound to avoid duplicates)
  }

  startTracking(sessionId) {
    console.log('CodeSight: startTracking called with sessionId:', sessionId);
    if (this.isTracking) {
      console.log('CodeSight: Already tracking, ignoring');
      return;
    }
    
    this.isTracking = true;
    this.sessionId = sessionId;
    this.startTime = Date.now();
    this.events = [];
    
    console.log('CodeSight: Binding events and showing indicator');
    this.bindEvents();
    this.showTrackingIndicator();
    
    // Send initial page load event
    this.captureEvent('navigation', {
      url: window.location.href,
      title: document.title,
      timestamp: Date.now()
    });
    
    console.log('CodeSight: Tracking started successfully');
  }

  stopTracking() {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    this.unbindEvents();
    this.hideTrackingIndicator();
    
    // Create downloadable file with session data
    this.downloadSessionData();
    
    // Send final data to background script
    chrome.runtime.sendMessage({
      action: 'TRACKING_COMPLETE',
      sessionId: this.sessionId,
      events: this.events
    });
    
    // Clear persistent state
    sessionStorage.removeItem('codesight-tracking-state');
    this.persistentLogEntries = [];
    
    return this.events;
  }

  downloadSessionData() {
    console.log('CodeSight: Starting download process...');
    console.log('CodeSight: Events to download:', this.events.length);
    
    const sessionData = {
      sessionId: this.sessionId,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      totalEvents: this.events.length,
      events: this.events,
      activityLog: this.persistentLogEntries,
      summary: {
        clicks: this.events.filter(e => e.type === 'click').length,
        inputs: this.events.filter(e => e.type === 'input').length,
        scrolls: this.events.filter(e => e.type === 'scroll').length,
        navigations: this.events.filter(e => e.type === 'navigation').length,
        pagesVisited: [...new Set(this.events.map(e => e.data.url).filter(Boolean))]
      }
    };

    console.log('CodeSight: Session summary:', sessionData.summary);

    try {
      // Create download
      const dataStr = JSON.stringify(sessionData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const filename = `codesight-session-${this.sessionId}-${new Date().toISOString().slice(0,10)}.json`;
      console.log('CodeSight: Creating download with filename:', filename);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      console.log('CodeSight: Triggering download...');
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('CodeSight: Download cleanup completed');
      }, 100);
      
      // Also show an alert so you know it happened
      alert(`CodeSight: Session data downloaded!\nFile: ${filename}\nEvents: ${sessionData.totalEvents}`);
      
    } catch (error) {
      console.error('CodeSight: Download failed:', error);
      alert('CodeSight: Download failed - check console for details');
    }
  }

  bindEvents() {
    // Click tracking
    document.addEventListener('click', this.handleClick.bind(this), true);
    
    // Form input tracking
    document.addEventListener('input', this.handleInput.bind(this), true);
    document.addEventListener('change', this.handleInput.bind(this), true);
    
    // Scroll tracking (throttled)
    document.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), 200), true);
    
    // Navigation tracking
    window.addEventListener('beforeunload', this.handleNavigation.bind(this));
    
    // Mouse hover (heavily throttled)
    document.addEventListener('mouseover', this.throttle(this.handleHover.bind(this), 1000), true);
  }

  unbindEvents() {
    document.removeEventListener('click', this.handleClick.bind(this), true);
    document.removeEventListener('input', this.handleInput.bind(this), true);
    document.removeEventListener('change', this.handleInput.bind(this), true);
    document.removeEventListener('scroll', this.handleScroll.bind(this), true);
    window.removeEventListener('beforeunload', this.handleNavigation.bind(this));
    document.removeEventListener('mouseover', this.handleHover.bind(this), true);
  }

  handleClick(event) {
    if (!this.isTracking) return;
    
    const element = event.target;
    const rect = element.getBoundingClientRect();
    
    const clickData = {
      type: 'click',
      timestamp: Date.now(),
      sessionTime: Date.now() - this.startTime,
      selector: this.getElementSelector(element),
      element: element.tagName.toLowerCase(),
      text: this.getElementText(element),
      attributes: this.getElementAttributes(element),
      coordinates: {
        x: Math.round(event.clientX),
        y: Math.round(event.clientY),
        pageX: Math.round(event.pageX),
        pageY: Math.round(event.pageY)
      },
      boundingBox: {
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      url: window.location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };

    this.captureEvent('click', clickData);
    this.showClickIndicator(event.clientX, event.clientY);
  }

  handleInput(event) {
    if (!this.isTracking) return;
    
    const element = event.target;
    let value = element.value || '';
    
    // Sanitize sensitive data
    const inputType = element.type || 'text';
    if (inputType === 'password') {
      value = '[PASSWORD]';
    } else if (inputType === 'email' || element.name?.toLowerCase().includes('email')) {
      value = value ? '[EMAIL_PROVIDED]' : '';
    } else if (element.name?.toLowerCase().includes('credit') || 
               element.name?.toLowerCase().includes('card') ||
               element.name?.toLowerCase().includes('cvv')) {
      value = '[PAYMENT_INFO]';
    } else if (value.length > 100) {
      value = value.substring(0, 100) + '...';
    }

    const inputData = {
      type: 'input',
      timestamp: Date.now(),
      sessionTime: Date.now() - this.startTime,
      selector: this.getElementSelector(element),
      element: element.tagName.toLowerCase(),
      inputType: inputType,
      value: value,
      placeholder: element.placeholder || '',
      label: this.getInputLabel(element),
      url: window.location.href
    };

    this.captureEvent('input', inputData);
  }

  handleScroll(event) {
    if (!this.isTracking) return;
    
    const scrollData = {
      type: 'scroll',
      timestamp: Date.now(),
      sessionTime: Date.now() - this.startTime,
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      documentHeight: Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      ),
      viewportHeight: window.innerHeight,
      url: window.location.href
    };

    this.captureEvent('scroll', scrollData);
  }

  handleHover(event) {
    if (!this.isTracking) return;
    
    const element = event.target;
    const hoverData = {
      type: 'hover',
      timestamp: Date.now(),
      sessionTime: Date.now() - this.startTime,
      selector: this.getElementSelector(element),
      element: element.tagName.toLowerCase(),
      text: this.getElementText(element),
      url: window.location.href
    };

    this.captureEvent('hover', hoverData);
  }

  handleNavigation() {
    if (!this.isTracking) return;
    
    const navData = {
      type: 'navigation',
      timestamp: Date.now(),
      sessionTime: Date.now() - this.startTime,
      from: window.location.href,
      url: window.location.href,
      title: document.title
    };

    this.captureEvent('navigation', navData);
  }

  captureEvent(type, data) {
    const event = {
      type,
      data,
      sessionId: this.sessionId
    };
    
    this.events.push(event);
    
    // Send to background script immediately for real-time processing
    chrome.runtime.sendMessage({
      action: 'EVENT_CAPTURED',
      event: event
    });
    
    // Create summary for visual log
    let summary = '';
    switch (type) {
      case 'click':
        summary = `${data.element} "${data.text}" (${data.selector})`;
        break;
      case 'input':
        summary = `${data.inputType} field: ${data.value} (${data.selector})`;
        break;
      case 'scroll':
        summary = `Y: ${data.scrollY}px`;
        break;
      case 'navigation':
        summary = `→ ${data.url || data.to}`;
        break;
      default:
        summary = JSON.stringify(data).substring(0, 100);
    }
    
    // Add to visual activity log
    this.addToActivityLog(type, summary);
    
    console.log('CodeSight captured:', type, data);
  }

  // Utility functions
  getElementSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }

    let selector = element.tagName.toLowerCase();
    
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        selector += '.' + classes.slice(0, 3).join('.');
      }
    }

    ['name', 'type', 'role', 'data-testid', 'data-track'].forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        selector += `[${attr}="${value}"]`;
      }
    });

    if (!element.id && !element.className) {
      const parent = element.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(child => 
          child.tagName === element.tagName
        );
        const index = siblings.indexOf(element);
        if (siblings.length > 1) {
          selector += `:nth-of-type(${index + 1})`;
        }
      }
    }

    return selector;
  }

  getElementText(element) {
    const text = element.textContent?.trim() || element.value || element.placeholder || '';
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
  }

  getElementAttributes(element) {
    const attrs = {};
    const importantAttrs = ['class', 'id', 'name', 'type', 'role', 'href', 'src', 'alt', 'title', 'data-track'];
    
    importantAttrs.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        attrs[attr] = value;
      }
    });

    return attrs;
  }

  getInputLabel(input) {
    const id = input.getAttribute('id');
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) {
        return label.textContent?.trim() || '';
      }
    }

    const parentLabel = input.closest('label');
    if (parentLabel) {
      return parentLabel.textContent?.trim() || '';
    }

    const ariaLabel = input.getAttribute('aria-label');
    if (ariaLabel) {
      return ariaLabel;
    }

    return '';
  }

  throttle(func, delay) {
    let timeoutId;
    let lastExecTime = 0;
    return function (...args) {
      const currentTime = Date.now();
      
      if (currentTime - lastExecTime > delay) {
        func.apply(this, args);
        lastExecTime = currentTime;
      } else {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          func.apply(this, args);
          lastExecTime = Date.now();
        }, delay - (currentTime - lastExecTime));
      }
    };
  }

  showTrackingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'codesight-tracking-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: rgba(34, 197, 94, 0.9);
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 12px;
      z-index: 999999;
      pointer-events: none;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      min-width: 200px;
    `;
    
    // Create activity log area
    const logArea = document.createElement('div');
    logArea.id = 'codesight-activity-log';
    logArea.style.cssText = `
      position: fixed;
      top: 50px;
      right: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #00ff00;
      padding: 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 10px;
      z-index: 999998;
      pointer-events: none;
      max-height: 300px;
      overflow-y: auto;
      min-width: 300px;
      display: none;
    `;
    
    this.updateIndicatorText(indicator);
    document.body.appendChild(indicator);
    document.body.appendChild(logArea);
    
    // Toggle log visibility on click
    indicator.style.pointerEvents = 'auto';
    indicator.style.cursor = 'pointer';
    indicator.addEventListener('click', () => {
      const log = document.getElementById('codesight-activity-log');
      log.style.display = log.style.display === 'none' ? 'block' : 'none';
    });
  }

  updateIndicatorText(indicator = null) {
    if (!indicator) {
      indicator = document.getElementById('codesight-tracking-indicator');
    }
    if (indicator) {
      indicator.innerHTML = `
        🎯 CodeSight Tracking<br>
        <small>Events: ${this.events.length} | Click to toggle log</small>
      `;
    }
  }

  addToActivityLog(type, summary) {
    const timestamp = new Date().toLocaleTimeString();
    let color = '#00ff00';
    if (type === 'click') color = '#ff6b6b';
    else if (type === 'input') color = '#4ecdc4';
    else if (type === 'scroll') color = '#45b7d1';
    else if (type === 'navigation') color = '#f9ca24';
    
    // Store in persistent array
    const logEntry = {
      timestamp,
      type,
      summary,
      color,
      url: window.location.href
    };
    
    this.persistentLogEntries.push(logEntry);
    
    // Keep only last 100 entries
    if (this.persistentLogEntries.length > 100) {
      this.persistentLogEntries = this.persistentLogEntries.slice(-100);
    }
    
    // Add to DOM if log exists
    const log = document.getElementById('codesight-activity-log');
    if (log) {
      const entry = document.createElement('div');
      entry.style.cssText = 'margin-bottom: 2px; border-bottom: 1px solid #333; padding-bottom: 2px;';
      entry.innerHTML = `<span style="color: ${color}">[${timestamp}] ${type.toUpperCase()}</span>: ${summary}`;
      
      log.appendChild(entry);
      log.scrollTop = log.scrollHeight;
      
      // Keep DOM clean
      while (log.children.length > 50) {
        log.removeChild(log.firstChild);
      }
    }
    
    // Save state and update counter
    this.saveState();
    this.updateIndicatorText();
  }

  restoreActivityLog() {
    const log = document.getElementById('codesight-activity-log');
    if (!log || this.persistentLogEntries.length === 0) return;
    
    // Clear existing entries
    log.innerHTML = '';
    
    // Add last 50 entries
    const entriesToShow = this.persistentLogEntries.slice(-50);
    entriesToShow.forEach(logEntry => {
      const entry = document.createElement('div');
      entry.style.cssText = 'margin-bottom: 2px; border-bottom: 1px solid #333; padding-bottom: 2px;';
      entry.innerHTML = `<span style="color: ${logEntry.color}">[${logEntry.timestamp}] ${logEntry.type.toUpperCase()}</span>: ${logEntry.summary}`;
      log.appendChild(entry);
    });
    
    log.scrollTop = log.scrollHeight;
    console.log(`CodeSight: Restored ${entriesToShow.length} log entries`);
  }

  hideTrackingIndicator() {
    const indicator = document.getElementById('codesight-tracking-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  showClickIndicator(x, y) {
    const indicator = document.createElement('div');
    indicator.style.cssText = `
      position: fixed;
      left: ${x - 5}px;
      top: ${y - 5}px;
      width: 10px;
      height: 10px;
      background: rgba(239, 68, 68, 0.8);
      border-radius: 50%;
      z-index: 1000000;
      pointer-events: none;
      animation: codesightClickPulse 0.6s ease-out;
    `;

    if (!document.querySelector('#codesight-click-styles')) {
      const style = document.createElement('style');
      style.id = 'codesight-click-styles';
      style.textContent = `
        @keyframes codesightClickPulse {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(3); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(indicator);
    setTimeout(() => {
      if (indicator.parentElement) {
        indicator.parentElement.removeChild(indicator);
      }
    }, 600);
  }
}

// Initialize trackers
console.log('CodeSight: Content script loaded');

// Wait a bit for enhanced tracker to load, then initialize
setTimeout(() => {
  // Try enhanced tracker first - check for both class and instance
  let activeTracker;
  if (window.enhancedTracker && window.EnhancedShoppingTracker) {
    activeTracker = window.enhancedTracker;
    console.log('CodeSight: Using existing enhanced tracker instance');
  } else if (window.EnhancedShoppingTracker) {
    activeTracker = new EnhancedShoppingTracker();
    window.enhancedTracker = activeTracker;
    console.log('CodeSight: Enhanced tracker initialized');
  } else {
    // Only create basic tracker if no enhanced tracker exists
    if (!window.activeTracker) {
      activeTracker = new ShoppingTracker();
      console.log('CodeSight: Basic tracker initialized (enhanced not available)');
    } else {
      activeTracker = window.activeTracker;
      console.log('CodeSight: Using existing active tracker');
    }
  }

  // Only set if not already set
  if (!window.activeTracker) {
    window.activeTracker = activeTracker;
  }
  window.ShoppingTracker = ShoppingTracker;
}, 100);

})(); // End of IIFE