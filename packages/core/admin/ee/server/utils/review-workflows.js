'use strict';

const { get, keys, pickBy, pipe } = require('lodash/fp');

const getVisibleContentTypesUID = pipe([
  // FIXME: Swap with the commented line below when figure out how to shorten strapi_reviewWorkflows_stage
  pickBy(get('options.reviewWorkflows')),
  // Pick only content-types visible in the content-manager
  // pickBy(getOr(true, 'pluginOptions.content-manager.visible')),
  // Get UIDs
  keys,
]);

module.exports = {
  getVisibleContentTypesUID,
};
