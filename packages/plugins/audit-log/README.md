# Strapi Plugin - Audit Log

Automated audit logging for all content changes performed through Strapi's Content API.

## Features

- ✅ **Automatic Logging**: Captures all create, update, and delete operations
- ✅ **Comprehensive Metadata**: Tracks user, timestamps, changed fields, IP address, and user agent
- ✅ **Flexible Filtering**: Query logs by content type, user, action type, and date range
- ✅ **Pagination & Sorting**: Efficient handling of large audit log datasets
- ✅ **Role-Based Access**: Permission-based access control for audit logs
- ✅ **Configurable**: Enable/disable logging, exclude content types, set retention policies
- ✅ **Performance Optimized**: Async logging, database indexing, and batch processing
- ✅ **Automatic Cleanup**: Scheduled cleanup of old logs based on retention policy

## Installation

### 1. Install the plugin

In an existing Strapi project:

```bash
npm install @strapi/plugin-audit-log
```

Or for development/testing in the Strapi monorepo:

```bash
cd packages/plugins/audit-log
yarn install
yarn build
```

### 2. Enable the plugin

Add the plugin to your `config/plugins.ts`:

```typescript
export default {
  // ... other plugins
  'audit-log': {
    enabled: true,
    config: {
      // Optional configuration
      enabled: true,
      excludeContentTypes: [],
      storeFullPayload: true,
      retentionDays: 90,
      asyncLogging: true,
      captureRequestMetadata: true,
    },
  },
};
```

### 3. Run database migrations

```bash
npm run strapi build
npm run strapi develop
```

### 4. Configure permissions

1. Go to **Settings → Roles**
2. Select a role (e.g., "Editor" or "Admin")
3. Under **Plugins → Audit Log**, enable the "Read" permission
4. Save the role

## Configuration Options

| Option                    | Type       | Default | Description                                       |
| ------------------------- | ---------- | ------- | ------------------------------------------------- |
| `enabled`                 | `boolean`  | `true`  | Enable/disable audit logging globally             |
| `excludeContentTypes`     | `string[]` | `[]`    | Array of content types to exclude from logging    |
| `storeFullPayload`        | `boolean`  | `true`  | Store full record data for creates                |
| `retentionDays`           | `number`   | `90`    | Days to keep audit logs (0 = keep forever)        |
| `asyncLogging`            | `boolean`  | `true`  | Use async logging to prevent blocking operations  |
| `captureRequestMetadata`  | `boolean`  | `true`  | Capture IP address and user agent from requests   |

### Example Configuration

```typescript
// config/plugins.ts
export default {
  'audit-log': {
    enabled: true,
    config: {
      // Disable logging for these content types
      excludeContentTypes: [
        'admin::user',           // Sensitive user data
        'plugin::upload.file',   // High volume uploads
      ],
      
      // Keep logs for 30 days
      retentionDays: 30,
      
      // Store only IDs for creates to save space
      storeFullPayload: false,
    },
  },
};
```

## API Usage

### Get Audit Logs

```http
GET /api/audit-logs
```

**Query Parameters:**

- `contentType` - Filter by content type (e.g., `api::article.article`)
- `userId` - Filter by user ID
- `action` - Filter by action (`create`, `update`, `delete`)
- `startDate` - Start of date range (ISO 8601)
- `endDate` - End of date range (ISO 8601)
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 25, max: 100)
- `sort` - Sort order (default: `createdAt:desc`)

**Example Request:**

```bash
curl -X GET \
  'http://localhost:1337/api/audit-logs?contentType=api::article.article&action=update&page=1&pageSize=25' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Response:**

```json
{
  "data": [
    {
      "id": 1,
      "documentId": "abc123",
      "contentType": "api::article.article",
      "recordId": "456",
      "action": "update",
      "userId": 5,
      "username": "john.doe@example.com",
      "changedFields": {
        "title": {
          "old": "Old Title",
          "new": "New Title"
        }
      },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2025-10-26T10:30:00.000Z"
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
GET /api/audit-logs/:id
```

### Get Statistics

```http
GET /api/audit-logs/stats?startDate=2025-01-01&endDate=2025-12-31
```

### Manual Cleanup

```http
POST /api/audit-logs/cleanup
```

Requires admin role.

## Database Schema

The `audit_logs` table includes:

```typescript
{
  id: number;                    // Auto-increment ID
  documentId: string;             // Strapi document ID
  contentType: string;            // Content type UID
  recordId: string;               // ID of modified record
  action: 'create'|'update'|'delete';
  userId: number;                 // User ID (if authenticated)
  username: string;               // User email/username
  changedFields: object;          // Field-level diff for updates
  payload: object;                // Full data for creates/deletes
  ipAddress: string;              // Request IP
  userAgent: string;              // Request user agent
  metadata: object;               // Additional context
  createdAt: Date;                // Timestamp
}
```

**Indexes:**
- `contentType` - Fast filtering by content type
- `action` - Fast filtering by operation type
- `createdAt` - Efficient date range queries
- `userId` - Quick user activity lookups
- Composite: `(contentType, createdAt)` - Optimized common query pattern

## Performance Considerations

### Async Logging
By default, audit logs are created asynchronously to prevent blocking main operations:

```typescript
config: {
  asyncLogging: true  // Fire-and-forget logging
}
```

### Selective Logging
Exclude high-volume or sensitive content types:

```typescript
config: {
  excludeContentTypes: [
    'plugin::upload.file',     // Large volumes
    'admin::user',             // Sensitive data
  ]
}
```

### Retention Policy
Automatically clean up old logs:

```typescript
config: {
  retentionDays: 30  // Keep logs for 30 days
}
```

## Security

### Permission Required
Users must have the `plugin::audit-log.read` permission to access audit logs.

### Sensitive Data
The plugin never logs audit logs themselves to prevent recursion. Consider excluding other sensitive content types using `excludeContentTypes`.

### Data Retention
Configure appropriate retention policies for compliance:
- **GDPR**: Typically 6-12 months
- **SOX**: 7 years
- **HIPAA**: 6 years

## Troubleshooting

### Logs Not Being Created

1. Check if plugin is enabled:
```typescript
// config/plugins.ts
'audit-log': { enabled: true }
```

2. Verify content type is not excluded
3. Check strapi logs for errors
4. Ensure database migrations have run

### Performance Issues

1. Enable async logging:
```typescript
config: { asyncLogging: true }
```

2. Reduce retention period:
```typescript
config: { retentionDays: 30 }
```

3. Exclude high-volume content types
4. Consider using a separate database for audit logs

### Permission Errors

Ensure users have the `plugin::audit-log.read` permission in **Settings → Roles**.

## Development

### Building

```bash
yarn build
```

### Watching

```bash
yarn watch
```

### Testing

```bash
yarn test
```

## License

See the [LICENSE](./LICENSE) file for licensing information.

## Support

For issues and feature requests, please use the GitHub issue tracker.

## Contributing

Contributions are welcome! Please read the [contributing guidelines](../../CONTRIBUTING.md) first.

