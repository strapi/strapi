'use strict';

const {
  validateRegistrationInput,
  validateAdminRegistrationInput,
  validateRegistrationInfoQuery,
} = require('./register');
const validateForgotPasswordInput = require('./forgot-password');
const validateResetPasswordInput = require('./reset-password');

module.exports = {
  validateRegistrationInput,
  validateAdminRegistrationInput,
  validateRegistrationInfoQuery,
  validateForgotPasswordInput,
  validateResetPasswordInput,
};
