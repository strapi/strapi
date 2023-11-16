import {
  validateRegistrationInput,
  validateAdminRegistrationInput,
  validateRegistrationInfoQuery,
} from './register';

export { validateRegistrationInput, validateAdminRegistrationInput, validateRegistrationInfoQuery };

export { default as validateForgotPasswordInput } from './forgot-password';
export { default as validateResetPasswordInput } from './reset-password';
export { default as validateRenewTokenInput } from './renew-token';
