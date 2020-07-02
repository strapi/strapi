'use strict';

const { yup, formatYupErrors } = require('strapi-utils');

const hasPermissionsSchema = yup.array().of(yup.string());

const validateHasPermissionsInput = actions => {
  try {
    return hasPermissionsSchema.validateSync(actions, { strict: true, abortEarly: true });
  } catch (e) {
    throw new Error(formatYupErrors(e));
  }
};

module.exports = {
  validateHasPermissionsInput,
};
