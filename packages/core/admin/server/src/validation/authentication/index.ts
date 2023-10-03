'use strict';

const {
  validateRegistrationInput,
  validateAdminRegistrationInput,
  validateRegistrationInfoQuery,
} = require('./register');
const validateForgotPasswordInput = require('./forgot-password');
const validateResetPasswordInput = require('./reset-password');
const validateRenewTokenInput = require('./renew-token');

module.exports = {
  validateRegistrationInput,
  validateAdminRegistrationInput,
  validateRegistrationInfoQuery,
  validateForgotPasswordInput,
  validateResetPasswordInput,
  validateRenewTokenInput,
};
