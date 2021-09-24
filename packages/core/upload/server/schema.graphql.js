'use strict';

const _ = require('lodash');
const { streamToBuffer } = require('./utils/file');
const { getService } = require('./utils');

module.exports = {
  definition: `
    input FileInfoInput {
      name: String
      alternativeText: String
      caption: String
    }
  `,
  mutation: `
    upload(refId: ID, ref: String, field: String, source: String, info: FileInfoInput, file: Upload!): UploadFile!
    multipleUpload(refId: ID, ref: String, field: String, source: String, files: [Upload]!): [UploadFile]!
    updateFileInfo(id: ID!, info: FileInfoInput!): UploadFile!
  `,
  resolver: {
    Query: {
      file: false,
      files: {
        resolver: 'plugin::upload.upload.find',
      },
    },
    Mutation: {
      createFile: false,
      updateFile: false,
      upload: {
        description: 'Upload one file',
        resolverOf: 'plugin::upload.upload.upload',
        async resolver(obj, { file: upload, info, ...fields }) {
          const file = await formatFile(upload, info, fields);

          const uploadedFiles = await getService('upload').uploadFileAndPersist(file);

          // Return response.
          return uploadedFiles.length === 1 ? uploadedFiles[0] : uploadedFiles;
        },
      },
      multipleUpload: {
        description: 'Upload one file',
        resolverOf: 'plugin::upload.upload.upload',
        async resolver(obj, { files: uploads, ...fields }) {
          const files = await Promise.all(uploads.map(upload => formatFile(upload, {}, fields)));

          const uploadService = getService('upload');

          return Promise.all(files.map(file => uploadService.uploadFileAndPersist(file)));
        },
      },
      updateFileInfo: {
        description: 'Update file information',
        resolverOf: 'plugin::upload.upload.upload',
        async resolver(obj, { id, info }) {
          return getService('upload').updateFileInfo(id, info);
        },
      },
      deleteFile: {
        description: 'Delete one file',
        resolverOf: 'plugin::upload.upload.destroy',
        async resolver(obj, options, { context }) {
          const file = await getService('upload').findOne(context.params.id);
          if (file) {
            const fileResult = await getService('upload').remove(file);
            return { file: fileResult };
          }
        },
      },
    },
  },
};

const formatFile = async (upload, extraInfo, metas) => {
  const { filename, mimetype, createReadStream } = await upload;

  const { optimize } = strapi.plugin('upload').service('image-manipulation');
  const readBuffer = await streamToBuffer(createReadStream());

  const { buffer, info } = await optimize(readBuffer);

  const uploadService = getService('upload');
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
