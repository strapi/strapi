# Strapi Audit Log Plugin

This plugin adds automated audit logging for create, update and delete operations performed through the Content API.

## Features
- Writes audit entries to `audit_logs` collection/table.
- Captures content type, record id, action, timestamp, user, diff/payload and meta.
- Exposes REST endpoints:
  - `GET /audit-logs` - list with filters, pagination, sorting
  - `GET /audit-logs/:id` - get single entry
- Role/permission controlled via `plugin::audit-log.read_audit_logs`.
- Configurable via `config/plugins.js`.

## Installation
1. Copy the `plugins/audit-log` folder into your Strapi project.
2. Add plugin configuration to `config/plugins.js` (see example in `config/example.plugins.js`).
3. Restart Strapi.
4. In Admin UI, go to Settings → Roles and Permissions, and grant the `Read audit logs` permission to desired roles.

## Testing endpoints
Use an admin user's JWT for authentication when calling the endpoints (or grant permission to a role used by content-api users).

Example:

```bash
curl -H "Authorization: Bearer <JWT>" "http://localhost:1337/api/audit-logs?_start=0&_limit=10"
```

## Notes
- Logging is best-effort and non-blocking; failures in audit writing are logged but do not stop the original request.
- For high-volume workloads consider writing to a queue instead of synchronous DB writes.
