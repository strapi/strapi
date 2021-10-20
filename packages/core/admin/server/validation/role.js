'use strict';

const { yup } = require('@strapi/utils');
const { YupValidationError } = require('@strapi/utils').errors;

const handleYupError = error => {
  throw new YupValidationError(error);
};

const roleUpdateSchema = yup
  .object()
  .shape({
    name: yup.string().min(1),
    description: yup.string().nullable(),
  })
  .noUnknown();

const validateRoleUpdateInput = data => {
  return roleUpdateSchema.validate(data, { strict: true, abortEarly: false }).catch(handleYupError);
};

module.exports = {
  validateRoleUpdateInput,
};
