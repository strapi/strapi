'use strict';

const { extendType } = require('nexus');
const { pipe } = require('lodash/fp');

const { actionExists } = require('../../../old/utils');
const { utils, args } = require('../../../types');
const {
  getUniqueScalarAttributes,
  scalarAttributesToFiltersMap,
  transformArgs,
} = require('../utils');
const { buildQueriesResolvers } = require('../../resolvers');

const getUniqueAttributesFiltersMap = pipe(getUniqueScalarAttributes, scalarAttributesToFiltersMap);

module.exports = ({ strapi }) => {
  const buildCollectionTypeQueries = contentType => {
    return extendType({
      type: 'Query',

      definition(t) {
        addFindOneQuery(t, contentType);
        addFindQuery(t, contentType);
      },
    });
  };

  /**
   * Register a "find one" query field to the nexus type definition
   * @param {OutputDefinitionBlock<Query>} t
   * @param contentType
   */
  const addFindOneQuery = (t, contentType) => {
    const { uid, attributes } = contentType;

    const findOneQueryName = utils.getFindOneQueryName(contentType);
    const responseTypeName = utils.getEntityResponseName(contentType);

    // If the action doesn't exist, return early and don't add the query
    if (!actionExists({ resolver: `${uid}.findOne` })) {
      return;
    }

    // Only authorize filtering using unique scalar fields for findOne queries
    const uniqueAttributes = getUniqueAttributesFiltersMap(attributes);

    t.field(findOneQueryName, {
      type: responseTypeName,

      args: {
        id: utils.getScalarFilterInputTypeName('ID'),
        ...uniqueAttributes,
      },

      async resolve(source, args) {
        const transformedArgs = transformArgs(args, { contentType });

        const value = buildQueriesResolvers({ contentType, strapi }).findOne(
          source,
          transformedArgs
        );

        return { value, info: { args: transformedArgs, resourceUID: uid } };
      },
    });
  };

  /**
   * Register a "find" query field to the nexus type definition
   * @param {OutputDefinitionBlock<Query>} t
   * @param contentType
   */
  const addFindQuery = (t, contentType) => {
    const { uid } = contentType;

    const findQueryName = utils.getFindQueryName(contentType);
    const responseCollectionTypeName = utils.getEntityResponseCollectionName(contentType);

    // If the action doesn't exist, return early and don't add the query
    if (!actionExists({ resolver: `${uid}.find` })) {
      return;
    }

    t.field(findQueryName, {
      type: responseCollectionTypeName,

      args: {
        publicationState: args.PublicationStateArg,
        // todo[v4]: to add through i18n plugin
        locale: 'String',
        sort: args.SortArg,
        pagination: args.PaginationArg,
        filters: utils.getFiltersInputTypeName(contentType),
      },

      async resolve(source, args) {
        const transformedArgs = transformArgs(args, { contentType, usePagination: true });

        const nodes = buildQueriesResolvers({ contentType, strapi }).find(source, transformedArgs);

        return { nodes, info: { args: transformedArgs, resourceUID: uid } };
      },
    });
  };

  return { buildCollectionTypeQueries };
};
