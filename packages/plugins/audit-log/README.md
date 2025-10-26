# Audit Log Plugin

Auto-logs all content changes (create/update/delete) in Strapi.

## What's Logged

- Content type, record ID, action, user, timestamp
- Correlation ID for request tracking  
- Before/after data + changed fields
- IP, user agent, user details

## API

```
GET /admin/audit-logs?contentType=api::article.article&action=update&page=1
```

**Filters:** contentType, userId, action, dateFrom, dateTo  
**Pagination:** page, pageSize  
**Sort:** timestamp:desc (default)

## Permissions

Grant `plugin::audit-log.read` permission via:  
Settings → Roles → [Role] → Plugins → Audit Log → ☑ Read

## Config

```js
// config/plugins.js
module.exports = {
  'audit-log': {
    config: {
      enabled: true,
      excludeContentTypes: ['plugin::upload.file'],
    },
  },
};
```

## Technical

- **Storage:** `audit_logs` table
- **Hooks:** `db.lifecycles` API
- **IDs:** `@paralleldrive/cuid2`
