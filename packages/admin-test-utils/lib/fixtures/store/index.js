'use strict';

// eslint-disable-next-line node/no-extraneous-require
const { combineReducers, createStore } = require('redux');

const reducers = {
  menu: jest.fn(() => ({
    generalSectionLinks: [
      {
        icon: 'list',
        intlLabel: {
          id: 'app.components.LeftMenuLinkContainer.listPlugins',
          defaultMessage: 'Plugins',
        },
        to: '/list-plugins',
        permissions: [
          { action: 'admin::marketplace.read', subject: null },
          { action: 'admin::marketplace.plugins.install', subject: null },
          { action: 'admin::marketplace.plugins.uninstall', subject: null },
        ],
      },
      {
        icon: 'shopping-basket',
        intlLabel: {
          id: 'app.components.LeftMenuLinkContainer.installNewPlugin',
          defaultMessage: 'Marketplace',
        },
        to: '/marketplace',
        permissions: [
          { action: 'admin::marketplace.read', subject: null },
          { action: 'admin::marketplace.plugins.install', subject: null },
          { action: 'admin::marketplace.plugins.uninstall', subject: null },
        ],
      },
      {
        icon: 'cog',
        intlLabel: {
          id: 'app.components.LeftMenuLinkContainer.settings',
          defaultMessage: 'Settings',
        },
        to: '/settings',
        // Permissions of this link are retrieved in the init phase
        // using the settings menu
        permissions: [],
        notificationsCount: 0,
      },
    ],
    pluginsSectionLinks: [],
    isLoading: true,
  })),
  rbacProvider: jest.fn(() => ({ allPermissions: null, collectionTypesRelatedPermissions: {} })),
};

const store = createStore(combineReducers(reducers));

module.exports = {
  store,
  state: store.getState(),
};
