export default [
  {
    method: 'GET',
    path: '/homepage/key-statistics',
    handler: 'homepage.getKeyStatistics',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'GET',
    path: '/homepage/layout',
    handler: 'homepage.getUserLayout',
    config: { policies: ['admin::isAuthenticatedAdmin'] },
  },
  {
    method: 'PUT',
    path: '/homepage/layout',
    handler: 'homepage.updateUserLayout',
    config: { policies: ['admin::isAuthenticatedAdmin'] },
  },
];
