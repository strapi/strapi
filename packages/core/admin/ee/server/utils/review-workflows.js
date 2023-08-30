'use strict';

const { getOr, keys, pickBy, pipe, has, clamp, filter } = require('lodash/fp');
const {
  ENTITY_STAGE_ATTRIBUTE,
  MAX_WORKFLOWS,
  MAX_STAGES_PER_WORKFLOW,
} = require('../constants/workflows');

const RW_EXCLUDED_CONTENT_TYPES = ['plugin::users-permissions.user'];

const getVisibleContentTypesUID = pipe([
  // Pick only content-types visible in the content-manager and option is not false
  pickBy(
    (value) =>
      getOr(true, 'pluginOptions.content-manager.visible', value) &&
      !getOr(false, 'options.noStageAttribute', value)
  ),
  // Get UIDs
  keys,
  filter((uid) => !RW_EXCLUDED_CONTENT_TYPES.includes(uid)),
]);

const hasStageAttribute = has(['attributes', ENTITY_STAGE_ATTRIBUTE]);

const getWorkflowContentTypeFilter = ({ strapi }, contentType) => {
  if (strapi.db.dialect.supportsOperator('$jsonSupersetOf')) {
    return { $jsonSupersetOf: JSON.stringify([contentType]) };
  }
  return { $contains: `"${contentType}"` };
};

const clampMaxWorkflows = clamp(1, MAX_WORKFLOWS);
const clampMaxStagesPerWorkflow = clamp(1, MAX_STAGES_PER_WORKFLOW);

module.exports = {
  clampMaxWorkflows,
  clampMaxStagesPerWorkflow,
  getVisibleContentTypesUID,
  hasStageAttribute,
  getWorkflowContentTypeFilter,
};
