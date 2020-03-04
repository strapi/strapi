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

          const uploadedFiles = await strapi.plugins.upload.services.upload.upload([file]);

          // Return response.
          return uploadedFiles.length === 1 ? uploadedFiles[0] : uploadedFiles;
        },
      },
      multipleUpload: {
        description: 'Upload one file',
        resolverOf: 'plugins::upload.upload.upload',
        resolver: async (obj, { files: uploads, ...fields }) => {
          const files = await Promise.all(uploads.map(upload => formatFile(upload, fields)));

          const uploadedFiles = await strapi.plugins.upload.services.upload.upload(files);

          // Return response.
          return uploadedFiles;
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

  const { formatFileInfo } = strapi.plugins.upload.services.upload;
  const fileInfo = formatFileInfo(
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
