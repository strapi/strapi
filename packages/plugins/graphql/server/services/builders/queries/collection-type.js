'use strict';

const { builder } = require('../pothosBuilder');

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

    return builder.queryFields((t) => {
      const fieldsObj = {};

      if (isFindOneEnabled) {
        fieldsObj[getFindOneQueryName(contentType)] = addFindOneQuery(t, contentType);
      }

      if (isFindEnabled) {
        fieldsObj[getFindQueryName(contentType)] = addFindQuery(t, contentType);
      }

      return fieldsObj;
    });
  };

  /**
   * Register a "find one" query field to the nexus type definition
   * @param {OutputDefinitionBlock<Query>} t
   * @param contentType
   */
  const addFindOneQuery = (t, contentType) => {
    const { uid } = contentType;

    const responseTypeName = getEntityResponseName(contentType);

    return t.field({
      type: responseTypeName,

      args: getContentTypeArgs(contentType, t, { multiple: false }),

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

    const responseCollectionTypeName = getEntityResponseCollectionName(contentType);

    return t.field({
      type: responseCollectionTypeName,

      args: getContentTypeArgs(contentType, t),

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
