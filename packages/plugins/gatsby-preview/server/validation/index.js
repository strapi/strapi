'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const createPreviewContentTypesSchema = contentTypes => {
  const fields = Object.values(contentTypes).reduce((acc, current) => {
    acc[current.uid] = yup.boolean();

    return acc;
  }, {});

  return yup
    .object()
    .shape(fields)
    .test('missing-keys', 'Some content types are missing', function(value) {
      if (!value) {
        return true;
      }

      return Object.keys(fields).every(key => key in value);
    })
    .noUnknown()
    .required();
};

const contentSyncSchema = yup
  .object()
  .shape({
    contentSyncURL: yup
      .string()
      .url()
      .required(),
  })
  .required();

module.exports = {
  validatePreviewInput: ({ contentTypes }) =>
    validateYupSchema(createPreviewContentTypesSchema(contentTypes)),
  validateContentSyncURL: validateYupSchema(contentSyncSchema),
};
