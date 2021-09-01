'use strict';

const { extendType } = require('nexus');

const { actionExists } = require('../../old/utils');

module.exports = ({ strapi }) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { args } = getService('internals');
  const { transformArgs } = getService('builders').utils;

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
