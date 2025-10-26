export default [
  {
    method: 'GET',
    path: '/audit-logs',
    handler: 'audit-log.find',
    config: {
      auth: true,
      policies: ['plugin::audit-log.can-read-audit-logs'],
    },
  },
];
