# Content API Audit Logging

This document explains the automated audit logging feature added to Strapi’s Content API. It covers the runtime architecture, configuration knobs, stored data shape, and how to retrieve audit history through the new `/audit-logs` endpoint.

## Architecture
- **Capture Points**: Core collection-type and single-type controllers record audit entries immediately after a successful create, update, or delete. They feed the sanitized entity payload, the preceding value (for updates), and the authenticated user (when available) to the logging service.
- **Logging Service**: `strapi.get('content-audit-logs')` encapsulates audit recording and querying. It enforces global configuration, computes shallow diffs for updates, normalises user/record identifiers, and writes to the dedicated table.
- **Storage Model**: A new internal model (`strapi::audit-log`) persists entries in the `audit_logs` table with indexes on `content_type`, `user_id`, `action`, and `timestamp` for efficient lookups.
- **API Module**: A lightweight module (`api::audit-log`) registers a content API route at `/audit-logs`. The controller validates query parameters, runs the logging service query, and returns paginated results with metadata.
- **Permissions**: The route is gated by the `read_audit_logs` scope. During startup the permission action is registered with the Content API engine and a disabled permission row is created for each Users & Permissions role, so administrators can grant access selectively.

## Configuration
Two optional settings live under the top-level `config/auditLog.(js|ts)` file:

```ts
module.exports = {
  enabled: true, // default
  excludeContentTypes: ['api::secret.secret'], // default []
};
```

They are read on every write, so toggling the configuration followed by a reload immediately changes logging behaviour.

## Testing With A Local Portal App
When validating the feature from a separate Strapi project that lives alongside this repository, point the app's dependencies to the in-repo packages so your test app consumes the latest audit log code.

```json
"dependencies": {
  "@strapi/core": "portal:../strapi/packages/core/core",
  "@strapi/admin": "portal:../strapi/packages/core/admin",
  "@strapi/plugin-cloud": "5.29.0",
  "@strapi/plugin-users-permissions": "5.29.0",
  "@strapi/strapi": "portal:../strapi/packages/core/strapi",
  "better-sqlite3": "11.3.0",
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "react-router-dom": "^6.0.0",
  "styled-components": "^6.0.0"
}
```

Adjust the relative path (`../strapi`) if your test application sits elsewhere.

## Logged Data
Each audit row includes:

| Field | Description |
| --- | --- |
| `contentType` | Content-type UID (`api::article.article`) |
| `recordId` | Primary identifier of the affected entry (stringified) |
| `action` | `create`, `update`, or `delete` |
| `timestamp` | UTC ISO timestamp of when the write completed |
| `userId` | Authenticated user id (if present) |
| `payload` | Full sanitized entity for creates and deletes |
| `diff` | Shallow `{ field: { before, after } }` object for updates |

Updates only populate `diff`; creates and deletes only populate `payload`.

## `/audit-logs` REST Endpoint
```
GET /api/audit-logs
Authorization: Bearer <token with read_audit_logs scope>
```

### Query Parameters
- `contentType` – filter by content type UID.
- `userId` – filter by acting user id.
- `action` – one of `create|update|delete`.
- `start` / `end` – ISO timestamps delimiting the date range (`timestamp` field).
- `page` / `pageSize` – pagination controls (defaults: `1` / `20`, `pageSize` max `100`).
- `sort` – currently supports `timestamp:asc` or `timestamp:desc` (default).

### Response Shape

```json
{
  "data": [
    {
      "id": "42",
      "contentType": "api::article.article",
      "recordId": "1337",
      "action": "update",
      "timestamp": "2024-05-22T18:10:43.512Z",
      "userId": "5",
      "payload": null,
      "diff": {
        "title": { "before": "Draft", "after": "Published" }
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "pageCount": 1,
      "total": 1
    }
  }
}
```

## Access Control
- Only roles granted the `read_audit_logs` permission can call the endpoint. Existing roles receive the permission (disabled) automatically during the next application start, so administrators can flip it on in the Users & Permissions role editor.
- Calls without a token, or without the permission in scope, receive `401`/`403` responses from the Content API auth layer.

## Operational Notes
- Logging is synchronous with the write operation; if the insert fails the request still completes, and a warning is printed to the server log.
- Excluding content types stops new entries from being captured but does not delete existing rows (retention can be handled with custom scripts if required).
- The audit log table is internal and intentionally hidden from Content Manager / Content Type Builder to avoid accidental edits.
