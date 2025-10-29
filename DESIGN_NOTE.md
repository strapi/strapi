# Design Summary: Content API Audit Logging

## Objectives
- Capture every create, update, and delete that flows through the Content API without burdening integrators with extra wiring.
- Persist structured audit entries that support fast filtering by content type, user, action, and time.
- Provide a first-party REST endpoint safeguarded by an explicit permission so platform owners can expose the history to selected clients.
- Keep the new capability opt-out through configuration to avoid surprising existing installations.

## Architectural Overview
1. **Lifecycle Capture** – Core content controllers (`collection-type` and `single-type`) delegate to a new internal service right after a mutation succeeds. This guarantees we only log successful writes and keeps logging close to the API surface that knows about the authenticated user.
2. **Audit Log Service** – A container-managed service performs filtering (enabled/excluded content types), prepares flat field diffs for updates, and writes to the dedicated `audit_logs` table. The service exposes a small query API consumed by the REST controller.
3. **Internal Module** – A lightweight `api::audit-log` module registers the `/audit-logs` route, controller, and permission scope (`read_audit_logs`). The module is added at boot via the existing module registry so it behaves like any application API.
4. **Access Control** – The content API permission engine receives a new action during `register()`. At bootstrap we ensure each Users & Permissions role has a `read_audit_logs` permission record (disabled by default), letting administrators opt specific roles in.
5. **Configuration** – `auditLog.enabled` and `auditLog.excludeContentTypes` are read from the main config provider on every write, allowing dynamic toggling or selective suppression.

## Key Decisions & Trade-offs
- **Controller-Level Logging**: Hooking at controllers preserves access to the sanitized payload and the user, avoiding architectural churn inside the entity service layer. Cost: duplicate helpers in both controllers for now.
- **Flat Diff Representation**: Updates are stored as a shallow diff `{ field: { before, after } }`. This keeps query payloads reasonable while still signalling nested changes (shown as whole-subobject replacements). Deep, path-aware diffs were considered but deferred for simplicity.
- **Permission Seeding**: Rather than introduce migrations we opportunistically insert missing `read_audit_logs` permissions during bootstrap. This keeps rollout smooth but does not automatically update roles added after startup (administrators must toggle the new permission once per role).
- **Internal API Module**: Registering a namespaced module avoids touching plugin boundaries and plugs into Strapi’s permission discovery. We deliberately named the module `api::audit-log` to minimize risk of conflict; if an app already defines the same API it must be renamed manually.

## Follow-up Ideas
- Add batching or queueing if deployments experience heavy write volumes and the synchronous insert becomes a bottleneck.
- Extend permissions seeding to listen for role creation events so new roles inherit the disabled permission automatically.
- Offer optional capture of additional metadata (e.g., request IP) through configuration hooks.
