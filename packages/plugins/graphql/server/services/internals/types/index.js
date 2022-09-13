'use strict';

const pagination = require('./pagination');
const buildResponseCollectionMeta = require('./response-collection-meta');
const publicationState = require('./publication-state');
const filters = require('./filters');
const error = require('./error');

module.exports = (context) => () => {
  const { strapi } = context;

  const { KINDS } = strapi.plugin('graphql').service('constants');

  return {
    [KINDS.internal]: {
      error: error(context),
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
