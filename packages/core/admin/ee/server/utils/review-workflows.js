'use strict';

const { getOr, keys, pickBy, pipe, has } = require('lodash/fp');
const { ENTITY_STAGE_ATTRIBUTE } = require('../constants/workflows');

const getVisibleContentTypesUID = pipe([
  // Pick only content-types visible in the content-manager
  pickBy(getOr(true, 'pluginOptions.content-manager.visible')),
  // Get UIDs
  keys,
]);

const hasStageAttribute = has(['attributes', ENTITY_STAGE_ATTRIBUTE]);

module.exports = {
  getVisibleContentTypesUID,
  hasStageAttribute,
};
