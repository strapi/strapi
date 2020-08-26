'use strict';

const { yup, formatYupErrors } = require('strapi-utils');

const settingsSchema = yup.object({
  sizeOptimization: yup.boolean().required(),
  responsiveDimensions: yup.boolean().required(),
});

const validateSettings = data => {
  return settingsSchema
    .validate(data, {
      abortEarly: false,
    })
    .catch(error => {
      throw strapi.errors.badRequest('ValidationError', {
        errors: formatYupErrors(error),
      });
    });
};

module.exports = validateSettings;
