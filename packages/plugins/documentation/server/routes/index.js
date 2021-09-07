'use strict';

module.exports = [
  {
    method: 'GET',
    path: '/',
    handler: 'Documentation.index',
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
    handler: 'Documentation.index',
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
    handler: 'Documentation.loginView',
    config: {
      policies: [
        { name: 'admin::hasPermissions', options: { actions: ['plugin::documentation.read'] } },
      ],
    },
  },
  {
    method: 'POST',
    path: '/login',
    handler: 'Documentation.login',
    config: {
      policies: [
        { name: 'admin::hasPermissions', options: { actions: ['plugin::documentation.read'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/getInfos',
    handler: 'Documentation.getInfos',
    config: {
      policies: [
        { name: 'admin::hasPermissions', options: { actions: ['plugin::documentation.read'] } },
      ],
    },
  },
  {
    method: 'POST',
    path: '/regenerateDoc',
    handler: 'Documentation.regenerateDoc',
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
    handler: 'Documentation.updateSettings',
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
    handler: 'Documentation.deleteDoc',
    config: {
      policies: [],
    },
  },
];
