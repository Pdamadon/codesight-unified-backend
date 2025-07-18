// Simple test tracker for debugging
(function() {
  'use strict';
  
  console.log('🚀 Simple test tracker loading...');
  console.log('Current URL:', window.location.href);
  console.log('Current origin:', window.location.origin);
  
  // Check if we should skip
  const shouldSkip = window.location.origin.includes('codesight') || 
                    window.location.origin.includes('vercel') || 
                    window.location.origin.includes('localhost');
  
  console.log('Should skip domain:', shouldSkip);
  
  if (shouldSkip) {
    console.log('⏭️ Skipping this domain');
    return;
  }
  
  // Simple tracker class
  class SimpleTracker {
    constructor() {
      console.log('✅ Simple tracker initialized');
      this.isActive = true;
      
      // Add click listener
      document.addEventListener('click', (e) => {
        console.log('🖱️ Click detected:', e.target);
      });
    }
  }
  
  // Create instance
  window.simpleTracker = new SimpleTracker();
  console.log('📊 Simple tracker ready');
  
})();