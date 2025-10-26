import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => {
  // Register permissions
  strapi.admin?.services.permission.actionProvider.registerMany([
    {
      section: 'plugins',
      displayName: 'Read',
      uid: 'plugin::audit-log.read',
      pluginName: 'audit-log',
    },
  ]);

  // Subscribe to lifecycle events
  strapi.db.lifecycles.subscribe({
    models: ['*'], // Subscribe to all models

    async afterCreate(event) {
      const auditService = strapi.plugin('audit-log')?.service('auditLog');
      if (auditService) {
        await auditService.logCreate(event, strapi.requestContext?.get());
      }
    },

    async afterUpdate(event) {
      const auditService = strapi.plugin('audit-log')?.service('auditLog');
      if (auditService) {
        await auditService.logUpdate(event, strapi.requestContext?.get());
      }
    },

    async afterDelete(event) {
      const auditService = strapi.plugin('audit-log')?.service('auditLog');
      if (auditService) {
        await auditService.logDelete(event, strapi.requestContext?.get());
      }
    },
  });

  // Schedule cleanup job (runs daily)
  if (strapi.cron) {
    strapi.cron.add({
      '0 2 * * *': async () => {
        // Run at 2 AM every day
        strapi.log.info('Running audit log cleanup...');
        const auditService = strapi.plugin('audit-log')?.service('auditLog');
        if (auditService) {
          await auditService.cleanup();
        }
      },
    });
  }

  strapi.log.info('Audit Log plugin registered successfully');
};

