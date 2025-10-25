import type { Core } from '@strapi/types';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  // Register permissions
  await strapi.admin.services.permission.actionProvider.registerMany([
    {
      section: 'plugins',
      displayName: 'Read Audit Logs',
      uid: 'read',
      pluginName: 'audit-logs',
    },
  ]);

  strapi.log.info('Audit Logs permissions registered');
};

