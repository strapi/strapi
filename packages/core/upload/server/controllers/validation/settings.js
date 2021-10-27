'use strict';

const { yup, handleYupError } = require('@strapi/utils');

const settingsSchema = yup.object({
  sizeOptimization: yup.boolean().required(),
  responsiveDimensions: yup.boolean().required(),
});

const validateSettings = data => {
  return settingsSchema
    .validate(data, {
      abortEarly: false,
    })
    .catch(handleYupError);
};

module.exports = validateSettings;
