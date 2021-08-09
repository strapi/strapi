'use strict';

const { extendType } = require('nexus');

const { actionExists } = require('../../../old/utils');
const { utils } = require('../../../types');
const { transformArgs, getContentTypeArgs } = require('../utils');
const { buildQueriesResolvers } = require('../../resolvers');

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
    const { uid } = contentType;

    const findOneQueryName = utils.getFindOneQueryName(contentType);
    const responseTypeName = utils.getEntityResponseName(contentType);

    // If the action doesn't exist, return early and don't add the query
    if (!actionExists({ resolver: `${uid}.findOne` })) {
      return;
    }

    t.field(findOneQueryName, {
      type: responseTypeName,

      args: getContentTypeArgs(contentType, { multiple: false }),

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

      args: getContentTypeArgs(contentType),

      async resolve(source, args) {
        const transformedArgs = transformArgs(args, { contentType, usePagination: true });

        const nodes = buildQueriesResolvers({ contentType, strapi }).find(source, transformedArgs);

        return { nodes, info: { args: transformedArgs, resourceUID: uid } };
      },
    });
  };

  return { buildCollectionTypeQueries };
};
