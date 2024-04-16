import type { Core } from '@strapi/types';

import executeCERegister from '../../../server/src/register';
import migrateAuditLogsTable from './migrations/audit-logs-table';
import createAuditLogsService from './services/audit-logs';
import { getService } from './utils';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  const auditLogsIsEnabled = strapi.config.get('admin.auditLogs.enabled', true);

  if (auditLogsIsEnabled) {
    strapi.hook('strapi::content-types.beforeSync').register(migrateAuditLogsTable);
    const auditLogsService = createAuditLogsService(strapi);
    strapi.add('audit-logs', auditLogsService);
    await auditLogsService.register();
  }

  await executeCERegister({ strapi });
};
