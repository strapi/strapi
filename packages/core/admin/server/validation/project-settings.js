'use strict';

const { yup, validateYupSchemaSync } = require('@strapi/utils');

const MAX_LOGO_SIZE = 1024 * 1024; // 1Mo
const ALLOWED_LOGO_FILE_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml'];

const updateProjectSettings = yup
  .object({
    menuLogo: yup.object({
      name: yup.string().max(255),
      type: yup.string().oneOf(ALLOWED_LOGO_FILE_TYPES),
      size: yup.number().max(MAX_LOGO_SIZE),
    }),
  })
  .noUnknown();

module.exports = {
  validateUpdateProjectSettings: validateYupSchemaSync(updateProjectSettings),
};
