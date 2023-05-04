'use strict';

module.exports = {
  type: 'admin',
  routes: [
    // License limit infos
    {
      method: 'GET',
      path: '/license-limit-information',
      handler: 'admin.licenseLimitInformation',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'admin::hasPermissions',
            config: {
              actions: [
                'admin::users.create',
                'admin::users.read',
                'admin::users.update',
                'admin::users.delete',
              ],
            },
          },
        ],
      },
    },
  ],
};
