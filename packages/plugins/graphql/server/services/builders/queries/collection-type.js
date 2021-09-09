'use strict';

const { extendType } = require('nexus');

const { actionExists } = require('../../old/utils');

module.exports = ({ strapi }) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { transformArgs, getContentTypeArgs } = getService('builders').utils;

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

    t.field(findOneQueryName, {
      type: responseTypeName,

      args: getContentTypeArgs(contentType, { multiple: false }),

      async resolve(parent, args) {
        const transformedArgs = transformArgs(args, { contentType });

        const { findOne } = getService('builders')
          .get('content-api')
          .buildQueriesResolvers({ contentType });

        const value = findOne(parent, transformedArgs);

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

      async resolve(parent, args) {
        const transformedArgs = transformArgs(args, { contentType, usePagination: true });

        const { find } = getService('builders')
          .get('content-api')
          .buildQueriesResolvers({ contentType });

        const nodes = find(parent, transformedArgs);

        return { nodes, info: { args: transformedArgs, resourceUID: uid } };
      },
    });
  };

  return { buildCollectionTypeQueries };
};
