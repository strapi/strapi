const _ = require('lodash');
const toArray = require('stream-to-array');

module.exports = {
  mutation: `
    upload(refId: ID, ref: String, field: String, source: String, file: Upload!): UploadFile!
    multipleUpload(refId: ID, ref: String, field: String, source: String, files: [Upload]!): [UploadFile]!
  `,
  resolver: {
    Query: {
      file: false,
      files: {
        resolver: 'plugins::upload.upload.find',
      },
    },
    Mutation: {
      createFile: false,
      updateFile: false,
      deleteFile: false,
      upload: {
        description: 'Upload one file',
        resolverOf: 'plugins::upload.upload.upload',
        resolver: async (obj, { file: upload, ...fields }) => {
          const file = await formatFile(upload, fields);

          const uploadedFiles = await strapi.plugins.upload.services.upload.uploadFileAndPersist(
            file
          );

          // Return response.
          return uploadedFiles.length === 1 ? uploadedFiles[0] : uploadedFiles;
        },
      },
      multipleUpload: {
        description: 'Upload one file',
        resolverOf: 'plugins::upload.upload.upload',
        resolver: async (obj, { files: uploads, ...fields }) => {
          const files = await Promise.all(uploads.map(upload => formatFile(upload, fields)));

          const uploadService = strapi.plugins.upload.services.upload;

          return Promise.all(files.map(file => uploadService.uploadFileAndPersist(file)));
        },
      },
    },
  },
};

const formatFile = async (upload, metas) => {
  const { filename, mimetype, createReadStream } = await upload;

  const stream = createReadStream();

  const parts = await toArray(stream);
  const buffers = parts.map(part => (_.isBuffer(part) ? part : Buffer.from(part)));

  const buffer = Buffer.concat(buffers);

  const uploadService = strapi.plugins.upload.services.upload;
  const fileInfo = uploadService.formatFileInfo(
    {
      filename,
      type: mimetype,
      size: buffer.length,
    },
    {},
    metas
  );

  return _.assign(fileInfo, { buffer });
};
