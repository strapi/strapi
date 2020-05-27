'use strict';

const { yup, formatYupErrors } = require('strapi-utils');
const { strapiId } = require('../../validation/common-validators');

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

const validateRoleDeleteInput = async data => {
  const roleDeleteSchema = yup
    .object()
    .shape({
      ids: yup
        .array()
        .of(strapiId)
        .min(1)
        .required(),
    })
    .noUnknown();

  return roleDeleteSchema.validate(data, { strict: true, abortEarly: false }).catch(handleReject);
};

module.exports = {
  validateRoleCreateInput,
  validateRoleUpdateInput,
  validateRoleDeleteInput,
};
