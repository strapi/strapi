# Audit Logs - Design Summary

## Goal
Automatically record create/update/delete operations performed via Strapi's Content API and provide a query endpoint with filtering, pagination, and RBAC.

## Architecture
- Event-driven capture: Subscribe to Strapi's `eventHub` and listen for `entry.create`, `entry.update`, `entry.delete`.
- Storage: Persist records in a dedicated collection type `plugin::audit-logs.audit-log` (`audit_logs`).
- Access: Expose an admin-only route `GET /admin/audit-logs` for querying logs with filters, pagination, and sorting.
- RBAC: Register `admin::audit-logs.read` and protect the route with `admin::hasPermissions`.
- Config: `plugin::audit-logs` supports `enabled` and `excludeContentTypes`.

## Key Decisions
- Source of truth for changes: Strapi document service emits `entry.*` events; we subscribe to those for reliable capture after transaction commit.
- Scope limited to Content API: We only log when `ctx.state.route.info.type === 'content-api'`, ignoring admin UI operations per requirement.
- Diff for updates: Best-effort diff between `payload.previous` and `payload.entry` when provided; stores list of `changedFields` plus the sanitized payload.
- Query surface in controller: For simplicity and to avoid extra layers, the list/search logic is implemented directly in the controller with strict pagination caps.
- Indexes: Added on `contentType`, `action`, `userId`, `occurredAt` for efficient filtering and time-range scans.

## Data Model
- contentType: string
- recordId: uid
- action: string ('create'|'update'|'delete')
- userId: integer (nullable)
- userType: string (route type)
- payload: json (sanitized entry or deleted snapshot)
- changedFields: json (array of field names)
- occurredAt: datetime

## Limitations / Future Enhancements
- Content API endpoint for non-admins is not included; could be added behind `users-permissions` with a `read_audit_logs` permission.
- Deep diffs not computed; field-level changes are shallow by key comparison.
- Config could support per-content-type field masking for sensitive data.
