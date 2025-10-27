# Strapi Audit Logs Plugin

A comprehensive audit logging plugin for Strapi that automatically tracks all content changes performed through the Content API.

## Features

- **Automatic Logging**: Captures create, update, and delete operations on all content types
- **Rich Metadata**: Records user information, timestamps, IP addresses, changed fields, and more
- **Flexible Configuration**: Enable/disable logging globally or exclude specific content types
- **REST API**: Query audit logs with filtering, pagination, and sorting
- **Access Control**: Role-based permissions for accessing audit logs
- **Data Retention**: Configurable cleanup of old audit logs
- **Performance Optimized**: Minimal impact on content operations

## Installation

This plugin is built into the Strapi core. It's available in the `packages/plugins/audit-logs` directory.

To build and use the plugin:

```bash
# Build the plugin
npm run build

# The plugin will be automatically available in your Strapi instance
```

## Configuration

Add configuration to your `config/plugins.js` file:

```javascript
module.exports = {
  'audit-logs': {
    enabled: true,
    config: {
      // Enable or disable audit logging globally
      enabled: true,
      
      // Content types to exclude from logging
      excludeContentTypes: [
        'plugin::upload.file',
        'plugin::upload.folder'
      ],
      
      // Which actions to log ('create', 'update', 'delete')
      enabledActions: ['create', 'update', 'delete'],
      
      // Retention policy: number of days to keep logs (null = keep forever)
      retentionDays: 365,
      
      // Log level for debugging ('debug', 'info', 'warn', 'error')
      logLevel: 'info',
      
      // Batch size for bulk operations
      batchSize: 100,
    },
  },
};
```

## Architecture Overview

### Lifecycle Hooks Integration

The plugin integrates with Strapi's database lifecycle system to capture content changes:

```
Content API Request → Database Operation → Lifecycle Hook → Audit Log Creation
```

### Database Schema

The audit logs are stored in a dedicated `audit_logs` table with the following structure:

```typescript
interface AuditLog {
  id: number;
  contentType: string;      // e.g., 'api::article.article'
  contentId: number;        // ID of the modified record
  action: 'create' | 'update' | 'delete';
  userId?: number;          // ID of the user who made the change
  userEmail?: string;       // Email of the user
  timestamp: Date;          // When the change occurred
  ipAddress?: string;       // Client IP address
  userAgent?: string;       // Client user agent
  changedFields?: object;   // Fields that were modified (update only)
  previousData?: object;    // Previous state of the record
  newData?: object;         // New state of the record
  metadata?: object;        // Additional metadata
}
```

### Permission System

The plugin registers a custom permission `read_audit_logs` that controls access to the audit log endpoints. Only users with this permission can view audit logs.

## API Usage

### List Audit Logs

```http
GET /admin/audit-logs
```

**Query Parameters:**

- `contentType` - Filter by content type (e.g., `api::article.article`)
- `userId` - Filter by user ID
- `action` - Filter by action type (`create`, `update`, `delete`)
- `contentId` - Filter by specific content record ID
- `dateFrom` - Filter by start date (ISO 8601)
- `dateTo` - Filter by end date (ISO 8601)
- `page` - Page number (default: 1)
- `pageSize` - Records per page (default: 25, max: 100)
- `sortBy` - Sort field (default: `timestamp`)
- `sortOrder` - Sort direction (`asc` or `desc`, default: `desc`)

**Example Request:**

