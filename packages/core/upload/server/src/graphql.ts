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
  /**
   * Register Upload's types, queries & mutations to the content API using the GraphQL extension API
   */
  getGraphQLService('extension').use(({ nexus }: { nexus: any }) => {
    const { inputObjectType, extendType, nonNull } = nexus;

    // Represents the input data payload for the file's information
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
            id: nonNull('ID'),
            info: FILE_INFO_INPUT_TYPE_NAME,
          },

          async resolve(parent: unknown, args: { id: number; info: any }) {
            const { id, info } = args;

            return getUploadService('upload').updateFileInfo(id, info);
          },
        });

        /**
         * Delete & remove a given file
         */
        t.field('deleteUploadFile', {
          type: fileTypeName,

          args: {
            id: nonNull('ID'),
          },

          async resolve(parent: unknown, args: { id: number }) {
            const { id } = args;

            const file = await getUploadService('upload').findOne(id);

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
        // Use custom scopes for the upload file CRUD operations
        'Query.uploadFiles': { auth: { scope: 'plugin::upload.content-api.find' } },
        'Query.uploadFiles_connection': { auth: { scope: 'plugin::upload.content-api.find' } },
        'Query.uploadFile': { auth: { scope: 'plugin::upload.content-api.findOne' } },
        'Mutation.updateUploadFile': { auth: { scope: 'plugin::upload.content-api.upload' } },
        'Mutation.deleteUploadFile': { auth: { scope: 'plugin::upload.content-api.destroy' } },
      },
    };
  });
};
