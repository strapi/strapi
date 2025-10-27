module.exports = [
  {
    method: 'GET',
    path: '/audit-logs',
    handler: 'audit.find',
    config: {
      policies: ['plugin::audit-log.has-read-permission']
    }
  },
  {
    method: 'GET',
    path: '/audit-logs/:id',
    handler: 'audit.findOne',
    config: {
      policies: ['plugin::audit-log.has-read-permission']
    }
  }
];
