import type { Core } from '@strapi/types';

import { computeRetentionDays } from './services/lifecycles';

/**
 * Reports the audit-log retention the daily delete job uses, admin override included, for the
 * Plan card and the debug dump. Registered whatever the boot-time license says, so a license
 * that lapsed before boot still resolves its retained limits, and a later renewal needs no restart.
 */
export const registerAuditLogsEntitlements = (strapi: Core.Strapi) => {
  strapi.ee.entitlements.register({
    feature: 'audit-logs',
    limits: [
      {
        key: 'retentionDays',
        unit: 'days',
        get(feature) {
          return computeRetentionDays(
            typeof feature === 'object' ? feature.options?.retentionDays : undefined,
            strapi.config.get('admin.auditLogs.retentionDays')
          );
        },
      },
    ],
  });
};
