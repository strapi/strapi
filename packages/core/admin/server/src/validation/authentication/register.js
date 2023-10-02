'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');
const validators = require('../common-validators');

const registrationSchema = yup
  .object()
  .shape({
    registrationToken: yup.string().required(),
    userInfo: yup
      .object()
      .shape({
        firstname: validators.firstname.required(),
        lastname: validators.lastname.nullable(),
        password: validators.password.required(),
      })
      .required()
      .noUnknown(),
  })
  .noUnknown();

const registrationInfoQuerySchema = yup
  .object()
  .shape({
    registrationToken: yup.string().required(),
  })
  .required()
  .noUnknown();

const adminRegistrationSchema = yup
  .object()
  .shape({
    email: validators.email.required(),
    firstname: validators.firstname.required(),
    lastname: validators.lastname.nullable(),
    password: validators.password.required(),
  })
  .required()
  .noUnknown();

module.exports = {
  validateRegistrationInput: validateYupSchema(registrationSchema),
  validateRegistrationInfoQuery: validateYupSchema(registrationInfoQuerySchema),
  validateAdminRegistrationInput: validateYupSchema(adminRegistrationSchema),
};
