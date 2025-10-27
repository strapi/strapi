export default [
  {
    method: 'GET',
    path: '/audit-logs',
    handler: 'audit-log.find',
    config: {
      policies: ['admin::hasPermissions'],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/audit-logs/statistics',
    handler: 'audit-log.getStatistics',
    config: {
      policies: ['admin::hasPermissions'],
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/audit-logs/:id',
    handler: 'audit-log.findOne',
    config: {
      policies: ['admin::hasPermissions'],
      auth: false,
    },
  },
];