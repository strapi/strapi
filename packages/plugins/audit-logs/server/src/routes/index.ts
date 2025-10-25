export default [
  {
    method: 'GET',
    path: '/', // Since the plugin's name is audit-logs, the full path will be /audit-logs/
    handler: 'auditController.getAuditLogs',
    config: {
      auth: {
        scope: ['plugin::audit-log.read_audit_logs'], // controls read access
      },
    },
  },
  {
    method: 'GET',
    path: '/:id', // Full path: /audit-logs/:id
    handler: 'auditController.getAuditLog',
    config: {
      auth: {
        scope: ['plugin::audit-log.read_audit_logs'], // controls read access to audit logs
      },
    },
  },
  {
    method: 'POST', // Created for testing purposes.
    path: '/', // Full path: /audit-logs/
    handler: 'auditController.saveAuditLog',
    config: {
      policies: [],
    },
  },
];