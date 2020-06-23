'use strict';

const { formatYupErrors } = require('strapi-utils');
const validators = require('../../validation/common-validators');

const handleReject = error => Promise.reject(formatYupErrors(error));

const validatedUpdatePermissionsInput = data => {
  return validators.updatePermissions
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleReject);
};

module.exports = {
  validatedUpdatePermissionsInput,
};
