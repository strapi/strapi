'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const callbackSchema = yup.object({
  identifier: yup.string().required(),
  password: yup.string().required(),
});

const createRegisterSchema = (config) =>
  yup.object({
    email: yup.string().email().required(),
    username: yup.string().required(),
    password: yup
      .string()
      .required()
      .test(function (value) {
        if (!value) return true;
        const isValid = new TextEncoder().encode(value).length <= 72;
        if (!isValid) {
          return this.createError({ message: 'Password must be less than 73 bytes' });
        }
        return true;
      })
      .test(async function (value) {
        if (typeof config?.validatePassword === 'function') {
          try {
            const isValid = await config.validatePassword(value);
            if (!isValid) {
              return this.createError({ message: 'Password validation failed.' });
            }
          } catch (error) {
            return this.createError({ message: error.message || 'An error occurred.' });
          }
        }
        return true;
      }),
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

const createResetPasswordSchema = (config) =>
  yup
    .object({
      password: yup
        .string()
        .required()
        .test(function (value) {
          if (!value) return true;
          const isValid = new TextEncoder().encode(value).length <= 72;
          if (!isValid) {
            return this.createError({ message: 'Password must be less than 73 bytes' });
          }
          return true;
        })
        .test(async function (value) {
          if (typeof config?.validatePassword === 'function') {
            try {
              const isValid = await config.validatePassword(value);
              if (!isValid) {
                return this.createError({ message: 'Password validation failed.' });
              }
            } catch (error) {
              return this.createError({ message: error.message || 'An error occurred.' });
            }
          }
          return true;
        }),
      passwordConfirmation: yup
        .string()
        .required()
        .oneOf([yup.ref('password')], 'Passwords do not match'),

      code: yup.string().required(),
    })
    .noUnknown();

const createChangePasswordSchema = (config) =>
  yup
    .object({
      password: yup
        .string()
        .required()
        .test(function (value) {
          if (!value) return true;
          const isValid = new TextEncoder().encode(value).length <= 72;
          if (!isValid) {
            return this.createError({ message: 'Password must be less than 73 bytes' });
          }
          return true;
        })
        .test(async function (value) {
          if (typeof config?.validatePassword === 'function') {
            try {
              const isValid = await config.validatePassword(value);
              if (!isValid) {
                return this.createError({ message: 'Password validation failed.' });
              }
            } catch (error) {
              return this.createError({ message: error.message || 'An error occurred.' });
            }
          }
          return true;
        }),
      passwordConfirmation: yup
        .string()
        .required()
        .oneOf([yup.ref('password')], 'Passwords do not match'),
      currentPassword: yup.string().required(),
    })
    .noUnknown();

module.exports = {
  validateCallbackBody: validateYupSchema(callbackSchema),
  validateRegisterBody: (payload, config) =>
    validateYupSchema(createRegisterSchema(config))(payload),
  validateSendEmailConfirmationBody: validateYupSchema(sendEmailConfirmationSchema),
  validateEmailConfirmationBody: validateYupSchema(validateEmailConfirmationSchema),
  validateForgotPasswordBody: validateYupSchema(forgotPasswordSchema),
  validateResetPasswordBody: (payload, config) =>
    validateYupSchema(createResetPasswordSchema(config))(payload),
  validateChangePasswordBody: (payload, config) =>
    validateYupSchema(createChangePasswordSchema(config))(payload),
};
