# Audit Logs Plugin for Strapi

Automatically creates audit log entries for all content operations (create, update, delete) via the Content API.

## Features

- **Automatic Tracking**: Captures create, update, and delete operations on all content types
- **Rich Metadata**: Stores content type, record ID, action type, timestamp, user information, and payloads
- **REST API**: Query audit logs with filtering, pagination, and sorting
- **Role-Based Access Control**: Permission-based access to audit log endpoints
- **Configurable**: Enable/disable logging globally and exclude specific content types
- **Sensitive Data Protection**: Automatically redacts passwords and tokens from logs

---

## Architecture Overview

### How It Works

The audit logging system integrates with Strapi using **lifecycle hooks** to capture database operations:

```
┌─────────────┐
│   Content   │
│     API     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Strapi Database │
│    Lifecycle    │ ──► afterCreate  ──┐
│     Events      │ ──► afterUpdate  ──┤
│                 │ ──► afterDelete  ──┤
└─────────────────┘                    │
                                       ▼
                       ┌──────────────────────────────┐
                       │  Audit Logs Plugin           │
                       ├──────────────────────────────┤
                       │  1. Context Resolver         │
                       │     ↓ (extracts user info)   │
                       │  2. Record ID Extractor      │
                       │     ↓ (gets record ID)       │
                       │  3. Payload Builder          │
                       │     ↓ (formats payload)      │
                       │  4. Log Writer               │
                       │     ↓ (writes to database)   │
                       └──────────────────────────────┘
                                       │
                                       ▼
                       ┌──────────────────────────────┐
                       │      audit_logs Table        │
                       └──────────────────────────────┘
```

### Component Architecture

```
audit-logs/
├── services/
│   ├── audit-log.js           # Coordinates all services
│   ├── context-resolver.js    # Extracts user information
│   ├── record-id-extractor.js # Extracts record IDs
│   ├── payload-builder.js     # Builds payloads based on action type
│   ├── log-writer.js          # Writes to database
│   └── log-reader.js          # Queries audit logs
├── strategies/
│   ├── create-payload.js      # Builds payload for create operations
│   ├── update-payload.js      # Builds payload for update operations
│   └── delete-payload.js      # Builds payload for delete operations
├── controllers/
│   └── audit-log.js           # HTTP request handlers
├── routes/
│   └── index.js               # Route definitions with policies
└── content-types/
    └── audit-log/
        └── schema.js          # audit_logs table definition
```

---

## Installation

### 1. Add to your project's dependencies

Add `@strapi/audit-logs` to your `package.json`:

```json
{
  "dependencies": {
    "@strapi/audit-logs": "workspace:*"
  }
}
```

### 2. Install and restart

```bash
yarn install
yarn develop
```

The plugin will automatically:
- Create the `audit_logs` table
- Register lifecycle hooks
- Register the custom permission `plugin::audit-logs.read`
- Start logging all content operations

**No configuration required!** The plugin works out of the box with sensible defaults.

---

## Configuration (Optional)

The plugin is **enabled by default** with no configuration needed. You can optionally customize its behavior in `config/plugins.js`:

### Disabling the Plugin

```javascript
module.exports = {
  'audit-logs': {
    enabled: false, // Completely disables audit logging
  },
};
```

### Customizing Excluded Content Types

```javascript
module.exports = {
  'audit-logs': {
    enabled: true,
    config: {
      enabled: true,
      excludeContentTypes: [
        'plugin::upload.file',
        'plugin::upload.folder',
        'plugin::audit-logs.audit-log',
        'admin::permission',
        'admin::user',
        'admin::role',
        'admin::api-token',
        'admin::api-token-permission',
        'admin::transfer-token',
        'admin::transfer-token-permission',
        'api::temporary.temporary', // Add your custom types here
      ],
    },
  },
};
```

### Configuration Reference

**Available Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | Boolean | `true` | Enable/disable audit logging globally |
| `excludeContentTypes` | Array | See below | Content types to exclude from logging |

**Default Excluded Content Types:**

```javascript
[
  'plugin::upload.file',
  'plugin::upload.folder',
  'plugin::audit-logs.audit-log', // Always excluded to prevent infinite loops
  'admin::permission',
  'admin::user',
  'admin::role',
  'admin::api-token',
  'admin::api-token-permission',
  'admin::transfer-token',
  'admin::transfer-token-permission',
]
```

**Important:** The `plugin::audit-logs.audit-log` content type is **always excluded** to prevent infinite loops. This protection is implemented with defense in depth:

