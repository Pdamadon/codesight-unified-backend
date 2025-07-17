// Simple WebSocket connection test
const WebSocket = require('ws');

const url = 'wss://gentle-vision-production.up.railway.app/ws';

console.log('Testing WebSocket connection to:', url);

const ws = new WebSocket(url);

ws.on('open', function open() {
  console.log('✅ WebSocket connected successfully!');
  
  // Send authentication message like the extension does
  const authMessage = {
    type: 'authenticate',
    data: {
      apiKey: 'test-key-dev',
      clientType: 'extension',
      extensionVersion: '2.0.0',
      browser: 'test'
    },
    timestamp: Date.now()
  };
  
  console.log('Sending auth message:', authMessage);
  ws.send(JSON.stringify(authMessage));
});

ws.on('message', function message(data) {
  console.log('📨 Received:', JSON.parse(data.toString()));
});

ws.on('close', function close(code, reason) {
  console.log('❌ WebSocket closed:', code, reason.toString());
});

ws.on('error', function error(err) {
  console.error('🚨 WebSocket error:', err.message);
});

// Keep alive for 10 seconds
setTimeout(() => {
  console.log('Closing test connection...');
  ws.close();
  process.exit(0);
}, 10000);