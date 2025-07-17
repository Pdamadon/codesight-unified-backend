// Injected script for CodeSight Tracker
// This script runs in the page context and can access page variables

(function() {
  'use strict';
  
  // Only inject once
  if (window.__CODESIGHT_INJECTED__) {
    return;
  }
  window.__CODESIGHT_INJECTED__ = true;
  
  // Create a communication channel with content script
  const channel = {
    send: function(type, data) {
      window.postMessage({
        source: 'codesight-injected',
        type: type,
        data: data
      }, '*');
    }
  };
  
  // Monitor for framework-specific events
  function detectFrameworkEvents() {
    // React detection
    if (window.React || window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
      channel.send('framework-detected', { framework: 'React' });
    }
    
    // Vue detection
    if (window.Vue || window.__VUE__) {
      channel.send('framework-detected', { framework: 'Vue' });
    }
    
    // Angular detection
    if (window.angular || window.ng) {
      channel.send('framework-detected', { framework: 'Angular' });
    }
  }
  
  // Monitor for e-commerce specific events
  function monitorEcommerceEvents() {
    // Override common e-commerce methods if they exist
    const ecommerceMethods = [
      'addToCart',
      'removeFromCart',
      'updateCart',
      'checkout',
      'purchase'
    ];
    
    ecommerceMethods.forEach(method => {
      if (window[method] && typeof window[method] === 'function') {
        const original = window[method];
        window[method] = function(...args) {
          channel.send('ecommerce-event', {
            method: method,
            args: args
          });
          return original.apply(this, args);
        };
      }
    });
  }
  
  // Monitor AJAX requests
  function monitorAjaxRequests() {
    // XMLHttpRequest monitoring
    const originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
      const xhr = new originalXHR();
      const originalOpen = xhr.open;
      const originalSend = xhr.send;
      
      xhr.open = function(method, url, ...args) {
        xhr._codesight = { method, url };
        return originalOpen.apply(xhr, [method, url, ...args]);
      };
      
      xhr.send = function(data) {
        if (xhr._codesight) {
          channel.send('ajax-request', {
            method: xhr._codesight.method,
            url: xhr._codesight.url,
            data: data
          });
        }
        return originalSend.apply(xhr, [data]);
      };
      
      return xhr;
    };
    
    // Fetch monitoring
    if (window.fetch) {
      const originalFetch = window.fetch;
      window.fetch = function(url, options = {}) {
        channel.send('fetch-request', {
          url: url,
          method: options.method || 'GET',
          headers: options.headers
        });
        return originalFetch.apply(window, [url, options]);
      };
    }
  }
  
  // Monitor page performance
  function monitorPerformance() {
    if (window.performance && window.performance.timing) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const timing = window.performance.timing;
          const metrics = {
            domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
            loadComplete: timing.loadEventEnd - timing.navigationStart,
            firstPaint: timing.responseEnd - timing.navigationStart,
            domInteractive: timing.domInteractive - timing.navigationStart
          };
          
          channel.send('performance-metrics', metrics);
        }, 1000);
      });
    }
  }
  
  // Initialize monitoring
  detectFrameworkEvents();
  monitorEcommerceEvents();
  monitorAjaxRequests();
  monitorPerformance();
  
  // Listen for messages from content script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    
    if (event.data && event.data.source === 'codesight-content') {
      // Handle messages from content script
      switch (event.data.type) {
        case 'ping':
          channel.send('pong', { timestamp: Date.now() });
          break;
          
        case 'get-page-data':
          channel.send('page-data', {
            title: document.title,
            url: window.location.href,
            referrer: document.referrer,
            cookies: document.cookie.length,
            localStorage: Object.keys(window.localStorage || {}).length,
            sessionStorage: Object.keys(window.sessionStorage || {}).length
          });
          break;
      }
    }
  });
  
  // Notify content script that injection is complete
  channel.send('injection-complete', {
    timestamp: Date.now(),
    url: window.location.href
  });
  
})();