'use strict';

const { yup, formatYupErrors } = require('strapi-utils');

const hasPermissionsSchema = yup.array().of(
  yup.object().shape({
    action: yup.string().required(),
    subject: yup.string(),
  })
);

const validateHasPermissionsInput = data => {
  try {
    return hasPermissionsSchema.validateSync(data, { strict: true, abortEarly: true });
  } catch (e) {
    throw new Error(formatYupErrors(e));
  }
};

module.exports = {
  validateHasPermissionsInput,
};
