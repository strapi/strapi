# Audit Logs Plugin

Provides automated audit logging for Content API changes and an endpoint to query logs.

- Logs: content type, record id, action (create/update/delete), timestamp, user, payload, changed fields.
- Route: GET /admin/audit-logs with filters (contentType, userId, action, start, end, page, pageSize, sort).
- RBAC: requires admin::audit-logs.read.
- Config: plugin::audit-logs { enabled: boolean; excludeContentTypes: string[] }.

See server/src for details.
