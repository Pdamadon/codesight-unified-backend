// Wake up script to activate extension service worker
(function() {
  'use strict';
  
  // Only run on CodeSight frontend
  if (window.location.origin.includes('codesight') || window.location.origin.includes('vercel')) {
    console.log('CodeSight: Waking up extension service worker...');
    
    // Send a message to wake up the service worker
    if (chrome && chrome.runtime && chrome.runtime.id) {
      chrome.runtime.sendMessage({
        type: 'WAKE_UP',
        origin: window.location.origin
      }, (response) => {
        console.log('CodeSight: Extension awakened:', response);
      });
    }
  }
})();