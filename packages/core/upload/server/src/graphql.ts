import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { FILE_MODEL_UID, FOLDER_MODEL_UID } from './constants';
import { resolveFileId } from './services/upload';

const { NotFoundError } = errors;

const FILE_INFO_INPUT_TYPE_NAME = 'FileInfoInput';

export const installGraphqlExtension = ({ strapi }: { strapi: Core.Strapi }) => {
  const { service: getGraphQLService, config: graphQLConfig } = strapi.plugin('graphql');
  const { service: getUploadService } = strapi.plugin('upload');

  const isShadowCRUDEnabled = graphQLConfig('shadowCRUD', true);

  if (!isShadowCRUDEnabled) {
    return;
  }

  const folderCRUD = getGraphQLService('extension').shadowCRUD(FOLDER_MODEL_UID);

  folderCRUD.disableMutations();
  folderCRUD.field('files').disable();
  folderCRUD.field('children').disableOutput();
  folderCRUD.field('pathId').disableOutput();

  getGraphQLService('extension').shadowCRUD(FILE_MODEL_UID).disableMutations();

  const { getTypeName } = getGraphQLService('utils').naming;

  const fileModel = strapi.getModel(FILE_MODEL_UID);
  const fileTypeName = getTypeName(fileModel);
  const folderTypeName = getTypeName(strapi.getModel(FOLDER_MODEL_UID));

  const pendingNamePaths = new WeakMap<
    object,
    { paths: Set<string>; namePaths: Promise<Record<string, string>> }
  >();

  // Batches the folders of one request into a single ancestors query.
  const loadNamePath = (context: object, path: string) => {
    let batch = pendingNamePaths.get(context);

    if (!batch) {
      const paths = new Set<string>();
      const namePaths = new Promise<void>((resolve) => {
        setImmediate(resolve);
      }).then(() => {
        pendingNamePaths.delete(context);

        return getUploadService('folder').getNamePaths([...paths]);
      });

      batch = { paths, namePaths };
      pendingNamePaths.set(context, batch);
    }

    batch.paths.add(path);

    return batch.namePaths.then((namePaths) => namePaths[path]);
  };

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

    const folderNamePath = extendType({
      type: folderTypeName,

      definition(t: any) {
        t.string('namePath', {
          resolve(parent: { path?: string | null }, args: unknown, context: object) {
            return typeof parent.path === 'string' ? loadNamePath(context, parent.path) : null;
          },
        });
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

          // GraphQL `ID` arrives as a string: a numeric id or a documentId
          async resolve(parent: unknown, args: { id: string; info: any }) {
            const { id, info } = args;

            const fileId = await resolveFileId(strapi, id);

            if (!fileId) {
              throw new NotFoundError();
            }

            return getUploadService('upload').updateFileInfo(fileId, info);
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

          async resolve(parent: unknown, args: { id: string }) {
            const { id } = args;

            const fileId = await resolveFileId(strapi, id);
            const file = fileId ? await getUploadService('upload').findOne(fileId) : null;

            if (!file) {
              return null;
            }

            return getUploadService('upload').remove(file);
          },
        });
      },
    });

    return {
      types: [fileInfoInputType, folderNamePath, mutations],
      resolversConfig: {
        // Use custom scopes for the upload file CRUD operations
        'Query.uploadFiles': { auth: { scope: 'plugin::upload.content-api.find' } },
        'Query.uploadFiles_connection': { auth: { scope: 'plugin::upload.content-api.find' } },
        'Query.uploadFile': { auth: { scope: 'plugin::upload.content-api.findOne' } },
        'Query.uploadFolders': { auth: { scope: 'plugin::upload.folder.find' } },
        'Query.uploadFolders_connection': { auth: { scope: 'plugin::upload.folder.find' } },
        'Query.uploadFolder': { auth: { scope: 'plugin::upload.folder.findOne' } },
        'Mutation.updateUploadFile': { auth: { scope: 'plugin::upload.content-api.upload' } },
        'Mutation.deleteUploadFile': { auth: { scope: 'plugin::upload.content-api.destroy' } },
      },
    };
  });
};
