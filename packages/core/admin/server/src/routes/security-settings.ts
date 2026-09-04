export default [
  {
    method: 'GET',
    path: '/security-settings',
    handler: 'security-settings.get',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::security-settings.read'] } },
      ],
    },
  },
  {
    method: 'PUT',
    path: '/security-settings',
    handler: 'security-settings.update',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::security-settings.update'] } },
      ],
      // The body may carry a password and a code.
      middlewares: ['admin::rateLimit'],
    },
  },
];
