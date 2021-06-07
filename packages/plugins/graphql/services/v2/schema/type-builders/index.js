'use strict';

const contentTypes = require('./content-types');
const contentTypesQueries = require('./content-types-queries');

module.exports = {
  ...contentTypes,
  ...contentTypesQueries,
};
