'use strict';

// eslint-disable-next-line node/no-extraneous-require
const { combineReducers, createStore } = require('redux');

const reducers = {
  menu: jest.fn(() => ({
    generalSectionLinks: [
      {
        icon: 'list',
        label: 'app.components.LeftMenuLinkContainer.listPlugins',
        destination: '/list-plugins',
        isDisplayed: false,
        permissions: [
          { action: 'admin::marketplace.read', subject: null },
          { action: 'admin::marketplace.plugins.install', subject: null },
          { action: 'admin::marketplace.plugins.uninstall', subject: null },
        ],
        notificationsCount: 0,
      },
      {
        icon: 'shopping-basket',
        label: 'app.components.LeftMenuLinkContainer.installNewPlugin',
        destination: '/marketplace',
        isDisplayed: false,
        permissions: [
          { action: 'admin::marketplace.read', subject: null },
          { action: 'admin::marketplace.plugins.install', subject: null },
          { action: 'admin::marketplace.plugins.uninstall', subject: null },
        ],
        notificationsCount: 0,
      },
      {
        icon: 'cog',
        label: 'app.components.LeftMenuLinkContainer.settings',
        isDisplayed: true,
        destination: '/settings',
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
