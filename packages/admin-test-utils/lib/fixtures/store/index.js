'use strict';

// eslint-disable-next-line node/no-extraneous-require
const { combineReducers, createStore } = require('redux');

const reducers = {
  language: jest.fn(() => ({ locale: 'en' })),
  menu: jest.fn(() => ({
    generalSectionLinks: [
      {
        icon: 'list',
        label: {
          id: 'app.components.LeftMenuLinkContainer.listPlugins',
          defaultMessage: 'Plugins',
        },
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
        label: {
          id: 'app.components.LeftMenuLinkContainer.installNewPlugin',
          defaultMessage: 'Marketplace',
        },
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
        label: { id: 'app.components.LeftMenuLinkContainer.settings', defaultMessage: 'Settings' },
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
