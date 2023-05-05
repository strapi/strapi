'use strict';

const { getOr } = require('lodash/fp');

const { contentTypes, sanitize } = require('@strapi/utils');

const { transformResponse } = require('./transform');
const createSingleTypeController = require('./single-type');
const createCollectionTypeController = require('./collection-type');

const getAuthFromKoaContext = getOr({}, 'state.auth');

const createController = ({ contentType }) => {
  const ctx = { contentType };

  const proto = {
    transformResponse(data, meta) {
      return transformResponse(data, meta, { contentType });
    },

    async sanitizeOutput(data, ctx) {
      const auth = getAuthFromKoaContext(ctx);
      console.log(data)
      const abc = await sanitize.contentAPI.output(data, contentType, { auth });
      console.log(abc)
      return abc
    },

    async sanitizeInput(data, ctx) {
      const auth = getAuthFromKoaContext(ctx);
      console.log(data)
      const abc = await sanitize.contentAPI.input(data, contentType, { auth });
      console.log(abc)
      return abc
    },

    async sanitizeQuery(ctx) {
      const auth = getAuthFromKoaContext(ctx);
      console.log(ctx.query)
      const abc = await sanitize.contentAPI.query(ctx.query, contentType, { auth });
      console.log(abc)
      return abc
    },
  };

  let ctrl;

  if (contentTypes.isSingleType(contentType)) {
    ctrl = createSingleTypeController(ctx);
  } else {
    ctrl = createCollectionTypeController(ctx);
  }

  return Object.assign(Object.create(proto), ctrl);
};

module.exports = { createController };
