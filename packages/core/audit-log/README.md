# Strapi Audit Log Plugin

A comprehensive audit logging plugin for Strapi that automatically tracks Content API operations with role-based access control.

## Features

- **Automatic Logging**: Tracks all Content API operations (create, update, delete)
- **Role-Based Access Control**: Granular permissions for read, write, and admin operations
- **Advanced Filtering**: Filter by content type, user, action, date range, and more
- **Pagination & Sorting**: Efficient data retrieval with configurable pagination
- **Security**: Sensitive data masking and encryption options
- **Performance**: Optimized database queries with indexing
- **Configuration**: Flexible configuration options for different environments

## Installation

This plugin is part of the Strapi core packages and is automatically available.

## Configuration

### Environment Variables

```bash
# Global Settings
AUDIT_LOG_ENABLED=true
AUDIT_LOG_EXCLUDE_CONTENT_TYPES=audit-log,strapi::core-store
AUDIT_LOG_CLEANUP_DAYS=90
```

### Plugin Configuration

```javascript
// config/plugins.js
module.exports = {
  'audit-log': {
    enabled: true,
    config: {
      excludeContentTypes: ['audit-log', 'strapi::core-store'],
      permissions: {
        readPermission: 'plugin::audit-log.read_audit_logs',
        writePermission: 'plugin::audit-log.write_audit_logs',
        adminPermission: 'plugin::audit-log.admin_audit_logs',
        defaultRoles: ['Super Admin', 'Editor']
      }
    }
  }
};
```

## API Endpoints

### Get Audit Logs
```
GET /api/audit-logs
```

**Query Parameters:**
- `contentType` - Filter by content type
- `userId` - Filter by user ID
- `action` - Filter by action (create, update, delete)
- `startDate` - Filter by start date (ISO format)
- `endDate` - Filter by end date (ISO format)
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 25, max: 100)
- `sort` - Sort fields (e.g., "timestamp:desc")

### Get Audit Logs for Record
```
GET /api/audit-logs/record/:contentType/:recordId
```

### Get Audit Logs for Content Type
```
GET /api/audit-logs/content-type/:contentType
```

### Get Audit Logs for User
```
GET /api/audit-logs/user/:userId
```

### Get Audit Statistics
```
GET /api/audit-logs/stats
```

### Cleanup Old Logs
```
POST /api/audit-logs/cleanup
```

## Permissions

The plugin provides three permission levels:

1. **`plugin::audit-log.read_audit_logs`** - Read audit logs
2. **`plugin::audit-log.write_audit_logs`** - Create/update audit logs
3. **`plugin::audit-log.admin_audit_logs`** - Admin operations (delete, cleanup)

## Usage Examples

### Basic Query
```bash
curl -X GET "http://localhost:1337/api/audit-logs" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filter by Content Type
```bash
curl -X GET "http://localhost:1337/api/audit-logs?contentType=articles" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Filter by User and Action
```bash
curl -X GET "http://localhost:1337/api/audit-logs?userId=123&action=update" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Date Range Filtering
```bash
curl -X GET "http://localhost:1337/api/audit-logs?startDate=2024-01-01T00:00:00.000Z&endDate=2024-12-31T23:59:59.999Z" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Response Format

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
        "email": "admin@example.com"
      },
      "changedFields": ["title", "content"],
      "fullPayload": { "title": "New Title", "content": "New Content" },
      "previousData": { "title": "Old Title", "content": "Old Content" },
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "requestId": "req_1234567890_abc123",
      "metadata": {
        "method": "PUT",
        "path": "/api/articles/123",
        "statusCode": 200,
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
      "action": "update"
    },
    "sort": ["timestamp:desc"]
  }
}
```

## Security

- **Authentication Required**: All endpoints require valid JWT tokens
- **Role-Based Access**: Granular permissions for different operations
- **Data Protection**: Sensitive field masking and encryption options
- **Rate Limiting**: Configurable rate limits per user and IP

## Performance

- **Database Indexing**: Optimized indexes for common query patterns
- **Pagination**: Configurable page sizes with metadata
- **Caching**: Optional caching for frequently accessed data
- **Cleanup**: Automatic cleanup of old audit logs

## Troubleshooting

### Audit Logs Not Being Created
1. Check if `AUDIT_LOG_ENABLED=true` in environment
2. Verify content type is not in excluded list
3. Ensure middleware is registered
4. Check database connection and permissions

### Permission Errors
1. Run permission bootstrap script
2. Assign appropriate permissions to user roles
3. Check permission names and actions
4. Verify user authentication

### Performance Issues
1. Run database migration to add indexes
2. Implement query optimization
3. Set up regular cleanup of old logs
4. Monitor and tune database performance

## Contributing

Please refer to the main Strapi repository for contributing guidelines.

## License

MIT License - see the main Strapi repository for details.
