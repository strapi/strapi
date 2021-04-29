'use strict';

// eslint-disable-next-line node/no-extraneous-require
const { features } = require('strapi/lib/utils/ee');
const executeCEBootstrap = require('../../../config/functions/bootstrap');
const {
  features: { sso: ssoActions },
} = require('../admin-actions');
const { getService } = require('../../../utils');

module.exports = async () => {
  const { actionProvider } = getService('permission');

  if (features.isEnabled('sso')) {
    await actionProvider.registerMany(ssoActions);
  }

  await executeCEBootstrap();
};
