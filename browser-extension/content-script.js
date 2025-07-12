// CodeSight Shopping Behavior Tracker - Content Script
class ShoppingTracker {
  constructor() {
    this.isTracking = false;
    this.sessionId = null;
    this.events = [];
    this.startTime = 0;
    
    this.initializeTracker();
  }

  initializeTracker() {
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
  }

  startTracking(sessionId) {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.sessionId = sessionId;
    this.startTime = Date.now();
    this.events = [];
    
    this.bindEvents();
    this.showTrackingIndicator();
    
    // Send initial page load event
    this.captureEvent('navigation', {
      url: window.location.href,
      title: document.title,
      timestamp: Date.now()
    });
  }

  stopTracking() {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    this.unbindEvents();
    this.hideTrackingIndicator();
    
    // Send final data to background script
    chrome.runtime.sendMessage({
      action: 'TRACKING_COMPLETE',
      sessionId: this.sessionId,
      events: this.events
    });
    
    return this.events;
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
    `;
    indicator.textContent = '🎯 CodeSight Tracking';
    document.body.appendChild(indicator);
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

// Initialize tracker
const shoppingTracker = new ShoppingTracker();