// Audit Log Routes - Provides API endpoints for accessing audit logs with role-based access control
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/audit-logs',
      handler: 'audit-log.find',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          'plugin::audit-log.audit-log.canReadAuditLogs',
          'plugin::audit-log.audit-log.isAuditLoggingEnabled'
        ],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/audit-logs/:id',
      handler: 'audit-log.findOne',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          'plugin::audit-log.audit-log.canReadAuditLogs',
          'plugin::audit-log.audit-log.isAuditLoggingEnabled'
        ],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/audit-logs/record/:contentType/:recordId',
      handler: 'audit-log.getRecordLogs',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          'plugin::audit-log.audit-log.canReadAuditLogs',
          'plugin::audit-log.audit-log.isAuditLoggingEnabled',
          'plugin::audit-log.audit-log.isContentTypeAllowed'
        ],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/audit-logs/content-type/:contentType',
      handler: 'audit-log.getContentTypeLogs',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          'plugin::audit-log.audit-log.canReadAuditLogs',
          'plugin::audit-log.audit-log.isAuditLoggingEnabled',
          'plugin::audit-log.audit-log.isContentTypeAllowed'
        ],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/audit-logs/user/:userId',
      handler: 'audit-log.getUserLogs',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          'plugin::audit-log.audit-log.canReadAuditLogs',
          'plugin::audit-log.audit-log.isAuditLoggingEnabled'
        ],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/audit-logs/stats',
      handler: 'audit-log.getStats',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          'plugin::audit-log.audit-log.canReadAuditLogs',
          'plugin::audit-log.audit-log.isAuditLoggingEnabled'
        ],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/audit-logs/cleanup',
      handler: 'audit-log.cleanup',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          'plugin::audit-log.audit-log.canAdminAuditLogs',
          'plugin::audit-log.audit-log.isAuditLoggingEnabled'
        ],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/audit-logs',
      handler: 'audit-log.create',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          'plugin::audit-log.audit-log.canWriteAuditLogs',
          'plugin::audit-log.audit-log.isAuditLoggingEnabled'
        ],
        middlewares: [],
      },
    },
    {
      method: 'PUT',
      path: '/audit-logs/:id',
      handler: 'audit-log.update',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          'plugin::audit-log.audit-log.canWriteAuditLogs',
          'plugin::audit-log.audit-log.isAuditLoggingEnabled'
        ],
        middlewares: [],
      },
    },
    {
      method: 'DELETE',
      path: '/audit-logs/:id',
      handler: 'audit-log.delete',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          'plugin::audit-log.audit-log.canAdminAuditLogs',
          'plugin::audit-log.audit-log.isAuditLoggingEnabled'
        ],
        middlewares: [],
      },
    },
  ],
};
