import { Core } from '@strapi/types';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  await strapi.admin.services.permission.actionProvider.registerMany([
    {
      section: 'plugins',
      category: 'audit-log',
      subCategory: 'general',
      action: 'read_audit_logs',
      displayName: 'Read audit logs',
      pluginName: 'audit-log'
    },
    {
      section: 'plugins',
      category: 'audit-log',
      subCategory: 'general',
      action: 'write_audit_logs',
      displayName: 'Write audit logs',
      pluginName: 'audit-log'
    },
    {
      section: 'plugins',
      category: 'audit-log',
      subCategory: 'general',
      action: 'admin_audit_logs',
      displayName: 'Admin audit logs',
      pluginName: 'audit-log'
    }
  ]);

  strapi.server.use(require('./middlewares/content-api-audit')({}, { strapi }));

  strapi.log.info('Audit Log plugin enabled with role-based access control');
};
