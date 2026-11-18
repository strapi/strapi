import type { Core } from '@strapi/types';
import { get, pickBy, has, clamp } from 'lodash';
import {
  ENTITY_STAGE_ATTRIBUTE,
  MAX_WORKFLOWS,
  MAX_STAGES_PER_WORKFLOW,
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

/** Constrains the workflow limit to the supported range. */
export const clampMaxWorkflows = (value: number) => clamp(value, 1, MAX_WORKFLOWS);
/** Constrains the stage limit to the supported range. */
export const clampMaxStagesPerWorkflow = (value: number) =>
  clamp(value, 1, MAX_STAGES_PER_WORKFLOW);

export default {
  clampMaxWorkflows,
  clampMaxStagesPerWorkflow,
  getVisibleContentTypesUID,
  hasStageAttribute,
  getWorkflowContentTypeFilter,
};
