# Strapi Audit Logs Plugin

Automated audit logging for all content changes performed through Strapi's Content API. This plugin captures comprehensive metadata for every create, update, delete, publish, and unpublish operation across all content types in your Strapi application.

## Features

- 🔍 **Automatic Tracking**: Captures all content changes without manual intervention
- 📊 **Comprehensive Metadata**: Records content type, record ID, action type, timestamp, user information, and changed fields
- 🔐 **Role-Based Access Control**: Secure access with granular permissions
- 🎛️ **Configurable**: Enable/disable logging globally and exclude specific content types
- 📈 **REST API**: Query audit logs with filtering, pagination, sorting, and statistics
- 🧹 **Auto-Cleanup**: Optional retention policy to automatically remove old logs
- 🔒 **Security**: Automatically redacts sensitive fields like passwords
- ⚡ **Performance**: Non-blocking logging that won't impact your application performance

## Installation

Since this is an internal plugin in the Strapi monorepo, it's automatically available. For external use, you can install it as:

```bash
# Using npm
npm install @strapi/plugin-audit-logs

# Using yarn
yarn add @strapi/plugin-audit-logs
```

## Setup

### 1. Enable the Plugin

Add the plugin to your `config/plugins.js` (or `config/plugins.ts`):

```javascript
module.exports = {
  // ... other plugins
  'audit-logs': {
    enabled: true,
    config: {
      // Optional: Disable audit logging (default: true)
      enabled: true,
      
      // Optional: Exclude specific content types from logging
      excludeContentTypes: [
        // 'api::article.article',
        // 'api::comment.comment',
      ],
      
      // Optional: Capture full payload data (default: true)
      capturePayload: true,
      
      // Optional: Automatically delete logs older than X days (default: null - keep forever)
      retentionDays: null, // e.g., 90 for 90 days
    },
  },
};
```

### 2. Grant Permissions

After starting Strapi with the plugin enabled:

1. Navigate to **Settings** → **Roles** (under Administration Panel)
2. Select a role (e.g., **Super Admin**, **Editor**)
3. Scroll to **Plugins** → **Audit Logs**
4. Check the **Read** permission
5. Save

## Usage

### API Endpoints

All endpoints require authentication and the `plugin::audit-logs.read` permission.

#### Get Audit Logs

```http
GET /api/audit-logs/audit-logs
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `contentType` | string | Filter by content type UID (e.g., `api::article.article`) |
| `userId` | integer | Filter by user ID |
| `action` | string | Filter by action: `create`, `update`, `delete`, `publish`, `unpublish` |
| `startDate` | ISO 8601 | Filter logs from this date onwards |
| `endDate` | ISO 8601 | Filter logs up to this date |
| `page` | integer | Page number (default: 1) |
| `pageSize` | integer | Results per page (default: 25, max: 100) |
| `sort` | string | Sort field and order (e.g., `timestamp:desc`) |

**Example Request:**

```bash
curl -X GET \
  'http://localhost:1337/api/audit-logs/audit-logs?contentType=api::article.article&action=update&page=1&pageSize=10' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Example Response:**

```json
{
  "data": [
    {
      "id": 1,
      "documentId": "abc123",
      "contentType": "api::article.article",
      "recordId": "123",
      "action": "update",
      "userId": 1,
      "userName": "john_doe",
      "userEmail": "john@example.com",
      "changedFields": ["title", "content"],
      "previousData": {
        "title": "Old Title",
        "content": "Old content..."
      },
      "newData": {
        "title": "New Title",
        "content": "Updated content..."
      },
      "timestamp": "2024-10-25T10:30:00.000Z",
      "createdAt": "2024-10-25T10:30:00.000Z",
      "updatedAt": "2024-10-25T10:30:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "pageCount": 5,
      "total": 47
    }
  }
}
```

#### Get Single Audit Log

```http
GET /api/audit-logs/audit-logs/:id
```

**Example Request:**

```bash
curl -X GET \
  'http://localhost:1337/api/audit-logs/audit-logs/abc123' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

#### Get Audit Statistics

```http
GET /api/audit-logs/audit-logs/stats
```

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `startDate` | ISO 8601 | Statistics from this date onwards |
| `endDate` | ISO 8601 | Statistics up to this date |

**Example Request:**

```bash
curl -X GET \
  'http://localhost:1337/api/audit-logs/audit-logs/stats?startDate=2024-10-01T00:00:00.000Z' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Example Response:**

```json
{
  "data": {
    "total": 1523,
    "byAction": {
      "create": 542,
      "update": 823,
      "delete": 98,
      "publish": 45,
      "unpublish": 15
    },
    "byContentType": {
      "api::article.article": 856,
      "api::page.page": 342,
      "api::comment.comment": 325
    }
  }
}
```

### Programmatic Access

You can also access the audit logs service programmatically:

```javascript
// Get the audit logs service
const auditLogsService = strapi.plugin('audit-logs').service('audit-logs');

// Find audit logs
const logs = await auditLogsService.find({
  contentType: 'api::article.article',
  action: 'update',
  page: 1,
  pageSize: 10,
});

// Create a custom audit log
await auditLogsService.create({
  contentType: 'api::custom.custom',
  recordId: '123',
  action: 'custom-action',
  userId: 1,
  userName: 'admin',
  userEmail: 'admin@example.com',
  payload: { custom: 'data' },
});
```

