'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');
const { isNil } = require('lodash/fp');
const { getService } = require('../../../utils');

const fileInfoSchema = yup.object({
  name: yup.string().nullable(),
  alternativeText: yup.string().nullable(),
  caption: yup.string().nullable(),
  folder: yup
    .strapiID()
    .nullable()
    .test('folder-exists', 'the folder does not exist', async (folderId) => {
      if (isNil(folderId)) {
        return true;
      }

      const exists = await getService('folder').exists({ id: folderId });

      return exists;
    }),
});

const bufferFileInfoSchema = yup.object({
  name: yup.string().required(),
  type: yup.string().required(),
  alternativeText: yup.string().nullable(),
  caption: yup.string().nullable(),
  folder: yup
    .strapiID()
    .nullable()
    .test('folder-exists', 'the folder does not exist', async (folderId) => {
      if (isNil(folderId)) {
        return true;
      }

      const exists = await getService('folder').exists({ id: folderId });

      return exists;
    }),
});

const bufferUploadSchema = yup.object({
  fileInfo: bufferFileInfoSchema,
});

const multiBufferUploadSchema = yup.object({
  fileInfo: yup.array().of(bufferFileInfoSchema),
});

const uploadSchema = yup.object({
  fileInfo: fileInfoSchema,
});

const multiUploadSchema = yup.object({
  fileInfo: yup.array().of(fileInfoSchema),
});

const validateUploadBody = (data = {}, { isMulti = false, isBufferData = false } = {}) => {
  let schema = isMulti ? multiUploadSchema : uploadSchema;

  if (isBufferData) {
    schema = isMulti ? multiBufferUploadSchema : bufferUploadSchema;
  }

  return validateYupSchema(schema, { strict: false })(data);
};

module.exports = validateUploadBody;
