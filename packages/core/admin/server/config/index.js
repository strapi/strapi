'use strict';

const forgotPasswordTemplate = require('./email-templates/forgot-password');
const multiFactorAuthenticationTemplate = require('./email-templates/multi-factor-authentication')

module.exports = {
  forgotPassword: {
    emailTemplate: forgotPasswordTemplate,
  },
  multiFactorAuthentication: {
    emailTemplate: multiFactorAuthenticationTemplate,
  }
};