## Data Model

### Audit Log Schema

Each audit log entry contains:

| Field | Type | Description |
|-------|------|-------------|
| `contentType` | string | UID of the content type (e.g., `api::article.article`) |
| `recordId` | string | ID of the record that was modified |
| `action` | enum | Action performed: `create`, `update`, `delete`, `publish`, `unpublish` |
| `userId` | integer | ID of the user who performed the action (null if system) |
| `userName` | string | Username of the user |
| `userEmail` | string | Email of the user |
| `changedFields` | JSON | Array of field names that changed (for updates) |
| `previousData` | JSON | Data before the change (for updates/deletes) |
| `newData` | JSON | Data after the change (for creates/updates) |
| `payload` | JSON | Full payload of the request (for creates) |
| `timestamp` | datetime | When the action occurred |

### Database Indexes

The plugin automatically creates indexes on:
- `contentType` - for filtering by content type
- `recordId` - for finding logs for specific records
- `action` - for filtering by action type
- `userId` - for filtering by user
- `timestamp` - for date range queries and sorting

## Configuration Options

### Plugin Configuration

```javascript
// config/plugins.js
module.exports = {
  'audit-logs': {
    enabled: true,
    config: {
      // Enable/disable all audit logging
      enabled: true,
      
      // Content types to exclude from logging
      excludeContentTypes: [
        'api::temporary-data.temporary-data',
        'api::cache.cache',
      ],
      
      // Whether to capture full payload data
      capturePayload: true,
      
      // Retention policy in days (null = keep forever)
      retentionDays: 90,
    },
  },
};
```

### Environment Variables

You can also configure the plugin using environment variables:

```bash
# Enable/disable plugin
AUDIT_LOGS_ENABLED=true

# Retention period in days
AUDIT_LOGS_RETENTION_DAYS=90
```

## Best Practices

### 1. Exclude High-Volume Content Types

If you have content types with very frequent updates (e.g., analytics, sessions), exclude them to avoid database bloat:

```javascript
config: {
  excludeContentTypes: [
    'api::analytics.analytics',
    'api::session.session',
  ],
}
```

### 2. Set a Retention Policy

For production applications, set a retention policy to automatically clean up old logs:

```javascript
config: {
  retentionDays: 90, // Keep logs for 90 days
}
```

### 3. Regular Backups

If audit logs are critical for compliance, ensure they're included in your backup strategy before they're cleaned up.

### 4. Monitor Database Size

Audit logs can grow quickly. Monitor your database size and adjust retention policies accordingly.

### 5. Index Optimization

The plugin creates default indexes, but you may want to add custom indexes based on your query patterns:

```sql
-- Example: Add composite index for common query pattern
CREATE INDEX idx_audit_logs_content_type_timestamp 
  ON audit_logs (content_type, timestamp DESC);
```

## Security

### Sensitive Data

The plugin automatically redacts sensitive fields:
- `password`
- `resetPasswordToken`
- `registrationToken`

### Access Control

- All API endpoints require authentication
- Users need the `plugin::audit-logs.read` permission
- Audit logs themselves are excluded from logging to prevent infinite loops

### GDPR Compliance

When deleting user data for GDPR compliance, remember to also clean up their audit logs:

```javascript
// Delete audit logs for a user
await strapi.db.query('plugin::audit-logs.audit-log').deleteMany({
  where: { userId: userIdToDelete },
});
```

## Troubleshooting

### Logs Not Appearing

1. **Check if the plugin is enabled:**
   ```javascript
   // config/plugins.js
   'audit-logs': { enabled: true }
   ```

2. **Check if the content type is excluded:**
   ```javascript
   config: {
     excludeContentTypes: [], // Should not contain your content type
   }
   ```

3. **Verify permissions:**
   - User must have `plugin::audit-logs.read` permission

### Performance Issues

1. **Set a retention policy:**
   ```javascript
   config: { retentionDays: 90 }
   ```

2. **Exclude high-volume content types:**
   ```javascript
   config: {
     excludeContentTypes: ['api::high-volume.high-volume'],
   }
   ```

3. **Disable payload capture:**
   ```javascript
   config: { capturePayload: false }
   ```

### Missing User Information

User information is only available when operations are performed through authenticated API requests. System operations (e.g., cron jobs, bootstrap scripts) will have `null` user information.

## Architecture

For detailed information about the plugin's architecture and implementation, see [DESIGN_NOTE.md](./DESIGN_NOTE.md).

## Testing

```bash
# Run tests
npm run test:unit

# Run with watch mode
npm run test:unit:watch
```

## Development

```bash
# Install dependencies
npm install

# Build the plugin
npm run build

# Watch for changes
npm run watch

# Lint code
npm run lint
```

## Contributing

Contributions are welcome! Please follow the [Strapi contribution guidelines](../../CONTRIBUTING.md).

## License

See [LICENSE](./LICENSE) file for details.

## Support

- [Strapi Documentation](https://docs.strapi.io)
- [Strapi Community](https://strapi.io/community)
- [GitHub Issues](https://github.com/strapi/strapi/issues)

## Changelog

### 1.0.0 (2024-10-25)

- Initial release
- Automatic audit logging for all content changes
- REST API with filtering, pagination, and sorting
- Role-based access control
- Configurable exclusions and retention policy
- Statistics endpoint
- Auto-cleanup cron job

