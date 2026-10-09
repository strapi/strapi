import { yup, validateYupSchema } from '@strapi/utils';

export type PasswordValidationRules = {
  validatePassword?: (password: string | undefined) => boolean | Promise<boolean>;
};

const callbackSchema = yup.object({
  identifier: yup.string().required(),
  password: yup.string().required(),
});

const createPasswordSchema = (config?: PasswordValidationRules) =>
  yup
    .string()
    .required()
    .test(function validatePasswordMaxLength(value) {
      if (!value) return true;
      const isValid = new TextEncoder().encode(value).length <= 72;
      return isValid || this.createError({ message: 'Password must be less than 73 bytes' });
    })
    .test(async function validatePasswordPolicy(value) {
      if (typeof config?.validatePassword !== 'function') return true;

      try {
        const isValid = await config.validatePassword(value);
        return isValid || this.createError({ message: 'Password validation failed.' });
      } catch (error) {
        const message =
          typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof error.message === 'string' &&
          error.message.length > 0
            ? error.message
            : 'An error occurred.';
        return this.createError({ message });
      }
    });

const createRegisterSchema = (config?: PasswordValidationRules) =>
  yup.object({
    email: yup.string().email().required(),
    username: yup.string().required(),
    password: createPasswordSchema(config),
  });

const sendEmailConfirmationSchema = yup.object({
  email: yup.string().email().required(),
});

const emailConfirmationSchema = yup.object({
  confirmation: yup.string().required(),
});

const forgotPasswordSchema = yup
  .object({
    email: yup.string().email().required(),
  })
  .noUnknown();

const passwordConfirmationSchema = yup
  .string()
  .required()
  .oneOf([yup.ref('password')], 'Passwords do not match');

const createResetPasswordSchema = (config?: PasswordValidationRules) =>
  yup
    .object({
      password: createPasswordSchema(config),
      passwordConfirmation: passwordConfirmationSchema,
      code: yup.string().required(),
    })
    .noUnknown();

const createChangePasswordSchema = (config?: PasswordValidationRules) =>
  yup
    .object({
      password: createPasswordSchema(config),
      passwordConfirmation: passwordConfirmationSchema,
      currentPassword: yup.string().required(),
    })
    .noUnknown();

/** Validate local login credentials. */
export const validateCallbackBody = validateYupSchema(callbackSchema);
/** Validate registration details and the configured password policy. */
export const validateRegisterBody = (payload: unknown, config?: PasswordValidationRules) =>
  validateYupSchema(createRegisterSchema(config))(payload);
/** Validate a confirmation email request. */
export const validateSendEmailConfirmationBody = validateYupSchema(sendEmailConfirmationSchema);
/** Validate the confirmation token. */
export const validateEmailConfirmationBody = validateYupSchema(emailConfirmationSchema);
/** Validate a password recovery request. */
export const validateForgotPasswordBody = validateYupSchema(forgotPasswordSchema);
/** Validate a password reset and the configured password policy. */
export const validateResetPasswordBody = (payload: unknown, config?: PasswordValidationRules) =>
  validateYupSchema(createResetPasswordSchema(config))(payload);
/** Validate a password change and the configured password policy. */
export const validateChangePasswordBody = (payload: unknown, config?: PasswordValidationRules) =>
  validateYupSchema(createChangePasswordSchema(config))(payload);
