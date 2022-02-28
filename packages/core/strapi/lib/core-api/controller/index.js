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

    sanitizeOutput(data, ctx) {
      const auth = getAuthFromKoaContext(ctx);

      return sanitize.contentAPI.output(data, contentType, { auth });
    },

    sanitizeInput(data, ctx) {
      const auth = getAuthFromKoaContext(ctx);

      return sanitize.contentAPI.input(data, contentType, { auth });
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
