'use strict';

const { extendType } = require('nexus');

const { actionExists } = require('../../old/utils');

module.exports = ({ strapi }) => {
  const { naming } = strapi.plugin('graphql').service('utils');
  const { transformArgs, getContentTypeArgs } = strapi.plugin('graphql').service('builders').utils;

  const {
    getFindOneQueryName,
    getEntityResponseName,
    getFindQueryName,
    getEntityResponseCollectionName,
  } = naming;

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

    const findOneQueryName = getFindOneQueryName(contentType);
    const responseTypeName = getEntityResponseName(contentType);

    // If the action doesn't exist, return early and don't add the query
    if (!actionExists({ resolver: `${uid}.findOne` })) {
      return;
    }

    t.field(findOneQueryName, {
      type: responseTypeName,

      args: getContentTypeArgs(contentType, { multiple: false }),

      async resolve(source, args) {
        const transformedArgs = transformArgs(args, { contentType });

        const { findOne } = strapi
          .plugin('graphql')
          .service('builders')
          .get('content-api')
          .buildQueriesResolvers({ contentType });

        const value = findOne(source, transformedArgs);

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

    const findQueryName = getFindQueryName(contentType);
    const responseCollectionTypeName = getEntityResponseCollectionName(contentType);

    // If the action doesn't exist, return early and don't add the query
    if (!actionExists({ resolver: `${uid}.find` })) {
      return;
    }

    t.field(findQueryName, {
      type: responseCollectionTypeName,

      args: getContentTypeArgs(contentType),

      async resolve(source, args) {
        const transformedArgs = transformArgs(args, { contentType, usePagination: true });

        const { find } = strapi
          .plugin('graphql')
          .service('builders')
          .get('content-api')
          .buildQueriesResolvers({ contentType });

        const nodes = find(source, transformedArgs);

        return { nodes, info: { args: transformedArgs, resourceUID: uid } };
      },
    });
  };

  return { buildCollectionTypeQueries };
};
