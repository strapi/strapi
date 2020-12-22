'use strict';

const executeCEBootstrap = require('../../../config/functions/bootstrap');
const { actions: eeActions } = require('../admin-actions');

module.exports = async () => {
  strapi.admin.services.permission.actionProvider.register(eeActions);

  await executeCEBootstrap();
};
