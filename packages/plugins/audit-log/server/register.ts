import { Strapi } from '@strapi/strapi';

export default ({ strapi }: { strapi: Strapi }) => {
  const config = strapi.config.get('plugin.audit-log');

  if (config?.enabled) {
    let beforeState: any = {}; // Temporary storage for before state

    strapi.db.lifecycles.subscribe(async (event) => {
      const { action, model, params, result } = event;
      const { uid, singularName } = model;

      if (config.excludeContentTypes?.includes(uid)) {
        return;
      }

      if (action === 'beforeUpdate') {
        const recordId = params.where?.id;
        if (recordId) {
          beforeState[recordId] = await strapi.db.query(uid).findOne({ where: { id: recordId } });
        }
        return;
      }

      if (event.action === 'beforeCreate' || event.action === 'beforeDelete') {
        // We will get the full diff in the after events
        return;
      }

      // ... existing code ...

      let payload = {};
      let recordId = where?.id || result?.id;

      if (action === 'afterUpdate') {
        payload = { before: beforeState[recordId], after: result };
        delete beforeState[recordId]; // Clean up temporary state
      } else if (action === 'afterCreate') {
        payload = { after: result };
      } else if (action === 'afterDelete') {
        payload = { before: result };
      }

      // Attempt to get the authenticated user from the request context
      let userId = null;
      const ctx = strapi.requestContext.get();
      if (ctx && ctx.state && ctx.state.user) {
        userId = ctx.state.user.id;
      }

      await strapi.entityService.create('plugin::audit-log.audit-log', {
        data: {
          action: action.replace('after', '').toLowerCase(),
          contentType: singularName,
          recordId,
          userId, // Added userId
          payload,
        },
      });
    });
  }

  strapi.admin.services.permission.actionProvider.register({
    uid: 'read',
    displayName: 'Read Audit Logs',
    pluginName: 'audit-log',
    section: 'plugins',
  });
};
