#!/usr/bin/env node

/**
 * Simple test script for Strapi Audit Log API
 * Run with: node test-audit-api.js
 */

const https = require('https');
const http = require('http');

const API_BASE = 'http://localhost:1337/api';
const ADMIN_BASE = 'http://localhost:1337/admin';

// Configuration
const config = {
  adminEmail: 'adminTesting@gmail.com',
  adminPassword: 'AAA',
  baseUrl: 'http://localhost:1337'
};

let jwtToken = null;

// Helper function to make HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

// Test functions
async function login() {
  console.log('🔐 Logging in...');
  try {
    const response = await makeRequest(`${ADMIN_BASE}/auth/local`, {
      method: 'POST',
      body: {
        identifier: config.adminEmail,
        password: config.adminPassword
      }
    });

    if (response.status === 200 && response.data.token) {
      jwtToken = response.data.token;
      console.log('✅ Login successful');
      return true;
    } else {
      console.log('❌ Login failed:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Login error:', error.message);
    return false;
  }
}

async function testBasicEndpoint() {
  console.log('\n📊 Testing basic audit logs endpoint...');
  try {
    const response = await makeRequest(`${API_BASE}/audit-logs`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });

    if (response.status === 200) {
      console.log('✅ Basic endpoint working');
      console.log(`   Found ${response.data.data?.length || 0} audit log entries`);
      if (response.data.meta) {
        console.log(`   Total: ${response.data.meta.pagination?.total || 0}`);
      }
    } else {
      console.log('❌ Basic endpoint failed:', response.status, response.data);
    }
  } catch (error) {
    console.log('❌ Basic endpoint error:', error.message);
  }
}

async function testFiltering() {
  console.log('\n🔍 Testing filtering...');
  try {
    const response = await makeRequest(`${API_BASE}/audit-logs?pageSize=5&sort=timestamp:desc`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });

    if (response.status === 200) {
      console.log('✅ Filtering working');
      console.log(`   Retrieved ${response.data.data?.length || 0} entries with pagination`);
    } else {
      console.log('❌ Filtering failed:', response.status, response.data);
    }
  } catch (error) {
    console.log('❌ Filtering error:', error.message);
  }
}

async function testStatistics() {
  console.log('\n📈 Testing statistics endpoint...');
  try {
    const response = await makeRequest(`${API_BASE}/audit-logs/stats`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });

    if (response.status === 200) {
      console.log('✅ Statistics endpoint working');
      console.log(`   Total count: ${response.data.totalCount || 0}`);
      if (response.data.actionStats) {
        console.log('   Action breakdown:', response.data.actionStats);
      }
    } else {
      console.log('❌ Statistics endpoint failed:', response.status, response.data);
    }
  } catch (error) {
    console.log('❌ Statistics error:', error.message);
  }
}

async function testErrorHandling() {
  console.log('\n🚫 Testing error handling...');
  
  // Test without authentication
  try {
    const response = await makeRequest(`${API_BASE}/audit-logs`);
    if (response.status === 401) {
      console.log('✅ Unauthorized access properly blocked');
    } else {
      console.log('❌ Unauthorized access not properly blocked:', response.status);
    }
  } catch (error) {
    console.log('❌ Error handling test failed:', error.message);
  }

  // Test invalid query parameters
  try {
    const response = await makeRequest(`${API_BASE}/audit-logs?action=invalid_action`, {
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      }
    });
    if (response.status === 400) {
      console.log('✅ Invalid parameters properly rejected');
    } else {
      console.log('❌ Invalid parameters not properly rejected:', response.status);
    }
  } catch (error) {
    console.log('❌ Error handling test failed:', error.message);
  }
}

async function generateTestData() {
  console.log('\n📝 Generating test data...');
  
  // Create a test article to generate audit logs
  try {
    const response = await makeRequest(`${API_BASE}/articles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`
      },
      body: {
        data: {
          title: 'Test Article for Audit Log',
          content: 'This is a test article to generate audit log entries',
          author: 'Test Author'
        }
      }
    });

    if (response.status === 200 || response.status === 201) {
      console.log('✅ Test article created');
      
      // Update the article
      const articleId = response.data.data?.id;
      if (articleId) {
        const updateResponse = await makeRequest(`${API_BASE}/articles/${articleId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${jwtToken}`
          },
          body: {
            data: {
              title: 'Updated Test Article',
              content: 'This article has been updated to test audit logging',
              author: 'Updated Author'
            }
          }
        });
        
        if (updateResponse.status === 200) {
          console.log('✅ Test article updated');
        }
      }
    } else {
      console.log('❌ Failed to create test article:', response.status, response.data);
    }
  } catch (error) {
    console.log('❌ Test data generation failed:', error.message);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Strapi Audit Log API Tests\n');
  
  // Check if Strapi is running
  try {
    await makeRequest(`${config.baseUrl}/admin`);
    console.log('✅ Strapi server is running');
  } catch (error) {
    console.log('❌ Strapi server is not running. Please start it with: npm run develop');
    process.exit(1);
  }

  // Run tests
  const loginSuccess = await login();
  if (!loginSuccess) {
    console.log('❌ Cannot proceed without authentication');
    process.exit(1);
  }

  await generateTestData();
  await testBasicEndpoint();
  await testFiltering();
  await testStatistics();
  await testErrorHandling();

  console.log('\n🎉 Test suite completed!');
  console.log('\nFor more detailed testing, see: AUDIT_LOG_TESTING_GUIDE.md');
}

// Run the tests
runTests().catch(console.error);
