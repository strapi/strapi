# Audit Logs API Usage Examples

## cURL Examples

### 1. Get All Audit Logs (Basic Query)

```bash
curl -X GET "http://localhost:1337/api/audit-logs" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 2. Filter by Content Type

```bash
curl -X GET "http://localhost:1337/api/audit-logs?contentType=articles" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 3. Filter by User ID

```bash
curl -X GET "http://localhost:1337/api/audit-logs?userId=123" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 4. Filter by Action Type

```bash
curl -X GET "http://localhost:1337/api/audit-logs?action=create" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 5. Filter by Date Range

```bash
curl -X GET "http://localhost:1337/api/audit-logs?startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 6. Multiple Filters Combined

```bash
curl -X GET "http://localhost:1337/api/audit-logs?contentType=articles&action=update&userId=123&startDate=2024-01-01T00:00:00.000Z" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 7. Pagination

```bash
curl -X GET "http://localhost:1337/api/audit-logs?page=2&pageSize=50" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 8. Sorting

```bash
curl -X GET "http://localhost:1337/api/audit-logs?sort=action:asc,timestamp:desc" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### 9. Complex Query with All Parameters

```bash
curl -X GET "http://localhost:1337/api/audit-logs?contentType=articles&action=update&userId=123&startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z&page=1&pageSize=10&sort=timestamp:desc" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

## JavaScript/Node.js Examples

### Using Fetch API

```javascript
// Get audit logs with filtering
async function getAuditLogs(filters = {}) {
  const params = new URLSearchParams();
  
  // Add filters
  if (filters.contentType) params.append('contentType', filters.contentType);
  if (filters.userId) params.append('userId', filters.userId);
  if (filters.action) params.append('action', filters.action);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.recordId) params.append('recordId', filters.recordId);
  if (filters.requestId) params.append('requestId', filters.requestId);
  if (filters.ipAddress) params.append('ipAddress', filters.ipAddress);
  if (filters.userAgent) params.append('userAgent', filters.userAgent);
  
  // Add pagination
  if (filters.page) params.append('page', filters.page);
  if (filters.pageSize) params.append('pageSize', filters.pageSize);
  
  // Add sorting
  if (filters.sort) params.append('sort', filters.sort);

  const response = await fetch(`http://localhost:1337/api/audit-logs?${params}`, {
    headers: {
      'Authorization': `Bearer ${YOUR_ADMIN_JWT_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Usage examples
async function examples() {
  try {
    // Get all audit logs
    const allLogs = await getAuditLogs();
    console.log('All logs:', allLogs);

    // Get logs for articles content type
    const articleLogs = await getAuditLogs({ contentType: 'articles' });
    console.log('Article logs:', articleLogs);

    // Get logs for specific user
    const userLogs = await getAuditLogs({ userId: 123 });
    console.log('User logs:', userLogs);

    // Get logs with pagination
    const paginatedLogs = await getAuditLogs({ 
      page: 1, 
      pageSize: 10,
      sort: 'timestamp:desc'
    });
    console.log('Paginated logs:', paginatedLogs);

    // Get logs with date range
    const dateRangeLogs = await getAuditLogs({
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-12-31T23:59:59.999Z'
    });
    console.log('Date range logs:', dateRangeLogs);

    // Complex query
    const complexLogs = await getAuditLogs({
      contentType: 'articles',
      action: 'update',
      userId: 123,
      startDate: '2024-01-01T00:00:00.000Z',
      page: 1,
      pageSize: 25,
      sort: 'timestamp:desc'
    });
    console.log('Complex query logs:', complexLogs);

  } catch (error) {
    console.error('Error fetching audit logs:', error);
  }
}
```

### Using Axios

```javascript
const axios = require('axios');

const auditLogAPI = axios.create({
  baseURL: 'http://localhost:1337/api',
  headers: {
    'Authorization': `Bearer ${YOUR_ADMIN_JWT_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// Get audit logs with filtering
async function getAuditLogs(params = {}) {
  try {
    const response = await auditLogAPI.get('/audit-logs', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching audit logs:', error.response?.data || error.message);
    throw error;
  }
}

// Usage examples
async function examples() {
  try {
    // Basic query
    const logs = await getAuditLogs();
    console.log('Basic query:', logs);

    // Filter by content type and action
    const filteredLogs = await getAuditLogs({
      contentType: 'articles',
      action: 'create'
    });
    console.log('Filtered logs:', filteredLogs);

    // Pagination and sorting
    const paginatedLogs = await getAuditLogs({
      page: 1,
      pageSize: 10,
      sort: 'timestamp:desc'
    });
    console.log('Paginated logs:', paginatedLogs);

  } catch (error) {
    console.error('Error:', error);
  }
}
```

## Python Examples

### Using requests library

```python
import requests
import json
from datetime import datetime

class AuditLogAPI:
    def __init__(self, base_url, admin_token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {admin_token}',
            'Content-Type': 'application/json'
        }
    
    def get_audit_logs(self, **params):
        """Get audit logs with optional filtering"""
        response = requests.get(
            f'{self.base_url}/api/audit-logs',
            headers=self.headers,
            params=params
        )
        response.raise_for_status()
        return response.json()

# Usage examples
api = AuditLogAPI('http://localhost:1337', 'YOUR_ADMIN_JWT_TOKEN')

# Get all audit logs
all_logs = api.get_audit_logs()
print('All logs:', json.dumps(all_logs, indent=2))

# Filter by content type
article_logs = api.get_audit_logs(contentType='articles')
print('Article logs:', json.dumps(article_logs, indent=2))

# Filter by user and action
user_logs = api.get_audit_logs(userId=123, action='update')
print('User update logs:', json.dumps(user_logs, indent=2))

# Date range filtering
date_logs = api.get_audit_logs(
    startDate='2024-01-01T00:00:00.000Z',
    endDate='2024-12-31T23:59:59.999Z'
)
print('Date range logs:', json.dumps(date_logs, indent=2))

# Pagination and sorting
paginated_logs = api.get_audit_logs(
    page=1,
    pageSize=10,
    sort='timestamp:desc'
)
print('Paginated logs:', json.dumps(paginated_logs, indent=2))

# Complex query
complex_logs = api.get_audit_logs(
    contentType='articles',
    action='create',
    userId=123,
    startDate='2024-01-01T00:00:00.000Z',
    page=1,
    pageSize=25,
    sort='timestamp:desc'
)
print('Complex query logs:', json.dumps(complex_logs, indent=2))
```

## Response Processing Examples

### JavaScript - Processing Response Data

```javascript
async function processAuditLogs() {
  const response = await getAuditLogs({ contentType: 'articles' });
  
  // Access the data
  const auditLogs = response.data;
  const pagination = response.meta.pagination;
  const filters = response.meta.filters;
  const sort = response.meta.sort;
  
  console.log(`Found ${pagination.total} audit logs`);
  console.log(`Page ${pagination.page} of ${pagination.pageCount}`);
  console.log(`Applied filters:`, filters);
  console.log(`Sort order:`, sort);
  
  // Process each audit log
  auditLogs.forEach(log => {
    console.log(`Action: ${log.action}`);
    console.log(`Content Type: ${log.contentType}`);
    console.log(`Record ID: ${log.recordId}`);
    console.log(`User: ${log.user?.username || 'Anonymous'}`);
    console.log(`Timestamp: ${log.timestamp}`);
    console.log(`Changed Fields: ${log.changedFields?.join(', ') || 'N/A'}`);
    console.log('---');
  });
}
```

### Python - Processing Response Data

```python
def process_audit_logs():
    response = api.get_audit_logs(contentType='articles')
    
    # Access the data
    audit_logs = response['data']
    pagination = response['meta']['pagination']
    filters = response['meta']['filters']
    sort = response['meta']['sort']
    
    print(f"Found {pagination['total']} audit logs")
    print(f"Page {pagination['page']} of {pagination['pageCount']}")
    print(f"Applied filters: {filters}")
    print(f"Sort order: {sort}")
    
    # Process each audit log
    for log in audit_logs:
        print(f"Action: {log['action']}")
        print(f"Content Type: {log['contentType']}")
        print(f"Record ID: {log['recordId']}")
        print(f"User: {log['user']['username'] if log['user'] else 'Anonymous'}")
        print(f"Timestamp: {log['timestamp']}")
        print(f"Changed Fields: {', '.join(log['changedFields']) if log['changedFields'] else 'N/A'}")
        print("---")
```

## Error Handling Examples

### JavaScript - Error Handling

```javascript
async function getAuditLogsWithErrorHandling(filters = {}) {
  try {
    const response = await fetch(`http://localhost:1337/api/audit-logs?${new URLSearchParams(filters)}`, {
      headers: {
        'Authorization': `Bearer ${YOUR_ADMIN_JWT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError') {
      console.error('Network error:', error.message);
    } else {
      console.error('API error:', error.message);
    }
    throw error;
  }
}
```

### Python - Error Handling

```python
def get_audit_logs_with_error_handling(**params):
    try:
        response = requests.get(
            f'{api.base_url}/api/audit-logs',
            headers=api.headers,
            params=params
        )
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 400:
            error_data = e.response.json()
            print(f"Bad Request: {error_data.get('error', {}).get('message', 'Unknown error')}")
        elif e.response.status_code == 401:
            print("Unauthorized: Invalid or missing authentication token")
        elif e.response.status_code == 403:
            print("Forbidden: Insufficient permissions")
        else:
            print(f"HTTP Error: {e.response.status_code}")
        raise
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        raise
```
