'use strict';

const { extendType } = require('nexus');

module.exports = ({ strapi }) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { transformArgs, getContentTypeArgs } = getService('builders').utils;
  const { toEntityResponse, toEntityResponseCollection } = getService('format').returnTypes;

  const {
    getFindOneQueryName,
    getEntityResponseName,
    getFindQueryName,
    getEntityResponseCollectionName,
  } = naming;

  const buildCollectionTypeQueries = (contentType) => {
    const findOneQueryName = `Query.${getFindOneQueryName(contentType)}`;
    const findQueryName = `Query.${getFindQueryName(contentType)}`;

    const extension = getService('extension');

    const registerAuthConfig = (action, auth) => {
      return extension.use({ resolversConfig: { [action]: { auth } } });
    };

    const isActionEnabled = (action) => {
      return extension.shadowCRUD(contentType.uid).isActionEnabled(action);
    };

    const isFindOneEnabled = isActionEnabled('findOne');
    const isFindEnabled = isActionEnabled('find');

    if (isFindOneEnabled) {
      registerAuthConfig(findOneQueryName, { scope: [`${contentType.uid}.findOne`] });
    }

    if (isFindEnabled) {
      registerAuthConfig(findQueryName, { scope: [`${contentType.uid}.find`] });
    }

    return extendType({
      type: 'Query',

      definition(t) {
        if (isFindOneEnabled) {
          addFindOneQuery(t, contentType);
        }

        if (isFindEnabled) {
          addFindQuery(t, contentType);
        }
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

        return toEntityResponse(value, { args: transformedArgs, resourceUID: uid });
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

    t.field(findQueryName, {
      type: responseCollectionTypeName,

      args: getContentTypeArgs(contentType),

      async resolve(parent, args) {
        const transformedArgs = transformArgs(args, { contentType, usePagination: true });

        const { find } = getService('builders')
          .get('content-api')
          .buildQueriesResolvers({ contentType });

        const nodes = await find(parent, transformedArgs);

        return toEntityResponseCollection(nodes, { args: transformedArgs, resourceUID: uid });
      },
    });
  };

  return { buildCollectionTypeQueries };
};
