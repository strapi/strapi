'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const callbackSchema = yup.object({
  identifier: yup.string().required(),
  password: yup.string().required(),
});

const registerSchema = (config) =>
  yup.object({
    email: yup.string().email().required(),
    username: yup.string().required(),
    password: yup
      .string()
      .required()
      .min(config?.password?.min || 6)
      .max(config?.password?.max || 255),
  });

const sendEmailConfirmationSchema = yup.object({
  email: yup.string().email().required(),
});

const validateEmailConfirmationSchema = yup.object({
  confirmation: yup.string().required(),
});

const forgotPasswordSchema = yup
  .object({
    email: yup.string().email().required(),
  })
  .noUnknown();

const resetPasswordSchema = (config) =>
  yup
    .object({
      password: yup
        .string()
        .required()
        .min(config?.password?.min || 6)
        .max(config?.password?.max || 255),

      passwordConfirmation: yup
        .string()
        .required()
        .oneOf([yup.ref('password')], 'Passwords do not match'),

      code: yup.string().required(),
    })
    .noUnknown();

const changePasswordSchema = (config) =>
  yup
    .object({
      password: yup
        .string()
        .required()
        .min(config?.password?.min || 6)
        .max(config?.password?.max || 255),
      passwordConfirmation: yup
        .string()
        .required()
        .oneOf([yup.ref('password')], 'Passwords do not match'),
      currentPassword: yup.string().required(),
    })
    .noUnknown();

module.exports = {
  validateCallbackBody: validateYupSchema(callbackSchema),
  validateRegisterBody: (config) => validateYupSchema(registerSchema(config)),
  validateSendEmailConfirmationBody: validateYupSchema(sendEmailConfirmationSchema),
  validateEmailConfirmationBody: validateYupSchema(validateEmailConfirmationSchema),
  validateForgotPasswordBody: validateYupSchema(forgotPasswordSchema),
  validateResetPasswordBody: (config) => validateYupSchema(resetPasswordSchema(config)),
  validateChangePasswordBody: (config) => validateYupSchema(changePasswordSchema(config)),
};
