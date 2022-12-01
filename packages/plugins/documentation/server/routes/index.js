'use strict';

const restrictAccess = require('../middlewares/restrict-access');

module.exports = [
  {
    method: 'GET',
    path: '/',
    handler: 'documentation.index',
    config: {
      auth: false,
      middlewares: [restrictAccess],
    },
  },
  {
    method: 'GET',
    path: '/v:major(\\d+).:minor(\\d+).:patch(\\d+)',
    handler: 'documentation.index',
    config: {
      auth: false,
      middlewares: [restrictAccess],
    },
  },
  {
    method: 'GET',
    path: '/login',
    handler: 'documentation.loginView',
    config: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/login',
    handler: 'documentation.login',
    config: {
      auth: false,
    },
  },
  {
    method: 'GET',
    path: '/getInfos',
    handler: 'documentation.getInfos',
    config: {
      policies: [
        { name: 'admin::hasPermissions', config: { actions: ['plugin::documentation.read'] } },
      ],
    },
  },
  {
    method: 'GET',
    path: '/v:major(\\d+).:minor(\\d+).:patch(\\d+)/download',
    handler: 'documentation.download',
    config: {
      auth: false,
      middlewares: [restrictAccess],
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
          config: { actions: ['plugin::documentation.settings.regenerate'] },
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
          config: { actions: ['plugin::documentation.settings.update'] },
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
