'use strict';

const { UsersPermissionsRouteValidator } = require('./validation');

module.exports = (strapi) => {
  const validator = new UsersPermissionsRouteValidator(strapi);

  return [
    {
      method: 'GET',
      path: '/connect/(.*)',
      handler: 'auth.connect',
      config: {
        middlewares: ['plugin::users-permissions.rateLimit'],
        prefix: '',
      },
    },
    {
      method: 'POST',
      path: '/auth/local',
      handler: 'auth.callback',
      config: {
        middlewares: ['plugin::users-permissions.rateLimit'],
        prefix: '',
      },
      request: {
        body: { 'application/json': validator.loginBodySchema },
      },
      response: validator.authResponseSchema,
    },
    {
      method: 'POST',
      path: '/auth/local/register',
      handler: 'auth.register',
      config: {
        middlewares: ['plugin::users-permissions.rateLimit'],
        prefix: '',
      },
      request: {
        body: { 'application/json': validator.registerBodySchema },
      },
      response: validator.authRegisterResponseSchema,
    },
    {
      method: 'GET',
      path: '/auth/:provider/callback',
      handler: 'auth.callback',
      config: {
        prefix: '',
      },
      request: {
        params: {
          provider: validator.providerParam,
        },
      },
      response: validator.authResponseSchema,
    },
    {
      method: 'POST',
      path: '/auth/forgot-password',
      handler: 'auth.forgotPassword',
      config: {
        middlewares: ['plugin::users-permissions.rateLimit'],
        prefix: '',
      },
      request: {
        body: { 'application/json': validator.forgotPasswordBodySchema },
      },
      response: validator.forgotPasswordResponseSchema,
    },
    {
      method: 'POST',
      path: '/auth/reset-password',
      handler: 'auth.resetPassword',
      config: {
        middlewares: ['plugin::users-permissions.rateLimit'],
        prefix: '',
      },
      request: {
        body: { 'application/json': validator.resetPasswordBodySchema },
      },
      response: validator.authResponseSchema,
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
      request: {
        body: { 'application/json': validator.sendEmailConfirmationBodySchema },
      },
      response: validator.sendEmailConfirmationResponseSchema,
    },
    {
      method: 'POST',
      path: '/auth/change-password',
      handler: 'auth.changePassword',
      config: {
        middlewares: ['plugin::users-permissions.rateLimit'],
        prefix: '',
      },
      request: {
        body: { 'application/json': validator.changePasswordBodySchema },
      },
      response: validator.authResponseSchema,
    },
    {
      method: 'POST',
      path: '/auth/refresh',
      handler: 'auth.refresh',
      config: { prefix: '' },
    },
    {
      method: 'POST',
      path: '/auth/logout',
      handler: 'auth.logout',
      config: { prefix: '' },
    },
  ];
};
