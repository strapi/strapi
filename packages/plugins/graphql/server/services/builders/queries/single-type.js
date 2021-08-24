'use strict';

const { extendType } = require('nexus');

const { actionExists } = require('../../old/utils');
const { transformArgs } = require('../utils');
const { args, utils } = require('../../types');

module.exports = ({ strapi }) => {
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

    const findQueryName = utils.getFindOneQueryName(contentType);
    const responseTypeName = utils.getEntityResponseName(contentType);

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
