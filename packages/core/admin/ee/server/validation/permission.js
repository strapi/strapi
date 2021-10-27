'use strict';

const { handleYupError } = require('@strapi/utils');
const validators = require('../../../server/validation/common-validators');

const validatedUpdatePermissionsInput = data => {
  return validators.updatePermissions
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleYupError);
};

module.exports = {
  validatedUpdatePermissionsInput,
};
