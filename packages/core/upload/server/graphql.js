'use strict';

const path = require('path');
const os = require('os');
const mime = require('mime-types');
const fse = require('fs-extra');
const { FILE_MODEL_UID } = require('./constants');
const { getStreamSize } = require('./utils/file');

const UPLOAD_MUTATION_NAME = 'upload';
const MULTIPLE_UPLOAD_MUTATION_NAME = 'multipleUpload';
const UPDATE_FILE_INFO_MUTATION_NAME = 'updateFileInfo';
const DELETE_FILE_MUTATION_NAME = 'removeFile';

const FILE_INFO_INPUT_TYPE_NAME = 'FileInfoInput';

/**
 * @param {{ strapi: import('@strapi/strapi').Strapi }}
 */
module.exports = ({ strapi }) => {
  const { service: getGraphQLService, config: graphQLConfig } = strapi.plugin('graphql');
  const { service: getUploadService } = strapi.plugin('upload');

  const isShadowCRUDEnabled = graphQLConfig('shadowCRUD', true);

  if (!isShadowCRUDEnabled) {
    return;
  }

  const { getTypeName, getEntityResponseName } = getGraphQLService('utils').naming;
  const { toEntityResponse } = getGraphQLService('format').returnTypes;

  const fileModel = strapi.getModel(FILE_MODEL_UID);
  const fileTypeName = getTypeName(fileModel);
  const fileEntityResponseType = getEntityResponseName(fileModel);

  const { optimize, isSupportedImage } = getUploadService('image-manipulation');

  /**
   * Optimize and format a file using the upload services
   *
   * @param {object} upload
   * @param {object} extraInfo
   * @param {object} metas
   * @return {Promise<object>}
   */
  const formatFile = async (upload, extraInfo, metas) => {
    const uploadService = getUploadService('upload');
    const { filename, mimetype, createReadStream } = await upload;
    const currentFile = await uploadService.formatFileInfo(
      {
        filename,
        /**
         * in case the mime-type wasn't sent, Strapi tries to guess it
         * from the file extension, to avoid a corrupt database state
         */
        type: mimetype || mime.lookup(filename) || 'application/octet-stream',
        size: await getStreamSize(createReadStream()),
      },
      extraInfo || {},
      metas
    );
    currentFile.getStream = createReadStream;

    if (!(await isSupportedImage(currentFile))) {
      return currentFile;
    }

    return optimize(currentFile);
  };

  /**
   * Register Upload's types, queries & mutations to the content API using the GraphQL extension API
   */
  getGraphQLService('extension').use(({ builder }) => {
    // Represents the input data payload for the file's information
    const fileInfoInputType = builder.inputType(FILE_INFO_INPUT_TYPE_NAME, {
      fields(t) {
        return {
          name: t.string(),
          alternativeText: t.string(),
          caption: t.string(),
        };
      },
    });

    const mutations = builder.mutationFields((t) => ({
      /**
       * Upload a single file
       */
      [UPLOAD_MUTATION_NAME]: t.field({
        type: fileEntityResponseType,
        nullable: false,

        args: {
          refId: t.arg({ type: 'ID' }),
          ref: t.arg({ type: 'String' }),
          field: t.arg({ type: 'String' }),
          info: t.arg({ type: FILE_INFO_INPUT_TYPE_NAME }),
          file: t.arg({ type: 'Upload', required: false }),
        },

        async resolve(parent, args) {
          // create temporary folder to store files for stream manipulation
          const tmpWorkingDirectory = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-upload-'));
          let sanitizedEntity;

          try {
            const { file: upload, info = {}, ...metas } = args;

            const apiUploadFolderService = getUploadService('api-upload-folder');

            const apiUploadFolder = await apiUploadFolderService.getAPIUploadFolder();
            info.folder = apiUploadFolder.id;

            const file = await formatFile(upload, info, { ...metas, tmpWorkingDirectory });
            const uploadedFile = await getUploadService('upload').uploadFileAndPersist(file, {});
            sanitizedEntity = await toEntityResponse(uploadedFile, {
              args,
              resourceUID: fileTypeName,
            });
          } finally {
            // delete temporary folder
            await fse.remove(tmpWorkingDirectory);
          }

          return sanitizedEntity;
        },
      }),

      /**
       * Upload multiple files
       */
      [MULTIPLE_UPLOAD_MUTATION_NAME]: t.field({
        type: [fileEntityResponseType],
        nullable: false,

        args: {
          refId: t.arg({ type: 'ID' }),
          ref: t.arg({ type: 'String' }),
          field: t.arg({ type: 'String' }),
          files: t.arg({ type: 'Upload', required: false }),
        },

        async resolve(parent, args) {
          // create temporary folder to store files for stream manipulation
          const tmpWorkingDirectory = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-upload-'));
          let sanitizedEntities = [];

          try {
            const { files: uploads, ...metas } = args;

            const apiUploadFolderService = getUploadService('api-upload-folder');

            const apiUploadFolder = await apiUploadFolderService.getAPIUploadFolder();

            const files = await Promise.all(
              uploads.map((upload) =>
                formatFile(
                  upload,
                  { folder: apiUploadFolder.id },
                  { ...metas, tmpWorkingDirectory }
                )
              )
            );

            const uploadService = getUploadService('upload');

            const uploadedFiles = await Promise.all(
              files.map((file) => uploadService.uploadFileAndPersist(file, {}))
            );

            sanitizedEntities = uploadedFiles.map((file) =>
              toEntityResponse(file, { args, resourceUID: fileTypeName })
            );
          } finally {
            // delete temporary folder
            await fse.remove(tmpWorkingDirectory);
          }

          return sanitizedEntities;
        },
      }),

      /**
       * Update some information for a given file
       */
      [UPDATE_FILE_INFO_MUTATION_NAME]: t.field({
        type: fileEntityResponseType,
        nullable: false,

        args: {
          id: t.arg({ type: 'ID', required: false }),
          info: t.arg({ type: FILE_INFO_INPUT_TYPE_NAME }),
        },

        async resolve(parent, args) {
          const { id, info } = args;

          const updatedFile = await getUploadService('upload').updateFileInfo(id, info);

          return toEntityResponse(updatedFile, { args, resourceUID: fileTypeName });
        },
      }),

      /**
       * Delete & remove a given file
       */
      [DELETE_FILE_MUTATION_NAME]: t.field({
        type: fileEntityResponseType,

        args: {
          id: t.arg({ type: 'ID', required: false }),
        },

        async resolve(parent, args) {
          const { id } = args;

          const file = await getUploadService('upload').findOne(id);

          if (!file) {
            return null;
          }

          const deletedFile = await getUploadService('upload').remove(file);

          return toEntityResponse(deletedFile, { args, resourceUID: fileTypeName });
        },
      }),
    }));

    return {
      types: [fileInfoInputType, mutations],
      resolversConfig: {
        // Use custom scopes for the upload file CRUD operations
        'Query.uploadFiles': { auth: { scope: 'plugin::upload.content-api.find' } },
        'Query.uploadFile': { auth: { scope: 'plugin::upload.content-api.findOne' } },
        'Mutation.createUploadFile': { auth: { scope: 'plugin::upload.content-api.upload' } },
        'Mutation.updateUploadFile': { auth: { scope: 'plugin::upload.content-api.upload' } },
        'Mutation.deleteUploadFile': { auth: { scope: 'plugin::upload.content-api.destroy' } },

        [`Mutation.${UPLOAD_MUTATION_NAME}`]: {
          auth: { scope: 'plugin::upload.content-api.upload' },
        },
        [`Mutation.${MULTIPLE_UPLOAD_MUTATION_NAME}`]: {
          auth: { scope: 'plugin::upload.content-api.upload' },
        },
        [`Mutation.${UPDATE_FILE_INFO_MUTATION_NAME}`]: {
          auth: { scope: 'plugin::upload.content-api.upload' },
        },
        [`Mutation.${DELETE_FILE_MUTATION_NAME}`]: {
          auth: { scope: 'plugin::upload.content-api.destroy' },
        },
      },
    };
  });
};
