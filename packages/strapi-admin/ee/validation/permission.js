'use strict';

const { formatYupErrors } = require('strapi-utils');
const validators = require('../../validation/common-validators');

const handleReject = error => Promise.reject(formatYupErrors(error));

const updatePermissionsSchemas = [...validators.updatePermissionsValidators];

const validatedUpdatePermissionsInput = async data => {
  try {
    for (const schema of updatePermissionsSchemas) {
      await schema.validate(data, { strict: true, abortEarly: false });
    }
  } catch (e) {
    return handleReject(e);
  }
};

module.exports = {
  validatedUpdatePermissionsInput,
};
