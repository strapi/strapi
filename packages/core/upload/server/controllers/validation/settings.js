'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const settingsSchema = yup.object({
  sizeOptimization: yup.boolean().required(),
  responsiveDimensions: yup.boolean().required(),
});

module.exports = validateYupSchema(settingsSchema);
