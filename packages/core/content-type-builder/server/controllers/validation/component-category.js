'use strict';

const { yup, handleYupError } = require('@strapi/utils');

const { isValidCategoryName } = require('./common');

module.exports = data => {
  return componentCategorySchema
    .validate(data, {
      strict: true,
      abortEarly: false,
    })
    .catch(handleYupError);
};

const componentCategorySchema = yup
  .object({
    name: yup
      .string()
      .min(3)
      .test(isValidCategoryName)
      .required('name.required'),
  })
  .noUnknown();
