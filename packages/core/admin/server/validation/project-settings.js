'use strict';

const { yup, validateYupSchemaSync } = require('@strapi/utils');

const MAX_IMAGE_WIDTH = 750;
const MAX_IMAGE_HEIGHT = MAX_IMAGE_WIDTH;
const MAX_IMAGE_FILE_SIZE = 1024 * 1024; // 1Mo
const ALLOWED_IMAGE_FILE_TYPES = ['image/jpeg', 'image/png', 'image/svg+xml'];

const updateProjectSettings = yup
  .object({
    menuLogo: yup.string(),
    authLogo: yup.string(),
  })
  .noUnknown();

const updateProjectSettingsLogo = yup.object({
  name: yup.string(),
  type: yup.string().oneOf(ALLOWED_IMAGE_FILE_TYPES),
  size: yup.number().max(MAX_IMAGE_FILE_SIZE),
});

const updateProjectSettingsFiles = yup
  .object({
    menuLogo: updateProjectSettingsLogo,
    authLogo: updateProjectSettingsLogo,
  })
  .noUnknown();

const logoDimensions = yup.object({
  width: yup.number().max(MAX_IMAGE_WIDTH),
  height: yup.number().max(MAX_IMAGE_HEIGHT),
});

const updateProjectSettingsImagesDimensions = yup
  .object({
    menuLogo: logoDimensions,
    authLogo: logoDimensions,
  })
  .noUnknown();

module.exports = {
  validateUpdateProjectSettings: validateYupSchemaSync(updateProjectSettings),
  validateUpdateProjectSettingsFiles: validateYupSchemaSync(updateProjectSettingsFiles),
  validateUpdateProjectSettingsImagesDimensions: validateYupSchemaSync(
    updateProjectSettingsImagesDimensions
  ),
};
