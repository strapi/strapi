'use strict';

const { yup, formatYupErrors } = require('strapi-utils');

const handleReject = error => Promise.reject(formatYupErrors(error));

const roleCreateUpdateSchema = yup
  .object()
  .shape({
    name: yup
      .string()
      .min(1)
      .required(),
    description: yup.string().required(),
  })
  .noUnknown();

const validateRoleCreateInput = async data => {
  return roleCreateUpdateSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleReject);
};

const validateRoleUpdateInput = async data => {
  return roleCreateUpdateSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleReject);
};

module.exports = {
  validateRoleCreateInput,
  validateRoleUpdateInput,
};
