# Audit Log REST API Design

## Overview
Implementation of a REST API endpoint `/audit-logs` that provides comprehensive filtering capabilities for audit log data with role-based access control.

## Architecture

### 1. Core Components

#### **Controller Layer** (`packages/core/audit-log/server/src/controllers/audit-log.ts`)
- **Purpose**: Handles HTTP requests and response formatting
- **Key Method**: `find()` - Main endpoint handler
- **Features**:
  - Query parameter validation and sanitization
  - Filter building from query parameters
  - Pagination and sorting support
  - Error handling with appropriate HTTP status codes

#### **Service Layer** (`packages/core/audit-log/server/src/services/audit-log.ts`)
- **Purpose**: Business logic and data access
- **Key Methods**:
  - `logContentApiOperation()` - Creates audit entries
  - `getRecordAuditLogs()` - Fetches logs for specific records
  - `getContentTypeAuditLogs()` - Fetches logs for content types
  - `getUserAuditLogs()` - Fetches logs for users
  - `getAuditStats()` - Provides statistics

#### **Middleware Layer** (`packages/core/audit-log/server/src/middlewares/content-api-audit.ts`)
- **Purpose**: Automatic audit logging for Content API operations
- **Features**:
  - Intercepts Content API requests
  - Captures request context and metadata
  - Logs create, update, delete operations
  - Handles error scenarios

#### **Policy Layer** (`packages/core/audit-log/server/src/policies/audit-log.ts`)
- **Purpose**: Role-based access control
- **Policies**:
  - `canReadAuditLogs` - Read permission check
  - `canWriteAuditLogs` - Write permission check
  - `canAdminAuditLogs` - Admin permission check
  - `isAuditLoggingEnabled` - Global enablement check

### 2. Data Model

#### **Audit Log Schema** (`packages/core/audit-log/server/src/content-types/audit-log/schema.json`)
```json
{
  "contentType": "string",
  "recordId": "string", 
  "action": "enum[create,update,delete]",
  "timestamp": "datetime",
  "user": "relation",
  "changedFields": "json",
  "fullPayload": "json",
  "previousData": "json",
  "ipAddress": "string",
  "userAgent": "string",
  "requestId": "string",
  "metadata": "json"
}
```

#### **Database Indexes** (`packages/core/audit-log/server/src/migrations/20241201000000-add-audit-log-indexes.js`)
- Composite indexes for efficient querying:
  - `content_type + timestamp`
  - `record_id + timestamp`
  - `user + timestamp`
  - `action + timestamp`
  - `request_id`
  - `timestamp` (for cleanup operations)

### 3. API Endpoint Design

#### **Base Endpoint**: `/api/audit-logs`

#### **Supported HTTP Methods**:
- `GET /api/audit-logs` - List audit logs with filtering
- `GET /api/audit-logs/:id` - Get specific audit log
- `GET /api/audit-logs/record/:contentType/:recordId` - Get logs for specific record
- `GET /api/audit-logs/content-type/:contentType` - Get logs for content type
- `GET /api/audit-logs/user/:userId` - Get logs for user
- `GET /api/audit-logs/stats` - Get audit statistics
- `POST /api/audit-logs/cleanup` - Cleanup old logs

### 4. Filtering Implementation

#### **Query Parameter Processing**:
```typescript
// Input validation and sanitization
const sanitizedQuery = validateAndSanitizeQuery(ctx.query);

// Filter building
const filters = buildFilters(sanitizedQuery);
```

#### **Supported Filters**:

1. **Content Type Filter**:
   - Parameter: `contentType`
   - Example: `?contentType=articles`
   - Implementation: Direct string match

2. **User ID Filter**:
   - Parameter: `userId`
   - Example: `?userId=123`
   - Implementation: Direct integer match

3. **Action Type Filter**:
   - Parameter: `action`
   - Example: `?action=create`
   - Implementation: Enum match (create, update, delete)

