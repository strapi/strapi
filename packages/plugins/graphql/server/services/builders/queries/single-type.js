'use strict';

const { extendType } = require('nexus');

const { actionExists } = require('../../old/utils');

module.exports = ({ strapi }) => {
  const { naming } = strapi.plugin('graphql').service('utils');
  const { args } = strapi.plugin('graphql').service('internals');
  const { transformArgs } = strapi.plugin('graphql').service('builders').utils;

  const { getFindOneQueryName, getEntityResponseName } = naming;

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

    const findQueryName = getFindOneQueryName(contentType);
    const responseTypeName = getEntityResponseName(contentType);

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

        const queriesResolvers = strapi
          .plugin('graphql')
          .service('builders')
          .get('content-api')
          .buildQueriesResolvers({ contentType });

        const value = queriesResolvers.find();

        return { value, info: { args: transformedArgs, resourceUID: uid } };
      },
    });
  };

  return { buildSingleTypeQueries };
};
