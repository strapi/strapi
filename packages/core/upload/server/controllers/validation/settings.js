'use strict';

const { yup } = require('@strapi/utils');
const { YupValidationError } = require('@strapi/utils').errors;

const settingsSchema = yup.object({
  sizeOptimization: yup.boolean().required(),
  responsiveDimensions: yup.boolean().required(),
});

const handleYupError = error => {
  throw new YupValidationError(error);
};

const validateSettings = data => {
  return settingsSchema
    .validate(data, {
      abortEarly: false,
    })
    .catch(handleYupError);
};

module.exports = validateSettings;
