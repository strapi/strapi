'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const multiFactorAuthenticationSchema = yup
  .object()
  .shape({
      code: yup.number()
          .integer()
          .min(100000, 'The code must be at least 6 digits')
          .max(999999, 'The code cannot be more than 6 digits')
          .required()
  })
  .required()
  .noUnknown();

module.exports = validateYupSchema(multiFactorAuthenticationSchema);
