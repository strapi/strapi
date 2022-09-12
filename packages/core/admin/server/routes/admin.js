'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/init',
    handler: 'admin.init',
    config: { auth: false },
  },
  {
    method: 'GET',
    path: '/project-settings',
    handler: 'admin.getProjectSettings',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        {
          name: 'admin::hasPermissions',
          config: { actions: ['admin::project-settings.read'] },
        },
      ],
    },
  },
  {
    method: 'POST',
    path: '/project-settings',
    handler: 'admin.updateProjectSettings',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        {
          name: 'admin::hasPermissions',
          config: { actions: ['admin::project-settings.update'] },
        },
      ],
    },
  },
  {
    method: 'GET',
    path: '/project-type',
    handler: 'admin.getProjectType',
    config: { auth: false },
  },
  {
    method: 'GET',
    path: '/information',
    handler: 'admin.information',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
  {
    method: 'GET',
    path: '/telemetry-properties',
    handler: 'admin.telemetryProperties',
    config: {
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/plugins',
    handler: 'admin.plugins',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        { name: 'admin::hasPermissions', config: { actions: ['admin::marketplace.read'] } },
      ],
    },
  },
  {
    method: 'POST',
    path: '/plugins/install',
    handler: 'admin.installPlugin',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        {
          name: 'admin::hasPermissions',
          config: { actions: ['admin::marketplace.plugins.install'] },
        },
      ],
    },
  },
  {
    method: 'DELETE',
    path: '/plugins/uninstall/:plugin',
    handler: 'admin.uninstallPlugin',
    config: {
      policies: [
        'admin::isAuthenticatedAdmin',
        {
          name: 'admin::hasPermissions',
          config: { actions: ['admin::marketplace.plugins.uninstall'] },
        },
      ],
    },
  },
];
