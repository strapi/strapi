# Strapi Audit Logs Plugin

A comprehensive audit logging system for Strapi that automatically tracks all content changes through the Content API.

## Overview

This plugin integrates with Strapi's middleware system to capture and log all content operations (create, update, delete) performed through the Content API. It stores detailed audit trails including user information, timestamps, and content changes.

## Architecture

The plugin consists of three main components:

1. **Middleware Layer**
   - Intercepts all Content API requests
   - Captures pre/post operation states
   - Computes diffs for update operations
   - Creates audit log entries

2. **Data Layer**
   - Uses Strapi's content-types system
   - Stores audit logs in `audit_logs` collection
   - Implements efficient indexing for queries

3. **API Layer**
   - Provides REST endpoints for querying logs
   - Implements filtering and pagination
   - Handles access control

## Implementation Details

### Audit Log Entry Structure
```typescript
{
  content_type: string;    // The type of content being modified
  record_id: string;       // ID of the modified record
  action: enum;           // 'create' | 'update' | 'delete'
  user_id: number;        // ID of the user performing the action
  user_email: string;     // Email of the user
  changes: JSON;          // For updates: before/after changes
  payload: JSON;          // For create/delete: full record data
  metadata: {
    ip: string;          // Client IP address
    userAgent: string;   // User agent string
    timestamp: Date;     // Action timestamp
  }
}
```

### Database Indexing
```json
{
  "indexes": [
    {
      "name": "audit_content_type_idx",
      "columns": ["content_type"]
    },
    {
      "name": "audit_user_id_idx",
      "columns": ["user_id"]
    },
    {
      "name": "audit_action_idx",
      "columns": ["action"]
    },
    {
      "name": "audit_timestamp_idx",
      "columns": ["created_at"]
    }
  ]
}
```

## Configuration

Add to your Strapi configuration (`config/plugins.js`):

```javascript
module.exports = {
  'audit-logs': {
    enabled: true,
    config: {
      enabled: true,              // Enable/disable logging globally
      excludeContentTypes: [],    // Content types to exclude from logging
      retentionDays: 30          // Number of days to keep logs
    }
  }
};
```

## API Endpoints

### Get Audit Logs
```http
GET /api/audit-logs
```

Query Parameters:
- `content_type`: Filter by content type
- `user_id`: Filter by user
- `action`: Filter by action type (create/update/delete)
- `start_date`: Filter by start date
- `end_date`: Filter by end date
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 25)
- `sort`: Sort field and direction (e.g., created_at:desc)

Response:
```json
{
  "data": [
    {
      "id": 1,
      "content_type": "api::article.article",
      "record_id": "123",
      "action": "update",
      "user_id": 1,
      "user_email": "admin@example.com",
      "changes": {
        "title": {
          "previous": "Old Title",
          "current": "New Title"
        }
      },
      "metadata": {
        "timestamp": "2025-10-26T09:00:00.000Z"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "total": 100
    }
  }
}
```

## Permissions

The plugin adds the following permissions:
- `plugin::audit-logs.read` - Required to access audit logs

## Installation

1. Install the plugin:
   ```bash
   yarn add @strapi/plugin-audit-logs
   ```

2. Enable the plugin in your Strapi configuration
3. Configure permissions in the admin panel
4. Restart your Strapi server

## Development

1. Clone the repository
2. Install dependencies: `yarn install`
3. Build the plugin: `yarn build`
4. Link to your Strapi project
5. Run tests: `yarn test`