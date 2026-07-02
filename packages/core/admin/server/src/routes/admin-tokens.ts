export default [
  {
    method: 'POST',
    path: '/admin-tokens',
    handler: 'admin-token.create',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::admin-tokens.create'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/admin-tokens',
    handler: 'admin-token.list',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::admin-tokens.read'] } },
      ],
    },
  },
  {
    method: 'DELETE',
    path: '/admin-tokens/:id',
    handler: 'admin-token.revoke',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::admin-tokens.delete'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/admin-tokens/:id',
    handler: 'admin-token.get',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::admin-tokens.read'] } },
      ],
    },
  },
  {
    method: 'PUT',
    path: '/admin-tokens/:id',
    handler: 'admin-token.update',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::admin-tokens.update'] } },
      ],
    },
  },
  {
    method: 'POST',
    path: '/admin-tokens/:id/regenerate',
    handler: 'admin-token.regenerate',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::admin-tokens.regenerate'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/admin-tokens/:id/owner-permissions',
    handler: 'admin-token.getOwnerPermissions',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::admin-tokens.read'] } },
      ],
    },
  },
];
