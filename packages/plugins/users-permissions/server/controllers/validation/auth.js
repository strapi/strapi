'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const callbackBodySchema = yup.object().shape({
  identifier: yup.string().required(),
  password: yup.string().required(),
});

const registerBodySchema = yup.object().shape({
  email: yup
    .string()
    .email()
    .required(),
  username: yup.string().required(),
  password: yup.string().required(),
});

const sendEmailConfirmationBodySchema = yup.object().shape({
  email: yup
    .string()
    .email()
    .required(),
});

const forgotPasswordBodySchema = yup
  .object()
  .shape({
    email: yup
      .string()
      .email()
      .required(),
  })
  .noUnknown();

module.exports = {
  validateCallbackBody: validateYupSchema(callbackBodySchema),
  validateRegisterBody: validateYupSchema(registerBodySchema),
  validateSendEmailConfirmationBody: validateYupSchema(sendEmailConfirmationBodySchema),
  validateForgotPasswordBody: validateYupSchema(forgotPasswordBodySchema),
};
