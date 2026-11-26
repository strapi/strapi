import type { Core } from '@strapi/types';

import { computeRetentionDays } from './services/utils';

/**
 * Reports the history retention the delete job uses for the Plan card and the debug dump. That
 * caps an unconfigured instance at the default even when the license allows far more, so the
 * card never promises retention the job does not keep. Registered whatever the boot-time license
 * says, so a lapsed or later-renewed license still resolves.
 */
export const registerHistoryEntitlements = (strapi: Core.Strapi) => {
  strapi.ee.entitlements.register({
    feature: 'cms-content-history',
    limits: [
      {
        key: 'retentionDays',
        unit: 'days',
        get(feature) {
          return computeRetentionDays(
            typeof feature === 'object' ? feature.options?.retentionDays : undefined,
            strapi.config.get('admin.history.retentionDays')
          );
        },
      },
    ],
  });
};