1. **Configuration Validator** - Automatically adds the audit-log content type to `excludeContentTypes` if missing
2. **Hardcoded Guard** - The service itself checks for and ignores audit-log operations before processing

Even if a user manually removes `plugin::audit-logs.audit-log` from the configuration, the plugin will not crash or create infinite loops.

---

## Database Schema

### `audit_logs` Table Structure

| Field | Type | Description |
|-------|------|-------------|
| `id` | Integer | Primary key (auto-increment) |
| `contentType` | String | Content type UID (e.g., `api::article.article`) |
| `recordId` | String | ID or documentId of the affected record |
| `action` | Enum | Operation type: `create`, `update`, or `delete` |
| `timestamp` | DateTime | When the operation occurred |
| `userId` | Integer | ID of the user who performed the action (nullable) |
| `userEmail` | String | Email of the user who performed the action |
| `payload` | JSON | Operation payload (structure varies by action type) |

### Payload Structure by Action Type

**Create:**
```json
{
  "action": "create",
  "data": { /* full record data */ },
  "result": {
    "id": 1,
    "documentId": "abc123"
  }
}
```

**Update:**
```json
{
  "action": "update",
  "changes": { /* only changed fields */ },
  "where": { "id": 1 },
  "result": {
    "id": 1,
    "documentId": "abc123"
  }
}
```

**Delete:**
```json
{
  "action": "delete",
  "where": { "id": 1 },
  "deletedData": { /* original record data if available */ },
  "result": null
}
```

### Database Indexes

For optimal query performance, these indexes are **automatically created** when the plugin initializes. If you need to create them manually:

```sql
-- SQLite/PostgreSQL/MySQL compatible
CREATE INDEX IF NOT EXISTS idx_audit_logs_content_type ON audit_logs(content_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_content_type_timestamp ON audit_logs(content_type, timestamp);
```

**Note:** Column names use snake_case (`content_type`, not `contentType`) as Strapi converts them automatically.

---

## API Usage

### Authentication

All endpoints require:
1. Admin authentication
2. `plugin::audit-logs.read` permission

### Endpoints

#### 1. List Audit Logs

```http
GET /audit-logs/
```

**Note:** Admin plugin routes are automatically prefixed with the plugin name in Strapi. The actual URL is `/audit-logs/`.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `contentType` | String | Filter by content type UID |
| `recordId` | String | Filter by record ID |
| `userId` | Integer | Filter by user ID |
| `action` | String | Filter by action (`create`, `update`, `delete`) |
| `dateFrom` | ISO Date | Filter by date range (start) |
| `dateTo` | ISO Date | Filter by date range (end) |
| `page` | Integer | Page number (default: 1) |
| `pageSize` | Integer | Items per page (default: 25, max: 100) |
| `sortBy` | String | Sort field (default: `timestamp`) |
| `sortOrder` | String | Sort order (`asc` or `desc`, default: `desc`) |

**Example Request:**

```bash
GET /audit-logs/?contentType=api::article.article&action=update&page=1&pageSize=25
```

**Example Response:**

```json
{
  "data": [
    {
      "id": 123,
      "contentType": "api::article.article",
      "recordId": "abc123",
      "action": "update",
      "timestamp": "2025-10-25T14:30:00.000Z",
      "userId": 1,
      "userEmail": "admin@example.com",
      "payload": {
        "action": "update",
        "changes": {
          "title": "Updated Article Title"
        },
        "where": { "id": 5 }
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 5,
      "total": 120
    }
  }
}
```

#### 2. Get Single Audit Log Entry

```http
GET /audit-logs/:id
```

**Example Response:**

```json
{
  "data": {
    "id": 123,
    "contentType": "api::article.article",
    "recordId": "abc123",
    "action": "create",
    "timestamp": "2025-10-25T14:30:00.000Z",
    "userId": 1,
    "userEmail": "admin@example.com",
    "payload": {
      "action": "create",
      "data": {
        "title": "New Article",
        "content": "Article content..."
      }
    }
  }
}
```

#### 3. Get Audit Log Statistics

```http
GET /audit-logs/statistics
```

**Query Parameters:** Same filters as list endpoint

**Example Response:**

```json
{
  "data": {
    "total": 1250,
    "byAction": {
      "create": 450,
      "update": 620,
      "delete": 180
    }
  }
}
```

---

## Permissions

### Granting Access

1. Go to **Settings** → **Administration Panel** → **Roles**
2. Select a role (e.g., "Editor")
3. Expand **Plugins** → **Audit Logs**
4. Check **Read** permission
5. Save

### Permission UID

```
plugin::audit-logs.read
```

