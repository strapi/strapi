'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const roleUpdateSchema = yup
  .object()
  .shape({
    name: yup.string().min(1),
    description: yup.string().nullable(),
  })
  .noUnknown();

module.exports = {
  validateRoleUpdateInput: validateYupSchema(roleUpdateSchema),
};
