'use strict';

const pagination = require('./pagination');
const buildResponseCollectionMeta = require('./response-collection-meta');
const publicationState = require('./publication-state');
const filters = require('./filters');

module.exports = ({ strapi }) => ({
  internals: {
    pagination,
    responseCollectionMeta: buildResponseCollectionMeta({ strapi }),
  },

  enums: {
    publicationState,
  },

  ['filters-inputs']: {
    ...filters,
  },
});
