'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/audit-logs',
    handler: 'audit-log.find',
    config: {
      auth: {
        scope: ['plugin::users-permissions.read_audit_logs'],
      },
      policies: ['plugin::audit-logs.read-audit-logs'],
    },
  },
];

