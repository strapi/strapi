'use strict';

module.exports = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/settings',
      handler: 'settings.getSettings',
      config: { policies: [] },
    },
    {
      method: 'PUT',
      path: '/settings',
      handler: 'settings.updateSettings',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/settings/test',
      handler: 'settings.testSettings',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/locales',
      handler: 'translate.locales',
      config: { policies: [] },
    },
    {
      method: 'POST',
      path: '/translate',
      handler: 'translate.translate',
      config: { policies: [] },
    },
  ],
};
