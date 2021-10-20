'use strict';

const yup = require('yup');
const { YupValidationError } = require('@strapi/utils').errors;

const { isValidCategoryName } = require('./common');

const handleYupError = error => {
  throw new YupValidationError(error);
};

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
