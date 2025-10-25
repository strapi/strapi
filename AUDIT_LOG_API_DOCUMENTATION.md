# Audit Logs REST API Documentation

## Overview

The `/api/audit-logs` endpoint provides comprehensive filtering, pagination, and sorting capabilities for accessing audit log data.

## Base URL

```
GET /api/audit-logs
```

## Authentication

All endpoints require admin authentication. Include the admin JWT token in the Authorization header:

```
Authorization: Bearer <admin-jwt-token>
```

## Query Parameters

### Filtering Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `contentType` | string | Filter by content type name | `articles` |
| `userId` | integer | Filter by user ID | `123` |
| `action` | string | Filter by action type | `create`, `update`, `delete` |
| `startDate` | string | Filter by start date (ISO format) | `2024-01-01T00:00:00.000Z` |
| `endDate` | string | Filter by end date (ISO format) | `2024-12-31T23:59:59.999Z` |
| `recordId` | string | Filter by specific record ID | `123` |
| `requestId` | string | Filter by request ID | `req_1234567890_abc123` |
| `ipAddress` | string | Filter by IP address | `192.168.1.100` |
| `userAgent` | string | Filter by user agent (partial match) | `Mozilla` |

### Pagination Parameters

| Parameter | Type | Default | Description | Limits |
|-----------|------|---------|-------------|---------|
| `page` | integer | 1 | Page number | ≥ 1 |
| `pageSize` | integer | 25 | Items per page | 1-100 |

### Sorting Parameters

| Parameter | Type | Default | Description | Valid Fields |
|-----------|------|---------|-------------|--------------|
| `sort` | string/array | `timestamp:desc` | Sort field and direction | `timestamp`, `action`, `contentType`, `recordId`, `createdAt`, `updatedAt` |

**Sort Directions:**
- `asc` - Ascending
- `desc` - Descending

## Response Format

### Success Response

```json
{
  "data": [
    {
      "id": 1,
      "contentType": "articles",
      "recordId": "123",
      "action": "update",
      "timestamp": "2024-12-01T10:30:00.000Z",
      "user": {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com",
        "firstname": "Admin",
        "lastname": "User"
      },
      "changedFields": ["title", "content"],
      "fullPayload": {
        "title": "New Article Title",
        "content": "Article content..."
      },
      "previousData": {
        "title": "Old Article Title",
        "content": "Old content..."
      },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "requestId": "req_1234567890_abc123",
      "metadata": {
        "method": "PUT",
        "path": "/api/articles/123",
        "statusCode": 200,
        "responseTime": 150,
        "timestamp": "2024-12-01T10:30:00.000Z"
      },
      "createdAt": "2024-12-01T10:30:00.000Z",
      "updatedAt": "2024-12-01T10:30:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 10,
      "total": 250,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "filters": {
      "contentType": "articles",
      "userId": null,
      "action": "update",
      "startDate": "2024-01-01T00:00:00.000Z",
      "endDate": "2024-12-31T23:59:59.999Z",
      "recordId": null,
      "requestId": null,
      "ipAddress": null,
      "userAgent": null
    },
    "sort": ["timestamp:desc"]
  }
}
```

### Error Response

```json
{
  "data": null,
  "error": {
    "status": 400,
    "name": "BadRequest",
    "message": "Invalid query parameters",
    "details": {
      "error": "Invalid action: invalid_action. Valid actions: create, update, delete"
    }
  }
}
```

## API Examples

### 1. Basic Query - Get All Audit Logs

```http
GET /api/audit-logs
```

**Response:** Returns first 25 audit logs sorted by timestamp (newest first)

### 2. Filter by Content Type

```http
GET /api/audit-logs?contentType=articles
```

**Response:** Returns audit logs only for the "articles" content type

### 3. Filter by User ID

```http
GET /api/audit-logs?userId=123
```

**Response:** Returns audit logs only for user with ID 123

### 4. Filter by Action Type

```http
GET /api/audit-logs?action=create
```

**Response:** Returns only "create" action audit logs

### 5. Filter by Date Range

```http
GET /api/audit-logs?startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z
```

