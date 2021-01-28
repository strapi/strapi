'use strict';
const { isFunction } = require('lodash/fp');

const createProviderRegistry = require('./provider-registry');

const valueIsFunctionType = ([, value]) => isFunction(value);

const providerRegistry = createProviderRegistry();

const getStrategyCallbackURL = providerName => `/admin/connect/${providerName}`;

const syncProviderRegistryWithConfig = () => {
  const { providers = [], events = {} } = strapi.config.get('server.admin.auth', {});
  const eventList = Object.entries(events);

  providerRegistry.registerMany(providers);

  for (const [eventName, handler] of eventList.filter(valueIsFunctionType)) {
    strapi.eventHub.on(`admin.auth.${eventName}`, handler);
  }
};

module.exports = {
  providerRegistry,
  getStrategyCallbackURL,
  syncProviderRegistryWithConfig,
};