4. **Date Range Filter**:
   - Parameters: `startDate`, `endDate`
   - Example: `?startDate=2024-01-01&endDate=2024-12-31`
   - Implementation: Timestamp range query

#### **Additional Filters**:
- `recordId` - Specific record ID
- `requestId` - Request correlation ID
- `ipAddress` - IP address filtering
- `userAgent` - User agent filtering

### 5. Pagination & Sorting

#### **Pagination Parameters**:
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 25, max: 100)

#### **Sorting Parameters**:
- `sort` - Sort field and direction
- Example: `?sort=timestamp:desc`
- Supported fields: `timestamp`, `contentType`, `action`, `user`

### 6. Response Format

#### **Success Response**:
```json
{
  "data": [
    {
      "id": 1,
      "contentType": "articles",
      "recordId": "123",
      "action": "create",
      "timestamp": "2024-01-01T10:00:00Z",
      "user": {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com"
      },
      "changedFields": ["title", "content"],
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "requestId": "req_123456789",
      "metadata": {
        "method": "POST",
        "path": "/api/articles",
        "statusCode": 201,
        "responseTime": 150
      }
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
      "action": null,
      "startDate": "2024-01-01",
      "endDate": "2024-12-31"
    },
    "sort": ["timestamp:desc"]
  }
}
```

### 7. Security & Access Control

#### **Authentication Required**:
- All endpoints require admin authentication
- JWT token validation

#### **Permission-Based Access**:
- `read_audit_logs` - Required for GET operations
- `write_audit_logs` - Required for POST operations
- `admin_audit_logs` - Required for admin operations

#### **Rate Limiting**:
- Per-user rate limits
- Per-IP rate limits
- Configurable thresholds

### 8. Configuration

#### **Global Settings** (`packages/core/audit-log/server/src/config/default.ts`):
```typescript
{
  enabled: true,
  excludeContentTypes: ['audit-log', 'strapi::core-store'],
  excludedFields: ['id', 'createdAt', 'updatedAt'],
  logLevels: ['create', 'update', 'delete'],
  permissions: {
    readPermission: 'plugin::audit-log.read_audit_logs',
    writePermission: 'plugin::audit-log.write_audit_logs',
    adminPermission: 'plugin::audit-log.admin_audit_logs'
  }
}
```

### 9. Performance Optimizations

#### **Database Indexes**:
- Composite indexes for common query patterns
- Timestamp-based indexes for date range queries
- Content type and action-based indexes

#### **Query Optimization**:
- Efficient filter building
- Pagination with proper LIMIT/OFFSET
- Population of related data (users) with field selection

#### **Caching Strategy**:
- Configurable caching for frequently accessed data
- Cache TTL settings
- Cache invalidation on updates

### 10. Error Handling

#### **HTTP Status Codes**:
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource not found)
- `503` - Service Unavailable (audit logging disabled)

#### **Error Response Format**:
```json
{
  "error": {
    "status": 400,
    "name": "ValidationError",
    "message": "Invalid query parameters",
    "details": {
      "contentType": ["Invalid content type format"]
    }
  }
}
```

### 11. Implementation Flow

1. **Request Reception**: Controller receives HTTP request
2. **Authentication**: Verify user authentication
3. **Authorization**: Check user permissions via policies
4. **Validation**: Sanitize and validate query parameters
5. **Filter Building**: Convert query parameters to database filters
6. **Data Retrieval**: Execute optimized database query
7. **Response Formatting**: Format data with metadata
8. **Response Delivery**: Return JSON response to client

### 12. Testing Strategy

#### **Unit Tests**:
- Controller method testing
- Service logic testing
- Policy validation testing

#### **Integration Tests**:
- End-to-end API testing
- Database query testing
- Authentication flow testing

#### **Performance Tests**:
- Load testing with large datasets
- Query performance testing
- Memory usage monitoring

This architecture provides a robust, scalable, and secure audit log API with comprehensive filtering capabilities while maintaining high performance and security standards.
