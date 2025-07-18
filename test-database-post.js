const https = require('https');

// Test data to send to the backend
const testSessionData = {
  id: `test_session_${Date.now()}`,
  type: 'HUMAN',
  config: {
    testMode: true,
    source: 'direct_post_test'
  },
  workerId: 'test_worker',
  userAgent: 'Test Script',
  ipAddress: '127.0.0.1'
};

const testInteractionData = {
  sessionId: testSessionData.id,
  type: 'click',
  elementSelector: 'button#test-button',
  elementText: 'Test Button',
  timestamp: new Date().toISOString(),
  viewport: { width: 1920, height: 1080 },
  coordinates: { x: 100, y: 200 }
};

function makePostRequest(path, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: 'gentle-vision-production.up.railway.app',
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': 'Bearer test-api-key', // If auth is required
        'X-API-Key': 'test-key-dev' // Alternative auth header
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`📡 ${path} Response:`, {
          statusCode: res.statusCode,
          headers: res.headers,
          data: responseData
        });
        resolve({
          statusCode: res.statusCode,
          data: responseData,
          headers: res.headers
        });
      });
    });

    req.on('error', (error) => {
      console.error(`❌ ${path} Error:`, error);
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function testDatabasePosts() {
  console.log('🧪 Testing direct POST requests to backend database...\n');
  
  try {
    // Test 1: Create session via API
    console.log('1️⃣ Testing session creation...');
    const sessionResponse = await makePostRequest('/api/sessions', testSessionData);
    
    if (sessionResponse.statusCode === 200 || sessionResponse.statusCode === 201) {
      console.log('✅ Session creation successful!');
    } else {
      console.log('⚠️ Session creation response:', sessionResponse.statusCode);
    }
    
    console.log('\n');
    
    // Test 2: Create interaction via API
    console.log('2️⃣ Testing interaction creation...');
    const interactionResponse = await makePostRequest('/api/interactions', testInteractionData);
    
    if (interactionResponse.statusCode === 200 || interactionResponse.statusCode === 201) {
      console.log('✅ Interaction creation successful!');
    } else {
      console.log('⚠️ Interaction creation response:', interactionResponse.statusCode);
    }
    
    console.log('\n');
    
    // Test 3: Direct database insertion via custom endpoint (if we create one)
    console.log('3️⃣ Testing direct database insertion...');
    const directData = {
      action: 'create_session',
      data: testSessionData
    };
    
    const directResponse = await makePostRequest('/api/test/database', directData);
    console.log('Direct database test response:', directResponse.statusCode);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
  
  console.log('\n🔍 After running tests, check database with:');
  console.log('   cd unified-backend && node check-database.js');
}

// Run the tests
testDatabasePosts();