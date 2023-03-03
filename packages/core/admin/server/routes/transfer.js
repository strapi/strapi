'use strict';

const dataTransferAuthStrategy = require('../strategies/data-transfer');

module.exports = [
  // Transfer Push
  {
    method: 'GET',
    path: '/transfer/runner/push',
    handler: 'transfer.runner-push',
    config: {
      middlewares: [
        (ctx, next) => {
          if (process.env.STRAPI_DISABLE_REMOTE_DATA_TRANSFER === 'true') {
            return ctx.notFound();
          }

          return next();
        },
      ],
      auth: { strategies: [dataTransferAuthStrategy], scope: ['push'] },
    },
  },
  // Transfer Pull
  {
    method: 'GET',
    path: '/transfer/runner/pull',
    handler: 'transfer.runner-push', // TODO Change this
    config: {
      middlewares: [
        (ctx, next) => {
          if (process.env.STRAPI_DISABLE_REMOTE_DATA_TRANSFER === 'true') {
            return ctx.notFound();
          }

          return next();
        },
      ],
      auth: { strategies: [dataTransferAuthStrategy], scope: ['pull'] },
    },
  },
  // Transfer Tokens
  {
    method: 'POST',
    path: '/transfer/tokens',
    handler: 'transfer.token-create',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::transfer.tokens.create'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/transfer/tokens',
    handler: 'transfer.token-list',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::transfer.tokens.read'] } },
      ],
    },
  },
  {
    method: 'DELETE',
    path: '/transfer/tokens/:id',
    handler: 'transfer.token-revoke',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::transfer.tokens.delete'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/transfer/tokens/:id',
    handler: 'transfer.token-getById',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::transfer.tokens.read'] } },
      ],
    },
  },
  {
    method: 'PUT',
    path: '/transfer/tokens/:id',
    handler: 'transfer.token-update',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::transfer.tokens.update'] } },
      ],
    },
  },
  {
    method: 'POST',
    path: '/transfer/tokens/:id/regenerate',
    handler: 'transfer.token-regenerate',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        {
          name: 'admin::hasPermissions',
          config: { actions: ['admin::transfer.tokens.regenerate'] },
        },
      ],
    },
  },
];
