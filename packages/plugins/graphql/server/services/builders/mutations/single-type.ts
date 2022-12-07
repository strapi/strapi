import { StrapiCTX } from '../../../types/strapi-ctx';
import { omit, isNil } from 'lodash/fp';
import utils from '@strapi/utils';
import { builder } from '../pothosBuilder';
import { ContentType } from '../../../types/schema';

const { sanitize } = utils;
const { NotFoundError } = utils.errors;

export default ({ strapi }: StrapiCTX) => {
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

  const addUpdateMutation = (t: any, contentType: ContentType) => {
    const { uid } = contentType;

    const responseTypeName = getEntityResponseName(contentType);

    return t.field({
      type: responseTypeName,

      args: {
        // Update payload
        data: t.arg({ type: getContentTypeInputName(contentType), required: true }),
      },

      async resolve(parent: any, args: any, context: any) {
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

        const findParams = omit(['data', 'files'], transformedArgs);
        const entity = await strapi.entityService.findMany(uid, { params: findParams });

        // Create or update
        const value = isNil(entity)
          ? create(parent, transformedArgs)
          : update(uid, { id: entity.id, data: transformedArgs.data });

        return toEntityResponse(value, { args: transformedArgs, resourceUID: uid });
      },
    });
  };

  const addDeleteMutation = (t: any, contentType: ContentType) => {
    const { uid } = contentType;

    const responseTypeName = getEntityResponseName(contentType);

    return t.field({
      type: responseTypeName,

      args: {},

      async resolve(parent: any, args: any) {
        const transformedArgs = transformArgs(args, { contentType });

        const { delete: deleteResolver } = getService('builders')
          .get('content-api')
          .buildMutationsResolvers({ contentType });

        const entity = await strapi.entityService.findMany(uid, { params: transformedArgs });

        if (!entity) {
          throw new NotFoundError('Entity not found');
        }

        const value = await deleteResolver(parent, { id: entity.id, params: transformedArgs });

        return toEntityResponse(value, { args: transformedArgs, resourceUID: uid });
      },
    });
  };

  return {
    buildSingleTypeMutations(contentType: any) {
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

      return builder.mutationFields((t) => {
        const fieldsObj: any = {};

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
