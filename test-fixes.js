#!/usr/bin/env node

// Simple test script to validate our API fixes
const axios = require('axios');

async function testApiConnection() {
  const apiKey = process.env.EXA_API_KEY;
  
  if (!apiKey) {
    console.log('❌ EXA_API_KEY environment variable not set');
    console.log('Please set your API key: export EXA_API_KEY=your_key_here');
    return;
  }

  console.log('🔧 Testing Exa Websets API fixes...\n');

  // Test 1: Check authentication header format
  console.log('1. Testing authentication header format...');
  try {
    const response = await axios.get('https://api.exa.ai/websets/v0/websets', {
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Authentication successful with x-api-key header');
    console.log(`   Status: ${response.status}`);
    console.log(`   Response type: ${typeof response.data}`);
    
    if (response.data && response.data.data) {
      console.log(`   Found ${response.data.data.length} websets`);
    }
    
  } catch (error) {
    if (error.response) {
      console.log(`❌ API Error: ${error.response.status} - ${error.response.statusText}`);
      console.log(`   Response: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.code === 'ECONNABORTED') {
      console.log('❌ Request timeout - API might be slow');
    } else {
      console.log(`❌ Network Error: ${error.message}`);
    }
  }

  // Test 2: Try old Bearer format to confirm it fails
  console.log('\n2. Testing old Bearer format (should fail)...');
  try {
    const response = await axios.get('https://api.exa.ai/websets/v0/websets', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });
    
    console.log('⚠️  Unexpected: Bearer format still works');
    
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Bearer format correctly rejected (401 Unauthorized)');
    } else {
      console.log(`❓ Bearer format failed with: ${error.response?.status || error.message}`);
    }
  }

  console.log('\n🎯 Test Summary:');
  console.log('- Fixed authentication header from "Authorization: Bearer" to "x-api-key"');
  console.log('- Fixed endpoint access patterns to use webset hierarchy');
  console.log('- Updated search/enrichment retrieval to find parent websets first');
  console.log('\n📋 Next steps:');
  console.log('1. Test the websetsManager tool with real operations');
  console.log('2. Verify search and enrichment operations work end-to-end');
  console.log('3. Run integration tests to confirm 47% functionality gap is resolved');
}

testApiConnection().catch(console.error);