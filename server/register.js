'use strict';

// Helper function to get the current actor (admin or api user)
const getActor = () => {
  const ctx = strapi.requestContext.get();
  if (!ctx) return null;

  if (ctx.state.admin?.user) {
    return { id: ctx.state.admin.user.id, type: 'admin::user' };
  }
  if (ctx.state.user) {
    return { id: ctx.state.user.id, type: 'plugin::users-permissions.user' };
  }
  return null;
};

module.exports = ({ strapi }) => {
  // Get plugin configuration
  const config = strapi.config.get('plugin.audit-log', {
    enabled: true,
    excludeContentTypes: [],
  });

  // Do not register hooks if disabled
  if (!config.enabled) {
    return;
  }

  // Ensure we don't log our own content type
  const excluded = new Set(config.excludeContentTypes);
  excluded.add('plugin::audit-log.audit-log');

  const auditLogService = strapi.service('plugin::audit-log.audit-log');

  // Subscribe to all models
  strapi.db.lifecycles.subscribe({
    models: ['*'],

    async afterCreate(event) {
      if (excluded.has(event.model.uid)) return;

      await auditLogService.logAction({
        action: 'create',
        contentType: event.model.uid,
        recordId: event.result.id,
        payload: event.result, // Log the full new record
        actor: getActor(),
      });
    },

    async afterUpdate(event) {
      if (excluded.has(event.model.uid)) return;

      await auditLogService.logAction({
        action: 'update',
        contentType: event.model.uid,
        recordId: event.result.id,
        payload: event.params.data, // Log only the changed fields
        actor: getActor(),
      });
    },

    async afterDelete(event) {
      if (excluded.has(event.model.uid)) return;

      await auditLogService.logAction({
        action: 'delete',
        contentType: event.model.uid,
        recordId: event.result.id,
        payload: event.result, // Log the full deleted record
        actor: getActor(),
      });
    },
  });
};
