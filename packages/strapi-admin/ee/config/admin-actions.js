'use strict';

module.exports = {
  features: {
    sso: [
      {
        uid: 'provider-login.read',
        displayName: 'Read',
        pluginName: 'admin',
        section: 'settings',
        category: 'single sign on',
        subCategory: 'options',
      },
      {
        uid: 'provider-login.update',
        displayName: 'Update',
        pluginName: 'admin',
        section: 'settings',
        category: 'single sign on',
        subCategory: 'options',
      },
    ],
  },
};
