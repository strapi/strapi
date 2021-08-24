'use strict';

const { extendType } = require('nexus');

const { actionExists } = require('../../old/utils');
const { toSingular } = require('../../old/naming');
const { buildMutation } = require('../../old/resolvers-builder');

module.exports = ({ strapi }) => {
  const { naming } = strapi.plugin('graphql').service('utils');

  const {
    getUpdateMutationTypeName,
    getEntityResponseName,
    getContentTypeInputName,
    getDeleteMutationTypeName,
  } = naming;

  const addUpdateMutation = (t, contentType) => {
    const { uid, modelName } = contentType;

    const updateMutationName = getUpdateMutationTypeName(contentType);
    const responseTypeName = getEntityResponseName(contentType);

    const resolverOptions = { resolver: `${uid}.update` };

    // If the action doesn't exist, return early and don't add the mutation
    if (!actionExists(resolverOptions)) {
      return;
    }

    const resolver = buildMutation(toSingular(modelName), resolverOptions);

    t.field(updateMutationName, {
      type: responseTypeName,

      args: {
        // Update payload
        data: getContentTypeInputName(contentType),
      },

      async resolve(parent, args, context, info) {
        // const query = mappers.graphQLFiltersToStrapiQuery(args.params, contentType);

        const res = await resolver(parent, args, context, info);

        return { data: { id: res.id, attributes: res } };
      },
    });
  };

  const addDeleteMutation = (t, contentType) => {
    const { uid, modelName } = contentType;

    const deleteMutationName = getDeleteMutationTypeName(contentType);
    const responseTypeName = getEntityResponseName(contentType);

    const resolverOptions = { resolver: `${uid}.delete` };

    // If the action doesn't exist, return early and don't add the mutation
    if (!actionExists(resolverOptions)) {
      return;
    }

    const resolver = buildMutation(toSingular(modelName), resolverOptions);

    t.field(deleteMutationName, {
      type: responseTypeName,

      args: {},

      async resolve(parent, args, context, info) {
        // const query = mappers.graphQLFiltersToStrapiQuery(args.params, contentType);

        const res = await resolver(parent, args, context, info);

        return { data: { id: res.id, attributes: res } };
      },
    });
  };

  return {
    buildSingleTypeMutations(contentType) {
      return extendType({
        type: 'Mutation',

        definition(t) {
          addUpdateMutation(t, contentType);
          addDeleteMutation(t, contentType);
        },
      });
    },
  };
};
