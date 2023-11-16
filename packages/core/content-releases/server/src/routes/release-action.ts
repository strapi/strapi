export default {
  type: 'admin',
  routes: [
    {
      method: 'POST',
      path: '/release-actions',
      handler: 'release-action.create',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: ['plugin::content-releases.create-action'],
            },
          },
        ],
      },
    },
  ],
};
