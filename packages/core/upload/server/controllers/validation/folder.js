'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const NO_SLASH_REGEX = /^[^/]+$/;
const NO_SPACES_AROUND = /^(?! ).+(?<! )$/;

const validateCreateFolderSchema = yup
  .object()
  .shape({
    name: yup
      .string()
      .min(1)
      .matches(NO_SLASH_REGEX, 'name cannot contain slashes')
      .matches(NO_SPACES_AROUND, 'name cannot start or end with a whitespace')
      .required(),
    parent: yup.strapiID().nullable(),
  })
  .noUnknown()
  .required();

module.exports = {
  validateCreateFolder: validateYupSchema(validateCreateFolderSchema),
};
