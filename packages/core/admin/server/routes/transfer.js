'use strict';

const dataTransferAuthStrategy = require('../strategies/data-transfer');

module.exports = [
  // Transfer route
  {
    method: 'GET',
    path: '/transfer/runner/connect',
    handler: 'transfer.runner-connect',
    config: {
      middlewares: ['admin::data-transfer'],
      // TODO: Allow not passing any scope <> Add a way to prevent assigning one by default
      auth: { strategies: [dataTransferAuthStrategy], scope: ['push'] },
    },
  },
  // Transfer Tokens
  {
    method: 'POST',
    path: '/transfer/tokens',
    handler: 'transfer.token-create',
    config: {
      middlewares: ['admin::data-transfer'],
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
      middlewares: ['admin::data-transfer'],
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
      middlewares: ['admin::data-transfer'],
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
      middlewares: ['admin::data-transfer'],
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
      middlewares: ['admin::data-transfer'],
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
      middlewares: ['admin::data-transfer'],
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
