export default {
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/',
      handler: 'release.create',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'GET',
      path: '/',
      handler: 'release.findMany',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};
