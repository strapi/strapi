'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/',
    handler: 'documentation.index',
    config: {
      policies: [
        'plugin::documentation.index',
        { name: 'admin::hasPermissions', options: { actions: ['plugin::documentation.read'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/v:major(\\d+).:minor(\\d+).:patch(\\d+)',
    handler: 'documentation.index',
    config: {
      policies: [
        'plugin::documentation.index',
        { name: 'admin::hasPermissions', options: { actions: ['plugin::documentation.read'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/login',
    handler: 'documentation.loginView',
    config: {
      policies: [
        { name: 'admin::hasPermissions', options: { actions: ['plugin::documentation.read'] } },
      ],
    },
  },
  {
    method: 'POST',
    path: '/login',
    handler: 'documentation.login',
    config: {
      policies: [
        { name: 'admin::hasPermissions', options: { actions: ['plugin::documentation.read'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/getInfos',
    handler: 'documentation.getInfos',
    config: {
      policies: [
        { name: 'admin::hasPermissions', options: { actions: ['plugin::documentation.read'] } },
      ],
    },
  },
  {
    method: 'POST',
    path: '/regenerateDoc',
    handler: 'documentation.regenerateDoc',
    config: {
      policies: [
        {
          name: 'admin::hasPermissions',
          options: { actions: ['plugin::documentation.settings.regenerate'] },
        },
      ],
    },
  },
  {
    method: 'PUT',
    path: '/updateSettings',
    handler: 'documentation.updateSettings',
    config: {
      policies: [
        {
          name: 'admin::hasPermissions',
          options: { actions: ['plugin::documentation.settings.update'] },
        },
      ],
    },
  },
  {
    method: 'DELETE',
    path: '/deleteDoc/:version',
    handler: 'documentation.deleteDoc',
    config: {
      policies: [],
    },
  },
];
