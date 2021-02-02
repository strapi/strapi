'use strict';

// eslint-disable-next-line node/no-extraneous-require
const { features } = require('strapi/lib/utils/ee');
const executeCEBootstrap = require('../../../config/functions/bootstrap');
const {
  features: { sso: ssoActions },
} = require('../admin-actions');

module.exports = async () => {
  if (features.isEnabled('sso')) {
    strapi.admin.services.permission.actionProvider.register(ssoActions);
  }

  await executeCEBootstrap();
};
