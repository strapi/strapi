'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/licenses',
    handler: 'license.findLicense',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::license.read'] } },
      ],
    },
  },
  {
    method: 'POST',
    path: '/licenses/generateLicenseFile',
    handler: 'license.generateLicenseFile',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::license.create'] } },
      ],
    },
  },
];
