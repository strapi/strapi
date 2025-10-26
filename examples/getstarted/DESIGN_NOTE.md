# Audit Logging Feature - Design Summary

## Overview

This document describes the design and implementation approach for the audit logging feature added to the Strapi `getstarted` example application. The feature provides comprehensive tracking of all content API operations (create, update, delete) with detailed metadata capture.

## Architecture Approach

### 1. **Direct Integration Strategy**
Instead of creating a standalone plugin, the audit logging functionality was directly integrated into the application's core files:
- **Middleware**: Embedded in `src/index.js` to intercept all API requests
- **Content Type**: Defined in `src/api/audit-log/content-types/audit-log/schema.json`
- **Controller**: Custom implementation in `src/api/audit-log/controllers/audit-log.js`
- **Routes**: Explicit route definitions in `src/api/audit-log/routes/audit-log.js`

**Rationale**: This approach bypasses Strapi's plugin loading mechanism complexities and ensures immediate availability without dependency management issues.

### 2. **Middleware-First Design**
The audit logging is implemented as a Koa middleware that:
- Intercepts all incoming requests before they reach content handlers
- Captures request/response data, user information, and metadata
- Creates audit log entries asynchronously to avoid blocking the main request flow
- Uses `setImmediate()` for non-blocking audit log creation

**Key Features**:
- **Request ID Generation**: UUID-based tracking for request correlation
- **User Context Capture**: Extracts authenticated user information
- **IP Address Detection**: Multiple fallback mechanisms for IP detection
- **Error Handling**: Graceful error handling without affecting main operations

### 3. **Content Type Schema Design**

The audit log content type captures comprehensive metadata:

```json
{
  "contentType": "string",     // API endpoint (e.g., "articles")
  "contentId": "string",       // ID of the affected content
  "action": "enumeration",     // create, update, delete
  "userId": "string",          // User who performed the action
  "userEmail": "string",       // User email for identification
  "userRole": "string",        // User role for permission context
  "ipAddress": "string",       // Client IP address
  "userAgent": "text",         // Browser/client information
  "requestId": "string",       // Unique request identifier
  "changes": "json",           // Field-level changes (for updates)
  "previousValues": "json",    // Original values (for updates/deletes)
  "newValues": "json",         // New values (for creates/updates)
  "metadata": "json",          // Additional context (status, errors)
  "timestamp": "datetime"      // When the action occurred
}
```

## API Design

### 1. **RESTful Endpoints**

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/audit-logs` | List audit logs with pagination and filtering |
| `GET` | `/api/audit-logs/:id` | Get specific audit log by ID |
| `GET` | `/api/audit-logs/stats` | Get audit log statistics |

### 2. **Query Parameters**

**Pagination**:
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 25, max: 100)

**Filtering**:
- `contentType`: Filter by content type
- `userId`: Filter by user ID
- `action`: Filter by action type (create/update/delete)
- `startDate`: Filter by start date (ISO 8601)
- `endDate`: Filter by end date (ISO 8601)

**Sorting**:
- `sort`: Sort field and order (e.g., `timestamp:desc`)

### 3. **Response Format**

```json
{
  "data": [...],              // Array of audit log entries
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 4,
      "total": 100
    },
    "filters": {...},         // Applied filters
    "sort": {...}             // Sort configuration
  }
}
```

## Implementation Details

### 1. **Helper Functions**

**Path Parsing**:
- `getContentTypeFromPath()`: Extracts content type from API paths
- `getActionType()`: Maps HTTP methods to CRUD actions
- `getContentIdFromPath()`: Extracts content ID from URL paths

**Change Detection**:
- `calculateChanges()`: Compares old and new values to identify field-level changes

### 2. **Error Handling Strategy**

- **Non-blocking**: Audit log creation failures don't affect main operations
- **Graceful Degradation**: Missing data is handled with sensible defaults
- **Comprehensive Logging**: All errors are logged for debugging

### 3. **Performance Considerations**

- **Asynchronous Processing**: Audit logs are created after request completion
- **Minimal Overhead**: Middleware adds minimal latency to requests
- **Efficient Filtering**: Database-level filtering reduces data transfer

## Testing Strategy

### 1. **Comprehensive Test Coverage**

**Unit Tests** (46 tests):
- Controller method testing with mocked dependencies
- Middleware functionality testing with various scenarios
- Helper function validation
- Input validation and error handling

**Test Categories**:
- **Controller Tests**: API endpoint behavior, pagination, filtering, validation
- **Middleware Tests**: Request interception, data capture, error handling
- **Integration Tests**: End-to-end API testing (requires full Strapi setup)

### 2. **Mock Strategy**

- **Strapi Services**: Mocked `entityService`, `log`, `server`, `config`
- **Koa Context**: Mocked request/response objects
- **Database Operations**: Mocked CRUD operations for isolated testing

## Security Considerations

### 1. **Access Control**
- Currently configured with `auth: false` for testing purposes
- Production implementation should include proper RBAC policies
- Sensitive data filtering may be required

### 2. **Data Privacy**
- IP addresses and user agents are captured for security auditing
- Consider GDPR compliance for user data retention
- Implement data anonymization if required

## Configuration Options

The implementation supports various configuration options:

```javascript
{
  enabled: true,                    // Enable/disable audit logging
  excludeContentTypes: [],          // Content types to exclude
  retentionDays: 90,               // Data retention period
  detailedLogging: true,           // Capture detailed change information
  excludeFields: ['password'],     // Fields to exclude from logging
}
```

## Future Enhancements

### 1. **Potential Improvements**
- **Real-time Notifications**: WebSocket-based audit log streaming
- **Advanced Analytics**: Dashboard with audit log insights
- **Export Functionality**: CSV/JSON export capabilities
- **Retention Policies**: Automated cleanup of old audit logs

### 2. **Scalability Considerations**
- **Database Indexing**: Optimize queries with proper indexes
- **Archiving**: Move old logs to cold storage
- **Caching**: Implement caching for frequently accessed data

## Dependencies

- **Core**: Strapi 5.29.0, Node.js 24.3.0
- **Testing**: Jest 29.0.0, Supertest 6.0.0
- **Database**: SQLite (development), PostgreSQL/MySQL (production)

## File Structure

```
src/
├── index.js                                    # Main application with embedded middleware
├── api/
│   └── audit-log/
│       ├── content-types/
│       │   └── audit-log/
│       │       └── schema.json                 # Content type definition
│       ├── controllers/
│       │   └── audit-log.js                    # Custom controller implementation
│       ├── routes/
│       │   └── audit-log.js                    # Route definitions
│       └── __tests__/                          # Comprehensive test suite
│           ├── audit-log.controller.test.js   # Controller unit tests
│           ├── audit-log.middleware.test.js    # Middleware unit tests
│           ├── audit-log.integration.test.js   # Integration tests
│           ├── jest.config.js                  # Jest configuration
│           ├── setup.js                        # Test setup and mocks
│           └── package.json                    # Test dependencies
```

## Conclusion

This audit logging implementation provides a robust, scalable solution for tracking content changes in Strapi applications. The direct integration approach ensures reliability while the comprehensive test suite guarantees maintainability. The design prioritizes performance, security, and extensibility while maintaining simplicity in implementation.
