// Enhanced Content Script with Advanced Capture Capabilities
(function() {
  'use strict';
  
  // Prevent redeclaration and multiple injections
  if (window.EnhancedShoppingTracker || window.ENHANCED_SCRIPT_LOADED) {
    console.log('Enhanced tracker already loaded, skipping redefinition');
    return;
  }
  
  // Mark script as loaded
  window.ENHANCED_SCRIPT_LOADED = true;

class EnhancedShoppingTracker {
  constructor() {
    this.isTracking = false;
    this.sessionId = null;
    this.events = [];
    this.startTime = 0;
    this.screenshotQueue = [];
    this.domSnapshots = new Map();
    this.mutationObserver = null;
    this.currentUrl = window.location.href;
    
    this.initializeTracker();
  }

  // Enhanced click capture with full context
  async handleClick(event) {
    if (!this.isTracking) return;
    
    const element = event.target;
    const timestamp = Date.now();
    
    // Skip invisible or very small elements (likely tracking pixels)
    const rect = element.getBoundingClientRect();
    if (rect.width < 5 && rect.height < 5) {
      console.log('Enhanced: Skipping tiny element (likely tracking pixel)');
      return;
    }
    
    // Capture screenshot before any state changes
    const screenshot = await this.captureScreenshot('click', timestamp);
    
    // Get all possible selectors
    const selectors = this.generateAllSelectors(element);
    
    // Capture DOM context
    const domContext = this.captureDOMContext(element);
    
    // Get computed styles
    const computedStyles = this.getComputedStyles(element);
    
    // Find nearby interactive elements
    const nearbyElements = this.findNearbyElements(element);
    
    // Capture page state
    const pageState = this.capturePageState();
    
    const enhancedClickData = {
      type: 'click',
      timestamp,
      sessionTime: Date.now() - this.startTime,
      
      // Element identification
      selectors: {
        primary: selectors.primary,
        alternatives: selectors.alternatives,
        xpath: selectors.xpath,
        fullPath: selectors.fullPath
      },
      
      // Visual context
      visual: {
        screenshot: screenshot.id,
        boundingBox: this.getBoundingBox(element),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          scrollX: window.scrollX,
          scrollY: window.scrollY
        },
        isInViewport: this.isElementInViewport(element),
        percentVisible: this.getElementVisibility(element)
      },
      
      // Element details
      element: {
        tagName: element.tagName.toLowerCase(),
        text: this.getElementText(element),
        value: element.value || null,
        attributes: this.getAllAttributes(element),
        computedStyles: computedStyles,
        isInteractive: this.isInteractiveElement(element),
        role: element.getAttribute('role') || this.inferElementRole(element)
      },
      
      // DOM context
      context: {
        parentElements: domContext.parents,
        siblings: domContext.siblings,
        nearbyElements: nearbyElements,
        pageStructure: this.analyzePageStructure()
      },
      
      // State information
      state: {
        before: pageState,
        url: window.location.href,
        pageTitle: document.title,
        activeElement: document.activeElement?.tagName
      },
      
      // User interaction details
      interaction: {
        coordinates: {
          clientX: event.clientX,
          clientY: event.clientY,
          pageX: event.pageX,
          pageY: event.pageY,
          offsetX: event.offsetX,
          offsetY: event.offsetY
        },
        modifiers: {
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          metaKey: event.metaKey
        },
        button: event.button
      }
    };
    
    // Capture what happens after the click
    setTimeout(async () => {
      enhancedClickData.state.after = this.capturePageState();
      enhancedClickData.state.changes = this.detectStateChanges(
        enhancedClickData.state.before,
        enhancedClickData.state.after
      );
      
      // Update the event with post-click data
      this.updateEvent(enhancedClickData);
      
      console.log('Enhanced: Updated event with post-click state:', enhancedClickData.state.changes);
    }, 1000); // Increased from 500ms to 1000ms
    
    this.captureEvent('click', enhancedClickData);
  }

  // Generate all possible selectors for an element
  generateAllSelectors(element) {
    const selectors = {
      primary: null,
      alternatives: [],
      xpath: null,
      fullPath: null
    };
    
    // Priority 1: ID selector
    if (element.id) {
      selectors.primary = `#${element.id}`;
      selectors.alternatives.push(selectors.primary);
    }
    
    // Priority 2: Data attributes
    const dataAttrs = ['data-testid', 'data-test', 'data-cy', 'data-qa'];
    for (const attr of dataAttrs) {
      const value = element.getAttribute(attr);
      if (value) {
        const selector = `[${attr}="${value}"]`;
        if (!selectors.primary) selectors.primary = selector;
        selectors.alternatives.push(selector);
      }
    }
    
    // Priority 3: ARIA attributes
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) {
      const selector = `[aria-label="${ariaLabel}"]`;
      if (!selectors.primary) selectors.primary = selector;
      selectors.alternatives.push(selector);
    }
    
    // Priority 4: Role + text
    const role = element.getAttribute('role');
    const text = this.getElementText(element);
    if (role && text) {
      const selector = `[role="${role}"]:contains("${text}")`;
      selectors.alternatives.push(selector);
    }
    
    // Priority 5: Class-based selector
    if (element.className && typeof element.className === 'string') {
      const classes = element.className.split(' ')
        .filter(c => c.trim() && !c.match(/^(active|hover|focus)/));
      if (classes.length > 0) {
        const selector = '.' + classes.join('.');
        if (!selectors.primary) selectors.primary = selector;
        selectors.alternatives.push(selector);
      }
    }
    
    // Priority 6: Tag + attributes
    const tagSelector = this.buildTagSelector(element);
    if (!selectors.primary) selectors.primary = tagSelector;
    selectors.alternatives.push(tagSelector);
    
    // Generate XPath
    selectors.xpath = this.getXPath(element);
    
    // Generate full CSS path
    selectors.fullPath = this.getFullCSSPath(element);
    
    // Remove duplicates
    selectors.alternatives = [...new Set(selectors.alternatives)];
    
    return selectors;
  }

  // Capture DOM context around element
  captureDOMContext(element) {
    const context = {
      parents: [],
      siblings: [],
      domPath: []
    };
    
    // Capture parent hierarchy
    let parent = element.parentElement;
    let depth = 0;
    while (parent && depth < 5) {
      context.parents.push({
        tagName: parent.tagName.toLowerCase(),
        id: parent.id || null,
        className: (typeof parent.className === 'string' ? parent.className : parent.className?.baseVal) || null,
        role: parent.getAttribute('role'),
        selector: this.generateAllSelectors(parent).primary
      });
      parent = parent.parentElement;
      depth++;
    }
    
    // Capture siblings
    if (element.parentElement) {
      const siblings = Array.from(element.parentElement.children);
      const elementIndex = siblings.indexOf(element);
      
      // Get previous and next siblings
      for (let i = Math.max(0, elementIndex - 2); i <= Math.min(siblings.length - 1, elementIndex + 2); i++) {
        if (i !== elementIndex) {
          const sibling = siblings[i];
          context.siblings.push({
            position: i < elementIndex ? 'before' : 'after',
            distance: Math.abs(i - elementIndex),
            tagName: sibling.tagName.toLowerCase(),
            text: this.getElementText(sibling),
            selector: this.generateAllSelectors(sibling).primary
          });
        }
      }
    }
    
    return context;
  }

  // Get computed styles relevant for interaction
  getComputedStyles(element) {
    const computed = window.getComputedStyle(element);
    const relevantProps = [
      'display', 'visibility', 'position', 'zIndex',
      'width', 'height', 'padding', 'margin',
      'backgroundColor', 'color', 'fontSize',
      'cursor', 'pointerEvents', 'opacity',
      'transform', 'transition'
    ];
    
    const styles = {};
    relevantProps.forEach(prop => {
      styles[prop] = computed.getPropertyValue(prop);
    });
    
    return styles;
  }

  // Find nearby interactive elements
  findNearbyElements(targetElement, radius = 200) {
    const nearby = [];
    const targetRect = targetElement.getBoundingClientRect();
    const targetCenter = {
      x: targetRect.left + targetRect.width / 2,
      y: targetRect.top + targetRect.height / 2
    };
    
    console.log('Enhanced: Target element center:', targetCenter, 'rect:', targetRect);
    
    // Find all interactive elements
    const interactiveSelectors = 'a, button, input, select, textarea, [role="button"], [onclick], [data-clickable]';
    const candidates = document.querySelectorAll(interactiveSelectors);
    
    candidates.forEach(element => {
      if (element === targetElement) return;
      
      const rect = element.getBoundingClientRect();
      const center = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
      
      const distance = Math.sqrt(
        Math.pow(center.x - targetCenter.x, 2) +
        Math.pow(center.y - targetCenter.y, 2)
      );
      
      if (distance <= radius) {
        nearby.push({
          selector: this.generateAllSelectors(element).primary,
          tagName: element.tagName.toLowerCase(),
          text: this.getElementText(element),
          distance: Math.round(distance),
          direction: this.getRelativeDirection(targetCenter, center),
          isVisible: this.isElementVisible(element)
        });
      }
    });
    
    // Sort by distance
    nearby.sort((a, b) => a.distance - b.distance);
    
    console.log('Enhanced: Found', nearby.length, 'nearby elements within', radius, 'px');
    
    return nearby.slice(0, 10); // Return closest 10
  }

  // Capture current page state
  capturePageState() {
    return {
      url: window.location.href,
      title: document.title,
      readyState: document.readyState,
      documentHeight: document.documentElement.scrollHeight,
      viewportHeight: window.innerHeight,
      scrollPosition: {
        x: window.scrollX,
        y: window.scrollY
      },
      activeModals: this.detectActiveModals(),
      formData: this.captureFormStates(),
      visibleProducts: this.countVisibleProducts()
    };
  }

  // Capture screenshot using Chrome API
  async captureScreenshot(eventType, timestamp) {
    console.log(`Enhanced: captureScreenshot called with eventType: ${eventType}, timestamp: ${timestamp}`);
    return new Promise((resolve) => {
      // Send message to background script to capture
      chrome.runtime.sendMessage({
        action: 'CAPTURE_SCREENSHOT',
        data: {
          eventType,
          timestamp,
          viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            scrollX: window.scrollX,
            scrollY: window.scrollY
          }
        }
      }, (response) => {
        if (response && response.screenshotId) {
          this.screenshotQueue.push({
            id: response.screenshotId,
            timestamp,
            eventType
          });
          resolve({
            id: response.screenshotId,
            dataUrl: response.dataUrl
          });
        } else {
          resolve({ id: null, dataUrl: null });
        }
      });
    });
  }

  // Helper methods
  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0';
  }

  isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  }

  getElementVisibility(element) {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
    const visibleWidth = Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
    
    const visibleArea = Math.max(0, visibleHeight) * Math.max(0, visibleWidth);
    const totalArea = rect.height * rect.width;
    
    return totalArea > 0 ? (visibleArea / totalArea) * 100 : 0;
  }

  detectActiveModals() {
    const modalSelectors = [
      '[role="dialog"]',
      '.modal:visible',
      '.popup:visible',
      '[class*="modal"][style*="display: block"]',
      '[class*="overlay"][style*="visible"]'
    ];
    
    const modals = [];
    modalSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (this.isElementVisible(el)) {
            modals.push({
              selector: this.generateAllSelectors(el).primary,
              zIndex: window.getComputedStyle(el).zIndex
            });
          }
        });
      } catch (e) {
        // Invalid selector, skip
      }
    });
    
    return modals;
  }

  getXPath(element) {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }
    
    const parts = [];
    while (element && element.nodeType === Node.ELEMENT_NODE) {
      let index = 0;
      let sibling = element.previousSibling;
      
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === element.tagName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }
      
      const tagName = element.tagName.toLowerCase();
      const part = index > 0 ? `${tagName}[${index + 1}]` : tagName;
      parts.unshift(part);
      
      element = element.parentElement;
    }
    
    return parts.length ? '/' + parts.join('/') : null;
  }

  // Additional helper methods
  buildTagSelector(element) {
    let selector = element.tagName.toLowerCase();
    
    // Add important attributes
    const importantAttrs = ['name', 'type', 'role'];
    importantAttrs.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        selector += `[${attr}="${value}"]`;
      }
    });
    
    return selector;
  }

  getFullCSSPath(element) {
    const names = [];
    while (element.parentNode) {
      if (element.id) {
        names.unshift('#' + element.id);
        break;
      } else {
        let tagName = element.nodeName.toLowerCase();
        if (element.className && typeof element.className === 'string') {
          tagName += '.' + element.className.split(' ').join('.');
        }
        
        const siblings = Array.from(element.parentNode.children);
        const sameTagSiblings = siblings.filter(sibling => 
          sibling.nodeName === element.nodeName
        );
        
        if (sameTagSiblings.length > 1) {
          const index = sameTagSiblings.indexOf(element) + 1;
          tagName += `:nth-of-type(${index})`;
        }
        
        names.unshift(tagName);
        element = element.parentNode;
      }
    }
    return names.join(' > ');
  }

  getElementText(element) {
    // Get direct text content, not including children
    const textNodes = [];
    for (let node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        textNodes.push(node.textContent.trim());
      }
    }
    
    let text = textNodes.join(' ').trim();
    
    // Fallback to full text content if no direct text
    if (!text) {
      text = element.textContent?.trim() || '';
    }
    
    // Also check common attributes
    if (!text) {
      text = element.value || 
             element.placeholder || 
             element.alt || 
             element.title || 
             element.getAttribute('aria-label') || '';
    }
    
    return text.length > 100 ? text.substring(0, 100) + '...' : text;
  }

  getAllAttributes(element) {
    const attrs = {};
    for (let attr of element.attributes) {
      attrs[attr.name] = attr.value;
    }
    return attrs;
  }

  isInteractiveElement(element) {
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
    const interactiveRoles = ['button', 'link', 'tab', 'menuitem'];
    
    return interactiveTags.includes(element.tagName.toLowerCase()) ||
           interactiveRoles.includes(element.getAttribute('role')) ||
           element.onclick ||
           element.getAttribute('onclick') ||
           element.style.cursor === 'pointer';
  }

  inferElementRole(element) {
    const tag = element.tagName.toLowerCase();
    
    switch (tag) {
      case 'button':
        return 'button';
      case 'a':
        return 'link';
      case 'input':
        return element.type || 'input';
      case 'select':
        return 'combobox';
      case 'textarea':
        return 'textbox';
      default:
        if (element.onclick || element.getAttribute('onclick')) {
          return 'button';
        }
        return null;
    }
  }

  getBoundingBox(element) {
    const rect = element.getBoundingClientRect();
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      top: Math.round(rect.top),
      left: Math.round(rect.left),
      bottom: Math.round(rect.bottom),
      right: Math.round(rect.right)
    };
  }

  getRelativeDirection(center1, center2) {
    const deltaX = center2.x - center1.x;
    const deltaY = center2.y - center1.y;
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'below' : 'above';
    }
  }

  analyzePageStructure() {
    return {
      hasNavigation: !!document.querySelector('nav, [role="navigation"]'),
      hasSearch: !!document.querySelector('input[type="search"], [role="searchbox"]'),
      hasFilters: !!document.querySelectorAll('[class*="filter"], [data-filter]').length,
      productGridExists: !!document.querySelector('[class*="grid"], [class*="list"], [data-products]'),
      hasShoppingCart: !!document.querySelector('[class*="cart"], [data-cart]'),
      hasPagination: !!document.querySelector('[class*="page"], [aria-label*="page"]'),
      totalElements: document.querySelectorAll('*').length,
      interactiveElements: document.querySelectorAll('button, a, input, select, textarea, [role="button"]').length
    };
  }

  detectStateChanges(stateBefore, stateAfter) {
    const changes = {};
    
    // URL change
    if (stateBefore.url !== stateAfter.url) {
      changes.urlChanged = {
        from: stateBefore.url,
        to: stateAfter.url
      };
    }
    
    // Title change
    if (stateBefore.title !== stateAfter.title) {
      changes.titleChanged = {
        from: stateBefore.title,
        to: stateAfter.title
      };
    }
    
    // Scroll change
    if (stateBefore.scrollPosition.y !== stateAfter.scrollPosition.y) {
      changes.scrollChanged = {
        from: stateBefore.scrollPosition.y,
        to: stateAfter.scrollPosition.y,
        delta: stateAfter.scrollPosition.y - stateBefore.scrollPosition.y
      };
    }
    
    // Modal changes
    const beforeModals = stateBefore.activeModals?.length || 0;
    const afterModals = stateAfter.activeModals?.length || 0;
    if (beforeModals !== afterModals) {
      changes.modalStateChanged = {
        before: beforeModals,
        after: afterModals
      };
    }
    
    // Product count changes
    if (stateBefore.visibleProducts !== stateAfter.visibleProducts) {
      changes.productCountChanged = {
        from: stateBefore.visibleProducts,
        to: stateAfter.visibleProducts
      };
    }
    
    return changes;
  }

  captureFormStates() {
    const forms = document.querySelectorAll('form');
    const formData = [];
    
    forms.forEach((form, index) => {
      const inputs = form.querySelectorAll('input, select, textarea');
      const formState = {
        formIndex: index,
        action: form.action,
        method: form.method,
        fields: []
      };
      
      inputs.forEach(input => {
        formState.fields.push({
          name: input.name,
          type: input.type,
          value: input.type === 'password' ? '[HIDDEN]' : input.value,
          required: input.required
        });
      });
      
      formData.push(formState);
    });
    
    return formData;
  }

  countVisibleProducts() {
    // Try to detect product elements by common patterns
    const productSelectors = [
      '[data-product]',
      '[class*="product"]',
      '[class*="item"]',
      '[itemtype*="Product"]'
    ];
    
    let count = 0;
    productSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          if (this.isElementVisible(el)) {
            count++;
          }
        });
      } catch (e) {
        // Invalid selector
      }
    });
    
    return count;
  }

  updateEvent(eventData) {
    // Find and update the event in the events array
    const index = this.events.findIndex(e => 
      e.data.timestamp === eventData.timestamp && 
      e.data.type === eventData.type
    );
    
    if (index !== -1) {
      this.events[index].data = eventData;
    }
  }

  captureEvent(type, data) {
    const event = {
      type,
      data,
      sessionId: this.sessionId
    };
    
    this.events.push(event);
    
    // Save state after each event
    this.saveState();
    
    // Update indicator
    this.updateIndicatorText();
    
    // Send to background script
    chrome.runtime.sendMessage({
      action: 'EVENT_CAPTURED',
      event: event
    });
    
    console.log('Enhanced event captured:', type, data);
  }

  // Initialize enhanced tracker
  initializeTracker() {
    // Listen for messages from popup/background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'START_TRACKING':
          this.startTracking(message.sessionId);
          sendResponse({ success: true });
          break;
        case 'STOP_TRACKING':
          // Call stopTracking without await since message handlers can't be async
          this.stopTracking().then(() => {
            sendResponse({ success: true, events: this.events });
          }).catch((error) => {
            console.error('Enhanced: stopTracking failed:', error);
            sendResponse({ success: false, error: error.message });
          });
          return true; // Keep message channel open for async response
        case 'GET_STATUS':
          sendResponse({ 
            isTracking: this.isTracking, 
            eventCount: this.events.length 
          });
          break;
      }
      return false; // Don't keep channel open for sync responses
    });

    // Handle page navigation like the basic tracker
    this.setupNavigationHandling();

    // Restore state if tracking was active
    this.restoreState();
  }

  // Setup navigation handling with burst screenshots
  setupNavigationHandling() {
    // Check for URL changes periodically
    setInterval(() => {
      if (this.isTracking) {
        // Debug: Check if we detect the URL change
        if (window.location.href !== this.currentUrl) {
          console.log('Enhanced: Page navigation detected', this.currentUrl, '->', window.location.href);
          console.log('Enhanced: About to start burst mode for page_navigation');
        
          // Start navigation burst mode
          this.startBurstMode('page_navigation');
        
          // Capture navigation event
          this.captureEvent('navigation', {
            from: this.currentUrl,
            to: window.location.href,
            title: document.title,
            timestamp: Date.now()
          });
          
          this.currentUrl = window.location.href;
          
          // Re-establish tracking on new page
          setTimeout(() => {
            if (this.isTracking) {
              this.rebindEventsAfterNavigation();
            }
          }, 500);
        }
      }
    }, 1000);

    // Also listen for popstate events
    window.addEventListener('popstate', () => {
      if (this.isTracking) {
        console.log('Enhanced: Popstate navigation detected');
        this.startBurstMode('page_navigation');
        setTimeout(() => {
          this.rebindEventsAfterNavigation();
        }, 500);
      }
    });

    // Setup DOM mutation observer for overlays/modals
    this.setupModalDetection();
  }

  setupModalDetection() {
    this.mutationObserver = new MutationObserver((mutations) => {
      if (!this.isTracking) return;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (this.isModalOrOverlay(node)) {
                console.log('Enhanced: Modal/overlay detected');
                this.startBurstMode('overlay_detected');
              }
            }
          });
        }
      });
    });

    // Start observing
    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  isModalOrOverlay(element) {
    const modalSelectors = [
      'modal', 'popup', 'overlay', 'dialog', 'tooltip', 'dropdown',
      'flyout', 'popover', 'menu', 'lightbox'
    ];
    
    const className = (typeof element.className === 'string' ? element.className : element.className?.baseVal || '').toLowerCase();
    const role = element.getAttribute('role');
    
    // Check class names
    if (modalSelectors.some(selector => className.includes(selector))) {
      return true;
    }
    
    // Check role attributes
    if (role && ['dialog', 'menu', 'tooltip', 'popup'].includes(role)) {
      return true;
    }
    
    // Check z-index (modals usually have high z-index)
    const computedStyle = window.getComputedStyle(element);
    const zIndex = parseInt(computedStyle.zIndex);
    if (zIndex > 100) {
      return true;
    }
    
    return false;
  }

  startBurstMode(trigger) {
    console.log(`Enhanced: Starting burst mode for ${trigger}`);
    
    if (trigger === 'page_navigation') {
      // 3 shots over 2 seconds for page transitions
      console.log('Enhanced: Taking nav screenshot 1');
      this.captureScreenshot('burst_nav_1', Date.now());
      setTimeout(() => {
        if (this.isTracking) {
          console.log('Enhanced: Taking nav screenshot 2');
          this.captureScreenshot('burst_nav_2', Date.now());
        }
      }, 1000);
      setTimeout(() => {
        if (this.isTracking) {
          console.log('Enhanced: Taking nav screenshot 3');
          this.captureScreenshot('burst_nav_3', Date.now());
        }
      }, 2000);
      
    } else if (trigger === 'overlay_detected') {
      // 8 shots over 4 seconds for modals/overlays (every 0.5 seconds)
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          if (this.isTracking) this.captureScreenshot(`burst_modal_${i + 1}`, Date.now());
        }, i * 500);
      }
    }
  }

  rebindEventsAfterNavigation() {
    console.log('Enhanced: Re-establishing tracking after navigation');
    // Events should still be bound, but let's make sure
  }

  // State persistence (like basic tracker)
  saveState() {
    if (this.sessionId) {
      sessionStorage.setItem('codesight-enhanced-state', JSON.stringify({
        isTracking: this.isTracking,
        sessionId: this.sessionId,
        startTime: this.startTime,
        eventCount: this.events.length,
        allEvents: this.events
      }));
    }
  }

  restoreState() {
    const saved = sessionStorage.getItem('codesight-enhanced-state');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        this.isTracking = state.isTracking;
        this.sessionId = state.sessionId;
        this.startTime = state.startTime || Date.now();
        this.events = state.allEvents || [];
        
        if (this.isTracking) {
          console.log(`Enhanced: Restored tracking state for session: ${this.sessionId} with ${this.events.length} events`);
          this.bindEvents();
        }
      } catch (error) {
        console.log('Enhanced: Failed to restore state:', error);
      }
    }
  }

  bindEvents() {
    // Bind enhanced event handlers with stored references for proper removal
    this.boundHandleClick = this.handleClick.bind(this);
    document.addEventListener('click', this.boundHandleClick, true);
  }

  startTracking(sessionId) {
    if (this.isTracking) return;
    
    this.isTracking = true;
    this.sessionId = sessionId;
    this.startTime = Date.now();
    this.events = [];
    
    // Bind enhanced event handlers
    this.bindEvents();
    
    // Show tracking indicator
    this.showTrackingIndicator();
    
    // Save state for persistence across navigation
    this.saveState();
    
    console.log('Enhanced tracking started for session:', sessionId);
  }

  async stopTracking() {
    if (!this.isTracking) return;
    
    this.isTracking = false;
    
    // Unbind events (store bound functions to properly remove them)
    if (this.boundHandleClick) {
      document.removeEventListener('click', this.boundHandleClick, true);
    }
    
    // Stop mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    
    // Hide tracking indicator
    this.hideTrackingIndicator();
    
    // Create downloadable file with enhanced session data
    try {
      await this.downloadSessionData();
    } catch (error) {
      console.error('Enhanced: Download failed:', error);
      alert('Download failed - check console for details');
    }
    
    // Send final data to background script
    try {
      chrome.runtime.sendMessage({
        action: 'TRACKING_COMPLETE',
        sessionId: this.sessionId,
        events: this.events
      });
    } catch (error) {
      console.error('Enhanced: Failed to send tracking complete:', error);
    }
    
    // Clear persistent state
    sessionStorage.removeItem('codesight-enhanced-state');
    
    console.log('Enhanced tracking stopped. Events captured:', this.events.length);
    return this.events;
  }

  async downloadSessionData() {
    console.log('Enhanced: Starting download process...');
    console.log('Enhanced: Events to download:', this.events.length);
    
    // Fetch screenshot data from background script
    console.log('Enhanced: Fetching screenshots from background...');
    const screenshotData = await this.getSessionScreenshots();
    
    // Process screenshots and create file mapping
    const screenshotFiles = [];
    const screenshotMetadata = [];
    
    screenshotData.forEach((screenshot, index) => {
      // Create descriptive filename with timestamp and event type
      const timestamp = screenshot.metadata.timestamp;
      const eventType = screenshot.metadata.eventType || 'unknown';
      const filename = `screenshot_${this.sessionId}_${index}_${eventType}_${timestamp}.png`;
      
      // Convert base64 to blob for separate file download
      const base64Data = screenshot.dataUrl.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      
      screenshotFiles.push({ filename, blob });
      
      // Store metadata without the large data_url
      screenshotMetadata.push({
        id: screenshot.id,
        filename: filename,
        timestamp: timestamp,
        eventType: eventType,
        viewport: screenshot.metadata.viewport,
        size: blob.size
      });
    });
    
    const sessionData = {
      sessionId: this.sessionId,
      startTime: new Date(this.startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      totalEvents: this.events.length,
      events: this.enrichEventsWithScreenshots(this.events, screenshotData, screenshotMetadata),
      screenshots: screenshotMetadata, // Only metadata, not full data
      summary: {
        clicks: this.events.filter(e => e.type === 'click').length,
        inputs: this.events.filter(e => e.type === 'input').length,
        scrolls: this.events.filter(e => e.type === 'scroll').length,
        navigations: this.events.filter(e => e.type === 'navigation').length,
        screenshots: screenshotData.length,
        pagesVisited: [...new Set(this.events.map(e => e.data.url || e.data.state?.url).filter(Boolean))],
        enhancedData: {
          multipleSelectors: this.events.filter(e => e.data.selectors?.alternatives?.length > 1).length,
          visualContext: this.events.filter(e => e.data.visual?.screenshot).length,
          nearbyElements: this.events.filter(e => e.data.context?.nearbyElements?.length > 0).length,
          stateChanges: this.events.filter(e => e.data.state?.changes && Object.keys(e.data.state.changes).length > 0).length,
          screenshotsWithData: screenshotData.length
        }
      }
    };

    console.log('Enhanced: Session summary:', sessionData.summary);

    try {
      // Download JSON file
      const dataStr = JSON.stringify(sessionData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const jsonUrl = URL.createObjectURL(dataBlob);
      
      const baseFilename = `codesight-enhanced-session-${this.sessionId}-${new Date().toISOString().slice(0,10)}`;
      const jsonFilename = `${baseFilename}.json`;
      
      console.log('Enhanced: Creating JSON download:', jsonFilename);
      
      const jsonLink = document.createElement('a');
      jsonLink.href = jsonUrl;
      jsonLink.download = jsonFilename;
      jsonLink.style.display = 'none';
      document.body.appendChild(jsonLink);
      jsonLink.click();
      
      // Download screenshot files
      console.log('Enhanced: Downloading', screenshotFiles.length, 'screenshot files...');
      screenshotFiles.forEach((file, index) => {
        setTimeout(() => {
          const url = URL.createObjectURL(file.blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = file.filename;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 100);
        }, index * 100); // Stagger downloads by 100ms
      });
      
      // Cleanup JSON download
      setTimeout(() => {
        document.body.removeChild(jsonLink);
        URL.revokeObjectURL(jsonUrl);
        console.log('Enhanced: Download cleanup completed');
      }, screenshotFiles.length * 100 + 500);
      
      // Show alert with enhanced data stats
      alert(`Enhanced CodeSight: Session data downloaded!\nFiles: ${jsonFilename} + ${screenshotFiles.length} screenshots\nEvents: ${sessionData.totalEvents}\nScreenshots: ${screenshotData.length}\nEnhanced Features: ${sessionData.summary.enhancedData.multipleSelectors} multi-selectors, ${sessionData.summary.enhancedData.visualContext} visual contexts`);
      
    } catch (error) {
      console.error('Enhanced: Download failed:', error);
      alert('Enhanced CodeSight: Download failed - check console for details');
    }
  }

  async getSessionScreenshots() {
    return new Promise((resolve) => {
      console.log('Enhanced: Requesting screenshots for session:', this.sessionId);
      
      // Set a timeout in case the message never gets a response
      const timeout = setTimeout(() => {
        console.log('Enhanced: Screenshot request timed out, continuing without screenshots');
        resolve([]);
      }, 5000);
      
      try {
        chrome.runtime.sendMessage({
          action: 'GET_SESSION_SCREENSHOTS',
          sessionId: this.sessionId
        }, (response) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            console.error('Enhanced: Runtime error fetching screenshots:', chrome.runtime.lastError);
            resolve([]);
            return;
          }
          
          if (response && response.screenshots) {
            console.log('Enhanced: Retrieved', response.screenshots.length, 'screenshots');
            resolve(response.screenshots);
          } else {
            console.log('Enhanced: No screenshots found in response:', response);
            resolve([]);
          }
        });
      } catch (error) {
        clearTimeout(timeout);
        console.error('Enhanced: Failed to fetch screenshots:', error);
        resolve([]);
      }
    });
  }

  enrichEventsWithScreenshots(events, screenshots, screenshotMetadata = null) {
    // Create a map of screenshot IDs to screenshot data
    const screenshotMap = new Map();
    screenshots.forEach(screenshot => {
      screenshotMap.set(screenshot.id, screenshot);
    });

    // Enrich events with full screenshot data in AI-training friendly format
    return events.map((event, index) => {
      const enrichedEvent = {
        // Training sequence info
        sequence_id: index + 1,
        session_id: this.sessionId,
        
        // Timing correlation (CRITICAL for AI training)
        timing: {
          event_timestamp: event.data.timestamp,
          session_time_ms: event.data.sessionTime,
          human_readable: new Date(event.data.timestamp).toISOString()
        },
        
        // User action (what the AI needs to learn)
        user_action: {
          type: event.data.type,
          target_element: {
            tag: event.data.element?.tagName,
            text: event.data.element?.text,
            selectors: event.data.selectors,
            coordinates: event.data.interaction?.coordinates,
            bounding_box: event.data.visual?.boundingBox
          }
        },
        
        // Visual context (screenshot + metadata)
        visual_context: this.createVisualContext(event, screenshotMap, screenshotMetadata),
        
        // Page context
        page_context: {
          url: event.data.state?.url,
          title: event.data.state?.pageTitle,
          viewport: event.data.visual?.viewport,
          dom_structure: event.data.context
        },
        
        // State changes (what happened after the action)
        result: {
          state_changes: event.data.state?.changes || {},
          navigation_occurred: !!(event.data.state?.changes?.urlChanged),
          modal_changes: this.detectModalChanges(event.data.state)
        },
        
        // Original event data (for debugging)
        _original: event.data
      };
      
      return enrichedEvent;
    });
  }

  createVisualContext(event, screenshotMap, screenshotMetadata = null) {
    if (!event.data?.visual?.screenshot) {
      return {
        screenshot_available: false,
        reason: "No screenshot captured for this event"
      };
    }

    const screenshotId = event.data.visual.screenshot;
    const screenshotInfo = screenshotMap.get(screenshotId);
    
    if (!screenshotInfo) {
      return {
        screenshot_available: false,
        screenshot_id: screenshotId,
        reason: "Screenshot data not found in background storage"
      };
    }

    // Find corresponding metadata if provided
    let metadata = null;
    if (screenshotMetadata) {
      metadata = screenshotMetadata.find(meta => meta.id === screenshotId);
    }

    return {
      screenshot_available: true,
      // CLEAR timestamp correlation for AI training
      screenshot_timing: {
        captured_at: screenshotInfo.metadata.timestamp,
        event_timestamp: event.data.timestamp,
        time_diff_ms: Math.abs(screenshotInfo.metadata.timestamp - event.data.timestamp),
        synchronized: Math.abs(screenshotInfo.metadata.timestamp - event.data.timestamp) < 1000
      },
      // Reference to separate image file instead of embedded data
      image: {
        filename: metadata ? metadata.filename : `screenshot_${screenshotId}.png`,
        format: "png",
        viewport: screenshotInfo.metadata.viewport,
        capture_quality: 90,
        file_size: metadata ? metadata.size : null,
        // Remove data_url to keep JSON small
        // data_url: screenshotInfo.dataUrl, // Now stored in separate file
      },
      // Visual element location within screenshot
      target_location: {
        bounding_box: event.data.visual.boundingBox,
        in_viewport: event.data.visual.isInViewport,
        visibility_percent: event.data.visual.percentVisible,
        scroll_position: event.data.visual.viewport
      }
    };
  }

  detectModalChanges(stateData) {
    if (!stateData?.before || !stateData?.after) return null;
    
    const beforeModals = stateData.before.activeModals || [];
    const afterModals = stateData.after.activeModals || [];
    
    return {
      modal_opened: afterModals.length > beforeModals.length,
      modal_closed: afterModals.length < beforeModals.length,
      modal_count_before: beforeModals.length,
      modal_count_after: afterModals.length
    };
  }

  showTrackingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'codesight-enhanced-indicator';
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
    
    indicator.innerHTML = `
      🚀 Enhanced CodeSight<br>
      <small>Events: ${this.events.length} | Enhanced mode active</small>
    `;
    
    document.body.appendChild(indicator);
  }

  hideTrackingIndicator() {
    const indicator = document.getElementById('codesight-enhanced-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  updateIndicatorText() {
    const indicator = document.getElementById('codesight-enhanced-indicator');
    if (indicator) {
      indicator.innerHTML = `
        🚀 Enhanced CodeSight<br>
        <small>Events: ${this.events.length} | Enhanced mode active</small>
      `;
    }
  }
}

// Export for use and instantiate
window.EnhancedShoppingTracker = EnhancedShoppingTracker;

// Create instance immediately so it's available when content-script.js loads
try {
  window.enhancedTracker = new EnhancedShoppingTracker();
  console.log('Enhanced tracker class defined and instantiated successfully');
  console.log('Enhanced tracker instance:', window.enhancedTracker);
} catch (error) {
  console.error('Enhanced tracker instantiation failed:', error);
}

})(); // End of IIFE