'use strict';

module.exports = {
  type: 'admin', // Accessible via admin API
  routes: [
    {
      method: 'GET',
      path: '/audit-logs',
      handler: 'audit-log.find',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::audit-logs.read']
            }
          }
        ]
      }
    },
    {
      method: 'GET',
      path: '/audit-logs/:id',
      handler: 'audit-log.findOne',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::audit-logs.read']
            }
          }
        ]
      }
    }
  ]
};
