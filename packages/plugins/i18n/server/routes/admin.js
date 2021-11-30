'use strict';

module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/iso-locales',
      handler: 'iso-locales.listIsoLocales',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::i18n.locale.read'] },
          },
        ],
      },
    },
    {
      method: 'GET',
      path: '/locales',
      handler: 'locales.listLocales',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
    {
      method: 'POST',
      path: '/locales',
      handler: 'locales.createLocale',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::i18n.locale.create'] },
          },
        ],
      },
    },
    {
      method: 'PUT',
      path: '/locales/:id',
      handler: 'locales.updateLocale',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::i18n.locale.update'] },
          },
        ],
      },
    },
    {
      method: 'DELETE',
      path: '/locales/:id',
      handler: 'locales.deleteLocale',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::i18n.locale.delete'] },
          },
        ],
      },
    },
    {
      method: 'POST',
      path: '/content-manager/actions/get-non-localized-fields',
      handler: 'content-types.getNonLocalizedAttributes',
      config: {
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
};
