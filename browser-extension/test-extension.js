// Simple test to verify extension is working
console.log('CodeSight Extension Test Script Loaded');

// Test if we can communicate with the background script
chrome.runtime.sendMessage({
  type: 'GET_STATUS'
}, (response) => {
  console.log('Extension response:', response);
});

// Test extension ID
console.log('Extension ID:', chrome.runtime.id);