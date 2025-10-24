'use strict';

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    await next();

    const { method, path, request, state } = ctx;
    const isAPI = path.startsWith('/api/');
    if (!isAPI) return;

    const auditService = strapi.plugin('audit-logs').service('auditLog');

    if (['POST', 'PUT', 'DELETE'].includes(method)) {
      const action =
        method === 'POST' ? 'create' : method === 'PUT' ? 'update' : 'delete';
      const user = state.user || null;
      const contentType = path.split('/')[2];
      const entityId = ctx.params?.id || null;

      await auditService.createLog({
        user,
        contentType,
        entityId,
        action,
        payload: request.body,
      });
    }
  };
};

