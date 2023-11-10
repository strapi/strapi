export default {
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/release-actions',
      handler: 'release-action.create',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};
