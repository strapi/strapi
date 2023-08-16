'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const callbackSchema = yup.object({
  identifier: yup.string().required(),
  password: yup.string().required(),
});

const registerSchema = yup.object({
  email: yup.string().email().required(),
  username: yup.string().required(),
  password: yup.string().required(),
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

const multiFactorAuthenticationSchema = yup
  .object({
      code: yup.number()
        .typeError('Please enter a valid number')
        .integer()
        .min(100000, 'The code must be at least 6 digits')
        .max(999999, 'The code cannot be more than 6 digits')
        .required()
  })
  .noUnknown();

const resetPasswordSchema = yup
  .object({
    password: yup.string().required(),
    passwordConfirmation: yup.string().required(),
    code: yup.string().required(),
  })
  .noUnknown();

const changePasswordSchema = yup
  .object({
    password: yup.string().required(),
    passwordConfirmation: yup
      .string()
      .required()
      .oneOf([yup.ref('password')], 'Passwords do not match'),
    currentPassword: yup.string().required(),
  })
  .noUnknown();

module.exports = {
  validateCallbackBody: validateYupSchema(callbackSchema),
  validateRegisterBody: validateYupSchema(registerSchema),
  validateSendEmailConfirmationBody: validateYupSchema(sendEmailConfirmationSchema),
  validateEmailConfirmationBody: validateYupSchema(validateEmailConfirmationSchema),
  validateForgotPasswordBody: validateYupSchema(forgotPasswordSchema),
  validateMultiFactorAuthenticationBody: validateYupSchema(multiFactorAuthenticationSchema),
  validateResetPasswordBody: validateYupSchema(resetPasswordSchema),
  validateChangePasswordBody: validateYupSchema(changePasswordSchema),
};
