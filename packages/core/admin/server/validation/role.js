'use strict';

const { yup, handleYupError } = require('@strapi/utils');

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