```bash
curl -X GET "http://localhost:1337/admin/audit-logs?contentType=api::article.article&action=update&page=1&pageSize=25" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Example Response:**

```json
{
  "data": [
    {
      "id": 123,
      "contentType": "api::article.article",
      "contentId": 456,
      "action": "update",
      "userId": 1,
      "userEmail": "admin@example.com",
      "timestamp": "2023-10-27T14:30:00.000Z",
      "ipAddress": "192.168.1.100",
      "userAgent": "Mozilla/5.0...",
      "changedFields": {
        "title": {
          "from": "Old Title",
          "to": "New Title"
        }
      },
      "previousData": { "title": "Old Title", "content": "..." },
      "newData": { "title": "New Title", "content": "..." },
      "metadata": { "source": "strapi-api" }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 10,
      "total": 250
    }
  }
}
```

### Get Single Audit Log

```http
GET /admin/audit-logs/:id
```

### Get Statistics

```http
GET /admin/audit-logs/statistics
```

Returns summary statistics about audit logs:

```json
{
  "totalLogs": 1250,
  "actionStats": [
    { "action": "create", "count": 500 },
    { "action": "update", "count": 600 },
    { "action": "delete", "count": 150 }
  ],
  "recentActivity": 25,
  "retentionPolicy": 365
}
```

## Implementation Details

### Lifecycle Hook Registration

The plugin registers global lifecycle hooks in the `bootstrap.ts` file:

```typescript
strapi.db.lifecycles.subscribe({
  models: Object.keys(strapi.contentTypes).filter(uid => uid !== 'plugin::audit-logs.audit-log'),
  
  async afterCreate(event) {
    // Log creation
  },
  
  async afterUpdate(event) {
    // Log updates with field changes
  },
  
  async beforeDelete(event) {
    // Capture data before deletion
  },
  
  async afterDelete(event) {
    // Log deletion with previous data
  },
});
```

### Change Detection

For update operations, the plugin calculates which fields changed by comparing the previous and new data:

```typescript
calculateChangedFields(oldData, newData) {
  const changedFields = {};
  
  for (const key of allKeys) {
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changedFields[key] = { from: oldValue, to: newValue };
    }
  }
  
  return changedFields;
}
```

### Error Handling

The plugin includes comprehensive error handling to ensure that audit logging failures don't impact normal content operations:

- All audit operations are wrapped in try-catch blocks
- Errors are logged but don't propagate to the main operation
- Graceful degradation when audit logging is unavailable

### Performance Considerations

- **Asynchronous Operations**: Audit logging happens asynchronously after the main operation
- **Minimal Overhead**: Only essential data is captured and stored
- **Efficient Queries**: Database indexes on frequently filtered fields
- **Batch Processing**: Support for bulk operations
- **Optional Cleanup**: Configurable retention to manage storage

## Security Considerations

- **Access Control**: Only authorized users can view audit logs
- **Data Privacy**: Sensitive fields can be excluded from logging
- **IP Tracking**: Client IP addresses are captured for security analysis
- **User Attribution**: All changes are linked to the responsible user
- **Tamper Resistance**: Audit logs are stored separately and not modifiable

## Monitoring and Maintenance

### Log Cleanup

Configure automatic cleanup of old audit logs:

```javascript
// Clean up logs older than 365 days
retentionDays: 365
```

The cleanup can also be triggered manually through the service:

```javascript
await strapi.plugin('audit-logs').service('audit').cleanupOldLogs();
```

### Monitoring

Monitor audit log health through the statistics endpoint:

- Total number of logs
- Distribution by action type
- Recent activity levels
- Retention policy status

### Database Indexes

The plugin automatically creates appropriate indexes for optimal query performance:

- `contentType` - For filtering by content type
- `userId` - For filtering by user
- `timestamp` - For date range queries and sorting
- `action` - For filtering by action type

## Troubleshooting

### Common Issues

1. **Audit logs not appearing**: Check if the plugin is enabled in configuration
2. **Permission denied**: Ensure the user has the `read_audit_logs` permission
3. **Performance issues**: Consider increasing `retentionDays` to reduce log volume
4. **Missing user information**: Verify authentication is properly configured

### Debug Mode

Enable debug logging for troubleshooting:

```javascript
module.exports = {
  'audit-logs': {
    config: {
      logLevel: 'debug',
    },
  },
};
```

### Health Check

Monitor the audit logging system:

```bash
# Check statistics
curl -X GET "http://localhost:1337/admin/audit-logs/statistics" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Verify recent logs
curl -X GET "http://localhost:1337/admin/audit-logs?page=1&pageSize=5" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Development

### Running Tests

```bash
# Run unit tests
npm run test:unit

# Run integration tests
npm run test:e2e
```

### Building

```bash
# Build the plugin
npm run build

# Build in watch mode
npm run build:watch
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

This plugin is part of the Strapi project and follows the same licensing terms.

## Support

For support and questions:

- [Strapi Documentation](https://docs.strapi.io)
- [Strapi Community Forum](https://forum.strapi.io)
- [GitHub Issues](https://github.com/strapi/strapi/issues)