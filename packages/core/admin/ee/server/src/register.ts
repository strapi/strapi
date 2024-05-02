import type { Core } from '@strapi/types';

import executeCERegister from '../../../server/src/register';

import createAuditLogsService from './services/audit-logs';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  const auditLogsIsEnabled = strapi.config.get('admin.auditLogs.enabled', true);

  if (auditLogsIsEnabled) {
    const auditLogsService = createAuditLogsService(strapi);
    strapi.add('audit-logs', auditLogsService);
    await auditLogsService.register();
  }

  await executeCERegister({ strapi });
};
