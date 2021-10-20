'use strict';

const { YupValidationError } = require('@strapi/utils').errors;
const validators = require('../../../server/validation/common-validators');

const handleYupError = error => {
  throw new YupValidationError(error);
};

const validatedUpdatePermissionsInput = data => {
  return validators.updatePermissions
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleYupError);
};

module.exports = {
  validatedUpdatePermissionsInput,
};
