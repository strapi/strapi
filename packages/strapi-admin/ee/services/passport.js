'use strict';

const { isFunction } = require('lodash/fp');

const { features } = require('../../../strapi/lib/utils/ee');

const createLocalStrategy = require('../../services/passport/local-strategy');
const createProviderRegistry = require('./passport/provider-registry');

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

const getPassportStrategies = () => {
  const localStrategy = createLocalStrategy(strapi);

  if (!features.isEnabled('sso')) {
    return [localStrategy];
  }

  if (!strapi.isLoaded) {
    syncProviderRegistryWithConfig();
  }

  const providers = providerRegistry.toArray();
  const strategies = providers.map(provider => provider.createStrategy(strapi));

  return [localStrategy, ...strategies];
};

module.exports = {
  getPassportStrategies,
};

if (features.isEnabled('sso')) {
  Object.assign(module.exports, {
    syncProviderRegistryWithConfig,
    getStrategyCallbackURL,
    providerRegistry,
  });
}
