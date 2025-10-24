'use strict';

module.exports = async ({ strapi }) => {
  const isEnabled = strapi.config.get('plugin.audit-logs.enabled', true);

  if (isEnabled) {
    strapi.log.info('[Audit Logs] Plugin initialized.');

    // Register middleware globally if enabled
    strapi.server.use(async (ctx, next) => {
      await next();

      const auditLogger = strapi.plugin('audit-logs').service('auditLog');
      const { user } = ctx.state;

      const method = ctx.request.method.toLowerCase();
      const path = ctx.request.path;

      if (!path.startsWith('/api/')) return;

      if (['post', 'put', 'delete'].includes(method)) {
        try {
          const contentType = path.split('/')[2]; // crude extraction from /api/{content-type}/
          const entityId = ctx.params?.id || null;
          const action = method === 'post' ? 'create' : method === 'put' ? 'update' : 'delete';
          const payload = ctx.request.body;

          await auditLogger.createLog({
            user,
            contentType,
            entityId,
            action,
            payload,
          });
        } catch (err) {
          strapi.log.error(`[Audit Logs] Failed to record log: ${err.message}`);
        }
      }
    });
  }
};

