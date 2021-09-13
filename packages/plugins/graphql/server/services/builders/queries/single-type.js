'use strict';

const { extendType } = require('nexus');

module.exports = ({ strapi }) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { transformArgs, getContentTypeArgs } = getService('builders').utils;

  const { getFindOneQueryName, getEntityResponseName } = naming;

  const buildSingleTypeQueries = contentType => {
    getService('extension')
      .for('content-api')
      .use(() => ({
        resolversConfig: {
          [`Query.${getFindOneQueryName(contentType)}`]: {
            auth: {
              scope: [`${contentType.uid}.findOne`],
            },
          },
        },
      }));

    return extendType({
      type: 'Query',

      definition(t) {
        addFindQuery(t, contentType);
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

        return { value, info: { args: transformedArgs, resourceUID: uid } };
      },
    });
  };

  return { buildSingleTypeQueries };
};
