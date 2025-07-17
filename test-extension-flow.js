#!/usr/bin/env node

// Test complete extension data flow with production backend
const WebSocket = require('ws');

const config = {
  url: 'wss://gentle-vision-production.up.railway.app/ws',
  apiKey: 'test-key-dev'
};

console.log('🔌 Testing complete extension data flow...');

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
    console.log('📨 Received message:', message.type);
    
    if (message.type === 'authentication_success') {
      console.log('✅ Authentication successful!');
      testSessionFlow(ws);
    } else if (message.type === 'session_started') {
      console.log('✅ Session started:', message.sessionId);
      testInteractionFlow(ws, message.sessionId);
    } else if (message.type === 'interaction_processed') {
      console.log('✅ Interaction processed:', message.data);
      testScreenshotFlow(ws, message.sessionId);
    } else if (message.type === 'screenshot_processed') {
      console.log('✅ Screenshot processed:', message.data);
      console.log('🎉 Complete extension data flow test successful!');
      ws.close();
    }
  } catch (error) {
    console.error('❌ Error parsing message:', error);
  }
});

function testSessionFlow(ws) {
  console.log('🚀 Testing session start...');
  
  const sessionMessage = {
    type: 'session_start',
    data: {
      sessionId: 'test-session-' + Date.now(),
      config: {
        type: 'HUMAN',
        captureScreenshots: true,
        captureInteractions: true,
        workerId: 'test-worker-123'
      }
    },
    timestamp: Date.now()
  };
  
  ws.send(JSON.stringify(sessionMessage));
}

function testInteractionFlow(ws, sessionId) {
  console.log('🖱️ Testing interaction event...');
  
  const interactionMessage = {
    type: 'interaction_event',
    sessionId: sessionId,
    data: {
      type: 'click',
      element: 'button',
      selector: '#test-button',
      timestamp: Date.now(),
      x: 100,
      y: 200,
      sequence: 1,
      modifiers: { shift: false, ctrl: false, alt: false },
      offsetX: 10,
      offsetY: 15,
      isVisible: true,
      context: {
        pageUrl: 'https://example.com/test',
        pageTitle: 'Test Page',
        viewport: { width: 1920, height: 1080 }
      },
      elementAnalysis: {
        tagName: 'BUTTON',
        className: 'test-button',
        innerText: 'Click me',
        attributes: { id: 'test-button', type: 'button' }
      }
    },
    timestamp: Date.now()
  };
  
  ws.send(JSON.stringify(interactionMessage));
}

function testScreenshotFlow(ws, sessionId) {
  console.log('📷 Testing screenshot data...');
  
  const screenshotMessage = {
    type: 'screenshot_data',
    sessionId: sessionId,
    data: {
      timestamp: Date.now(),
      eventType: 'interaction',
      url: 'https://example.com/test',
      viewport: JSON.stringify({ width: 1920, height: 1080 }),
      imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
      burstId: 'burst-123',
      burstIndex: 1,
      burstTotal: 3,
      trigger: 'click',
      compressionRatio: 0.75
    },
    timestamp: Date.now()
  };
  
  ws.send(JSON.stringify(screenshotMessage));
}

ws.on('close', (code, reason) => {
  console.log(`🔌 WebSocket closed. Code: ${code}, Reason: ${reason}`);
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});