'use strict';

const { yup, formatYupErrors } = require('@strapi/utils');

const hasPermissionsSchema = yup.object({
  actions: yup.array().of(yup.string()),
  hasAtLeastOne: yup.boolean(),
});

const validateHasPermissionsInput = options => {
  try {
    return hasPermissionsSchema.validateSync(options, { strict: true, abortEarly: true });
  } catch (e) {
    throw new Error(formatYupErrors(e));
  }
};

module.exports = {
  validateHasPermissionsInput,
};
