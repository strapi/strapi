'use strict';

const { yup, formatYupErrors } = require('strapi-utils');

const handleReject = error => Promise.reject(formatYupErrors(error));

const roleUpdateSchema = yup
  .object()
  .shape({
    description: yup.string(),
  })
  .noUnknown();

const validateRoleUpdateInput = data => {
  return roleUpdateSchema.validate(data, { strict: true, abortEarly: false }).catch(handleReject);
};

module.exports = {
  validateRoleUpdateInput,
};
