'use strict';

const _ = require('lodash');

module.exports = async ({ strapi }) => {
  try {
    if (strapi?.admin?.services?.permission?.actionProvider) {
      const actions = [
        {
          section: 'plugins',
          displayName: 'Read audit logs',
          uid: 'read_audit_logs',
          pluginName: 'audit-log'
        }
      ];
      strapi.admin.services.permission.actionProvider.registerMany(actions);
    }
  } catch (e) {
    strapi.log.debug('[audit-log] permission registration skipped');
  }

  const config = strapi.config.get('plugin.audit-log', { enabled: true, excludeContentTypes: [] });

  if (!config.enabled) {
    strapi.log.info('[audit-log] plugin disabled via configuration');
    return;
  }

  const excluded = new Set(config.excludeContentTypes || []);

  const shouldExclude = (uid) => {
    if (!uid) return true;
    if (excluded.has(uid)) return true;
    if (uid.startsWith('admin::')) return true;
    if (uid.startsWith('plugin::audit-log')) return true;
    return false;
  };

  const extractUser = (context) => {
    if (!context) return null;
    if (context.state && context.state.user) return context.state.user;
    if (context.request && context.request.ctx && context.request.ctx.state && context.request.ctx.state.user) return context.request.ctx.state.user;
    return null;
  };

  const registerHooksForModel = (contentTypeUid) => {
    if (shouldExclude(contentTypeUid)) return;

    strapi.db.lifecycles.register({
      model: contentTypeUid,

      async afterCreate(event) {
        try {
          const { result, params } = event;
          const user = extractUser(params?.context);
          await strapi.plugin('audit-log').service('audit').createEntry({
            contentType: contentTypeUid,
            recordId: result?.id?.toString?.() ?? String(result?.id ?? ''),
            action: 'create',
            user,
            payload: result,
            context: params?.context
          });
        } catch (err) {
          strapi.log.error('[audit-log] afterCreate failed', err);
        }
      },

      async afterUpdate(event) {
        try {
          const { result, params } = event;
          const user = extractUser(params?.context);
          await strapi.plugin('audit-log').service('audit').createEntry({
            contentType: contentTypeUid,
            recordId: result?.id?.toString?.() ?? String(result?.id ?? ''),
            action: 'update',
            user,
            payload: result,
            changed: params?.data,
            context: params?.context
          });
        } catch (err) {
          strapi.log.error('[audit-log] afterUpdate failed', err);
        }
      },

      async beforeDelete(event) {
        try {
          const { params } = event;
          const id = params?.where?.id ?? params?.id;
          let record = null;
          try {
            record = await strapi.entityService.findOne(contentTypeUid, id, { populate: true });
          } catch (e) {
          }

          const user = extractUser(params?.context);

          await strapi.plugin('audit-log').service('audit').createEntry({
            contentType: contentTypeUid,
            recordId: id?.toString?.() ?? null,
            action: 'delete',
            user,
            payload: record,
            context: params?.context
          });
        } catch (err) {
          strapi.log.error('[audit-log] beforeDelete failed', err);
        }
      }
    });

    strapi.log.debug(`[audit-log] registered lifecycles for ${contentTypeUid}`);
  };

  for (const uid of Object.keys(strapi.contentTypes)) {
    registerHooksForModel(uid);
  }

  strapi.log.info('[audit-log] bootstrap complete');
};
