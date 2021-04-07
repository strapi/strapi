'use strict';

const { createAsyncSeriesWaterfallHook } = require('strapi-utils').hooks;

module.exports = {
  createQuery: createAsyncSeriesWaterfallHook(),
  createMutation: createAsyncSeriesWaterfallHook(),
};
