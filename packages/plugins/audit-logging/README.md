# Strapi Audit Logging Plugin

Automated audit logging for all content changes performed through Strapi's Content API.

## Features

- **Automatic Logging**: Captures all create, update, and delete operations on content
- **Comprehensive Metadata**: Records user, timestamps, changed fields, and full payloads
- **Secure API**: REST endpoint with role-based access control
- **Configurable**: Enable/disable logging and exclude specific content types
- **Multi-Database Support**: Compatible with PostgreSQL, MySQL, MariaDB, and SQLite

## Installation

This plugin is included with Strapi core. To enable it, add it to your `config/plugins.js`:

```javascript
module.exports = {
  'audit-logging': {
    enabled: true,
    config: {
      auditLog: {
        enabled: true,
        excludeContentTypes: ['strapi::core-store'],
      }
    }
  }
};
```

## Configuration

### Options

- `auditLog.enabled` (boolean): Enable or disable audit logging globally
- `auditLog.excludeContentTypes` (array): Content types to exclude from logging

### Example Configuration

```javascript
// config/plugins.js
module.exports = {
  'audit-logging': {
    enabled: true,
    config: {
      auditLog: {
        enabled: true,
        excludeContentTypes: [
          'strapi::core-store',
          'admin::user',
          'plugin::upload.file'
        ],
      }
    }
  }
};
```

## API Usage

### Get Audit Logs

```
GET /api/audit-logs
```

#### Query Parameters

- `contentType`: Filter by content type
- `userId`: Filter by user ID
- `action`: Filter by action (create, update, delete)
- `startDate`: Start date for filtering
- `endDate`: End date for filtering
- `page`: Page number for pagination
- `pageSize`: Number of items per page (max 100)
- `sort`: Sort field and direction (e.g., `timestamp:desc`)

#### Example Request

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:1337/api/audit-logs?contentType=api::article.article&action=update&page=1&pageSize=25"
```

#### Example Response

```json
{
  "data": [
    {
      "id": 1,
      "contentType": "api::article.article",
      "recordId": "123",
      "action": "update",
      "userId": 1,
      "timestamp": "2024-01-15T10:30:00Z",
      "changedFields": {
        "title": "New Article Title",
        "updatedAt": "2024-01-15T10:30:00Z"
      },
      "userAgent": "Mozilla/5.0...",
      "ipAddress": "192.168.1.100"
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

## Permissions

To access audit logs, users need the `plugin::audit-logging.read` permission. This can be assigned through the Strapi admin panel under Settings > Administration Panel > Roles.

## Architecture

The audit logging system integrates with Strapi's core architecture through:

- **Database Lifecycle Hooks**: Capture operations at the database level
- **Plugin System**: Modular implementation following Strapi conventions
- **Permission System**: Secure access using Strapi's RBAC
- **Configuration System**: Runtime configuration through Strapi's config system

## Development

### Building

```bash
yarn build
```

### Testing

```bash
yarn test:unit
```

### Linting

```bash
yarn lint
```

## License

See the [LICENSE](../../../LICENSE) file for licensing information.