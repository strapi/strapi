import type { Core } from '@strapi/types';
import { getOr, keys, pickBy, pipe, has, clamp } from 'lodash/fp';
import {
  ENTITY_STAGE_ATTRIBUTE,
  MAX_WORKFLOWS,
  MAX_STAGES_PER_WORKFLOW,
} from '../constants/workflows';

export const getVisibleContentTypesUID = pipe([
  // Pick only content-types visible in the content-manager and option is not false
  pickBy(
    (value) =>
      getOr(true, 'pluginOptions.content-manager.visible', value) &&
      !getOr(false, 'options.noStageAttribute', value)
  ),
  // Get UIDs
  keys,
]);

export const hasStageAttribute = has(['attributes', ENTITY_STAGE_ATTRIBUTE]);

export const getWorkflowContentTypeFilter = (
  { strapi }: { strapi: Core.Strapi },
  contentType: any
) => {
  if (strapi.db.dialect.supportsOperator('$jsonSupersetOf')) {
    return { $jsonSupersetOf: JSON.stringify([contentType]) };
  }
  return { $contains: `"${contentType}"` };
};

export const clampMaxWorkflows = clamp(1, MAX_WORKFLOWS);
export const clampMaxStagesPerWorkflow = clamp(1, MAX_STAGES_PER_WORKFLOW);

export default {
  clampMaxWorkflows,
  clampMaxStagesPerWorkflow,
  getVisibleContentTypesUID,
  hasStageAttribute,
  getWorkflowContentTypeFilter,
};
