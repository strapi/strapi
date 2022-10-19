'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const settingsSchema = yup.object({
  sizeOptimization: yup.boolean().required(),
  responsiveDimensions: yup.boolean().required(),
});

const configSchema = yup.object({
  pageSize: yup.number().required(),
});

module.exports = {
  settings: validateYupSchema(settingsSchema),
  config: validateYupSchema(configSchema),
};
