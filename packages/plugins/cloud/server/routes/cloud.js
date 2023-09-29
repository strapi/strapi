module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/verify-project-is-versioned-on-git',
      handler: 'cloud.verifyProjectIsVersionedOnGit',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};
