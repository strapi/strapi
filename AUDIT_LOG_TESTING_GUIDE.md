# Audit Log API Testing Guide

This guide provides comprehensive instructions for testing the `/api/audit-logs` API endpoint.

## Prerequisites

### 1. Start Strapi Development Server

```bash
# From the Strapi root directory
npm run develop
# or
yarn develop
```

### 2. Create Test Content Types

First, create some test content types to generate audit logs:

1. Go to **Content-Type Builder** in Strapi Admin
2. Create a new content type called "Article" with fields:
   - `title` (Text)
   - `content` (Rich Text)
   - `author` (Text)
3. Create another content type called "Category" with fields:
   - `name` (Text)
   - `description` (Text)

### 3. Set Up Test Data

1. Go to **Content Manager**
2. Create a few articles and categories
3. Update some entries
4. Delete some entries

This will generate audit log entries that you can query.

## Authentication Setup

### 1. Get Admin JWT Token

```bash
# Login to get JWT token
curl -X POST http://localhost:1337/admin/auth/local \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "admin@strapi.io",
    "password": "admin123"
  }'
```

Save the `token` from the response for use in subsequent requests.

### 2. Set Up User Permissions

1. Go to **Settings** → **Users & Permissions** → **Roles**
2. Edit the "Authenticated" role
3. Add the following permissions:
   - `plugin::audit-log.read_audit_logs`
   - `plugin::audit-log.write_audit_logs`
   - `plugin::audit-log.admin_audit_logs`

## API Testing

### 1. Basic API Test

```bash
# Test basic endpoint access
curl -X GET "http://localhost:1337/api/audit-logs" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "data": [
    {
      "id": 1,
      "contentType": "article",
      "recordId": "1",
      "action": "create",
      "timestamp": "2024-12-01T10:30:00.000Z",
      "user": {
        "id": 1,
        "username": "admin",
        "email": "admin@strapi.io"
      },
      "changedFields": [],
      "fullPayload": { "title": "Test Article", "content": "Test Content" },
      "previousData": null,
      "ipAddress": "127.0.0.1",
      "userAgent": "curl/7.68.0",
      "requestId": "req_1234567890_abc123",
      "metadata": {
        "method": "POST",
        "path": "/api/articles",
        "statusCode": 200,
        "responseTime": 150
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 1,
      "total": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

### 2. Filtering Tests

#### Filter by Content Type
```bash
curl -X GET "http://localhost:1337/api/audit-logs?contentType=article" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Filter by Action
```bash
curl -X GET "http://localhost:1337/api/audit-logs?action=create" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Filter by User
```bash
curl -X GET "http://localhost:1337/api/audit-logs?userId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Filter by Date Range
```bash
curl -X GET "http://localhost:1337/api/audit-logs?startDate=2024-12-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Filter by Record ID
```bash
curl -X GET "http://localhost:1337/api/audit-logs?recordId=1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Pagination Tests

#### Basic Pagination
```bash
curl -X GET "http://localhost:1337/api/audit-logs?page=1&pageSize=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Large Page Size (should be limited to 100)
```bash
curl -X GET "http://localhost:1337/api/audit-logs?pageSize=150" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Sorting Tests

#### Sort by Timestamp (Descending - Default)
```bash
curl -X GET "http://localhost:1337/api/audit-logs?sort=timestamp:desc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Sort by Timestamp (Ascending)
```bash
curl -X GET "http://localhost:1337/api/audit-logs?sort=timestamp:asc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Multiple Sort Fields
```bash
curl -X GET "http://localhost:1337/api/audit-logs?sort=contentType:asc,timestamp:desc" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 5. Specialized Endpoints

#### Get Audit Logs for Specific Record
```bash
curl -X GET "http://localhost:1337/api/audit-logs/record/article/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Audit Logs for Content Type
```bash
curl -X GET "http://localhost:1337/api/audit-logs/content-type/article" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Audit Logs for User
```bash
curl -X GET "http://localhost:1337/api/audit-logs/user/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Audit Statistics
```bash
curl -X GET "http://localhost:1337/api/audit-logs/stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Get Specific Audit Log Entry
```bash
curl -X GET "http://localhost:1337/api/audit-logs/1" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 6. Error Testing

#### Test Without Authentication
```bash
curl -X GET "http://localhost:1337/api/audit-logs"
# Should return 401 Unauthorized
```

#### Test With Invalid Token
```bash
curl -X GET "http://localhost:1337/api/audit-logs" \
  -H "Authorization: Bearer invalid_token"
# Should return 401 Unauthorized
```

#### Test Invalid Query Parameters
```bash
curl -X GET "http://localhost:1337/api/audit-logs?action=invalid_action" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Should return 400 Bad Request
```

#### Test Invalid Date Format
```bash
curl -X GET "http://localhost:1337/api/audit-logs?startDate=invalid_date" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
# Should return 400 Bad Request
```

## JavaScript/Node.js Testing

### Using Axios

