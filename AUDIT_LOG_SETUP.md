# Strapi Content API Audit Log System

This system automatically creates audit log entries whenever records are created, updated, or deleted via the Content API.

## Features

- **Automatic Logging**: Tracks all Content API operations (create, update, delete)
- **Comprehensive Data**: Records content type, record ID, action type, timestamp, user, and changed fields
- **Efficient Querying**: Optimized database indexes for fast retrieval
- **Configurable**: Exclude specific content types and fields
- **User Tracking**: Links operations to authenticated users
- **Request Metadata**: Captures IP address, user agent, and request ID

## Installation

1. **Copy the audit log files** to your Strapi project:
   ```
   src/api/audit-log/
   src/middlewares/content-api-audit.js
   src/index.js
   config/audit-log.js
   database/migrations/20241201000000-add-audit-log-indexes.js
   ```

2. **Run database migration** to add indexes:
   ```bash
   npm run strapi db:migrate
   ```

3. **Restart your Strapi server**:
   ```bash
   npm run develop
   ```

## Configuration

Edit `config/audit-log.js` to customize the audit logging behavior:

```javascript
module.exports = {
  // Enable/disable audit logging
  enabled: true,

  // Content types to exclude from logging
  excludedContentTypes: [
    'audit-log', // Don't log audit log entries themselves
    'strapi::core-store'
  ],

  // Fields to exclude from change detection
  excludedFields: [
    'id', 'documentId', 'createdAt', 'updatedAt'
  ],

  // Number of days to keep logs (0 = keep forever)
  cleanupDays: 90
};
```

## Environment Variables

Set these environment variables to configure audit logging:

```bash
# Enable/disable audit logging (default: true)
AUDIT_LOG_ENABLED=true

# Number of days to keep audit logs (default: 90)
AUDIT_LOG_CLEANUP_DAYS=90
```

## API Endpoints

The system provides several API endpoints for accessing audit logs:

### Get All Audit Logs
```http
GET /api/audit-logs
```

### Get Audit Logs for a Specific Record
```http
GET /api/audit-logs/record/{contentType}/{recordId}
```

### Get Audit Logs for a Content Type
```http
GET /api/audit-logs/content-type/{contentType}
```

### Get Audit Logs for a User
```http
GET /api/audit-logs/user/{userId}
```

### Get Audit Statistics
```http
GET /api/audit-logs/stats?startDate=2024-01-01&endDate=2024-12-31
```

### Cleanup Old Logs
```http
POST /api/audit-logs/cleanup
Content-Type: application/json

{
  "daysToKeep": 90
}
```

## Audit Log Schema

Each audit log entry contains:

```json
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
  "fullPayload": {
    "title": "New Article Title",
    "content": "Article content..."
  },
  "previousData": {
    "title": "Old Article Title",
    "content": "Old content..."
  },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "requestId": "req_1234567890_abc123",
  "metadata": {
    "method": "PUT",
    "path": "/api/articles/123",
    "statusCode": 200,
    "responseTime": 150,
    "timestamp": "2024-12-01T10:30:00.000Z"
  }
}
```

## Database Indexes

The system creates optimized indexes for efficient querying:

- `content_type + timestamp` - For querying by content type
- `record_id + timestamp` - For querying by specific record
- `user + timestamp` - For querying by user
- `action + timestamp` - For querying by action type
- `request_id` - For tracking specific requests
- `timestamp` - For cleanup operations

## Usage Examples

### Query Audit Logs for an Article
```javascript
const auditLogs = await strapi.service('api::audit-log.audit-log').getRecordAuditLogs(
  'articles',
  '123',
  { page: 1, pageSize: 10 }
);
```

### Get Statistics
```javascript
const stats = await strapi.service('api::audit-log.audit-log').getAuditStats({
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  contentType: 'articles',
  action: 'update'
});
```

### Cleanup Old Logs
```javascript
const deletedCount = await strapi.service('api::audit-log.audit-log').cleanupOldLogs(90);
console.log(`Cleaned up ${deletedCount} old audit log entries`);
```

## Performance Considerations

1. **Indexing**: The system creates optimized indexes for common query patterns
2. **Cleanup**: Regularly clean up old logs to maintain performance
3. **Exclusion**: Exclude system content types from logging
4. **Size Limits**: Large payloads are truncated to prevent database bloat

## Security

- Audit logs are only accessible to authenticated admin users
- Sensitive data can be excluded from logging via configuration
- User information is linked but not stored in plain text

## Troubleshooting

### Audit Logs Not Being Created
1. Check if `AUDIT_LOG_ENABLED=true` in environment variables
2. Verify the middleware is registered in `src/index.js`
3. Check if the content type is in the excluded list

### Performance Issues
1. Run the database migration to add indexes
2. Clean up old audit logs regularly
3. Consider excluding high-frequency content types

### Database Errors
1. Ensure the audit_logs table exists
2. Run the migration to add proper indexes
3. Check database permissions

## Maintenance

### Regular Cleanup
Set up a cron job to clean up old audit logs:

```bash
# Clean up logs older than 90 days
curl -X POST http://localhost:1337/api/audit-logs/cleanup \
  -H "Content-Type: application/json" \
  -d '{"daysToKeep": 90}'
```

### Monitoring
Monitor the audit_logs table size and query performance:

```sql
-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('audit_logs'));

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename = 'audit_logs';
```
