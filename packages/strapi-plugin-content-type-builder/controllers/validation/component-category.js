'use strict';

const yup = require('yup');
const formatYupErrors = require('./yup-formatter');

const { isValidName } = require('./common');

module.exports = data => {
  return componentCategorySchema
    .validate(data, {
      strict: true,
      abortEarly: false,
    })
    .catch(error => Promise.reject(formatYupErrors(error)));
};

const componentCategorySchema = yup
  .object({
    name: yup
      .string()
      .min(3)
      .test(isValidName)
      .required('name.required'),
  })
  .noUnknown();
