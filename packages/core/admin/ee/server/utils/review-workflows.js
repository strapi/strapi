'use strict';

const { getOr, keys, pickBy, pipe } = require('lodash/fp');
const { WORKFLOW_MODEL_UID } = require('../constants/workflows');

// TODO To be refactored when multiple workflows are added
const getDefaultWorkflow = async ({ strapi }) =>
  strapi.query(WORKFLOW_MODEL_UID).findOne({ populate: ['stages'] });

const getVisibleContentTypesUID = pipe([
  // Pick only content-types visible in the content-manager
  pickBy(getOr(true, 'pluginOptions.content-manager.visible')),
  // Get UIDs
  keys,
]);

module.exports = {
  getDefaultWorkflow,
  getVisibleContentTypesUID,
};
