'use strict';

const createCollectionTypeQueriesBuilder = require('./collection-type');
const createSingleTypeQueriesBuilder = require('./single-type');

module.exports = (context) => ({
  ...createCollectionTypeQueriesBuilder(context),
  ...createSingleTypeQueriesBuilder(context),
});
