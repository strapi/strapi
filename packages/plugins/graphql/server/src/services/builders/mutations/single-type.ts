import { extendType, nonNull } from 'nexus';
import { omit, isNil } from 'lodash/fp';
import { sanitize, validate, errors } from '@strapi/utils';
import type * as Nexus from 'nexus';
import type { Schema } from '@strapi/types';
import type { Context } from '../../types';

const { NotFoundError } = errors;

export default ({ strapi }: Context) => {
  const { service: getService } = strapi.plugin('graphql');

  const { naming } = getService('utils');
  const { transformArgs } = getService('builders').utils;
  const { toEntityResponse } = getService('format').returnTypes;

  const {
    getUpdateMutationTypeName,
    getEntityResponseName,
    getContentTypeInputName,
    getDeleteMutationTypeName,
  } = naming;

  const addUpdateMutation = (
    t: Nexus.blocks.ObjectDefinitionBlock<'Mutation'>,
    contentType: Schema.SingleType
  ) => {
    const { uid } = contentType;

    const updateMutationName = getUpdateMutationTypeName(contentType);
    const responseTypeName = getEntityResponseName(contentType);

    t.field(updateMutationName, {
      type: responseTypeName,

      args: {
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

        const { create, update } = getService('builders')
          .get('content-api')
          .buildMutationsResolvers({ contentType });

        // For single types, the validation and sanitization of args is done here instead of being
        // delegated to the query builders since we're calling the entity service directly

        await validate.contentAPI.query(omit(['data', 'files'], transformedArgs), contentType, {
          auth,
        });

        const sanitizedQuery = await sanitize.contentAPI.query(
          omit(['data', 'files'], transformedArgs),
          contentType,
          {
            auth,
          }
        );

        const entity = (await strapi.entityService!.findMany(uid, sanitizedQuery)) as any;

        // Create or update
        const value = isNil(entity)
          ? create(parent, transformedArgs)
          : update(uid, { id: entity.id, data: transformedArgs.data });

        return toEntityResponse(value, { args: transformedArgs, resourceUID: uid });
      },
    });
  };

  const addDeleteMutation = (
    t: Nexus.blocks.ObjectDefinitionBlock<'Mutation'>,
    contentType: Schema.SingleType
  ) => {
    const { uid } = contentType;

    const deleteMutationName = getDeleteMutationTypeName(contentType);
    const responseTypeName = getEntityResponseName(contentType);

    t.field(deleteMutationName, {
      type: responseTypeName,

      args: {},

      async resolve(parent, args, ctx) {
        const transformedArgs = transformArgs(args, { contentType });

        const { delete: deleteResolver } = getService('builders')
          .get('content-api')
          .buildMutationsResolvers({ contentType });

        // For single types, the validation and sanitization of args is done here instead of being
        // delegated to the query builders since we're calling the entity service directly

        await validate.contentAPI.query(transformedArgs, contentType, { auth: ctx?.state?.auth });

        const sanitizedQuery = await sanitize.contentAPI.query(transformedArgs, contentType, {
          auth: ctx?.state?.auth,
        });

        const entity = (await strapi.entityService!.findMany(uid, sanitizedQuery)) as any;

        if (!entity) {
          throw new NotFoundError('Entity not found');
        }

        const value = await deleteResolver(parent, { id: entity.id, params: transformedArgs });

        return toEntityResponse(value, { args: transformedArgs, resourceUID: uid });
      },
    });
  };

  return {
    buildSingleTypeMutations(contentType: Schema.SingleType) {
      const updateMutationName = `Mutation.${getUpdateMutationTypeName(contentType)}`;
      const deleteMutationName = `Mutation.${getDeleteMutationTypeName(contentType)}`;

      const extension = getService('extension');

      const registerAuthConfig = (action: string, auth: any) => {
        return extension.use({ resolversConfig: { [action]: { auth } } });
      };

      const isActionEnabled = (action: string) => {
        return extension.shadowCRUD(contentType.uid).isActionEnabled(action);
      };

      const isUpdateEnabled = isActionEnabled('update');
      const isDeleteEnabled = isActionEnabled('delete');

      if (isUpdateEnabled) {
        registerAuthConfig(updateMutationName, { scope: [`${contentType.uid}.update`] });
      }

      if (isDeleteEnabled) {
        registerAuthConfig(deleteMutationName, { scope: [`${contentType.uid}.delete`] });
      }

      return extendType({
        type: 'Mutation',

        definition(t) {
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
