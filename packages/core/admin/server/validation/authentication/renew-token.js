'use strict';

const { yup, handleYupError } = require('@strapi/utils');

const renewToken = yup
  .object()
  .shape({ token: yup.string().required() })
  .required()
  .noUnknown();

const validateRenewTokenInput = data => {
  return renewToken.validate(data, { strict: true, abortEarly: false }).catch(handleYupError);
};

module.exports = validateRenewTokenInput;
