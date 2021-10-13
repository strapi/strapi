'use strict';

const { yup, formatYupErrors } = require('strapi-utils');
// eslint-disable-next-line node/no-extraneous-require
const { features } = require('strapi/lib/utils/ee');
const { schemas } = require('../../validation/user');

const handleReject = error => Promise.reject(formatYupErrors(error));

const ssoUserCreationInputExtension = yup
  .object()
  .shape({
    useSSORegistration: yup.boolean(),
  })
  .noUnknown();

const validateUserCreationInput = data => {
  let schema = schemas.userCreationSchema;

  if (features.isEnabled('sso')) {
    schema = schema.concat(ssoUserCreationInputExtension);
  }

  return schema.validate(data, { strict: true, abortEarly: false }).catch(handleReject);
};

module.exports = {
  validateUserCreationInput,
};
