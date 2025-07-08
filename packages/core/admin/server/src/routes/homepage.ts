export default [
  {
    method: 'GET',
    path: '/homepage/key-statistics',
    handler: 'homepage.getKeyStatistics',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
];
