'use strict';

const { parseMultipartData, sanitizeEntity } = require('@strapi/utils');

const createSingleTypeController = require('./single-type');
const createCollectionTypeController = require('./collection-type');

module.exports = ({ service, model }) => {
  const ctx = {
    model,
    service,
    parseMultipartData,
    sanitize(data) {
      return sanitizeEntity(data, { model: strapi.getModel(model.uid) });
    },
  };

  if (model.kind === 'singleType') {
    return createSingleTypeController(ctx);
  }

  return createCollectionTypeController(ctx);
};
