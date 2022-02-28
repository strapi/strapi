'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const { isValidCategoryName } = require('./common');

const componentCategorySchema = yup
  .object({
    name: yup
      .string()
      .min(3)
      .test(isValidCategoryName)
      .required('name.required'),
  })
  .noUnknown();

module.exports = validateYupSchema(componentCategorySchema);
