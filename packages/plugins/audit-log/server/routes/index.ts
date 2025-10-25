export default [
  {
    method: 'GET',
    path: '/audit-logs',
    handler: 'auditLog.find',
    config: {
      policies: [],
      auth: {
        scope: ['plugin::audit-log.read'],
      },
    },
  },
];
