export default {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/audit-logs',
      handler: 'audit-logs.find',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/audit-logs/stats',
      handler: 'audit-logs.stats',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/audit-logs/:id',
      handler: 'audit-logs.findOne',
      config: {
        policies: [],
      },
    },
  ],
};

