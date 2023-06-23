'use strict';

const { getOr, keys, pickBy, pipe, has } = require('lodash/fp');
const { ENTITY_STAGE_ATTRIBUTE } = require('../constants/workflows');

const getVisibleContentTypesUID = pipe([
  // Pick only content-types visible in the content-manager and option is not false
  pickBy(
    (value) =>
      getOr(true, 'pluginOptions.content-manager.visible', value) &&
      !getOr(false, 'options.noStageAttribute', value)
  ),
  // Get UIDs
  keys,
]);

const hasStageAttribute = has(['attributes', ENTITY_STAGE_ATTRIBUTE]);

const getWorkflowContentTypeFilter = ({ strapi }, contentType) => {
  if (strapi.db.dialect.supportsOperator('$jsonSupersetOf')) {
    return { $jsonSupersetOf: JSON.stringify([contentType]) };
  }
  return { $contains: `"${contentType}"` };
};

module.exports = {
  getVisibleContentTypesUID,
  hasStageAttribute,
  getWorkflowContentTypeFilter,
};
