'use strict';

const { yup } = require('@strapi/utils');
const { YupValidationError } = require('@strapi/utils').errors;

const hasPermissionsSchema = yup.object({
  actions: yup.array().of(yup.string()),
  hasAtLeastOne: yup.boolean(),
});

const validateHasPermissionsInput = options => {
  try {
    return hasPermissionsSchema.validateSync(options, { strict: true, abortEarly: true });
  } catch (e) {
    throw new YupValidationError(e);
  }
};

module.exports = {
  validateHasPermissionsInput,
};
