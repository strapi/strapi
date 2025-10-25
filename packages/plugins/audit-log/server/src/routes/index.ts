export default [
  {
    method: 'GET',
    path: '/audit-logs',
    handler: 'auditController.getAuditLogs',
    config: {
      auth: {
        scope: ['plugin::audit-log.read_audit_logs'], // controls read access
      },
    },
  },
  {
    method: 'GET',
    path: '/audit-logs/:id',
    handler: 'auditController.getAuditLog',
    config: {
      auth: {
        scope: ['plugin::audit-log.read_audit_logs'], // controls read access to audit logs
      },
    },
  },
  {
    method: 'POST', // Created for testing purposes.
    path: '/audit-logs',
    handler: 'auditController.saveAuditLog',
    config: {
      policies: [],
    },
  },
];