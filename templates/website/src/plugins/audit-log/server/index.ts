import { Core } from '@strapi/strapi';
import _default from '../server/config/default.js';

const CONFIG_KEY = 'plugin.audit-log';
const config = strapi.config.get(CONFIG_KEY, _default);


export default async ({ strapi }: { strapi: Core.Strapi }) => {

  if (!config.auditLog.enabled) {
    strapi.log.info('Audit logging disabled via configuration.');
    return;
  }

  strapi.log.info('Audit logging initialized.');

  // Hook into Strapi content events
  strapi.db.lifecycles.subscribe({
    async afterCreate(event) {
      await createAuditLog(strapi, event, 'create');
    },
    async afterUpdate(event) {
      await createAuditLog(strapi, event, 'update');
    },
    async afterDelete(event) {
      await createAuditLog(strapi, event, 'delete');
    },
  });
};

// helper
async function createAuditLog(
  strapi: Core.Strapi,
  event: any,
  action: 'create' | 'update' | 'delete'
) {


  const { model, result, params } = event;
  if (config.auditLog.excludeContentTypes?.includes(model.uid)) return;

  const user = params?.user ?? null;

  await strapi.db.query('plugin::audit-log.audit-log').create({
    data: {
      contentType: model.uid,
      recordId: result.id,
      action,
      user: user?.id || null,
      timestamp: new Date(),
      payload: JSON.stringify(result),
    },
  });
}
