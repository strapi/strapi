'use strict';

const { getOr, keys, pickBy, pipe } = require('lodash/fp');

const getVisibleContentTypesUID = pipe([
  // Pick only content-types visible in the content-manager
  pickBy(getOr(true, 'pluginOptions.content-manager.visible')),
  // Get UIDs
  keys,
]);

module.exports = {
  getVisibleContentTypesUID,
};
