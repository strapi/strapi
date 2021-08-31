'use strict';

const { sanitizeEntity, contentTypes } = require('@strapi/utils');

const { transformResponse } = require('./transform');
const createSingleTypeController = require('./single-type');
const createCollectionTypeController = require('./collection-type');

module.exports = ({ service, model }) => {
  const ctx = {
    model,
    service,
    transformResponse(data, meta) {
      return transformResponse(data, meta, { contentType: model });
    },
    sanitize(data) {
      return sanitizeEntity(data, { model: strapi.getModel(model.uid) });
    },
  };

  if (contentTypes.isSingleType(model)) {
    return createSingleTypeController(ctx);
  }

  return createCollectionTypeController(ctx);
};
