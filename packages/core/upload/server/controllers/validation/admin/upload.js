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

const uploadSchema = yup.object({
  fileInfo: fileInfoSchema,
});

const multiUploadSchema = yup.object({
  fileInfo: yup.array().of(fileInfoSchema),
});

const validateUploadBody = (data = {}, isMulti = false) => {
  const schema = isMulti ? multiUploadSchema : uploadSchema;

  return validateYupSchema(schema, { strict: false })(data);
};

module.exports = validateUploadBody;
