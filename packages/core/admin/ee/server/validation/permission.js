'use strict';

const { validateYupSchema } = require('@strapi/utils');
const validators = require('../../../server/validation/common-validators');

module.exports = {
  validatedUpdatePermissionsInput: validateYupSchema(validators.updatePermissions),
};
