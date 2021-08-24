'use strict';

const pagination = require('./pagination');
const buildResponseCollectionMeta = require('./response-collection-meta');
const publicationState = require('./publication-state');
const filters = require('./filters');

module.exports = context => () => {
  const { strapi } = context;

  const { KINDS } = strapi.plugin('graphql').service('constants');

  return {
    [KINDS.internal]: {
      pagination: pagination(context),
      responseCollectionMeta: buildResponseCollectionMeta(context),
    },

    [KINDS.enum]: {
      publicationState: publicationState(context),
    },

    [KINDS.filtersInput]: {
      ...filters(context),
    },
  };
};
