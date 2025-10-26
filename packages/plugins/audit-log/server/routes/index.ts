export default {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/audit-logs',
      handler: 'auditLog.find',
      config: {
        policies: ['plugin::audit-log.has-audit-permission'],
        auth: true,
        description: 'Get audit logs with filtering and pagination',
        tag: {
          plugin: 'audit-log',
          name: 'Audit Log',
        },
      },
    },
    {
      method: 'GET',
      path: '/audit-logs/:id',
      handler: 'auditLog.findOne',
      config: {
        policies: ['plugin::audit-log.has-audit-permission'],
        auth: true,
        description: 'Get a specific audit log entry',
        tag: {
          plugin: 'audit-log',
          name: 'Audit Log',
        },
      },
    },
    {
      method: 'GET',
      path: '/audit-logs/stats',
      handler: 'auditLog.stats',
      config: {
        policies: ['plugin::audit-log.has-audit-permission'],
        auth: true,
        description: 'Get audit log statistics',
        tag: {
          plugin: 'audit-log',
          name: 'Audit Log',
        },
      },
    },
    {
      method: 'POST',
      path: '/audit-logs/cleanup',
      handler: 'auditLog.cleanup',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          'plugin::audit-log.has-audit-permission',
        ],
        auth: true,
        description: 'Manually trigger cleanup of old audit logs',
        tag: {
          plugin: 'audit-log',
          name: 'Audit Log',
        },
      },
    },
  ],
};

