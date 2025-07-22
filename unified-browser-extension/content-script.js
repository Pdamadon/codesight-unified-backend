// Unified CodeSight Content Script v2.0
// Enhanced data capture with privacy protection and quality control

(function() {
  'use strict';
  
  // Prevent multiple injections
  if (window.UnifiedCodeSightTracker || window.UNIFIED_CODESIGHT_LOADED) {
    console.log('Unified CodeSight already loaded, skipping');
    return;
  }
  
  window.UNIFIED_CODESIGHT_LOADED = true;

  class UnifiedCodeSightTracker {
    constructor() {
      this.isTracking = false;
      this.sessionId = null;
      this.startTime = 0;
      this.events = [];
      this.screenshots = [];
      this.currentUrl = window.location.href;
      
      // Configuration
      this.config = {
        screenshotQuality: 0.8,
        maxScreenshots: 200,
        maxEvents: 1000,
        privacyMode: true,
        compressionEnabled: true,
        burstModeEnabled: true
      };
      
      // State tracking
      this.pageStructure = null;
      this.lastInteractionTime = 0;
      this.interactionSequence = 0;
      
      // Task tracking
      this.currentTask = null;
      this.taskProgress = {
        currentStep: 0,
        completedSteps: []
      };
      this.taskOverlay = null;
      
      // Privacy filters
      this.sensitiveSelectors = [
        'input[type="password"]',
        'input[name*="password"]',
        'input[name*="ssn"]',
        'input[name*="social"]',
        'input[name*="credit"]',
        'input[name*="card"]',
        'input[name*="cvv"]',
        'input[name*="pin"]',
        '[data-sensitive]',
        '.sensitive-data'
      ];
      
      this.initializeTracker();
    }

    initializeTracker() {
      // Listen for messages from background script
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleMessage(message, sender, sendResponse);
        return true; // Keep message channel open for async responses
      });

      // Set up navigation handling
      this.setupNavigationHandling();
      
      // Set up state preservation for navigation
      this.setupStatePreservation();
      
      // Set up periodic state saving for navigation
      this.setupPeriodicStateSaving();
      
      // Restore state if needed
      this.restoreState();
      
      // Restore task overlay if tracking is active (delay to ensure state is fully restored)
      setTimeout(() => {
        this.restoreTaskOverlay();
      }, 200);
      
      console.log('Unified CodeSight Tracker initialized v2.0');
    }

    async handleMessage(message, sender, sendResponse) {
      try {
        switch (message.action) {
          case 'START_TRACKING':
            await this.startTracking(message.sessionId, message.config);
            sendResponse({ success: true });
            break;
            
          case 'STOP_TRACKING':
            const result = await this.stopTracking();
            sendResponse({ success: true, data: result });
            break;
            
          case 'GET_STATUS':
            sendResponse(this.getStatus());
            break;
            
          case 'GET_SESSION_DATA':
            const sessionData = this.getSessionData();
            sendResponse({ success: true, data: sessionData });
            break;
            
          case 'UPDATE_CONFIG':
            this.updateConfig(message.config);
            sendResponse({ success: true });
            break;
            
          case 'CAPTURE_SCREENSHOT':
            const screenshot = await this.captureScreenshot(message.trigger);
            sendResponse({ success: true, screenshot });
            break;

          case 'ping':
            sendResponse({ success: true, message: 'Content script is working', tracker: !!window.UnifiedCodeSightTracker });
            break;
            
          default:
            sendResponse({ success: false, error: 'Unknown action' });
        }
      } catch (error) {
        console.error('Unified: Message handling error:', error);
        sendResponse({ success: false, error: error.message });
      }
    }

    async startTracking(sessionId, config = {}) {
      if (this.isTracking) {
        console.log('Unified: Already tracking');
        return;
      }

      this.sessionId = sessionId;
      this.startTime = Date.now();
      this.isTracking = true;
      this.events = [];
      this.screenshots = [];
      this.interactionSequence = 0;
      
      // Update configuration
      this.config = { ...this.config, ...config };
      
      // Analyze initial page structure
      this.pageStructure = this.analyzePageStructure();
      
      // Bind event listeners
      this.bindEventListeners();
      
      // Show tracking indicator
      this.showTrackingIndicator();
      
      // Fetch and display task
      await this.fetchAndDisplayTask();
      
      // Save state
      this.saveState();
      
      // Capture initial screenshot
      await this.captureScreenshot('session_start');
      
      // Start periodic validation
      this.startPeriodicValidation();
      
      // Notify background script to start session on backend
      this.startBackendSession();
      
      console.log('Unified: Tracking started for session:', sessionId);
    }

    async stopTracking() {
      if (!this.isTracking) {
        console.log('Unified: Not currently tracking');
        return null;
      }

      this.isTracking = false;
      
      // Unbind event listeners
      this.unbindEventListeners();
      
      // Stop navigation handling
      this.cleanupNavigationHandling();
      
      // Stop state preservation
      this.cleanupStatePreservation();
      
      // Stop periodic validation
      this.stopPeriodicValidation();
      
      // Hide tracking indicator and task overlay
      this.hideTrackingIndicator();
      this.hideTaskOverlay();
      
      // Capture final screenshot
      await this.captureScreenshot('session_end');
      
      // Perform final validation
      const finalValidation = this.validateSessionData();
      console.log('Unified: Final validation score:', finalValidation.score);
      
      // Prepare session data
      const sessionData = await this.prepareSessionData();
      
      // Stop backend session
      await this.stopBackendSession();
      
      // Clear periodic saving
      if (this.stateSaveInterval) {
        clearInterval(this.stateSaveInterval);
        this.stateSaveInterval = null;
      }
      
      // Clear state
      this.clearState();
      
      console.log('Unified: Tracking stopped, captured', this.events.length, 'events');
      
      return sessionData;
    }

    bindEventListeners() {
      // Enhanced click tracking
      this.boundClickHandler = this.handleClick.bind(this);
      document.addEventListener('click', this.boundClickHandler, true);
      
      // Input tracking with privacy protection
      this.boundInputHandler = this.handleInput.bind(this);
      document.addEventListener('input', this.boundInputHandler, true);
      
      // Form submission tracking
      this.boundFormHandler = this.handleFormSubmit.bind(this);
      document.addEventListener('submit', this.boundFormHandler, true);
      
      // Scroll tracking (throttled)
      this.boundScrollHandler = this.throttle(this.handleScroll.bind(this), 200);
      document.addEventListener('scroll', this.boundScrollHandler, true);
      
      // Focus tracking for accessibility
      this.boundFocusHandler = this.handleFocus.bind(this);
      document.addEventListener('focus', this.boundFocusHandler, true);
      
      // Key press tracking (for shortcuts and navigation)
      this.boundKeyHandler = this.handleKeyPress.bind(this);
      document.addEventListener('keydown', this.boundKeyHandler, true);
    }

    unbindEventListeners() {
      if (this.boundClickHandler) {
        document.removeEventListener('click', this.boundClickHandler, true);
      }
      if (this.boundInputHandler) {
        document.removeEventListener('input', this.boundInputHandler, true);
      }
      if (this.boundFormHandler) {
        document.removeEventListener('submit', this.boundFormHandler, true);
      }
      if (this.boundScrollHandler) {
        document.removeEventListener('scroll', this.boundScrollHandler, true);
      }
      if (this.boundFocusHandler) {
        document.removeEventListener('focus', this.boundFocusHandler, true);
      }
      if (this.boundKeyHandler) {
        document.removeEventListener('keydown', this.boundKeyHandler, true);
      }
    }

    async handleClick(event) {
      if (!this.isTracking) return;
      
      const element = event.target;
      const timestamp = Date.now();
      
      // Skip if element is too small (likely tracking pixel)
      const rect = element.getBoundingClientRect();
      if (rect.width < 3 && rect.height < 3) return;
      
      // Capture screenshot before state changes
      const screenshotPromise = this.captureScreenshot('click', timestamp);
      
      // Generate enhanced multi-selector strategy with reliability scoring
      const selectors = this.generateEnhancedSelectors(element);
      
      // Capture enhanced DOM context matching reference model
      const domContext = this.captureEnhancedDOMContext(element);
      
      // Get comprehensive element analysis
      const elementAnalysis = this.analyzeElementEnhanced(element);
      
      // Capture page state before interaction
      const stateBefore = this.capturePageState();
      
      const interactionData = {
        type: 'CLICK',
        timestamp,
        sessionTime: timestamp - this.startTime,
        sequence: ++this.interactionSequence,

        // 1) Enhanced selectors (Group 1: Selectors)
        selectors: {
          primary: selectors.primary,
          alternatives: selectors.alternatives,
          xpath: selectors.xpath,
          cssPath: selectors.cssPath,
          selectorReliability: selectors.selectorReliability
        },

        // Backward compatibility - keep existing flattened fields
        primarySelector: selectors.primary,
        selectorAlternatives: selectors.alternatives,
        xpath: selectors.xpath,
        cssPath: selectors.cssPath,
        selectorReliability: selectors.selectorReliability,

        // 2) Enhanced visual context (Group 2: Visual)
        visual: {
          boundingBox: elementAnalysis.boundingBox,
          viewport: this.getViewportInfo(),
          isInViewport: elementAnalysis.isInViewport,
          percentVisible: elementAnalysis.percentVisible,
          screenshot: null // Will be set after screenshot capture
        },

        // 3) Enhanced element analysis (Group 3: Element)
        element: elementAnalysis,

        // Backward compatibility - keep existing flattened fields
        elementTag: elementAnalysis.tagName,
        elementText: elementAnalysis.text,
        elementValue: elementAnalysis.value,
        elementAttributes: elementAnalysis.attributes,
        boundingBox: elementAnalysis.boundingBox,
        isInViewport: elementAnalysis.isInViewport,
        percentVisible: elementAnalysis.percentVisible,

        // 4) Enhanced DOM context (Group 4: Context)
        context: {
          parentElements: domContext.parentElements,
          siblings: domContext.siblings,
          nearbyElements: domContext.nearbyElements,
          pageStructure: domContext.pageStructure
        },

        // Backward compatibility - keep existing flattened fields
        parentElements: domContext.parentElements,
        siblingElements: domContext.siblings,
        nearbyElements: domContext.nearbyElements,

        // 5) Enhanced state tracking (Group 5: State)
        state: {
          before: stateBefore,
          after: null, // Will be captured after delay
          changes: null // Will be calculated after state capture
        },

        // 6) Enhanced interaction metadata (Group 6: Interaction)
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
          timestamp: timestamp,
          sessionTime: timestamp - this.startTime,
          sequence: this.interactionSequence
        },

        // Backward compatibility - legacy fields
        metadata: {
          sessionId: this.sessionId,
          userId: 'anon-user',
          timestamp: new Date(timestamp).toISOString(),
          pageUrl: window.location.href,
          pageTitle: document.title,
          viewport: this.getViewportInfo()
        },
        pageContext: {
          domSnapshot: this.getPrunedDOMSnapshot(element),
          htmlHash: this.generatePageHash(),
          networkRequests: this.getRecentNetworkRequests()
        },

        // 5) Detailed elementDetails & overlays & action
        elementDetails: {
          tag: element.tagName.toLowerCase(),
          text: this.getElementText(element),
          attributes: this.getElementAttributes(element),
          cssSelector: this.generateCSSSelector(element),
          xpath: this.generateXPath(element),
          boundingBox: this.getElementBoundingBox(element),
          computedStyle: this.getRelevantComputedStyle(element)
        },
        contextData: {
          parent: this.getParentElementInfo(element),
          ancestors: this.getAncestorChain(element),
          siblings: this.getSiblingElements(element),
          nearestClickable: this.findNearbyClickableElements(element, 100)
        },
        overlays: this.detectActiveOverlays(),
        action: {
          type: 'click',
          selector: selectors.primary,
          timestamp: new Date(timestamp).toISOString()
        },
        
        // 6) Coordinates & modifiers
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

        // 7) Legacy fields (for pipeline)
        stateBefore,
        url: window.location.href,
        pageTitle: document.title,
        viewport: this.getViewportInfo()
      };

      // 🔍 LOG: Show what data we're collecting
      console.log('🎯 CLICK DATA COLLECTED:', {
        type: interactionData.type,
        timestamp: new Date(interactionData.timestamp).toISOString(),
        element: {
          tag: interactionData.element?.tagName,
          text: interactionData.element?.text?.substring(0, 50) + '...',
          selector: interactionData.selectors?.primary,
          isInteractive: interactionData.element?.isInteractive,
          percentVisible: interactionData.element?.percentVisible,
          attributeCount: Object.keys(interactionData.element?.attributes || {}).length
        },
        selectors: {
          primary: interactionData.selectors?.primary,
          alternativeCount: interactionData.selectors?.alternatives?.length,
          topReliability: interactionData.selectors?.selectorReliability?.[interactionData.selectors.primary],
          xpath: interactionData.selectors?.xpath?.substring(0, 50) + '...',
          cssPath: interactionData.selectors?.cssPath?.substring(0, 50) + '...'
        },
        visual: {
          viewport: interactionData.visual?.viewport,
          isInViewport: interactionData.visual?.isInViewport,
          percentVisible: interactionData.visual?.percentVisible,
          hasScreenshot: !!interactionData.visual?.screenshot
        },
        interaction: {
          coordinates: !!interactionData.interaction?.coordinates,
          modifiers: !!interactionData.interaction?.modifiers,
          timestamp: interactionData.interaction?.timestamp,
          sessionTime: interactionData.interaction?.sessionTime,
          sequence: interactionData.interaction?.sequence
        },
        state: {
          hasBefore: !!interactionData.state?.before,
          hasAfter: !!interactionData.state?.after,
          hasChanges: !!interactionData.state?.changes
        },
        context: {
          parentCount: interactionData.context?.parentElements?.length || 0,
          siblingCount: interactionData.context?.siblings?.length || 0,
          nearbyElementCount: interactionData.context?.nearbyElements?.length || 0,
          hasPageStructure: !!interactionData.context?.pageStructure
        },
        enhancedFields: {
          hasMetadata: !!interactionData.metadata,
          hasPageContext: !!interactionData.pageContext,
          hasElementDetails: !!interactionData.elementDetails,
          hasContextData: !!interactionData.contextData,
          hasOverlays: !!interactionData.overlays,
          hasAction: !!interactionData.action,
          overlayCount: interactionData.overlays?.length || 0
        }
      });

      // Wait for screenshot and link to visual context
      const screenshot = await screenshotPromise;
      if (screenshot) {
        interactionData.screenshotId = screenshot.id;
        interactionData.visual.screenshot = screenshot.id;
      }

      // Capture state after a delay to see changes (reference model: 1000ms)
      setTimeout(() => {
        const stateAfter = this.capturePageState();
        const stateChanges = this.detectStateChanges(stateBefore, stateAfter);
        
        // Update enhanced state structure
        interactionData.state.after = stateAfter;
        interactionData.state.changes = stateChanges;
        
        // Backward compatibility
        interactionData.stateAfter = stateAfter;
        interactionData.stateChanges = stateChanges;
        
        // Update the stored event
        this.updateEvent(interactionData);
        
        console.log('Enhanced: State changes detected:', {
          hasChanges: Object.keys(stateChanges).length > 0,
          changeTypes: Object.keys(stateChanges),
          urlChanged: !!stateChanges.urlChanged,
          titleChanged: !!stateChanges.titleChanged,
          scrollChanged: !!stateChanges.scrollChanged,
          details: {
            urlChange: stateChanges.urlChanged ? {
              from: stateChanges.urlChanged.from?.substring(0, 50) + '...',
              to: stateChanges.urlChanged.to?.substring(0, 50) + '...',
              type: stateChanges.urlChanged.type
            } : null,
            titleChange: stateChanges.titleChanged ? {
              from: stateChanges.titleChanged.from?.substring(0, 30) + '...',
              to: stateChanges.titleChanged.to?.substring(0, 30) + '...'
            } : null,
            scrollChange: stateChanges.scrollChanged ? {
              delta: stateChanges.scrollChanged.delta,
              direction: stateChanges.scrollChanged.direction
            } : null
          }
        });
      }, 1000);

      this.captureEvent(interactionData);
      this.lastInteractionTime = timestamp;
    }

    async handleInput(event) {
      if (!this.isTracking) return;
      
      const element = event.target;
      
      // Privacy protection - skip sensitive inputs
      if (this.isSensitiveInput(element)) {
        console.log('Unified: Skipping sensitive input');
        return;
      }
      
      const timestamp = Date.now();
      
      const interactionData = {
        type: 'INPUT',
        timestamp,
        sessionTime: timestamp - this.startTime,
        sequence: ++this.interactionSequence,
        
        selectors: this.generateMultipleSelectors(element),
        element: this.analyzeElement(element),
        
        // Input details (sanitized)
        inputType: element.type || 'text',
        inputName: element.name || '',
        placeholder: element.placeholder || '',
        valueLength: element.value ? element.value.length : 0,
        
        url: window.location.href,
        pageTitle: document.title
      };

      this.captureEvent(interactionData);
    }

    async handleFormSubmit(event) {
      if (!this.isTracking) return;
      
      const form = event.target;
      const timestamp = Date.now();
      
      // Capture screenshot of form submission
      const screenshot = await this.captureScreenshot('form_submit', timestamp);
      
      const interactionData = {
        type: 'FORM_SUBMIT',
        timestamp,
        sessionTime: timestamp - this.startTime,
        sequence: ++this.interactionSequence,
        
        selectors: this.generateMultipleSelectors(form),
        element: this.analyzeElement(form),
        
        // Form details (privacy-safe)
        formAction: form.action || '',
        formMethod: form.method || 'GET',
        fieldCount: form.elements.length,
        
        screenshotId: screenshot?.id,
        url: window.location.href,
        pageTitle: document.title
      };

      this.captureEvent(interactionData);
    }

    handleScroll(event) {
      if (!this.isTracking) return;
      
      // Skip scroll events to reduce noise (can be re-enabled if needed)
      return;
      
      const timestamp = Date.now();
      
      const interactionData = {
        type: 'SCROLL',
        timestamp,
        sessionTime: timestamp - this.startTime,
        sequence: ++this.interactionSequence,
        
        scrollPosition: {
          x: window.scrollX,
          y: window.scrollY
        },
        
        viewport: this.getViewportInfo(),
        url: window.location.href
      };

      this.captureEvent(interactionData);
    }

    handleFocus(event) {
      if (!this.isTracking) return;
      
      const element = event.target;
      const timestamp = Date.now();
      
      const interactionData = {
        type: 'FOCUS',
        timestamp,
        sessionTime: timestamp - this.startTime,
        sequence: ++this.interactionSequence,
        
        selectors: this.generateMultipleSelectors(element),
        element: this.analyzeElement(element),
        
        url: window.location.href
      };

      this.captureEvent(interactionData);
    }

    handleKeyPress(event) {
      if (!this.isTracking) return;
      
      // Only capture significant key presses
      const significantKeys = ['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (!significantKeys.includes(event.key) && !event.ctrlKey && !event.metaKey) {
        return;
      }
      
      const timestamp = Date.now();
      
      const interactionData = {
        type: 'KEY_PRESS',
        timestamp,
        sessionTime: timestamp - this.startTime,
        sequence: ++this.interactionSequence,
        
        key: event.key,
        code: event.code,
        modifiers: {
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey,
          altKey: event.altKey,
          metaKey: event.metaKey
        },
        
        url: window.location.href
      };

      this.captureEvent(interactionData);
    }

    // Enhanced selector generation
    generateMultipleSelectors(element) {
      const selectors = {
        primary: null,
        alternatives: [],
        xpath: null,
        cssPath: null,
        reliability: {}
      };

      // Priority 1: ID selector
      if (element.id && typeof element.id === 'string' && element.id.trim()) {
        const idSelector = `#${element.id}`;
        selectors.primary = idSelector;
        selectors.alternatives.push(idSelector);
        selectors.reliability[idSelector] = 0.95;
      }

      // Priority 2: Data attributes (test-friendly)
      const dataAttrs = ['data-testid', 'data-test', 'data-cy', 'data-qa', 'data-automation'];
      for (const attr of dataAttrs) {
        const value = element.getAttribute(attr);
        if (value) {
          const selector = `[${attr}="${value}"]`;
          if (!selectors.primary) selectors.primary = selector;
          selectors.alternatives.push(selector);
          selectors.reliability[selector] = 0.9;
        }
      }

      // Priority 3: ARIA attributes
      const ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel) {
        const selector = `[aria-label="${ariaLabel}"]`;
        if (!selectors.primary) selectors.primary = selector;
        selectors.alternatives.push(selector);
        selectors.reliability[selector] = 0.85;
      }

      // Priority 4: Name attribute (for form elements)
      if (element.name) {
        const selector = `[name="${element.name}"]`;
        if (!selectors.primary) selectors.primary = selector;
        selectors.alternatives.push(selector);
        selectors.reliability[selector] = 0.8;
      }

      // Priority 5: Class-based selector (stable classes only)
      if (element.className && typeof element.className === 'string') {
        const classes = element.className.split(' ')
          .filter(c => c.trim() && !this.isUnstableClass(c));
        
        if (classes.length > 0) {
          const selector = '.' + classes.join('.');
          if (!selectors.primary) selectors.primary = selector;
          selectors.alternatives.push(selector);
          selectors.reliability[selector] = 0.6;
        }
      }

      // Priority 6: Tag + attributes combination
      const tagSelector = this.buildTagSelector(element);
      if (!selectors.primary) selectors.primary = tagSelector;
      selectors.alternatives.push(tagSelector);
      selectors.reliability[tagSelector] = 0.5;

      // Generate XPath
      selectors.xpath = this.generateXPath(element);
      selectors.reliability[selectors.xpath] = 0.7;

      // Generate CSS path
      selectors.cssPath = this.generateCSSPath(element);
      selectors.reliability[selectors.cssPath] = 0.4;

      // Remove duplicates
      selectors.alternatives = [...new Set(selectors.alternatives)];

      return selectors;
    }

    isUnstableClass(className) {
      const unstablePatterns = [
        /^(active|hover|focus|selected|current)$/i,
        /^(is-|has-)/i,
        /\d{4,}/, // Long numbers (likely generated)
        /^[a-f0-9]{8,}$/i, // Hash-like strings
        /^css-/i, // CSS-in-JS generated classes
        /^sc-/i, // Styled-components
        /^emotion-/i // Emotion CSS
      ];
      
      return unstablePatterns.some(pattern => pattern.test(className));
    }

    buildTagSelector(element) {
      let selector = element.tagName.toLowerCase();
      
      // Add type for input elements
      if (element.type) {
        selector += `[type="${element.type}"]`;
      }
      
      // Add role if present
      if (element.getAttribute('role')) {
        selector += `[role="${element.getAttribute('role')}"]`;
      }
      
      return selector;
    }

    generateXPath(element) {
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

    generateCSSPath(element) {
      const names = [];
      while (element.parentNode) {
        if (element.id) {
          names.unshift('#' + element.id);
          break;
        } else {
          let tagName = element.nodeName.toLowerCase();
          
          if (element.className && typeof element.className === 'string') {
            const stableClasses = element.className.split(' ')
              .filter(c => c.trim() && !this.isUnstableClass(c));
            if (stableClasses.length > 0) {
              tagName += '.' + stableClasses.join('.');
            }
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

    // Enhanced selector generation with priority-based multi-selector strategy
    generateEnhancedSelectors(element) {
      const selectors = {
        primary: null,
        alternatives: [],
        xpath: null,
        cssPath: null,
        selectorReliability: {}
      };

      // Priority 1: ID selector (highest reliability)
      if (element.id && typeof element.id === 'string' && element.id.trim()) {
        const idSelector = `#${CSS.escape(element.id)}`;
        selectors.primary = idSelector;
        selectors.alternatives.push(idSelector);
        selectors.selectorReliability[idSelector] = this.testSelectorReliability(idSelector);
      }

      // Priority 2: Data attributes (test-friendly, high reliability)
      const dataAttrs = ['data-testid', 'data-test', 'data-cy', 'data-qa', 'data-automation'];
      for (const attr of dataAttrs) {
        const value = element.getAttribute(attr);
        if (value && value.trim()) {
          const selector = `[${attr}="${CSS.escape(value)}"]`;
          if (!selectors.primary) selectors.primary = selector;
          selectors.alternatives.push(selector);
          selectors.selectorReliability[selector] = this.testSelectorReliability(selector);
        }
      }

      // Priority 3: ARIA attributes (accessibility-based, good reliability)
      const ariaLabel = element.getAttribute('aria-label');
      if (ariaLabel && ariaLabel.trim()) {
        const selector = `[aria-label="${CSS.escape(ariaLabel)}"]`;
        if (!selectors.primary) selectors.primary = selector;
        selectors.alternatives.push(selector);
        selectors.selectorReliability[selector] = this.testSelectorReliability(selector);
      }

      // Priority 4: Name attribute (for form elements)
      const name = element.getAttribute('name');
      if (name && name.trim()) {
        const selector = `[name="${CSS.escape(name)}"]`;
        if (!selectors.primary) selectors.primary = selector;
        selectors.alternatives.push(selector);
        selectors.selectorReliability[selector] = this.testSelectorReliability(selector);
      }

      // Priority 5: Role + text combination (semantic, medium reliability)
      const role = element.getAttribute('role');
      const text = this.getElementText(element);
      if (role && text && text.length < 50) {
        // Use contains selector for partial text match
        const selector = `[role="${role}"]:contains("${CSS.escape(text.substring(0, 30))}")`;
        selectors.alternatives.push(selector);
        // Note: :contains is not standard CSS, so lower reliability
        selectors.selectorReliability[selector] = 0.6;
      }

      // Priority 6: Class-based selector (stable classes only)
      if (element.className && typeof element.className === 'string') {
        const stableClasses = element.className.split(' ')
          .filter(c => c.trim() && !this.isUnstableClass(c))
          .slice(0, 3); // Limit to prevent overly complex selectors
        
        if (stableClasses.length > 0) {
          const selector = '.' + stableClasses.map(c => CSS.escape(c)).join('.');
          if (!selectors.primary) selectors.primary = selector;
          selectors.alternatives.push(selector);
          selectors.selectorReliability[selector] = this.testSelectorReliability(selector);
        }
      }

      // Priority 7: Tag + attributes combination (fallback)
      const tagSelector = this.buildEnhancedTagSelector(element);
      if (!selectors.primary) selectors.primary = tagSelector;
      selectors.alternatives.push(tagSelector);
      selectors.selectorReliability[tagSelector] = this.testSelectorReliability(tagSelector);

      // Generate XPath (robust fallback)
      selectors.xpath = this.generateXPath(element);
      selectors.selectorReliability[selectors.xpath] = 0.7;

      // Generate full CSS path (last resort)
      selectors.cssPath = this.generateFullCSSPath(element);
      selectors.selectorReliability[selectors.cssPath] = 0.4;

      // Remove duplicates and sort by reliability
      selectors.alternatives = [...new Set(selectors.alternatives)]
        .sort((a, b) => (selectors.selectorReliability[b] || 0) - (selectors.selectorReliability[a] || 0))
        .slice(0, 5); // Keep top 5 alternatives

      console.log('Enhanced selectors generated:', {
        primary: selectors.primary,
        alternativeCount: selectors.alternatives.length,
        topReliability: selectors.selectorReliability[selectors.primary],
        alternatives: selectors.alternatives.map(s => ({
          selector: s.substring(0, 50) + '...',
          reliability: selectors.selectorReliability[s]
        }))
      });

      return selectors;
    }

    buildEnhancedTagSelector(element) {
      let selector = element.tagName.toLowerCase();
      
      // Add type for input elements
      if (element.type) {
        selector += `[type="${CSS.escape(element.type)}"]`;
      }
      
      // Add role if present
      const role = element.getAttribute('role');
      if (role) {
        selector += `[role="${CSS.escape(role)}"]`;
      }

      // Add href for links (first 50 chars to avoid overly long selectors)
      if (element.tagName.toLowerCase() === 'a' && element.href) {
        const href = element.getAttribute('href');
        if (href && href.length < 100) {
          selector += `[href="${CSS.escape(href)}"]`;
        }
      }

      // Add value for inputs (but mask sensitive inputs)
      if (element.tagName.toLowerCase() === 'input' && element.value && !this.isSensitiveInput(element)) {
        const value = element.value.substring(0, 20); // Limit length
        selector += `[value="${CSS.escape(value)}"]`;
      }
      
      return selector;
    }

    generateFullCSSPath(element) {
      const names = [];
      let current = element;
      
      while (current.parentNode && current !== document.body) {
        if (current.id) {
          names.unshift('#' + CSS.escape(current.id));
          break;
        } else {
          let tagName = current.nodeName.toLowerCase();
          
          if (current.className && typeof current.className === 'string') {
            const stableClasses = current.className.split(' ')
              .filter(c => c.trim() && !this.isUnstableClass(c))
              .slice(0, 2); // Limit to prevent complexity
            if (stableClasses.length > 0) {
              tagName += '.' + stableClasses.map(c => CSS.escape(c)).join('.');
            }
          }
          
          const siblings = Array.from(current.parentNode.children);
          const sameTagSiblings = siblings.filter(sibling => 
            sibling.nodeName === current.nodeName
          );
          
          if (sameTagSiblings.length > 1) {
            const index = sameTagSiblings.indexOf(current) + 1;
            tagName += `:nth-of-type(${index})`;
          }
          
          names.unshift(tagName);
          current = current.parentNode;
        }
      }
      return names.join(' > ');
    }

    // DOM context capture
    captureDOMContext(element) {
      const context = {
        parents: [],
        siblings: [],
        children: [],
        nearbyElements: []
      };

      // Capture parent hierarchy (up to 5 levels)
      let parent = element.parentElement;
      let depth = 0;
      while (parent && depth < 5) {
        context.parents.push({
          tagName: parent.tagName.toLowerCase(),
          id: parent.id || null,
          className: this.getStableClasses(parent),
          role: parent.getAttribute('role'),
          selector: this.generateMultipleSelectors(parent).primary
        });
        parent = parent.parentElement;
        depth++;
      }

      // Capture siblings
      if (element.parentElement) {
        const siblings = Array.from(element.parentElement.children);
        const elementIndex = siblings.indexOf(element);
        
        for (let i = Math.max(0, elementIndex - 2); i <= Math.min(siblings.length - 1, elementIndex + 2); i++) {
          if (i !== elementIndex) {
            const sibling = siblings[i];
            context.siblings.push({
              position: i < elementIndex ? 'before' : 'after',
              distance: Math.abs(i - elementIndex),
              tagName: sibling.tagName.toLowerCase(),
              text: this.getElementText(sibling),
              selector: this.generateMultipleSelectors(sibling).primary
            });
          }
        }
      }

      // Capture nearby interactive elements
      context.nearbyElements = this.findNearbyInteractiveElements(element);

      return context;
    }

    // Enhanced DOM context capture matching reference model (Group 4: Context)
    captureEnhancedDOMContext(element) {
      const context = {
        parentElements: [],
        siblings: [],
        nearbyElements: [],
        pageStructure: this.analyzePageStructure()
      };

      // Capture parent hierarchy (up to 5 levels) with enhanced data
      let parent = element.parentElement;
      let depth = 0;
      while (parent && depth < 5) {
        context.parentElements.push({
          tagName: parent.tagName.toLowerCase(),
          id: parent.id || null,
          className: this.getStableClasses(parent),
          role: parent.getAttribute('role'),
          selector: this.generateEnhancedSelectors(parent).primary,
          text: this.getElementTextEnhanced(parent).substring(0, 50),
          level: depth + 1
        });
        parent = parent.parentElement;
        depth++;
      }

      // Capture siblings with enhanced data
      if (element.parentElement) {
        const siblings = Array.from(element.parentElement.children);
        const elementIndex = siblings.indexOf(element);
        
        // Get 2 siblings before and after (reference model pattern)
        for (let i = Math.max(0, elementIndex - 2); i <= Math.min(siblings.length - 1, elementIndex + 2); i++) {
          if (i !== elementIndex) {
            const sibling = siblings[i];
            context.siblings.push({
              position: i < elementIndex ? 'before' : 'after',
              distance: Math.abs(i - elementIndex),
              tagName: sibling.tagName.toLowerCase(),
              text: this.getElementTextEnhanced(sibling).substring(0, 50),
              selector: this.generateEnhancedSelectors(sibling).primary,
              isInteractive: this.isInteractiveElement(sibling),
              boundingBox: this.getBoundingBox(sibling)
            });
          }
        }
      }

      // Capture nearby clickable elements within 100px radius (reference model spec)
      context.nearbyElements = this.findNearbyClickableElementsEnhanced(element, 100);

      return context;
    }

    // Enhanced nearby elements detection matching reference model
    findNearbyClickableElementsEnhanced(targetElement, radius = 100) {
      const nearby = [];
      const targetRect = targetElement.getBoundingClientRect();
      const targetCenter = {
        x: targetRect.left + targetRect.width / 2,
        y: targetRect.top + targetRect.height / 2
      };

      const interactiveSelectors = 'a, button, input, select, textarea, [role="button"], [onclick], [data-clickable], [tabindex]:not([tabindex="-1"])';
      const candidates = document.querySelectorAll(interactiveSelectors);

      candidates.forEach(element => {
        if (element === targetElement) return;
        
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        
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
            selector: this.generateEnhancedSelectors(element).primary,
            tagName: element.tagName.toLowerCase(),
            text: this.getElementTextEnhanced(element).substring(0, 30),
            distance: Math.round(distance),
            direction: this.getRelativeDirection(targetCenter, center),
            isVisible: this.isElementVisible(element),
            isInteractive: this.isInteractiveElement(element)
          });
        }
      });

      // Sort by distance and return closest 10 (reference model spec)
      return nearby.sort((a, b) => a.distance - b.distance).slice(0, 10);
    }

    findNearbyInteractiveElements(targetElement, radius = 150) {
      const nearby = [];
      const targetRect = targetElement.getBoundingClientRect();
      const targetCenter = {
        x: targetRect.left + targetRect.width / 2,
        y: targetRect.top + targetRect.height / 2
      };

      const interactiveSelectors = 'a, button, input, select, textarea, [role="button"], [onclick], [tabindex]';
      const candidates = document.querySelectorAll(interactiveSelectors);

      candidates.forEach(element => {
        if (element === targetElement) return;
        
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        
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
            selector: this.generateMultipleSelectors(element).primary,
            tagName: element.tagName.toLowerCase(),
            text: this.getElementText(element),
            distance: Math.round(distance),
            direction: this.getRelativeDirection(targetCenter, center),
            isVisible: this.isElementVisible(element)
          });
        }
      });

      return nearby.sort((a, b) => a.distance - b.distance).slice(0, 8);
    }

    // Element analysis
    analyzeElement(element) {
      const computed = window.getComputedStyle(element);
      
      return {
        tagName: element.tagName.toLowerCase(),
        text: this.getElementText(element),
        value: this.isSensitiveInput(element) ? '[PROTECTED]' : (element.value || null),
        attributes: this.getRelevantAttributes(element),
        
        // Visual properties
        boundingBox: this.getBoundingBox(element),
        isVisible: this.isElementVisible(element),
        isInViewport: this.isElementInViewport(element),
        
        // Computed styles (relevant ones)
        styles: {
          display: computed.display,
          visibility: computed.visibility,
          position: computed.position,
          zIndex: computed.zIndex,
          cursor: computed.cursor,
          backgroundColor: computed.backgroundColor,
          color: computed.color
        },
        
        // Interaction properties
        isInteractive: this.isInteractiveElement(element),
        role: element.getAttribute('role') || this.inferElementRole(element),
        tabIndex: element.tabIndex
      };
    }

    // Enhanced element analysis matching reference model (Group 3: Element)
    analyzeElementEnhanced(element) {
      const computed = window.getComputedStyle(element);
      
      return {
        // Basic element properties
        tagName: element.tagName.toLowerCase(),
        text: this.getElementTextEnhanced(element),
        value: this.isSensitiveInput(element) ? '[PROTECTED]' : (element.value || null),
        attributes: this.getAllElementAttributes(element),
        
        // Visual and positioning
        boundingBox: this.getBoundingBox(element),
        isVisible: this.isElementVisible(element),
        isInViewport: this.isElementInViewport(element),
        percentVisible: this.getElementVisibility(element),
        
        // Comprehensive computed styles (matching reference model)
        computedStyles: {
          display: computed.display,
          visibility: computed.visibility,
          position: computed.position,
          zIndex: computed.zIndex,
          width: computed.width,
          height: computed.height,
          padding: computed.padding,
          margin: computed.margin,
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          fontSize: computed.fontSize,
          cursor: computed.cursor,
          pointerEvents: computed.pointerEvents,
          opacity: computed.opacity,
          transform: computed.transform,
          transition: computed.transition
        },
        
        // Interaction and accessibility
        isInteractive: this.isInteractiveElement(element),
        role: element.getAttribute('role') || this.inferElementRole(element),
        tabIndex: element.tabIndex,
        
        // Additional properties from reference model
        hasClickHandler: !!(element.onclick || element.getAttribute('onclick')),
        ariaLabel: element.getAttribute('aria-label'),
        title: element.title,
        alt: element.alt,
        placeholder: element.placeholder
      };
    }

    // Enhanced text extraction with fallbacks (matching reference model)
    getElementTextEnhanced(element) {
      if (!element) return '';
      
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
      
      // Also check common attributes (matching reference model priority)
      if (!text) {
        text = element.value || 
               element.placeholder || 
               element.alt || 
               element.title || 
               element.getAttribute('aria-label') || '';
      }
      
      // Limit length to prevent huge payloads
      return text.length > 100 ? text.substring(0, 100) + '...' : text;
    }

    // Get all element attributes (comprehensive)
    getAllElementAttributes(element) {
      const attrs = {};
      for (let attr of element.attributes) {
        attrs[attr.name] = attr.value;
      }
      return attrs;
    }

    // Enhanced element visibility calculation (matching reference model)
    getElementVisibility(element) {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      const visibleHeight = Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0);
      const visibleWidth = Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0);
      
      const visibleArea = Math.max(0, visibleHeight) * Math.max(0, visibleWidth);
      const totalArea = rect.height * rect.width;
      
      return totalArea > 0 ? Math.round((visibleArea / totalArea) * 100) : 0;
    }

    getRelevantAttributes(element) {
      const relevantAttrs = [
        'id', 'class', 'name', 'type', 'role', 'aria-label', 'aria-describedby',
        'data-testid', 'data-test', 'data-cy', 'data-qa', 'href', 'src', 'alt', 'title'
      ];
      
      const attrs = {};
      relevantAttrs.forEach(attr => {
        const value = element.getAttribute(attr);
        if (value !== null) {
          attrs[attr] = value;
        }
      });
      
      return attrs;
    }

    // Privacy protection
    isSensitiveInput(element) {
      if (!element) return false;
      
      // Check input type
      if (element.type && ['password', 'hidden'].includes(element.type.toLowerCase())) {
        return true;
      }
      
      // Check against sensitive selectors
      return this.sensitiveSelectors.some(selector => {
        try {
          return element.matches(selector);
        } catch (e) {
          return false;
        }
      });
    }

    // Screenshot capture
    async captureScreenshot(trigger, timestamp = Date.now()) {
      if (!this.config.screenshotEnabled || this.screenshots.length >= this.config.maxScreenshots) {
        return null;
      }

      try {
        const screenshotData = {
          trigger,
          timestamp,
          viewport: this.getViewportInfo(),
          url: window.location.href,
          quality: this.config.screenshotQuality
        };

        // Send to background script for actual capture
        const response = await chrome.runtime.sendMessage({
          action: 'CAPTURE_SCREENSHOT',
          data: screenshotData
        });

        if (response && response.success) {
          const screenshot = {
            id: response.screenshotId,
            trigger,
            timestamp,
            ...screenshotData
          };
          
          this.screenshots.push(screenshot);
          return screenshot;
        }
      } catch (error) {
        console.error('Unified: Screenshot capture failed:', error);
      }
      
      return null;
    }

    // Page structure analysis
    analyzePageStructure() {
      return {
        hasNavigation: !!document.querySelector('nav, [role="navigation"]'),
        hasSearch: !!document.querySelector('input[type="search"], [role="searchbox"]'),
        hasFilters: document.querySelectorAll('[class*="filter"], [data-filter]').length > 0,
        hasProductGrid: !!document.querySelector('[class*="grid"], [class*="product"], [data-products]'),
        hasShoppingCart: !!document.querySelector('[class*="cart"], [data-cart]'),
        hasPagination: !!document.querySelector('[class*="page"], [aria-label*="page"]'),
        
        // Element counts
        totalElements: document.querySelectorAll('*').length,
        interactiveElements: document.querySelectorAll('button, a, input, select, textarea, [role="button"]').length,
        images: document.querySelectorAll('img').length,
        forms: document.querySelectorAll('form').length,
        
        // Page type detection
        pageType: this.detectPageType(),
        
        // Framework detection
        framework: this.detectFramework()
      };
    }

    detectPageType() {
      const url = window.location.href.toLowerCase();
      const title = document.title.toLowerCase();
      const content = document.body.textContent.toLowerCase();
      
      if (url.includes('/cart') || title.includes('cart') || content.includes('shopping cart')) {
        return 'cart';
      }
      if (url.includes('/checkout') || title.includes('checkout')) {
        return 'checkout';
      }
      if (url.includes('/product') || url.includes('/item') || document.querySelector('[itemtype*="Product"]')) {
        return 'product';
      }
      if (url.includes('/search') || url.includes('?q=') || document.querySelector('[role="search"]')) {
        return 'search';
      }
      if (url.includes('/category') || url.includes('/browse')) {
        return 'category';
      }
      
      return 'other';
    }

    detectFramework() {
      const frameworks = [];
      
      if (window.React || document.querySelector('[data-reactroot]')) {
        frameworks.push('React');
      }
      if (window.Vue || document.querySelector('[data-v-]')) {
        frameworks.push('Vue');
      }
      if (window.angular || document.querySelector('[ng-app], [data-ng-app]')) {
        frameworks.push('Angular');
      }
      if (window.jQuery || window.$) {
        frameworks.push('jQuery');
      }
      
      return frameworks;
    }

    // Navigation handling
    setupNavigationHandling() {
      // URL change detection
      let lastUrl = window.location.href;
      
      const checkUrlChange = () => {
        if (this.isTracking && window.location.href !== lastUrl) {
          this.handleNavigation(lastUrl, window.location.href);
          lastUrl = window.location.href;
        }
      };
      
      // Check every second
      this.navigationInterval = setInterval(checkUrlChange, 1000);
      
      // Also listen for popstate
      this.popstateHandler = () => {
        if (this.isTracking) {
          setTimeout(checkUrlChange, 100);
        }
      };
      window.addEventListener('popstate', this.popstateHandler);
    }
    
    cleanupNavigationHandling() {
      if (this.navigationInterval) {
        clearInterval(this.navigationInterval);
        this.navigationInterval = null;
      }
      
      if (this.popstateHandler) {
        window.removeEventListener('popstate', this.popstateHandler);
        this.popstateHandler = null;
      }
    }

    async handleNavigation(fromUrl, toUrl) {
      const timestamp = Date.now();
      
      // Capture navigation screenshot burst
      if (this.config.burstModeEnabled) {
        this.startBurstMode('navigation');
      }
      
      // Update page structure
      setTimeout(() => {
        this.pageStructure = this.analyzePageStructure();
      }, 1000);
      
      const navigationData = {
        type: 'NAVIGATION',
        timestamp,
        sessionTime: timestamp - this.startTime,
        sequence: ++this.interactionSequence,
        
        fromUrl,
        toUrl,
        pageTitle: document.title,
        
        // Navigation type detection
        navigationType: this.detectNavigationType(fromUrl, toUrl),
        
        // Page structure will be updated after delay
        pageStructure: this.pageStructure
      };

      this.captureEvent(navigationData);
    }

    detectNavigationType(fromUrl, toUrl) {
      if (fromUrl === toUrl) return 'refresh';
      if (toUrl.includes('#')) return 'hash_change';
      if (new URL(fromUrl).pathname === new URL(toUrl).pathname) return 'query_change';
      return 'page_change';
    }

    startBurstMode(trigger) {
      const burstCount = trigger === 'navigation' ? 3 : 5;
      const interval = 500; // 500ms between shots
      
      for (let i = 0; i < burstCount; i++) {
        setTimeout(() => {
          if (this.isTracking) {
            this.captureScreenshot(`burst_${trigger}_${i + 1}`);
          }
        }, i * interval);
      }
    }

    // Utility methods
    captureEvent(eventData) {
      if (this.events.length >= this.config.maxEvents) {
        console.warn('Unified: Max events reached, dropping oldest');
        this.events.shift();
      }
      
      this.events.push({
        ...eventData,
        id: this.generateId(),
        sessionId: this.sessionId
      });
      
      // Task progress is tracked naturally through user interactions
      
      // Send to background script for processing
      this.sendEventToBackground(eventData);
      
      // Save state
      this.saveState();
      
      // Periodic cleanup to prevent memory issues
      if (this.events.length > this.config.maxEvents / 2) {
        this.performEventCleanup();
      }
    }
    
    performEventCleanup() {
      const now = Date.now();
      const maxAge = 30 * 60 * 1000; // 30 minutes
      
      // Remove very old events
      this.events = this.events.filter(event => {
        return (now - event.timestamp) < maxAge;
      });
      
      // If still too many, keep only the most recent
      if (this.events.length > this.config.maxEvents) {
        this.events = this.events.slice(-this.config.maxEvents);
      }
    }

    updateEvent(eventData) {
      const index = this.events.findIndex(e => e.id === eventData.id);
      if (index !== -1) {
        this.events[index] = { ...this.events[index], ...eventData };
        this.saveState();
      }
    }

    async sendEventToBackground(eventData) {
      try {
        console.log('Unified: Sending event to background:', eventData.type);
        const response = await chrome.runtime.sendMessage({
          action: 'SEND_DATA',
          data: eventData
        });
        console.log('Unified: Background response:', response);
      } catch (error) {
        console.error('Unified: Failed to send event to background:', error);
        
        // If background script is not ready, try to wake it up
        if (error.message.includes('Could not establish connection')) {
          console.log('Unified: Background script disconnected, attempting to reconnect...');
          setTimeout(() => {
            this.sendEventToBackground(eventData);
          }, 1000);
        }
      }
    }

    async startBackendSession() {
      try {
        console.log('Unified: Starting backend session:', this.sessionId);
        const response = await chrome.runtime.sendMessage({
          action: 'START_BACKEND_SESSION',
          sessionId: this.sessionId,
          config: {
            type: 'AUTOMATED',
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: Date.now()
          }
        });
        console.log('Unified: Backend session started:', response);
      } catch (error) {
        console.error('Unified: Failed to start backend session:', error);
      }
    }

    async stopBackendSession() {
      try {
        console.log('Unified: Stopping backend session:', this.sessionId);
        const response = await chrome.runtime.sendMessage({
          action: 'STOP_BACKEND_SESSION',
          sessionId: this.sessionId
        });
        console.log('Unified: Backend session stopped:', response);
      } catch (error) {
        console.error('Unified: Failed to stop backend session:', error);
      }
    }

    // Page state capture
    capturePageState() {
      return {
        url: window.location.href,
        title: document.title,
        scrollPosition: {
          x: window.scrollX,
          y: window.scrollY
        },
        viewport: this.getViewportInfo(),
        activeElement: this.getActiveElementInfo(),
        visibleElements: this.getVisibleElementsCount(),
        timestamp: Date.now()
      };
    }

    detectStateChanges(stateBefore, stateAfter) {
      const changes = {};
      
      // Enhanced URL change detection (matching reference model)
      if (stateBefore.url !== stateAfter.url) {
        changes.urlChanged = {
          from: stateBefore.url,
          to: stateAfter.url,
          type: this.detectNavigationType(stateBefore.url, stateAfter.url)
        };
        // Backward compatibility
        changes.newUrl = stateAfter.url;
      }
      
      // Enhanced title change detection  
      if (stateBefore.title !== stateAfter.title) {
        changes.titleChanged = {
          from: stateBefore.title,
          to: stateAfter.title
        };
        // Backward compatibility
        changes.newTitle = stateAfter.title;
      }
      
      // Enhanced scroll change detection (matching reference model)  
      const scrollDiff = {
        x: Math.abs(stateAfter.scrollPosition.x - stateBefore.scrollPosition.x),
        y: Math.abs(stateAfter.scrollPosition.y - stateBefore.scrollPosition.y)
      };
      
      if (scrollDiff.x > 10 || scrollDiff.y > 10) {
        changes.scrollChanged = {
          from: stateBefore.scrollPosition.y,
          to: stateAfter.scrollPosition.y,
          delta: stateAfter.scrollPosition.y - stateBefore.scrollPosition.y,
          direction: stateAfter.scrollPosition.y > stateBefore.scrollPosition.y ? 'down' : 'up'
        };
        // Backward compatibility
        changes.scrollDiff = scrollDiff;
      }
      
      if (stateBefore.visibleElements !== stateAfter.visibleElements) {
        changes.elementsChanged = true;
        changes.elementDiff = stateAfter.visibleElements - stateBefore.visibleElements;
      }
      
      return changes;
    }

    getActiveElementInfo() {
      const activeElement = document.activeElement;
      if (!activeElement || activeElement === document.body) {
        return null;
      }
      
      return {
        tagName: activeElement.tagName.toLowerCase(),
        id: activeElement.id || null,
        className: activeElement.className || null,
        selector: this.generateMultipleSelectors(activeElement).primary
      };
    }

    getVisibleElementsCount() {
      const elements = document.querySelectorAll('*');
      let visibleCount = 0;
      
      for (const element of elements) {
        if (this.isElementVisible(element)) {
          visibleCount++;
        }
      }
      
      return visibleCount;
    }

    // Utility methods
    getViewportInfo() {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        devicePixelRatio: window.devicePixelRatio || 1
      };
    }

    getBoundingBox(element) {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left
      };
    }

    isElementVisible(element) {
      if (!element) return false;
      
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return false;
      
      const style = window.getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
      
      return true;
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

    isInteractiveElement(element) {
      const interactiveTags = ['a', 'button', 'input', 'select', 'textarea'];
      const interactiveRoles = ['button', 'link', 'menuitem', 'tab'];
      
      if (interactiveTags.includes(element.tagName.toLowerCase())) {
        return true;
      }
      
      const role = element.getAttribute('role');
      if (role && interactiveRoles.includes(role.toLowerCase())) {
        return true;
      }
      
      if (element.hasAttribute('onclick') || element.hasAttribute('tabindex')) {
        return true;
      }
      
      return false;
    }

    inferElementRole(element) {
      const tagName = element.tagName.toLowerCase();
      
      const roleMap = {
        'a': 'link',
        'button': 'button',
        'input': 'textbox',
        'select': 'combobox',
        'textarea': 'textbox',
        'img': 'image',
        'nav': 'navigation',
        'main': 'main',
        'header': 'banner',
        'footer': 'contentinfo',
        'aside': 'complementary'
      };
      
      return roleMap[tagName] || 'generic';
    }

    getElementText(element) {
      if (!element) return '';
      
      // For input elements, get placeholder or value
      if (element.tagName.toLowerCase() === 'input') {
        return element.placeholder || element.value || '';
      }
      
      // Get text content, but limit length
      const text = element.textContent || element.innerText || '';
      return text.trim().substring(0, 200);
    }

    getStableClasses(element) {
      if (!element.className || typeof element.className !== 'string') {
        return '';
      }
      
      return element.className.split(' ')
        .filter(c => c.trim() && !this.isUnstableClass(c))
        .join(' ');
    }

    getRelativeDirection(center1, center2) {
      const dx = center2.x - center1.x;
      const dy = center2.y - center1.y;
      
      if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? 'right' : 'left';
      } else {
        return dy > 0 ? 'below' : 'above';
      }
    }

    // State management
    saveState() {
      if (!this.sessionId) return;
      
      const state = {
        sessionId: this.sessionId,
        isTracking: this.isTracking,
        startTime: this.startTime,
        eventCount: this.events.length,
        screenshotCount: this.screenshots.length,
        currentTask: this.currentTask,
        taskProgress: this.taskProgress,
        lastSaved: Date.now()
      };
      
      try {
        localStorage.setItem('unified_codesight_state', JSON.stringify(state));
      } catch (error) {
        console.error('Unified: Failed to save state:', error);
      }
    }

    restoreState() {
      try {
        const stateStr = localStorage.getItem('unified_codesight_state');
        if (!stateStr) return;
        
        const state = JSON.parse(stateStr);
        
        // Only restore if recent (within 1 hour)
        if (Date.now() - state.lastSaved < 60 * 60 * 1000) {
          this.sessionId = state.sessionId;
          this.isTracking = state.isTracking;
          this.startTime = state.startTime;
          this.currentTask = state.currentTask;
          this.taskProgress = state.taskProgress || { currentStep: 0, completedSteps: [] };
          
          // Initialize arrays if not already initialized
          if (!this.events) this.events = [];
          if (!this.screenshots) this.screenshots = [];
          
          // Restore approximate counts (actual events are sent to backend)
          this.restoredEventCount = state.eventCount || 0;
          this.restoredScreenshotCount = state.screenshotCount || 0;
          
          if (this.isTracking) {
            console.log('Unified: Restored tracking state for session:', this.sessionId);
            
            // Re-initialize tracking components after state restoration
            this.bindEventListeners();
            this.showTrackingIndicator();
            
            // Re-establish backend connection if needed
            this.sendEventToBackground({
              type: 'navigation_restored',
              sessionId: this.sessionId,
              url: window.location.href,
              timestamp: Date.now()
            });
            
            // Start periodic validation to ensure connection remains active
            this.startPeriodicValidation();
          }
        }
      } catch (error) {
        console.error('Unified: Failed to restore state:', error);
      }
    }

    clearState() {
      try {
        localStorage.removeItem('unified_codesight_state');
      } catch (error) {
        console.error('Unified: Failed to clear state:', error);
      }
    }

    setupPeriodicStateSaving() {
      // Save state every 2 seconds when tracking to handle navigation
      this.stateSaveInterval = setInterval(() => {
        if (this.isTracking) {
          this.saveState();
        }
      }, 2000);
    }

    // Session data preparation
    async prepareSessionData() {
      const sessionData = {
        sessionId: this.sessionId,
        startTime: this.startTime,
        endTime: Date.now(),
        duration: Date.now() - this.startTime,
        
        // Event data
        events: this.events,
        eventCount: this.events.length,
        
        // Screenshot data
        screenshots: this.screenshots,
        screenshotCount: this.screenshots.length,
        
        // Page data
        initialUrl: this.currentUrl,
        finalUrl: window.location.href,
        pageStructure: this.pageStructure,
        
        // Browser data
        userAgent: navigator.userAgent,
        viewport: this.getViewportInfo(),
        
        // Quality metrics
        qualityScore: this.calculateQualityScore(),
        completeness: this.calculateCompleteness()
      };
      
      return sessionData;
    }

    calculateQualityScore() {
      let score = 0;
      
      // Base score for having events
      if (this.events.length > 0) score += 20;
      
      // Bonus for variety of event types
      const eventTypes = new Set(this.events.map(e => e.type));
      score += Math.min(eventTypes.size * 10, 30);
      
      // Bonus for screenshots
      if (this.screenshots.length > 0) score += 20;
      
      // Bonus for session duration (sweet spot: 30s - 5min)
      const duration = Date.now() - this.startTime;
      const durationMinutes = duration / (1000 * 60);
      if (durationMinutes >= 0.5 && durationMinutes <= 5) {
        score += 20;
      } else if (durationMinutes > 5) {
        score += 10;
      }
      
      // Bonus for interaction variety
      const clickEvents = this.events.filter(e => e.type === 'CLICK').length;
      const inputEvents = this.events.filter(e => e.type === 'INPUT').length;
      const navEvents = this.events.filter(e => e.type === 'NAVIGATION').length;
      
      if (clickEvents > 0 && inputEvents > 0) score += 10;
      if (navEvents > 0) score += 10;
      
      return Math.min(score, 100);
    }

    calculateCompleteness() {
      let completeness = 0;
      
      // Check for essential data
      if (this.events.length > 0) completeness += 25;
      if (this.screenshots.length > 0) completeness += 25;
      if (this.pageStructure) completeness += 25;
      
      // Check for interaction completeness
      const hasClicks = this.events.some(e => e.type === 'CLICK');
      const hasNavigation = this.events.some(e => e.type === 'NAVIGATION');
      
      if (hasClicks) completeness += 12.5;
      if (hasNavigation) completeness += 12.5;
      
      return Math.min(completeness, 100);
    }

    // Data Quality Validation System
    validateSessionData() {
      const validation = {
        isValid: true,
        score: 100,
        errors: [],
        warnings: [],
        suggestions: [],
        metrics: {}
      };

      // Validate basic session data
      this.validateBasicSessionData(validation);
      
      // Validate events
      this.validateEvents(validation);
      
      // Validate screenshots
      this.validateScreenshots(validation);
      
      // Validate interaction patterns
      this.validateInteractionPatterns(validation);
      
      // Validate data completeness
      this.validateDataCompleteness(validation);
      
      // Calculate final validation score
      validation.score = Math.max(0, validation.score - (validation.errors.length * 10) - (validation.warnings.length * 5));
      validation.isValid = validation.score >= 60 && validation.errors.length === 0;
      
      return validation;
    }

    validateBasicSessionData(validation) {
      // Check session ID
      if (!this.sessionId) {
        validation.errors.push('Missing session ID');
        validation.score -= 20;
      }

      // Check session duration
      const duration = Date.now() - this.startTime;
      if (duration < 10000) { // Less than 10 seconds
        validation.warnings.push('Session duration is very short (< 10s)');
        validation.suggestions.push('Consider longer interaction sessions for better training data');
      } else if (duration > 30 * 60 * 1000) { // More than 30 minutes
        validation.warnings.push('Session duration is very long (> 30min)');
        validation.suggestions.push('Consider breaking long sessions into smaller chunks');
      }

      validation.metrics.sessionDuration = duration;
      validation.metrics.sessionDurationMinutes = Math.round(duration / 60000);
    }

    validateEvents(validation) {
      if (this.events.length === 0) {
        validation.errors.push('No interaction events captured');
        validation.score -= 30;
        return;
      }

      let validEvents = 0;
      let invalidEvents = 0;
      const eventTypes = new Set();
      const missingSelectors = [];
      const missingTimestamps = [];

      this.events.forEach((event, index) => {
        let eventValid = true;

        // Check required fields
        if (!event.type) {
          validation.errors.push(`Event ${index}: Missing event type`);
          eventValid = false;
        } else {
          eventTypes.add(event.type);
        }

        if (!event.timestamp) {
          validation.errors.push(`Event ${index}: Missing timestamp`);
          missingTimestamps.push(index);
          eventValid = false;
        }

        // Validate selectors for click events
        if (event.type === 'CLICK') {
          if (!event.selectors || !event.selectors.primary) {
            validation.warnings.push(`Click event ${index}: Missing primary selector`);
            missingSelectors.push(index);
          } else {
            // Test selector reliability
            const reliability = this.testSelectorReliability(event.selectors.primary);
            if (reliability < 0.5) {
              validation.warnings.push(`Click event ${index}: Low selector reliability (${Math.round(reliability * 100)}%)`);
            }
          }

          // Check for coordinates
          if (!event.coordinates) {
            validation.warnings.push(`Click event ${index}: Missing click coordinates`);
          }
        }

        // Validate URL
        if (!event.url) {
          validation.warnings.push(`Event ${index}: Missing URL`);
        }

        if (eventValid) {
          validEvents++;
        } else {
          invalidEvents++;
        }
      });

      // Event diversity check
      if (eventTypes.size < 2) {
        validation.warnings.push('Low event type diversity - consider capturing more interaction types');
        validation.suggestions.push('Try to include clicks, inputs, navigation, and scrolling');
      }

      // Check for suspicious patterns
      this.detectSuspiciousPatterns(validation);

      validation.metrics.totalEvents = this.events.length;
      validation.metrics.validEvents = validEvents;
      validation.metrics.invalidEvents = invalidEvents;
      validation.metrics.eventTypes = Array.from(eventTypes);
      validation.metrics.eventTypeCount = eventTypes.size;
      validation.metrics.missingSelectors = missingSelectors.length;
      validation.metrics.missingTimestamps = missingTimestamps.length;
    }

    validateScreenshots(validation) {
      if (this.screenshots.length === 0) {
        validation.warnings.push('No screenshots captured');
        validation.suggestions.push('Screenshots provide valuable visual context for training');
        validation.score -= 10;
      } else {
        let validScreenshots = 0;
        let corruptedScreenshots = 0;

        this.screenshots.forEach((screenshot, index) => {
          if (!screenshot.dataUrl || !screenshot.dataUrl.startsWith('data:image/')) {
            validation.errors.push(`Screenshot ${index}: Invalid or missing image data`);
            corruptedScreenshots++;
          } else {
            validScreenshots++;
          }

          if (!screenshot.timestamp) {
            validation.warnings.push(`Screenshot ${index}: Missing timestamp`);
          }

          if (!screenshot.trigger) {
            validation.warnings.push(`Screenshot ${index}: Missing trigger information`);
          }
        });

        // Check screenshot frequency
        const duration = Date.now() - this.startTime;
        const screenshotRate = this.screenshots.length / (duration / 1000);
        
        if (screenshotRate > 2) { // More than 2 per second
          validation.warnings.push('Very high screenshot capture rate - may impact performance');
        } else if (screenshotRate < 0.1) { // Less than 1 per 10 seconds
          validation.warnings.push('Low screenshot capture rate - may miss important visual changes');
        }

        validation.metrics.totalScreenshots = this.screenshots.length;
        validation.metrics.validScreenshots = validScreenshots;
        validation.metrics.corruptedScreenshots = corruptedScreenshots;
        validation.metrics.screenshotRate = screenshotRate;
      }
    }

    validateInteractionPatterns(validation) {
      const clickEvents = this.events.filter(e => e.type === 'CLICK');
      const inputEvents = this.events.filter(e => e.type === 'INPUT');
      const navEvents = this.events.filter(e => e.type === 'NAVIGATION');
      const scrollEvents = this.events.filter(e => e.type === 'SCROLL');

      // Check for realistic interaction patterns
      if (clickEvents.length === 0) {
        validation.warnings.push('No click interactions captured');
        validation.suggestions.push('Click interactions are essential for shopping behavior training');
      }

      // Check interaction timing
      if (clickEvents.length > 1) {
        const intervals = [];
        for (let i = 1; i < clickEvents.length; i++) {
          intervals.push(clickEvents[i].timestamp - clickEvents[i-1].timestamp);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const minInterval = Math.min(...intervals);
        
        if (minInterval < 100) { // Less than 100ms between clicks
          validation.warnings.push('Suspiciously fast clicking detected - may indicate automated behavior');
        }
        
        if (avgInterval < 500) { // Average less than 500ms
          validation.warnings.push('Very rapid clicking pattern - may not represent natural human behavior');
        }

        validation.metrics.averageClickInterval = avgInterval;
        validation.metrics.minimumClickInterval = minInterval;
      }

      // Check for shopping-specific patterns
      this.validateShoppingPatterns(validation);

      validation.metrics.clickCount = clickEvents.length;
      validation.metrics.inputCount = inputEvents.length;
      validation.metrics.navigationCount = navEvents.length;
      validation.metrics.scrollCount = scrollEvents.length;
    }

    validateShoppingPatterns(validation) {
      const urls = this.events.map(e => e.url).filter(Boolean);
      const uniqueUrls = new Set(urls);
      
      // Check for shopping-related URLs
      const shoppingKeywords = ['product', 'item', 'cart', 'checkout', 'buy', 'shop', 'category', 'search'];
      const hasShoppingUrls = urls.some(url => 
        shoppingKeywords.some(keyword => url.toLowerCase().includes(keyword))
      );

      if (!hasShoppingUrls) {
        validation.warnings.push('No shopping-related URLs detected');
        validation.suggestions.push('Ensure interactions occur on e-commerce pages for relevant training data');
      }

      // Check for product interaction patterns
      const productViews = this.events.filter(e => 
        e.url && e.url.toLowerCase().includes('product')
      ).length;

      const cartActions = this.events.filter(e => 
        e.elementText && e.elementText.toLowerCase().includes('cart')
      ).length;

      if (productViews === 0) {
        validation.warnings.push('No product page interactions detected');
      }

      if (cartActions === 0) {
        validation.suggestions.push('Consider including cart interactions for complete shopping behavior');
      }

      validation.metrics.uniqueUrls = uniqueUrls.size;
      validation.metrics.productViews = productViews;
      validation.metrics.cartActions = cartActions;
      validation.metrics.hasShoppingUrls = hasShoppingUrls;
    }

    validateDataCompleteness(validation) {
      const completeness = this.calculateCompleteness();
      
      if (completeness < 50) {
        validation.errors.push('Data completeness is too low for quality training');
        validation.score -= 20;
      } else if (completeness < 75) {
        validation.warnings.push('Data completeness could be improved');
        validation.suggestions.push('Try to capture more diverse interactions and screenshots');
      }

      // Check for missing critical data
      const criticalMissing = [];
      
      if (this.events.length === 0) criticalMissing.push('interaction events');
      if (this.screenshots.length === 0) criticalMissing.push('screenshots');
      if (!this.pageStructure) criticalMissing.push('page structure analysis');

      if (criticalMissing.length > 0) {
        validation.errors.push(`Missing critical data: ${criticalMissing.join(', ')}`);
      }

      validation.metrics.completeness = completeness;
      validation.metrics.criticalMissing = criticalMissing;
    }

    detectSuspiciousPatterns(validation) {
      // Check for bot-like behavior patterns
      const clickEvents = this.events.filter(e => e.type === 'CLICK');
      
      if (clickEvents.length > 0) {
        // Check for identical coordinates (bot-like)
        const coordinates = clickEvents.map(e => `${e.coordinates?.clientX},${e.coordinates?.clientY}`);
        const uniqueCoordinates = new Set(coordinates);
        
        if (coordinates.length > 3 && uniqueCoordinates.size === 1) {
          validation.warnings.push('Identical click coordinates detected - may indicate automated behavior');
        }

        // Check for perfect timing patterns
        const intervals = [];
        for (let i = 1; i < clickEvents.length; i++) {
          intervals.push(clickEvents[i].timestamp - clickEvents[i-1].timestamp);
        }
        
        if (intervals.length > 2) {
          const variance = this.calculateVariance(intervals);
          if (variance < 100) { // Very low variance in timing
            validation.warnings.push('Suspiciously consistent timing pattern detected');
          }
        }
      }

      // Check for missing human-like variations
      const hasScrolling = this.events.some(e => e.type === 'SCROLL');
      const hasMouseMovement = this.events.some(e => e.coordinates);
      
      if (!hasScrolling && this.events.length > 5) {
        validation.suggestions.push('Consider including scrolling behavior for more natural interaction patterns');
      }
    }

    testSelectorReliability(selector) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length === 0) return 0; // Selector doesn't match anything
        if (elements.length === 1) return 1; // Perfect match
        if (elements.length <= 3) return 0.8; // Good match
        if (elements.length <= 10) return 0.6; // Okay match
        return 0.3; // Poor match (too many elements)
      } catch (error) {
        return 0; // Invalid selector
      }
    }

    calculateVariance(numbers) {
      const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
      const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
      return squaredDiffs.reduce((a, b) => a + b, 0) / numbers.length;
    }

    // Real-time validation feedback
    showValidationFeedback(validation) {
      // Remove existing feedback
      const existingFeedback = document.getElementById('unified-validation-feedback');
      if (existingFeedback) {
        existingFeedback.remove();
      }

      // Only show if there are issues
      if (validation.errors.length === 0 && validation.warnings.length === 0) {
        return;
      }

      const feedback = document.createElement('div');
      feedback.id = 'unified-validation-feedback';
      feedback.innerHTML = `
        <div style="
          position: fixed;
          top: 50px;
          right: 10px;
          background: ${validation.errors.length > 0 ? '#f44336' : '#ff9800'};
          color: white;
          padding: 12px;
          border-radius: 4px;
          font-family: Arial, sans-serif;
          font-size: 12px;
          z-index: 999998;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          max-width: 300px;
          cursor: pointer;
        " onclick="this.style.display='none'">
          <div style="font-weight: bold; margin-bottom: 8px;">
            Data Quality: ${validation.score}/100
          </div>
          ${validation.errors.length > 0 ? `
            <div style="margin-bottom: 4px;">
              <strong>Errors:</strong> ${validation.errors.length}
            </div>
          ` : ''}
          ${validation.warnings.length > 0 ? `
            <div style="margin-bottom: 4px;">
              <strong>Warnings:</strong> ${validation.warnings.length}
            </div>
          ` : ''}
          <div style="font-size: 10px; opacity: 0.8;">
            Click to dismiss
          </div>
        </div>
      `;
      
      document.body.appendChild(feedback);

      // Auto-hide after 10 seconds
      setTimeout(() => {
        if (feedback.parentNode) {
          feedback.remove();
        }
      }, 10000);
    }

    // Periodic validation during session
    startPeriodicValidation() {
      if (this.validationInterval) {
        clearInterval(this.validationInterval);
      }

      this.validationInterval = setInterval(() => {
        if (this.isTracking && this.events.length > 0) {
          const validation = this.validateSessionData();
          
          // Show feedback for significant issues
          if (validation.errors.length > 0 || validation.warnings.length > 2) {
            this.showValidationFeedback(validation);
          }

          // Send validation metrics to background
          chrome.runtime.sendMessage({
            action: 'VALIDATION_UPDATE',
            sessionId: this.sessionId,
            validation: {
              score: validation.score,
              isValid: validation.isValid,
              errorCount: validation.errors.length,
              warningCount: validation.warnings.length,
              metrics: validation.metrics
            }
          }).catch(() => {
            // Ignore errors - background script might not be ready
          });
        }
      }, 30000); // Every 30 seconds
    }

    stopPeriodicValidation() {
      if (this.validationInterval) {
        clearInterval(this.validationInterval);
        this.validationInterval = null;
      }
    }

    // UI feedback
    showTrackingIndicator() {
      if (document.getElementById('unified-tracking-indicator')) return;
      
      const indicator = document.createElement('div');
      indicator.id = 'unified-tracking-indicator';
      indicator.innerHTML = `
        <div style="
          position: fixed;
          top: 10px;
          right: 10px;
          background: #4CAF50;
          color: white;
          padding: 8px 12px;
          border-radius: 4px;
          font-family: Arial, sans-serif;
          font-size: 12px;
          z-index: 999999;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        ">
          🔴 CodeSight Recording
        </div>
      `;
      
      document.body.appendChild(indicator);
    }

    hideTrackingIndicator() {
      const indicator = document.getElementById('unified-tracking-indicator');
      if (indicator) {
        indicator.remove();
      }
    }

    // Task overlay methods
    async fetchAndDisplayTask() {
      console.log('Unified: fetchAndDisplayTask() called'); // Debug log
      try {
        console.log('Unified: Fetching task for session:', this.sessionId);
        
        // Request task from background script to avoid CORS issues
        const response = await chrome.runtime.sendMessage({
          action: 'FETCH_TASK',
          sessionId: this.sessionId,
          difficulty: 'beginner'
        });
        
        if (response && response.success && response.task) {
          this.currentTask = response.task;
          this.showTaskOverlay();
          console.log('Unified: Task loaded:', this.currentTask.title);
        } else {
          throw new Error('Failed to fetch task: ' + (response?.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('Unified: Failed to fetch task:', error);
        // Show fallback task
        this.currentTask = {
          title: "Explore this website",
          description: "Browse around and interact with different elements to help train our AI system",
          website: window.location.href,
          difficulty: "BEGINNER"
        };
        this.showTaskOverlay();
      }
    }

    showTaskOverlay() {
      if (document.getElementById('unified-task-overlay')) return;
      if (!this.currentTask) return;
      
      const overlay = document.createElement('div');
      overlay.id = 'unified-task-overlay';
      
      // Get website URL for display
      const targetWebsite = this.currentTask.website || 'the target website';
      const websiteDomain = targetWebsite.includes('://') ? new URL(targetWebsite).hostname : targetWebsite;
      
      overlay.innerHTML = `
        <div style="
          position: fixed;
          top: 50px;
          right: 10px;
          width: 320px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 18px;
          border-radius: 12px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 14px;
          z-index: 999998;
          box-shadow: 0 4px 20px rgba(0,0,0,0.25);
          border: 1px solid rgba(255,255,255,0.2);
        ">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h4 style="margin: 0; font-size: 18px; color: #fff; display: flex; align-items: center;">
              🎯 <span style="margin-left: 8px;">Your Task</span>
            </h4>
            <button onclick="document.getElementById('unified-task-overlay').style.display='none'" 
                    style="background: none; border: none; color: white; font-size: 20px; cursor: pointer; opacity: 0.8; padding: 4px;">×</button>
          </div>
          
          <div style="margin-bottom: 16px;">
            <div style="font-weight: 600; margin-bottom: 6px; font-size: 15px;">${this.currentTask.title}</div>
            <div style="font-size: 13px; opacity: 0.9; line-height: 1.4;">${this.currentTask.description}</div>
          </div>
          
          <div style="
            background: rgba(255,255,255,0.15);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
          ">
            <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px; opacity: 0.9;">🌐 Target Website:</div>
            <div style="font-size: 13px; font-weight: 500; color: #e8f4fd;">${websiteDomain}</div>
          </div>
          
          <div style="font-size: 11px; opacity: 0.8; text-align: center; font-style: italic;">
            Navigate to the website and complete your task naturally
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      this.taskOverlay = overlay;
    }

    hideTaskOverlay() {
      const overlay = document.getElementById('unified-task-overlay');
      if (overlay) {
        overlay.remove();
      }
      this.taskOverlay = null;
    }

    // Task progress is no longer automatically tracked - let users complete tasks naturally

    // Task completion is now handled naturally by user behavior, not automated step tracking

    restoreTaskOverlay() {
      // Check if we're tracking and have a current task
      if (this.isTracking && this.currentTask) {
        console.log('Unified: Restoring task overlay after navigation for task:', this.currentTask.title);
        
        // Small delay to ensure DOM is ready and tracking indicator is shown
        setTimeout(() => {
          this.showTaskOverlay();
        }, 100);
      } else if (this.isTracking && !this.currentTask) {
        // If we're tracking but lost the task, try to fetch it again
        console.log('Unified: Tracking active but no current task - attempting to fetch task');
        setTimeout(() => {
          this.fetchAndDisplayTask();
        }, 500);
      }
      
      // Check if current domain matches task website domain  
      if (this.isTracking && this.currentTask && this.currentTask.website) {
        const currentDomain = window.location.hostname;
        const taskDomain = new URL(this.currentTask.website).hostname;
        
        if (currentDomain === taskDomain || currentDomain.includes(taskDomain)) {
          console.log('Unified: Now on task target website!', currentDomain);
          // Highlight that we've reached the task website
          this.showTaskCompletionHint();
        }
      }
    }

    showTaskCompletionHint() {
      // Remove any existing hints
      const existingHint = document.getElementById('unified-task-completion-hint');
      if (existingHint) existingHint.remove();
      
      const hint = document.createElement('div');
      hint.id = 'unified-task-completion-hint';
      hint.innerHTML = `
        <div style="
          position: fixed;
          bottom: 20px;
          right: 20px;
          background: linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 100%);
          color: white;
          padding: 16px 20px;
          border-radius: 8px;
          font-family: Arial, sans-serif;
          font-size: 14px;
          z-index: 999999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
          max-width: 300px;
          animation: slideIn 0.3s ease-out;
        ">
          <div style="font-size: 18px; margin-bottom: 8px;">🎯 Task Website Reached!</div>
          <div style="font-weight: bold; margin-bottom: 4px;">You're now on the target website</div>
          <div style="font-size: 12px; opacity: 0.9;">Start completing your task objectives</div>
        </div>
        <style>
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        </style>
      `;
      
      document.body.appendChild(hint);
      
      // Auto remove after 4 seconds
      setTimeout(() => {
        if (hint.parentNode) {
          hint.remove();
        }
      }, 4000);
    }

    // Status methods
    getStatus() {
      // Use restored counts if available, otherwise use current array lengths
      const eventCount = this.events.length + (this.restoredEventCount || 0);
      const screenshotCount = this.screenshots.length + (this.restoredScreenshotCount || 0);
      
      return {
        isTracking: this.isTracking,
        sessionId: this.sessionId,
        startTime: this.startTime,
        duration: this.isTracking ? Date.now() - this.startTime : 0,
        eventCount: eventCount,
        screenshotCount: screenshotCount,
        currentUrl: window.location.href,
        qualityScore: this.calculateQualityScore(),
        completeness: this.calculateCompleteness(),
        currentTask: this.currentTask,
        taskProgress: this.taskProgress
      };
    }

    async getSessionData() {
      if (!this.isTracking) {
        return null;
      }
      
      return await this.prepareSessionData();
    }

    updateConfig(newConfig) {
      this.config = { ...this.config, ...newConfig };
      console.log('Unified: Config updated:', newConfig);
    }

    // Utility methods
    throttle(func, limit) {
      let inThrottle;
      return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
          func.apply(context, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    }

    generateId() {
      return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    setupStatePreservation() {
      // Save state before page unloads
      const saveBeforeUnload = () => {
        if (this.isTracking) {
          console.log('Unified: Saving state before navigation');
          this.saveState();
        }
      };

      // Multiple event listeners to catch all navigation scenarios
      window.addEventListener('beforeunload', saveBeforeUnload);
      window.addEventListener('pagehide', saveBeforeUnload);
      // Note: unload event removed due to permissions policy violation
      
      // Also save state periodically during tracking
      if (this.statePreservationInterval) {
        clearInterval(this.statePreservationInterval);
      }
      
      this.statePreservationInterval = setInterval(() => {
        if (this.isTracking) {
          this.saveState();
        }
      }, 5000); // Save every 5 seconds
    }

    cleanupStatePreservation() {
      if (this.statePreservationInterval) {
        clearInterval(this.statePreservationInterval);
        this.statePreservationInterval = null;
      }
    }

    // Enhanced data collection methods per ChatGPT specification
    
    getPrunedDOMSnapshot(targetElement) {
      // Get a focused DOM snapshot around the target element (5 levels up/down)
      let container = targetElement;
      for (let i = 0; i < 5 && container.parentElement; i++) {
        container = container.parentElement;
      }
      
      return this.serializeElementTree(container, 5);
    }
    
    serializeElementTree(element, maxDepth) {
      if (maxDepth <= 0) return null;
      
      const result = {
        tag: element.tagName.toLowerCase(),
        attributes: {},
        children: []
      };
      
      // Copy important attributes
      for (const attr of element.attributes) {
        if (['id', 'class', 'data-testid', 'role', 'type'].includes(attr.name)) {
          result.attributes[attr.name] = attr.value;
        }
      }
      
      // Add text content for text nodes
      if (element.childNodes.length === 1 && element.childNodes[0].nodeType === Node.TEXT_NODE) {
        result.text = element.textContent.trim().substring(0, 100);
      }
      
      // Recursively serialize children (but limit to avoid huge payloads)
      for (let i = 0; i < Math.min(element.children.length, 10); i++) {
        const child = this.serializeElementTree(element.children[i], maxDepth - 1);
        if (child) result.children.push(child);
      }
      
      return result;
    }
    
    generatePageHash() {
      // Simple hash of page structure for duplicate detection
      const content = document.title + window.location.pathname + document.body.innerHTML.substring(0, 1000);
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      return `sha256-${Math.abs(hash).toString(16)}`;
    }
    
    getRecentNetworkRequests() {
      // This would require additional setup to capture network requests
      // For now, return placeholder
      return [];
    }
    
    getElementAttributes(element) {
      const attrs = {};
      for (const attr of element.attributes) {
        attrs[attr.name] = attr.value;
      }
      return attrs;
    }
    
    generateCSSSelector(element) {
      const path = [];
      let current = element;
      
      while (current && current !== document.body) {
        let selector = current.tagName.toLowerCase();
        
        if (current.id) {
          selector += `#${current.id}`;
          path.unshift(selector);
          break;
        }
        
        if (current.className) {
          // Handle both regular HTML elements (string) and SVG elements (object)
          const classValue = typeof current.className === 'string' 
            ? current.className 
            : current.className.baseVal || current.className.toString();
            
          if (classValue && typeof classValue === 'string') {
            const classes = classValue.split(' ').filter(c => c.trim());
            if (classes.length > 0) {
              selector += `.${classes.join('.')}`;
            }
          }
        }
        
        // Add nth-child if needed for uniqueness
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(s => s.tagName === current.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            selector += `:nth-child(${index})`;
          }
        }
        
        path.unshift(selector);
        current = current.parentElement;
      }
      
      return path.join(' > ');
    }
    
    generateXPath(element) {
      const path = [];
      let current = element;
      
      while (current && current !== document.documentElement) {
        let selector = current.tagName.toLowerCase();
        
        if (current.id) {
          selector = `${selector}[@id='${current.id}']`;
          path.unshift(selector);
          break;
        }
        
        // Add position among siblings
        const parent = current.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(s => s.tagName === current.tagName);
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            selector += `[${index}]`;
          }
        }
        
        path.unshift(selector);
        current = current.parentElement;
      }
      
      return '//' + path.join('/');
    }
    
    getElementBoundingBox(element) {
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    }
    
    getRelevantComputedStyle(element) {
      const computed = window.getComputedStyle(element);
      return {
        visibility: computed.visibility,
        display: computed.display,
        cursor: computed.cursor,
        z_index: computed.zIndex,
        position: computed.position
      };
    }
    
    getParentElementInfo(element) {
      const parent = element.parentElement;
      if (!parent) return null;
      
      // Handle both HTML and SVG className properly
      const classValue = typeof parent.className === 'string' 
        ? parent.className 
        : parent.className.baseVal || parent.className.toString();
      
      return {
        tag: parent.tagName.toLowerCase(),
        classes: classValue ? classValue.split(' ').filter(c => c.trim()) : [],
        id: parent.id || null,
        css_selector: this.generateCSSSelector(parent)
      };
    }
    
    getAncestorChain(element) {
      const ancestors = [];
      let current = element.parentElement;
      
      while (current && current !== document.body && ancestors.length < 10) {
        // Handle both HTML and SVG className properly
        const classValue = typeof current.className === 'string' 
          ? current.className 
          : current.className.baseVal || current.className.toString();
        
        ancestors.push({
          tag: current.tagName.toLowerCase(),
          classes: classValue ? classValue.split(' ').filter(c => c.trim()) : [],
          id: current.id || null,
          css_selector: this.generateCSSSelector(current)
        });
        current = current.parentElement;
      }
      
      return ancestors;
    }
    
    getSiblingElements(element) {
      const parent = element.parentElement;
      if (!parent) return [];
      
      const siblings = [];
      const children = Array.from(parent.children);
      const elementIndex = children.indexOf(element);
      
      // Get 2 siblings on each side
      for (let i = Math.max(0, elementIndex - 2); i <= Math.min(children.length - 1, elementIndex + 2); i++) {
        if (i !== elementIndex) {
          const sibling = children[i];
          siblings.push({
            position: i < elementIndex ? 'before' : 'after',
            tag: sibling.tagName.toLowerCase(),
            text: this.getElementText(sibling).substring(0, 50),
            css_selector: this.generateCSSSelector(sibling)
          });
        }
      }
      
      return siblings;
    }
    
    findNearbyClickableElements(targetElement, radius = 100) {
      const nearby = [];
      const targetRect = targetElement.getBoundingClientRect();
      const targetCenter = {
        x: targetRect.left + targetRect.width / 2,
        y: targetRect.top + targetRect.height / 2
      };
      
      const clickableSelectors = 'a, button, input, select, textarea, [role="button"], [onclick], [tabindex]';
      const candidates = document.querySelectorAll(clickableSelectors);
      
      candidates.forEach(element => {
        if (element === targetElement) return;
        
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        
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
            tag: element.tagName.toLowerCase(),
            text: this.getElementText(element).substring(0, 50),
            css_selector: this.generateCSSSelector(element),
            distance: Math.round(distance)
          });
        }
      });
      
      return nearby.sort((a, b) => a.distance - b.distance).slice(0, 5);
    }
    
    detectActiveOverlays() {
      const overlays = [];
      
      // Common modal/overlay selectors
      const overlaySelectors = [
        '.modal:not([style*="display: none"])',
        '.overlay:not([style*="display: none"])',
        '.popup:not([style*="display: none"])',
        '.dialog:not([style*="display: none"])',
        '[role="dialog"]:not([style*="display: none"])',
        '.cookie-banner:not([style*="display: none"])',
        '.cookie-consent:not([style*="display: none"])'
      ];
      
      overlaySelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
          const computed = window.getComputedStyle(element);
          if (computed.display !== 'none' && computed.visibility !== 'hidden') {
            const closeButton = element.querySelector('button[class*="close"], .close, [aria-label*="close"]');
            overlays.push({
              id: element.id || `overlay-${overlays.length}`,
              css_selector: this.generateCSSSelector(element),
              bounding_box: this.getElementBoundingBox(element),
              close_button: closeButton ? {
                css_selector: this.generateCSSSelector(closeButton)
              } : null
            });
          }
        });
      });
      
      return overlays;
    }

    // Check if element is in viewport
    isElementInViewport(element) {
      const rect = element.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.right <= window.innerWidth
      );
    }

    // Test selector reliability (simplified)
    testSelectorReliability(selector) {
      try {
        const elements = document.querySelectorAll(selector);
        return elements.length === 1 ? 1.0 : Math.max(0.1, 1.0 / elements.length);
      } catch (e) {
        return 0.1;
      }
    }

    // Get viewport information
    getViewportInfo() {
      return {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        devicePixelRatio: window.devicePixelRatio || 1
      };
    }

    // Update existing event and send to background
    updateEvent(eventData) {
      const idx = this.events.findIndex(e => e.id === eventData.id);
      if (idx !== -1) {
        this.events[idx] = { ...this.events[idx], ...eventData };
        this.saveState();
        // **New**: push updated event to background
        chrome.runtime.sendMessage({
          action: 'SEND_DATA',
          data: this.events[idx]
        });
      }
    }

    // Get complete session data for download
    getSessionData() {
      const duration = this.isTracking ? Date.now() - this.startTime : 0;
      
      return {
        sessionId: this.sessionId,
        isTracking: this.isTracking,
        startTime: this.startTime,
        duration: duration,
        currentUrl: window.location.href,
        
        // Enhanced interaction data
        events: this.events,
        eventCount: this.events.length,
        
        // Screenshots
        screenshots: this.screenshots,
        screenshotCount: this.screenshots.length,
        
        // Session metadata
        config: this.config,
        
        // Quality metrics
        quality: this.calculateQualityScore(),
        
        // Page context
        pageContext: {
          title: document.title,
          url: window.location.href,
          timestamp: Date.now(),
          viewport: this.getViewportInfo(),
          userAgent: navigator.userAgent
        },
        
        // Data structure info
        dataStructure: {
          enhancedDataGroups: 6,
          version: '2.0',
          features: [
            'multi-selector-generation',
            'enhanced-element-analysis', 
            'visual-context-collection',
            'dom-hierarchy-mapping',
            'state-change-detection',
            'detailed-interaction-metadata'
          ]
        }
      };
    }

    // Calculate session quality score
    calculateQualityScore() {
      if (this.events.length === 0) return 0;
      
      let score = 0;
      let totalChecks = 0;
      
      // Check for enhanced data completeness
      this.events.forEach(event => {
        totalChecks++;
        
        // Check for selector data
        if (event.selectors && event.selectors.primary) score += 20;
        
        // Check for element analysis
        if (event.element && event.element.tag) score += 20;
        
        // Check for visual context
        if (event.visual && event.visual.boundingBox) score += 20;
        
        // Check for DOM context
        if (event.context && event.context.parentElements) score += 20;
        
        // Check for interaction metadata
        if (event.interaction && event.interaction.coordinates) score += 20;
      });
      
      return totalChecks > 0 ? Math.round(score / totalChecks) : 0;
    }

    // Get current tracking status
    getStatus() {
      return {
        isTracking: this.isTracking,
        sessionId: this.sessionId,
        eventCount: this.events.length,
        screenshotCount: this.screenshots.length,
        duration: this.isTracking ? Date.now() - this.startTime : 0,
        quality: this.calculateQualityScore()
      };
    }
  }

  // Initialize the tracker
  window.UnifiedCodeSightTracker = new UnifiedCodeSightTracker();
  
  // 🔍 TEST: Immediate console log to verify script loading
  console.log('🚀 CodeSight Enhanced Tracker Loaded!', new Date().toISOString());

})();