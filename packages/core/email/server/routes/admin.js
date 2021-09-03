'use strict';

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/',
      handler: 'email.send',
      config: {},
    },
    {
      method: 'POST',
      path: '/test',
      handler: 'email.test',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          { name: 'admin::hasPermissions', options: { actions: ['plugin::email.settings.read'] } },
        ],
      },
    },
    {
      method: 'GET',
      path: '/settings',
      handler: 'email.getSettings',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          { name: 'admin::hasPermissions', options: { actions: ['plugin::email.settings.read'] } },
        ],
      },
    },
  ],
};
