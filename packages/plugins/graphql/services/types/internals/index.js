'use strict';

const { KINDS } = require('../constants');

const pagination = require('./pagination');
const buildResponseCollectionMeta = require('./response-collection-meta');
const publicationState = require('./publication-state');
const filters = require('./filters');

module.exports = ({ strapi }) => ({
  [KINDS.internal]: {
    pagination,
    responseCollectionMeta: buildResponseCollectionMeta({ strapi }),
  },

  [KINDS.enum]: {
    publicationState,
  },

  [KINDS.filtersInput]: {
    ...filters,
  },
});
