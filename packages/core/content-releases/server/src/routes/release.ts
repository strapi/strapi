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
      handler: 'release.find',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};
