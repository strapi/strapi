'use strict';

// eslint-disable-next-line node/no-extraneous-require
const { features } = require('@strapi/strapi/lib/utils/ee');
const executeCEBootstrap = require('../../server/bootstrap');
const { getService } = require('../../server/utils');

const SSO_ACTIONS = [
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
];

module.exports = async () => {
  const { actionProvider } = getService('permission');

  if (features.isEnabled('sso')) {
    await actionProvider.registerMany(SSO_ACTIONS);
  }

  await executeCEBootstrap();
};
