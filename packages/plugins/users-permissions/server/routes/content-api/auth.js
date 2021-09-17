'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/connect/(.*)',
    handler: 'auth.connect',
    config: {
      policies: ['plugin::users-permissions.rateLimit'],
      prefix: '',
    },
  },
  {
    method: 'POST',
    path: '/auth/local',
    handler: 'auth.callback',
    config: {
      policies: ['plugin::users-permissions.rateLimit'],
      prefix: '',
    },
  },
  {
    method: 'POST',
    path: '/auth/local/register',
    handler: 'auth.register',
    config: {
      policies: ['plugin::users-permissions.rateLimit'],
      prefix: '',
    },
  },
  {
    method: 'GET',
    path: '/auth/:provider/callback',
    handler: 'auth.callback',
    config: {
      prefix: '',
    },
  },
  {
    method: 'POST',
    path: '/auth/forgot-password',
    handler: 'auth.forgotPassword',
    config: {
      policies: ['plugin::users-permissions.rateLimit'],
      prefix: '',
    },
  },
  {
    method: 'POST',
    path: '/auth/reset-password',
    handler: 'auth.resetPassword',
    config: {
      policies: ['plugin::users-permissions.rateLimit'],
      prefix: '',
    },
  },
  {
    method: 'GET',
    path: '/auth/email-confirmation',
    handler: 'auth.emailConfirmation',
    config: {
      prefix: '',
    },
  },
  {
    method: 'POST',
    path: '/auth/send-email-confirmation',
    handler: 'auth.sendEmailConfirmation',
    config: {
      prefix: '',
    },
  },
];
