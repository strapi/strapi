'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const validateDeleteManyFoldersFilesSchema = yup
  .object()
  .shape({
    fileIds: yup
      .array()
      .min(1)
      .of(yup.strapiID().required()),
    folderIds: yup
      .array()
      .min(1)
      .of(yup.strapiID().required()),
  })
  .noUnknown()
  .required();

module.exports = {
  validateDeleteManyFoldersFiles: validateYupSchema(validateDeleteManyFoldersFilesSchema),
};
