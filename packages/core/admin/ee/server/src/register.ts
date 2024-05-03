import type { Core } from '@strapi/types';

import executeCERegister from '../../../server/src/register';

import { createAuditLogsService } from './audit-logs/services/audit-logs';
import { createAuditLogsLifecycle } from './audit-logs/services/lifecycles';

export default async ({ strapi }: { strapi: Core.Strapi }) => {
  const auditLogsIsEnabled = strapi.config.get('admin.auditLogs.enabled', true);

  if (auditLogsIsEnabled) {
    // Expose Audit Logs as internal services on the Strapi instance
    const auditLogsService = createAuditLogsService(strapi);
    strapi.add('audit-logs', auditLogsService);
    const auditLogsLifecycle = createAuditLogsLifecycle(strapi);
    strapi.add('audit-logs-lifecycle', auditLogsLifecycle);

    await auditLogsLifecycle.register();
  }

  await executeCERegister({ strapi });
};
