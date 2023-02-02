'use strict';

const dataTransferAuthStrategy = require('../strategies/data-transfer');

module.exports = [
  // Transfer route
  {
    method: 'GET',
    path: '/transfer/runner/connect',
    handler: 'transfer.runner-connect',
    config: {
      middlewares: [
        (ctx, next) => {
          if (process.env.STRAPI_DISABLE_REMOTE_DATA_TRANSFER === 'true') {
            return ctx.notFound();
          }

          return next();
        },
      ],
      auth: { strategies: [dataTransferAuthStrategy] },
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
