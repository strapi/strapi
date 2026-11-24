import dataTransferAuthStrategy from '../strategies/data-transfer';

export default [
  // Transfer Push
  {
    method: 'GET',
    path: '/transfer/runner/push',
    handler: 'transfer.runner-push',
    config: {
      middlewares: ['admin::data-transfer'],
      auth: { strategies: [dataTransferAuthStrategy], scope: ['push'] },
      // A long lived websocket transfer session (a push writes) with its own disconnect handling
      abortReadsOnRequestDisconnect: false,
    },
  },
  // Transfer Pull
  {
    method: 'GET',
    path: '/transfer/runner/pull',
    handler: 'transfer.runner-pull',
    config: {
      middlewares: ['admin::data-transfer'],
      auth: { strategies: [dataTransferAuthStrategy], scope: ['pull'] },
      // A long lived websocket transfer session with its own disconnect handling
      abortReadsOnRequestDisconnect: false,
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
