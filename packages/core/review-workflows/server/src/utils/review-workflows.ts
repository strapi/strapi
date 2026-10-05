import type { Core } from '@strapi/types';
import { get, pickBy, has } from 'lodash';
import { ENTITY_STAGE_ATTRIBUTE } from '../constants/workflows';

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

/** Keeps the workflow limit at one or more. The license sets the upper bound, uncapped. */
export const clampMaxWorkflows = (value: number) => Math.max(value, 1);
/** Keeps the stage limit at one or more. The license sets the upper bound, uncapped. */
export const clampMaxStagesPerWorkflow = (value: number) => Math.max(value, 1);

export default {
  clampMaxWorkflows,
  clampMaxStagesPerWorkflow,
  getVisibleContentTypesUID,
  hasStageAttribute,
  getWorkflowContentTypeFilter,
};
