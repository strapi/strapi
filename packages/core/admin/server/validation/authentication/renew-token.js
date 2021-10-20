'use strict';

const { yup } = require('@strapi/utils');
const { YupValidationError } = require('@strapi/utils').errors;

const handleYupError = error => {
  throw new YupValidationError(error);
};

const renewToken = yup
  .object()
  .shape({ token: yup.string().required() })
  .required()
  .noUnknown();

const validateRenewTokenInput = data => {
  return renewToken.validate(data, { strict: true, abortEarly: false }).catch(handleYupError);
};

module.exports = validateRenewTokenInput;
