'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const fileInfoSchema = yup
  .object({
    name: yup.string().nullable(),
    alternativeText: yup.string().nullable(),
    caption: yup.string().nullable(),
  })
  .noUnknown();

const uploadSchema = yup.object({
  fileInfo: fileInfoSchema,
});

const multiUploadSchema = yup.object({
  fileInfo: yup.array().of(fileInfoSchema),
});

const bufferFileInfoSchema = yup.object({
  name: yup.string().required(),
  type: yup.string().required(),
  alternativeText: yup.string().nullable(),
  caption: yup.string().nullable(),
});

const bufferUploadSchema = yup.object({
  fileInfo: bufferFileInfoSchema,
});

const multiBufferUploadSchema = yup.object({
  fileInfo: yup.array().of(bufferFileInfoSchema),
});

const validateUploadBody = (data = {}, { isMulti = false, isBufferData = false } = {}) => {
  let schema = isMulti ? multiUploadSchema : uploadSchema;

  if (isBufferData) {
    schema = isMulti ? multiBufferUploadSchema : bufferUploadSchema;
  }

  return validateYupSchema(schema, { strict: false })(data);
};

module.exports = validateUploadBody;
