'use strict';

// eslint-disable-next-line node/no-extraneous-require
const { features } = require('@strapi/strapi/lib/utils/ee');
const executeCEBootstrap = require('../../server/bootstrap');
const { getService } = require('../../server/utils');
const { sso: ssoActions } = require('./config/admin-actions').features;

module.exports = async () => {
  const { actionProvider } = getService('permission');

  if (features.isEnabled('sso')) {
    await actionProvider.registerMany(ssoActions);
  }

  await executeCEBootstrap();
};
