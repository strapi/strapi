'use strict';

const { yup, validateYupSchemaSync } = require('@strapi/utils');

const MAX_IMAGE_WIDTH = 750;
const MAX_IMAGE_HEIGHT = MAX_IMAGE_WIDTH;
const MAX_IMAGE_FILE_SIZE = 1024 * 1024; // 1Mo
const ALLOWED_IMAGE_FILE_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml'];

const updateProjectSettings = yup
  .object({
    menuLogo: yup.string(),
  })
  .noUnknown();

const updateProjectSettingsFiles = yup
  .object({
    menuLogo: yup.object({
      name: yup.string(),
      type: yup.string().oneOf(ALLOWED_IMAGE_FILE_TYPES),
      size: yup.number().max(MAX_IMAGE_FILE_SIZE),
    }),
  })
  .noUnknown();

const updateProjectSettingsImagesDimensions = yup.object({
  menuLogo: yup.object({
    width: yup.number().max(MAX_IMAGE_WIDTH),
    height: yup.number().max(MAX_IMAGE_HEIGHT),
  }),
});

module.exports = {
  validateUpdateProjectSettings: validateYupSchemaSync(updateProjectSettings),
  validateUpdateProjectSettingsFiles: validateYupSchemaSync(updateProjectSettingsFiles),
  validateUpdateProjectSettingsImagesDimensions: validateYupSchemaSync(
    updateProjectSettingsImagesDimensions
  ),
};
