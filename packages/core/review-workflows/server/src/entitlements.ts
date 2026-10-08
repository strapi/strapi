import type { Core } from '@strapi/types';

import { resolveWorkflowLimits } from './utils/review-workflows';

/**
 * Exposes the workflow limits the validation service enforces to the Plan card and the debug dump.
 * Registered whatever the boot-time license says, so a lapsed or later-renewed license still
 * resolves.
 */
export const registerReviewWorkflowsEntitlements = (strapi: Core.Strapi) => {
  strapi.ee.entitlements.register({
    feature: 'review-workflows',
    limits: [
      {
        key: 'numberOfWorkflows',
        unit: 'count',
        get: (feature) => resolveWorkflowLimits(feature).numberOfWorkflows,
      },
      {
        key: 'stagesPerWorkflow',
        unit: 'count',
        get: (feature) => resolveWorkflowLimits(feature).stagesPerWorkflow,
      },
    ],
  });
};
