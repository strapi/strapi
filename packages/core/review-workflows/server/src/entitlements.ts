import type { Core } from '@strapi/types';

import { MAX_WORKFLOWS, MAX_STAGES_PER_WORKFLOW } from './constants/workflows';
import { clampMaxWorkflows, clampMaxStagesPerWorkflow } from './utils/review-workflows';

type Feature = Parameters<
  Parameters<Core.Strapi['ee']['entitlements']['register']>[0]['limits'][number]['get']
>[0];

const optionsOf = (feature: Feature) => (typeof feature === 'object' ? feature.options : undefined);

/**
 * Exposes the clamped workflow limits to the Plan card and the debug dump. Registered whatever
 * the boot-time license says, so a lapsed or later-renewed license still resolves.
 */
export const registerReviewWorkflowsEntitlements = (strapi: Core.Strapi) => {
  strapi.ee.entitlements.register({
    feature: 'review-workflows',
    limits: [
      {
        key: 'numberOfWorkflows',
        unit: 'count',
        get: (feature) =>
          clampMaxWorkflows(Number(optionsOf(feature)?.numberOfWorkflows) || MAX_WORKFLOWS),
      },
      {
        key: 'stagesPerWorkflow',
        unit: 'count',
        get: (feature) =>
          clampMaxStagesPerWorkflow(
            Number(optionsOf(feature)?.stagesPerWorkflow) || MAX_STAGES_PER_WORKFLOW
          ),
      },
    ],
  });
};