```javascript
const axios = require('axios');

const API_BASE = 'http://localhost:1337/api';
const JWT_TOKEN = 'YOUR_JWT_TOKEN';

const headers = {
  'Authorization': `Bearer ${JWT_TOKEN}`,
  'Content-Type': 'application/json'
};

// Test basic endpoint
async function testBasicEndpoint() {
  try {
    const response = await axios.get(`${API_BASE}/audit-logs`, { headers });
    console.log('Basic endpoint test:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Test filtering
async function testFiltering() {
  try {
    const response = await axios.get(`${API_BASE}/audit-logs`, {
      headers,
      params: {
        contentType: 'article',
        action: 'create',
        page: 1,
        pageSize: 10,
        sort: 'timestamp:desc'
      }
    });
    console.log('Filtering test:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Test statistics
async function testStatistics() {
  try {
    const response = await axios.get(`${API_BASE}/audit-logs/stats`, { headers });
    console.log('Statistics test:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Run tests
testBasicEndpoint();
testFiltering();
testStatistics();
```

### Using Fetch API

```javascript
const API_BASE = 'http://localhost:1337/api';
const JWT_TOKEN = 'YOUR_JWT_TOKEN';

async function testAuditLogs() {
  try {
    const response = await fetch(`${API_BASE}/audit-logs`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Audit logs:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

testAuditLogs();
```

## Python Testing

### Using Requests

```python
import requests
import json

API_BASE = 'http://localhost:1337/api'
JWT_TOKEN = 'YOUR_JWT_TOKEN'

headers = {
    'Authorization': f'Bearer {JWT_TOKEN}',
    'Content-Type': 'application/json'
}

def test_basic_endpoint():
    try:
        response = requests.get(f'{API_BASE}/audit-logs', headers=headers)
        response.raise_for_status()
        print('Basic endpoint test:', response.json())
    except requests.exceptions.RequestException as e:
        print('Error:', e)

def test_filtering():
    try:
        params = {
            'contentType': 'article',
            'action': 'create',
            'page': 1,
            'pageSize': 10,
            'sort': 'timestamp:desc'
        }
        response = requests.get(f'{API_BASE}/audit-logs', headers=headers, params=params)
        response.raise_for_status()
        print('Filtering test:', response.json())
    except requests.exceptions.RequestException as e:
        print('Error:', e)

def test_statistics():
    try:
        response = requests.get(f'{API_BASE}/audit-logs/stats', headers=headers)
        response.raise_for_status()
        print('Statistics test:', response.json())
    except requests.exceptions.RequestException as e:
        print('Error:', e)

# Run tests
test_basic_endpoint()
test_filtering()
test_statistics()
```

## Postman Collection

### Import this collection into Postman:

```json
{
  "info": {
    "name": "Strapi Audit Log API",
    "description": "Collection for testing Strapi Audit Log API"
  },
  "item": [
    {
      "name": "Get All Audit Logs",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{JWT_TOKEN}}"
          }
        ],
        "url": {
          "raw": "{{BASE_URL}}/api/audit-logs",
          "host": ["{{BASE_URL}}"],
          "path": ["api", "audit-logs"]
        }
      }
    },
    {
      "name": "Get Audit Logs with Filters",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{JWT_TOKEN}}"
          }
        ],
        "url": {
          "raw": "{{BASE_URL}}/api/audit-logs?contentType=article&action=create&page=1&pageSize=10",
          "host": ["{{BASE_URL}}"],
          "path": ["api", "audit-logs"],
          "query": [
            {
              "key": "contentType",
              "value": "article"
            },
            {
              "key": "action",
              "value": "create"
            },
            {
              "key": "page",
              "value": "1"
            },
            {
              "key": "pageSize",
              "value": "10"
            }
          ]
        }
      }
    },
    {
      "name": "Get Audit Statistics",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{JWT_TOKEN}}"
          }
        ],
        "url": {
          "raw": "{{BASE_URL}}/api/audit-logs/stats",
          "host": ["{{BASE_URL}}"],
          "path": ["api", "audit-logs", "stats"]
        }
      }
    }
  ],
  "variable": [
    {
      "key": "BASE_URL",
      "value": "http://localhost:1337"
    },
    {
      "key": "JWT_TOKEN",
      "value": "YOUR_JWT_TOKEN_HERE"
    }
  ]
}
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check JWT token and user permissions
2. **403 Forbidden**: Ensure user has audit log permissions
3. **404 Not Found**: Check if audit log system is properly installed
4. **500 Internal Server Error**: Check server logs for detailed error messages

### Debug Steps

1. **Check Server Logs**: Look for error messages in the console
2. **Verify Permissions**: Ensure user has required permissions
3. **Test Content API**: Create/update/delete content to generate audit logs
4. **Check Database**: Verify audit_logs table exists and has data

### Performance Testing

```bash
# Test with large dataset
curl -X GET "http://localhost:1337/api/audit-logs?pageSize=100" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -w "Time: %{time_total}s\n"
```

## Expected Results

- **Successful requests** should return JSON with `data` and `meta` fields
- **Error requests** should return appropriate HTTP status codes
- **Filtering** should return only matching records
- **Pagination** should work correctly with metadata
- **Sorting** should order results as expected

This comprehensive testing guide should help you verify that the audit log API is working correctly!
