import { extendType, nonNull, idArg } from 'nexus';
import type * as Nexus from 'nexus';
import type { Struct } from '@strapi/types';
import type { Context } from '../../types';

export default ({ strapi }: Context) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { args } = getService('internals');

  const {
    getCreateMutationTypeName,
    getUpdateMutationTypeName,
    getDeleteMutationTypeName,
    getContentTypeInputName,
    getTypeName,
  } = naming;

  const addCreateMutation = (
    t: Nexus.blocks.ObjectDefinitionBlock<'Mutation'>,
    contentType: Struct.CollectionTypeSchema
  ) => {
    const { uid } = contentType;

    const createMutationName = getCreateMutationTypeName(contentType);
    const typeName = getTypeName(contentType);

    t.field(createMutationName, {
      type: typeName,

      extensions: {
        strapi: {
          contentType,
        },
      },

      args: {
        // Create payload
        status: args.PublicationStatusArg,
        data: nonNull(getContentTypeInputName(contentType)),
      },

      async resolve(parent, args, context) {
        const { auth } = context.state;

        // Sanitize input data
        const sanitizedInputData = await strapi.contentAPI.sanitize.input(args.data, contentType, {
          auth,
        });

        return strapi.documents!(uid).create({
          ...args,
          data: sanitizedInputData,
        });
      },
    });
  };

  const addUpdateMutation = (
    t: Nexus.blocks.ObjectDefinitionBlock<'Mutation'>,
    contentType: Struct.CollectionTypeSchema
  ) => {
    const { uid } = contentType;

    const updateMutationName = getUpdateMutationTypeName(contentType);
    const typeName = getTypeName(contentType);

    t.field(updateMutationName, {
      type: typeName,

      extensions: {
        strapi: {
          contentType,
        },
      },

      args: {
        documentId: nonNull(idArg()),
        status: args.PublicationStatusArg,
        data: nonNull(getContentTypeInputName(contentType)),
      },

      async resolve(parent, args, context) {
        const { auth } = context.state;

        const { data, ...restParams } = args;

        // Sanitize input data
        const sanitizedInputData = await strapi.contentAPI.sanitize.input(data, contentType, {
          auth,
        });

        return strapi.documents!(uid).update({
          ...restParams,
          data: sanitizedInputData,
        });
      },
    });
  };

  const addDeleteMutation = (
    t: Nexus.blocks.ObjectDefinitionBlock<'Mutation'>,
    contentType: Struct.CollectionTypeSchema
  ) => {
    const { uid } = contentType;

    const deleteMutationName = getDeleteMutationTypeName(contentType);

    const { DELETE_MUTATION_RESPONSE_TYPE_NAME } = strapi.plugin('graphql').service('constants');

    t.field(deleteMutationName, {
      type: DELETE_MUTATION_RESPONSE_TYPE_NAME,

      extensions: {
        strapi: {
          contentType,
        },
      },

      args: {
        documentId: nonNull(idArg()),
      },

      async resolve(parent, args) {
        const { documentId } = args;

        await strapi.documents!(uid).delete({ documentId });

        return { documentId };
      },
    });
  };

  return {
    buildCollectionTypeMutations(contentType: Struct.CollectionTypeSchema) {
      const createMutationName = `Mutation.${getCreateMutationTypeName(contentType)}`;
      const updateMutationName = `Mutation.${getUpdateMutationTypeName(contentType)}`;
      const deleteMutationName = `Mutation.${getDeleteMutationTypeName(contentType)}`;

      const extension = getService('extension');

      const registerAuthConfig = (action: string, auth: any) => {
        return extension.use({ resolversConfig: { [action]: { auth } } });
      };

      const isActionEnabled = (action: string) => {
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
