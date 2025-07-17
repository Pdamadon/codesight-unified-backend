#!/usr/bin/env node

// Simple WebSocket client to test the production backend
const WebSocket = require('ws');

const config = {
  url: 'wss://gentle-vision-production.up.railway.app/ws',
  apiKey: 'test-key-dev'
};

console.log('🔌 Testing WebSocket connection to:', config.url);

const ws = new WebSocket(config.url);

ws.on('open', () => {
  console.log('✅ WebSocket connected');
  
  // Send authentication message
  const authMessage = {
    type: 'authenticate',
    data: {
      apiKey: config.apiKey,
      clientType: 'extension',
      extensionVersion: '2.0.0'
    },
    timestamp: Date.now()
  };
  
  console.log('🔑 Sending authentication...');
  ws.send(JSON.stringify(authMessage));
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log('📨 Received message:', message);
    
    if (message.type === 'authentication_success') {
      console.log('✅ Authentication successful!');
      
      // Send a test session start message
      const sessionMessage = {
        type: 'session_start',
        data: {
          sessionId: 'test-session-' + Date.now(),
          config: {
            captureScreenshots: true,
            captureInteractions: true
          }
        },
        timestamp: Date.now()
      };
      
      console.log('🚀 Starting test session...');
      ws.send(JSON.stringify(sessionMessage));
    }
  } catch (error) {
    console.error('❌ Error parsing message:', error);
  }
});

ws.on('close', (code, reason) => {
  console.log(`🔌 WebSocket closed. Code: ${code}, Reason: ${reason}`);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

// Keep the connection alive for testing
setTimeout(() => {
  if (ws.readyState === WebSocket.OPEN) {
    console.log('⏰ Closing test connection...');
    ws.close();
  }
}, 30000); // Close after 30 seconds