'use strict';

module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/audit-logs',
      handler: 'auditLog.find',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::audit-log.checkPermission',
            config: { permission: 'plugin::audit-log.read' },
          },
        ],
      },
    },
  ],
};
