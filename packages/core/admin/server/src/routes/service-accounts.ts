export default [
  {
    method: 'POST',
    path: '/service-accounts',
    handler: 'service-account.create',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::service-accounts.create'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/service-accounts',
    handler: 'service-account.list',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::service-accounts.read'] } },
      ],
    },
  },
  {
    method: 'DELETE',
    path: '/service-accounts/:id',
    handler: 'service-account.revoke',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::service-accounts.delete'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/service-accounts/:id',
    handler: 'service-account.get',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::service-accounts.read'] } },
      ],
    },
  },
  {
    method: 'PUT',
    path: '/service-accounts/:id',
    handler: 'service-account.update',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::service-accounts.update'] } },
      ],
    },
  },
  {
    method: 'POST',
    path: '/service-accounts/:id/regenerate',
    handler: 'service-account.regenerate',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        {
          name: 'admin::hasPermissions',
          config: { actions: ['admin::service-accounts.regenerate'] },
        },
      ],
    },
  },
];
