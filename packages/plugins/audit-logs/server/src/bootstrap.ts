import type { Core } from '@strapi/types';

export async function bootstrap({ strapi }: { strapi: Core.Strapi }) {

  const actions = [
    {
      section: 'plugins',
      displayName: 'Read Audit Logs',
      uid: 'read_audit_logs',
      pluginName: 'audit-logs',
    },
  ];

  await strapi.admin.services.permission.actionProvider.registerMany(actions);

// Function to create audit-log entry.
const createAuditLog = async (event: any, action: string) => {

  // TODO: Enable/disable based on config.
  //   const pluginConfig = strapi.config.get('plugin.audit-logs');
  //   if (!pluginConfig?.enabled) {
  //     strapi.log.info('Audit logging is disabled by configuration.');
  //     return;
  //  }

    const requestState = strapi.requestContext.get()?.state;
    const user = requestState?.user;
    const {model, params, result} = event;

      if(action === 'delete') {
          await strapi.plugin('audit-logs').service('auditService').create({
            date: new Date(),
            user: user?.id,
            collection: model.uid,
            action: action,
            params: {
              where: params.where,
            },
          });
      } else {
        const { data: reqBody } = params;
        await strapi.plugin('audit-logs').service('auditService').create({
          date: new Date(),
          user: user?.id,
          collection: model.uid,
          action: action,
          collectionAffectedId: result.id,
          params: {
            where: params.where,
            populate: params.populate,
          },
          data: reqBody,
        });
      }
  }

  // Global lifecycle handlers
  strapi.db.lifecycles.subscribe({
    async afterCreate(event: any) {
      await createAuditLog(event, 'create');
    },
    async afterUpdate(event: any) {
      await createAuditLog(event, 'update');
    },
    async afterDelete(event: any) {
      await createAuditLog(event, 'delete');
    },
  });
};