'use strict';

const { yup, handleYupError } = require('@strapi/utils');
// eslint-disable-next-line node/no-extraneous-require
const { features } = require('@strapi/strapi/lib/utils/ee');
const { schemas } = require('../../../server/validation/user');

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

  return schema.validate(data, { strict: true, abortEarly: false }).catch(handleYupError);
};

module.exports = {
  validateUserCreationInput,
};
