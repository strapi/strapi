'use strict';

const { sanitize } = require('@strapi/utils');
const { builder } = require('../pothosBuilder');

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

    const responseTypeName = getEntityResponseName(contentType);

    return t.field({
      type: responseTypeName,

      args: {
        // Create payload
        data: t.arg({ type: getContentTypeInputName(contentType), nullable: false }),
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

    const responseTypeName = getEntityResponseName(contentType);

    // todo[v4]: Don't allow to filter using every unique attributes for now
    // Only authorize filtering using unique scalar fields for updateOne queries
    // const uniqueAttributes = getUniqueAttributesFiltersMap(attributes);

    return t.field({
      type: responseTypeName,

      args: {
        // Query args
        id: t.arg({ type: 'ID', requires: true }),
        // todo[v4]: Don't allow to filter using every unique attributes for now
        // ...uniqueAttributes,

        // Update payload
        data: t.arg({ type: getContentTypeInputName(contentType), nullable: false }),
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

    const responseTypeName = getEntityResponseName(contentType);

    // todo[v4]: Don't allow to filter using every unique attributes for now
    // Only authorize filtering using unique scalar fields for updateOne queries
    // const uniqueAttributes = getUniqueAttributesFiltersMap(attributes);

    return t.field({
      type: responseTypeName,

      args: {
        // Query args
        id: t.arg({ type: 'ID', required: false }),
        // todo[v4]: Don't allow to filter using every unique attributes for now
        // ...uniqueAttributes,
      },

      async resolve(parent, args) {
        const transformedArgs = transformArgs(args, { contentType });

        const { delete: deleteResolver } = getService('builders')
          .get('content-api')
          .buildMutationsResolvers({ contentType });

        const value = await deleteResolver(parent, args);

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

      return builder.mutationFields((t) => {
        const fieldsObj = {};

        if (isCreateEnabled) {
          fieldsObj[getCreateMutationTypeName(contentType)] = addCreateMutation(t, contentType);
        }

        if (isUpdateEnabled) {
          fieldsObj[getUpdateMutationTypeName(contentType)] = addUpdateMutation(t, contentType);
        }

        if (isDeleteEnabled) {
          fieldsObj[getDeleteMutationTypeName(contentType)] = addDeleteMutation(t, contentType);
        }

        return fieldsObj;
      });
    },
  };
};
