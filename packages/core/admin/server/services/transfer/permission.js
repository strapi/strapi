'use strict';

const permissions = require('@strapi/permissions');
const { providerFactory } = require('@strapi/utils');

const DEFAULT_TRANSFER_ACTIONS = ['push'];

const providers = {
  action: providerFactory(),
  condition: providerFactory(),
};

DEFAULT_TRANSFER_ACTIONS.forEach((action) => {
  providers.action.register(action, { action });
});

const engine = permissions.engine.new({ providers });

module.exports = {
  engine,
  providers,
};
