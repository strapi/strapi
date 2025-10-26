**Architectural Overview**

The Audit Log feature is implemented as a Strapi Plugin, strapi-plugin-audit-log. This approach was chosen for its modularity, maintainability, and reusability. It avoids modifying Strapi's core files and allows the feature to be easily added or removed.

The system works in three main parts:

**Capture (Lifecycles):** The plugin's server/register.js file subscribes to Strapi's global database lifecycle events (afterCreate, afterUpdate, afterDelete) for all content types (models: ['*']). When an event fires, it checks the plugin's configuration (Is logging enabled? Is this content type excluded?).

**Process & Store (Service):** If the event should be logged, the hook captures the relevant metadata (action, content type, user, payload) and passes it to the audit-log service. This service is responsible for formatting the log entry and creating a new record in the plugin::audit-log.audit-log collection. The user (actor) is identified by inspecting the strapi.requestContext, which allows us to differentiate between Admin users (admin::user) and API users (plugin::users-permissions.user).

**Retrieve (API):** The plugin registers a new Admin API route at /audit-log/audit-logs. This endpoint is protected by Strapi's admin::isAuthenticatedAdmin policy and a new custom policy, plugin::audit-log.checkPermission. This policy verifies that the authenticated admin user has the specific plugin::audit-log.read permission, which is registered in the plugin's server/bootstrap.js file.

**Key Design Decisions**

**Global Lifecycles vs. Middleware:** We chose Global Lifecycles over API middleware. While the prompt specified the "Content API," a true audit log must be comprehensive. Middleware would miss all changes made through the Admin Panel, which is a critical gap. Lifecycles capture all database modifications, providing a complete and reliable audit trail.

**Admin API vs. Content API:** The retrieval endpoint is an Admin API (/audit-log/audit-logs). Audit logs are sensitive administrative data, not public-facing content. Placing this in the admin namespace provides a crucial layer of security and aligns with Strapi's permission model.

**User Identification:** We store actorId and actorType (e.g., admin::user) instead of a simple relation. This "polymorphic" approach is necessary because the user modifying content could be an Admin or an API User, which are stored in different tables.

**Payload Storage:** The payload attribute is stored as a json type.

For create: We store the full event.result (the new record).

For update: We store event.params.data (the "diff" or fields that were changed).

For delete: We store the full event.result (the record that was deleted). This provides maximum context for each operation.