### Programmatic Permission Check

```javascript
const hasPermission = await strapi.admin.services.permission.actionProvider.hasPermission(
  user,
  'plugin::audit-logs.read'
);
```

---

## Implementation Details

### 1. Lifecycle Hook Integration

The plugin subscribes to Strapi's database lifecycle events in `bootstrap.js`:

```javascript
strapi.db.lifecycles.subscribe({
  async afterCreate(event) {
    await auditLogService.logOperation('create', event);
  },
  async afterUpdate(event) {
    await auditLogService.logOperation('update', event);
  },
  async afterDelete(event) {
    await auditLogService.logOperation('delete', event);
  },
});
```

**Why afterX hooks?**
- Operations are already completed (we have full data)
- Logging failures don't break operations
- No risk of modifying user data

### 2. Service Architecture

The plugin uses a modular service architecture:

- **`context-resolver`**: Extracts user information from requests
- **`record-id-extractor`**: Extracts record IDs from lifecycle events
- **`payload-builder`**: Builds operation payloads using action-specific strategies
- **`log-writer`**: Writes audit entries to the database
- **`log-reader`**: Queries audit logs with filtering and pagination
- **`audit-log`**: Coordinates all services and handles the main logging flow

**Extensibility:**

You can register custom payload strategies for new action types:

```javascript
const payloadBuilder = strapi.plugin('audit-logs').service('payload-builder');

payloadBuilder.registerStrategy('custom-action', {
  build(event) {
    return { /* custom payload */ };
  },
});
```

### 3. Error Handling

**Graceful Degradation:**
- Logging failures never break operations
- All errors are caught and logged
- Users are unaffected by audit system issues

```javascript
try {
  await logWriter.write(logEntry);
} catch (error) {
  strapi.log.error('Failed to write audit log', error);
  // Operation continues successfully
}
```

### 4. Sensitive Data Protection

Passwords and tokens are automatically redacted:

```javascript
// In utils/sanitize.js
const sensitiveFields = [
  'password',
  'passwordHash',
  'resetPasswordToken',
  'confirmationToken',
  'apiToken',
  'secret',
  'privateKey',
  'accessToken',
  'refreshToken',
];
sensitiveFields.forEach((field) => {
  if (sanitized[field] !== undefined && sanitized[field] !== null) {
    sanitized[field] = '[REDACTED]';
  }
});
```

---

## Troubleshooting

### Audit logs not being created

**Check 1:** Is the plugin enabled?
```javascript
// config/plugins.js
'audit-logs': {
  enabled: true, // Must be true
  config: {
    enabled: true, // Must be true
  },
}
```

**Check 2:** Is the content type excluded?
```javascript
// Check excludeContentTypes array
```

**Check 3:** Check Strapi logs
```bash
# Look for:
[audit-logs] Plugin initialized - Lifecycle hooks registered
[audit-logs] Audit logging is ENABLED
```

### Permission denied errors

**Solution:** Grant `plugin::audit-logs.read` permission to the role.

### Performance issues

**Solution:** Ensure database indexes are created:
- Index on `contentType`
- Index on `userId`
- Index on `timestamp`
- Composite index on `(contentType, timestamp)`

---

## Extending the Plugin

### Adding Custom Payload Strategies

```javascript
// In your application bootstrap
const payloadBuilder = strapi.plugin('audit-logs').service('payload-builder');

payloadBuilder.registerStrategy('custom-publish', {
  build(event) {
    return {
      action: 'publish',
      publishedAt: event.params.data.publishedAt,
      publishedBy: event.state.user?.email,
    };
  },
});
```

### Listening to Custom Actions

```javascript
// In your plugin's bootstrap
strapi.db.lifecycles.subscribe({
  models: ['api::article.article'],

  async afterPublish(event) {
    const auditLog = strapi.plugin('audit-logs').service('audit-log');
    await auditLog.logOperation('publish', event);
  },
});
```

---

## FAQ

**Q: Does this slow down my application?**
A: Minimal impact (~5-10ms per operation). Logging happens after operations complete and failures don't block operations.

**Q: Can I log custom events?**
A: Yes! Use the `audit-log` service directly or register custom strategies.

**Q: Are passwords logged?**
A: No, passwords and tokens are automatically redacted with `[REDACTED]`.

**Q: Can I export audit logs?**
A: Yes, query the API and export to CSV/JSON or connect directly to the `audit_logs` table.

**Q: How long are logs retained?**
A: Forever by default. Implement a cleanup job if needed.

---

## License

MIT

---

## Support

For issues and questions, please open an issue on the project repository.
