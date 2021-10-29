'use strict';

const { getOr } = require('lodash/fp');

const { contentTypes, sanitize } = require('@strapi/utils');

const { transformResponse } = require('./transform');
const createSingleTypeController = require('./single-type');
const createCollectionTypeController = require('./collection-type');

const getAuthFromKoaContext = getOr({}, 'state.auth');

module.exports = ({ service, model }) => {
  const ctx = {
    model,
    service,

    transformResponse(data, meta) {
      return transformResponse(data, meta, { contentType: model });
    },

    sanitizeOutput(data, ctx) {
      const auth = getAuthFromKoaContext(ctx);

      return sanitize.contentAPI.output(data, strapi.getModel(model.uid), { auth });
    },

    sanitizeInput(data, ctx) {
      const auth = getAuthFromKoaContext(ctx);

      return sanitize.contentAPI.input(data, strapi.getModel(model.uid), { auth });
    },
  };

  if (contentTypes.isSingleType(model)) {
    return createSingleTypeController(ctx);
  }

  return createCollectionTypeController(ctx);
};
