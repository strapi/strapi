'use strict';

const { yup, validateYupSchemaSync } = require('@strapi/utils');

const hasPermissionsSchema = yup.object({
  actions: yup.array().of(yup.string()),
  hasAtLeastOne: yup.boolean(),
});

module.exports = {
  validateHasPermissionsInput: validateYupSchemaSync(hasPermissionsSchema),
};
