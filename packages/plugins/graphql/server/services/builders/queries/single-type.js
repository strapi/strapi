'use strict';

const { extendType } = require('nexus');

module.exports = ({ strapi }) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { transformArgs, getContentTypeArgs } = getService('builders').utils;
  const { toEntityResponse } = getService('format').returnTypes;

  const { getFindOneQueryName, getEntityResponseName } = naming;

  const buildSingleTypeQueries = (contentType) => {
    const findQueryName = `Query.${getFindOneQueryName(contentType)}`;

    const extension = getService('extension');

    const registerAuthConfig = (action, auth) => {
      return extension.use({ resolversConfig: { [action]: { auth } } });
    };

    const isActionEnabled = (action) => {
      return extension.shadowCRUD(contentType.uid).isActionEnabled(action);
    };

    const isFindEnabled = isActionEnabled('find');

    if (isFindEnabled) {
      registerAuthConfig(findQueryName, { scope: [`${contentType.uid}.find`] });
    }

    return extendType({
      type: 'Query',

      definition(t) {
        if (isFindEnabled) {
          addFindQuery(t, contentType);
        }
      },
    });
  };

  const addFindQuery = (t, contentType) => {
    const { uid } = contentType;

    const findQueryName = getFindOneQueryName(contentType);
    const responseTypeName = getEntityResponseName(contentType);

    t.field(findQueryName, {
      type: responseTypeName,

      args: getContentTypeArgs(contentType),

      async resolve(parent, args) {
        const transformedArgs = transformArgs(args, { contentType });

        const queriesResolvers = getService('builders')
          .get('content-api')
          .buildQueriesResolvers({ contentType });

        const value = queriesResolvers.find(parent, transformedArgs);

        return toEntityResponse(value, { args: transformedArgs, resourceUID: uid });
      },
    });
  };

  return { buildSingleTypeQueries };
};
