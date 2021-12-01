'use strict';

const _ = require('lodash');
const { streamToBuffer } = require('./utils/file');

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

  const fileModel = strapi.getModel('plugin::upload.file');
  const fileTypeName = getTypeName(fileModel);
  const fileEntityResponseType = getEntityResponseName(fileModel);

  const { optimize } = getUploadService('image-manipulation');

  /**
   * Optimize and format a file using the upload services
   *
   * @param {object} upload
   * @param {object} extraInfo
   * @param {object} metas
   * @return {Promise<object>}
   */
  const formatFile = async (upload, extraInfo, metas) => {
    const { filename, mimetype, createReadStream } = await upload;

    const readBuffer = await streamToBuffer(createReadStream());

    const { buffer, info } = await optimize(readBuffer);

    const uploadService = getUploadService('upload');

    const fileInfo = uploadService.formatFileInfo(
      {
        filename,
        type: mimetype,
        size: buffer.length,
      },
      extraInfo || {},
      metas
    );

    return _.assign(fileInfo, info, { buffer });
  };

  /**
   * Register Upload's types, queries & mutations to the content API using the GraphQL extension API
   */
  getGraphQLService('extension').use(({ nexus }) => {
    const { inputObjectType, extendType, nonNull, list } = nexus;

    // Represents the input data payload for the file's information
    const fileInfoInputType = inputObjectType({
      name: FILE_INFO_INPUT_TYPE_NAME,

      definition(t) {
        t.string('name');
        t.string('alternativeText');
        t.string('caption');
      },
    });

    const mutations = extendType({
      type: 'Mutation',

      definition(t) {
        /**
         * Upload a single file
         */
        t.field(UPLOAD_MUTATION_NAME, {
          type: nonNull(fileEntityResponseType),

          args: {
            refId: 'ID',
            ref: 'String',
            field: 'String',
            info: FILE_INFO_INPUT_TYPE_NAME,
            file: nonNull('Upload'),
          },

          async resolve(parent, args) {
            const { file: upload, info, ...fields } = args;

            const file = await formatFile(upload, info, fields);
            const uploadedFile = await getUploadService('upload').uploadFileAndPersist(file);

            return toEntityResponse(uploadedFile, { args, resourceUID: fileTypeName });
          },
        });

        /**
         * Upload multiple files
         */
        t.field(MULTIPLE_UPLOAD_MUTATION_NAME, {
          type: nonNull(list(fileEntityResponseType)),

          args: {
            refId: 'ID',
            ref: 'String',
            field: 'String',
            files: nonNull(list('Upload')),
          },

          async resolve(parent, args) {
            const { files: uploads, ...fields } = args;

            const files = await Promise.all(uploads.map(upload => formatFile(upload, {}, fields)));

            const uploadService = getUploadService('upload');

            const uploadedFiles = await Promise.all(
              files.map(file => uploadService.uploadFileAndPersist(file))
            );

            return uploadedFiles.map(file =>
              toEntityResponse(file, { args, resourceUID: fileTypeName })
            );
          },
        });

        /**
         * Update some information for a given file
         */
        t.field(UPDATE_FILE_INFO_MUTATION_NAME, {
          type: nonNull(fileEntityResponseType),

          args: {
            id: nonNull('ID'),
            info: FILE_INFO_INPUT_TYPE_NAME,
          },

          async resolve(parent, args) {
            const { id, info } = args;

            const updatedFile = await getUploadService('upload').updateFileInfo(id, info);

            return toEntityResponse(updatedFile, { args, resourceUID: fileTypeName });
          },
        });

        /**
         * Delete & remove a given file
         */
        t.field(DELETE_FILE_MUTATION_NAME, {
          type: fileEntityResponseType,

          args: {
            id: nonNull('ID'),
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
        });
      },
    });

    return {
      types: [fileInfoInputType, mutations],
      resolversConfig: {
        // Use custom scopes for the upload file CRUD operations
        ['Query.uploadFiles']: { auth: { scope: 'plugin::upload.content-api.find' } },
        ['Query.uploadFile']: { auth: { scope: 'plugin::upload.content-api.findOne' } },
        ['Mutation.createUploadFile']: { auth: { scope: 'plugin::upload.content-api.upload' } },
        ['Mutation.updateUploadFile']: { auth: { scope: 'plugin::upload.content-api.upload' } },
        ['Mutation.deleteUploadFile']: { auth: { scope: 'plugin::upload.content-api.destroy' } },

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
