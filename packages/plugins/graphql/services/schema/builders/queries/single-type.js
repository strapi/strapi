'use strict';

const { extendType } = require('nexus');
const { omit } = require('lodash/fp');

const { actionExists } = require('../../../old/utils');
const { buildQueriesResolvers } = require('../../resolvers');

const { args, utils, mappers } = require('../../../types');

const { graphQLFiltersToStrapiQuery } = mappers;

// todo[v4]: unify & move elsewhere
const transformArgs = (args, contentType) => {
  return {
    ...omit(['pagination', 'filters'], args),
    ...args.pagination,
    where: graphQLFiltersToStrapiQuery(args.filters, contentType),
  };
};

module.exports = () => {
  const buildSingleTypeQueries = contentType => {
    return extendType({
      type: 'Query',

      definition(t) {
        addFindQuery(t, contentType);
      },
    });
  };

  const addFindQuery = (t, contentType) => {
    const { uid } = contentType;

    const findQueryName = utils.getFindOneQueryName(contentType);
    const responseTypeName = utils.getEntityResponseName(contentType);

    if (!actionExists({ resolver: `${uid}.find` })) {
      return;
    }

    t.field(findQueryName, {
      type: responseTypeName,

      args: {
        publicationState: args.PublicationStateArg,
      },

      async resolve(source, args) {
        const transformedArgs = transformArgs(args, { contentType });

        const value = buildQueriesResolvers({ contentType, strapi }).find();

        return { value, info: { args: transformedArgs, resourceUID: uid } };
      },
    });
  };

  return { buildSingleTypeQueries };
};
