export default [
  {
    method: 'GET',
    path: '/permissions',
    handler: 'permission.getAll',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'POST',
    path: '/permissions/check',
    handler: 'permission.check',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
];