**Response:** Returns audit logs within the specified date range

### 6. Multiple Filters Combined

```http
GET /api/audit-logs?contentType=articles&action=update&userId=123&startDate=2024-01-01T00:00:00.000Z
```

**Response:** Returns update actions for articles by user 123 since January 1, 2024

### 7. Pagination

```http
GET /api/audit-logs?page=2&pageSize=50
```

**Response:** Returns page 2 with 50 items per page

### 8. Sorting

```http
GET /api/audit-logs?sort=action:asc,timestamp:desc
```

**Response:** Returns audit logs sorted by action (ascending), then by timestamp (descending)

### 9. Filter by Record ID

```http
GET /api/audit-logs?recordId=123
```

**Response:** Returns audit logs for the specific record with ID 123

### 10. Filter by Request ID

```http
GET /api/audit-logs?requestId=req_1234567890_abc123
```

**Response:** Returns audit logs for the specific request

### 11. Filter by IP Address

```http
GET /api/audit-logs?ipAddress=192.168.1.100
```

**Response:** Returns audit logs from the specific IP address

### 12. Filter by User Agent

```http
GET /api/audit-logs?userAgent=Mozilla
```

**Response:** Returns audit logs where user agent contains "Mozilla"

## Advanced Query Examples

### Complex Filtering with Pagination and Sorting

```http
GET /api/audit-logs?contentType=articles&action=update&startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z&page=1&pageSize=10&sort=timestamp:desc,action:asc
```

**Response:** Returns the first 10 update actions for articles in 2024, sorted by timestamp (newest first), then by action (ascending)

### Get Recent Activity for a User

```http
GET /api/audit-logs?userId=123&startDate=2024-11-01T00:00:00.000Z&sort=timestamp:desc&pageSize=50
```

**Response:** Returns the last 50 activities for user 123 since November 1, 2024

### Get All Delete Actions

```http
GET /api/audit-logs?action=delete&sort=timestamp:desc
```

**Response:** Returns all delete actions sorted by timestamp (newest first)

## Error Handling

### Common Error Responses

#### 400 Bad Request - Invalid Parameters

```json
{
  "data": null,
  "error": {
    "status": 400,
    "name": "BadRequest",
    "message": "Invalid query parameters",
    "details": {
      "error": "Invalid action: invalid_action. Valid actions: create, update, delete"
    }
  }
}
```

#### 400 Bad Request - Invalid Date Format

```json
{
  "data": null,
  "error": {
    "status": 400,
    "name": "BadRequest",
    "message": "Invalid query parameters",
    "details": {
      "error": "Invalid startDate: must be a valid ISO date string"
    }
  }
}
```

#### 400 Bad Request - Invalid Sort Field

```json
{
  "data": null,
  "error": {
    "status": 400,
    "name": "BadRequest",
    "message": "Invalid query parameters",
    "details": {
      "error": "Invalid sort field: invalidField. Valid fields: timestamp, action, contentType, recordId, createdAt, updatedAt"
    }
  }
}
```

#### 401 Unauthorized

```json
{
  "data": null,
  "error": {
    "status": 401,
    "name": "UnauthorizedError",
    "message": "Missing or invalid authentication"
  }
}
```

## Performance Considerations

### Pagination Limits
- Maximum page size: 100 items
- Default page size: 25 items
- Large result sets should use pagination

### Indexing
The following database indexes are optimized for common query patterns:
- `contentType + timestamp`
- `userId + timestamp`
- `action + timestamp`
- `recordId + timestamp`
- `requestId`
- `timestamp`

### Query Optimization Tips
1. Use specific filters to reduce result set size
2. Use date ranges to limit historical data
3. Use pagination for large result sets
4. Sort by indexed fields for better performance

## Rate Limiting

The API respects Strapi's rate limiting configuration. For high-volume queries, consider:
- Using specific filters to reduce data transfer
- Implementing client-side caching
- Using pagination to limit response size

## Security

- All endpoints require admin authentication
- Query parameters are validated and sanitized
- SQL injection protection through parameterized queries
- Input length limits to prevent abuse
