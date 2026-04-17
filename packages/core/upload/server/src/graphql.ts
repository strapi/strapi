import type { Core } from '@strapi/types';

import { FILE_MODEL_UID } from './constants';

const FILE_INFO_INPUT_TYPE_NAME = 'FileInfoInput';

export const installGraphqlExtension = ({ strapi }: { strapi: Core.Strapi }) => {
  const { service: getGraphQLService, config: graphQLConfig } = strapi.plugin('graphql');
  const { service: getUploadService } = strapi.plugin('upload');

  const isShadowCRUDEnabled = graphQLConfig('shadowCRUD', true);

  if (!isShadowCRUDEnabled) {
    return;
  }

  getGraphQLService('extension').shadowCRUD('plugin::upload.folder').disable();
  getGraphQLService('extension').shadowCRUD('plugin::upload.file').disableMutations();

  const { getTypeName } = getGraphQLService('utils').naming;

  const fileModel = strapi.getModel(FILE_MODEL_UID);
  const fileTypeName = getTypeName(fileModel);

  getGraphQLService('extension').use(({ nexus }: { nexus: any }) => {
    const { inputObjectType, extendType, nonNull } = nexus;

    const fileInfoInputType = inputObjectType({
      name: FILE_INFO_INPUT_TYPE_NAME,
      definition(t: any) {
        t.string('name');
        t.string('alternativeText');
        t.string('caption');
      },
    });

    const mutations = extendType({
      type: 'Mutation',

      definition(t: any) {
        /**
         * Update some information for a given file
         */
        t.field('updateUploadFile', {
          type: nonNull(fileTypeName),

          args: {
            id: 'ID',
            documentId: 'ID',
            info: FILE_INFO_INPUT_TYPE_NAME,
          },

          async resolve(parent: unknown, args: { id?: number; documentId?: string; info: any }) {
            const { id, documentId, info } = args;

            if (!id && !documentId) {
              throw new Error('You must provide either an id or a documentId');
            }

            // Using documentId if available, otherwise falling back to id
            const params = documentId ? { documentId } : { id };
            return getUploadService('upload').updateFileInfo(params, info);
          },
        });

        /**
         * Delete & remove a given file
         */
        t.field('deleteUploadFile', {
          type: fileTypeName,

          args: {
            id: 'ID',
            documentId: 'ID',
          },

          async resolve(parent: unknown, args: { id?: number; documentId?: string }) {
            const { id, documentId } = args;

            if (!id && !documentId) {
              throw new Error('You must provide either an id or a documentId');
            }

            const params = documentId ? { documentId } : { id };
            const file = await getUploadService('upload').findOne(params);

            if (!file) {
              return null;
            }

            return getUploadService('upload').remove(file);
          },
        });
      },
    });

    return {
      types: [fileInfoInputType, mutations],
      resolversConfig: {
        'Query.uploadFiles': { auth: { scope: 'plugin::upload.content-api.find' } },
        'Query.uploadFiles_connection': { auth: { scope: 'plugin::upload.content-api.find' } },
        'Query.uploadFile': { auth: { scope: 'plugin::upload.content-api.findOne' } },
        'Mutation.updateUploadFile': { auth: { scope: 'plugin::upload.content-api.upload' } },
        'Mutation.deleteUploadFile': { auth: { scope: 'plugin::upload.content-api.destroy' } },
      },
    };
  });
};