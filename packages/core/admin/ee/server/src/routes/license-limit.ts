export default {
  type: 'admin',
  routes: [
    // License limit infos
    {
      method: 'GET',
      path: '/license-limit-information',
      handler: 'admin.licenseLimitInformation',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};
