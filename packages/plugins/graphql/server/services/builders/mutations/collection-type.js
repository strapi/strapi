'use strict';

const { extendType, nonNull } = require('nexus');
const { sanitize } = require('@strapi/utils');

module.exports = ({ strapi }) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { transformArgs } = getService('builders').utils;
  const { toEntityResponse } = getService('format').returnTypes;

  const {
    getCreateMutationTypeName,
    getUpdateMutationTypeName,
    getDeleteMutationTypeName,
    getEntityResponseName,
    getContentTypeInputName,
  } = naming;

  const addCreateMutation = (t, contentType) => {
    const { uid } = contentType;

    const createMutationName = getCreateMutationTypeName(contentType);
    const responseTypeName = getEntityResponseName(contentType);

    t.field(createMutationName, {
      type: responseTypeName,

      args: {
        // Create payload
        data: nonNull(getContentTypeInputName(contentType)),
      },

      async resolve(parent, args, context) {
        const { auth } = context.state;
        const transformedArgs = transformArgs(args, { contentType });

        // Sanitize input data
        const sanitizedInputData = await sanitize.contentAPI.input(
          transformedArgs.data,
          contentType,
          { auth }
        );

        Object.assign(transformedArgs, { data: sanitizedInputData });

        const { create } = getService('builders')
          .get('content-api')
          .buildMutationsResolvers({ contentType });

        const value = await create(parent, transformedArgs);

        return toEntityResponse(value, { args: transformedArgs, resourceUID: uid });
      },
    });
  };

  const addUpdateMutation = (t, contentType) => {
    const { uid } = contentType;

    const updateMutationName = getUpdateMutationTypeName(contentType);
    const responseTypeName = getEntityResponseName(contentType);

    // todo[v4]: Don't allow to filter using every unique attributes for now
    // Only authorize filtering using unique scalar fields for updateOne queries
    // const uniqueAttributes = getUniqueAttributesFiltersMap(attributes);

    t.field(updateMutationName, {
      type: responseTypeName,

      args: {
        // Query args
        id: nonNull('ID'),
        // todo[v4]: Don't allow to filter using every unique attributes for now
        // ...uniqueAttributes,

        // Update payload
        data: nonNull(getContentTypeInputName(contentType)),
      },

      async resolve(parent, args, context) {
        const { auth } = context.state;
        const transformedArgs = transformArgs(args, { contentType });

        // Sanitize input data
        const sanitizedInputData = await sanitize.contentAPI.input(
          transformedArgs.data,
          contentType,
          { auth }
        );

        Object.assign(transformedArgs, { data: sanitizedInputData });

        const { update } = getService('builders')
          .get('content-api')
          .buildMutationsResolvers({ contentType });

        const value = await update(parent, transformedArgs);

        return toEntityResponse(value, { args: transformedArgs, resourceUID: uid });
      },
    });
  };

  const addDeleteMutation = (t, contentType) => {
    const { uid } = contentType;

    const deleteMutationName = getDeleteMutationTypeName(contentType);
    const responseTypeName = getEntityResponseName(contentType);

    // todo[v4]: Don't allow to filter using every unique attributes for now
    // Only authorize filtering using unique scalar fields for updateOne queries
    // const uniqueAttributes = getUniqueAttributesFiltersMap(attributes);

    t.field(deleteMutationName, {
      type: responseTypeName,

      args: {
        // Query args
        id: nonNull('ID'),
        // todo[v4]: Don't allow to filter using every unique attributes for now
        // ...uniqueAttributes,
      },

      async resolve(parent, args, ctx) {
        const transformedArgs = transformArgs(args, { contentType });

        const { delete: deleteResolver } = getService('builders')
          .get('content-api')
          .buildMutationsResolvers({ contentType });

        const value = await deleteResolver(parent, args, ctx);

        return toEntityResponse(value, { args: transformedArgs, resourceUID: uid });
      },
    });
  };

  return {
    buildCollectionTypeMutations(contentType) {
      const createMutationName = `Mutation.${getCreateMutationTypeName(contentType)}`;
      const updateMutationName = `Mutation.${getUpdateMutationTypeName(contentType)}`;
      const deleteMutationName = `Mutation.${getDeleteMutationTypeName(contentType)}`;

      const extension = getService('extension');

      const registerAuthConfig = (action, auth) => {
        return extension.use({ resolversConfig: { [action]: { auth } } });
      };

      const isActionEnabled = (action) => {
        return extension.shadowCRUD(contentType.uid).isActionEnabled(action);
      };

      const isCreateEnabled = isActionEnabled('create');
      const isUpdateEnabled = isActionEnabled('update');
      const isDeleteEnabled = isActionEnabled('delete');

      if (isCreateEnabled) {
        registerAuthConfig(createMutationName, { scope: [`${contentType.uid}.create`] });
      }

      if (isUpdateEnabled) {
        registerAuthConfig(updateMutationName, { scope: [`${contentType.uid}.update`] });
      }

      if (isDeleteEnabled) {
        registerAuthConfig(deleteMutationName, { scope: [`${contentType.uid}.delete`] });
      }

      return extendType({
        type: 'Mutation',

        definition(t) {
          if (isCreateEnabled) {
            addCreateMutation(t, contentType);
          }

          if (isUpdateEnabled) {
            addUpdateMutation(t, contentType);
          }

          if (isDeleteEnabled) {
            addDeleteMutation(t, contentType);
          }
        },
      });
    },
  };
};
