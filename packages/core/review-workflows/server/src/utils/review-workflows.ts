import type { Core } from '@strapi/types';
import { get, pickBy, has } from 'lodash';
import {
  DEFAULT_NUMBER_OF_WORKFLOWS,
  DEFAULT_STAGES_PER_WORKFLOW,
  ENTITY_STAGE_ATTRIBUTE,
} from '../constants/workflows';

/** Returns the content types that can use review workflow stages. */
export const getVisibleContentTypesUID = (contentTypes: Core.Strapi['contentTypes']) =>
  Object.keys(
    pickBy(
      contentTypes,
      (value) =>
        get(value, 'pluginOptions.content-manager.visible', true) &&
        !get(value, 'options.noStageAttribute', false)
    )
  ) as Array<keyof Core.Strapi['contentTypes']>;

/** Checks whether a content type stores a review workflow stage. */
export const hasStageAttribute = (contentType: unknown) =>
  has(contentType, ['attributes', ENTITY_STAGE_ATTRIBUTE]);

export const getWorkflowContentTypeFilter = (
  { strapi }: { strapi: Core.Strapi },
  contentType: any
) => {
  if (strapi.db.dialect.supportsOperator('$jsonSupersetOf')) {
    return { $jsonSupersetOf: JSON.stringify([contentType]) };
  }
  return { $contains: `"${contentType}"` };
};

/**
 * Reads one limit from the license feature options. The license is the source of truth, above or
 * below the default, and the default only applies when the license gives no usable value.
 *
 * - A number, or a numeric string such as '300', is the limit (rounded down).
 * - Absent, null, an empty string or a non-numeric value means the license sets no limit.
 * - 0 or a negative value also gets the default. The admin panel reads 0 as "no limit" too, and
 *   the default keeps a limit enforced where NaN or 0 would turn the check off or block everything.
 */
const resolveLicenseLimit = (value: unknown, defaultLimit: number): number => {
  const limit = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;

  // NaN fails the comparison, so a non-numeric value gets the default as well
  return limit >= 1 ? Math.floor(limit) : defaultLimit;
};

/**
 * The workflow and stage limits a license feature grants. The validation service and the Plan card
 * both read them from here, so what is enforced and what is displayed cannot disagree.
 */
export const resolveWorkflowLimits = (feature: unknown) => ({
  numberOfWorkflows: resolveLicenseLimit(
    get(feature, ['options', 'numberOfWorkflows']),
    DEFAULT_NUMBER_OF_WORKFLOWS
  ),
  stagesPerWorkflow: resolveLicenseLimit(
    get(feature, ['options', 'stagesPerWorkflow']),
    DEFAULT_STAGES_PER_WORKFLOW
  ),
});

export default {
  resolveWorkflowLimits,
  getVisibleContentTypesUID,
  hasStageAttribute,
  getWorkflowContentTypeFilter,
};
