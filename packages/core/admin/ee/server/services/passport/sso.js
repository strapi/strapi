'use strict';

const { authEventsMapper } = require('../../../../server/services/passport');
const createProviderRegistry = require('./provider-registry');

const providerRegistry = createProviderRegistry();

const getStrategyCallbackURL = (providerName) => `/admin/connect/${providerName}`;

const syncProviderRegistryWithConfig = () => {
  const { providers = [] } = strapi.config.get('admin.auth', {});

  providerRegistry.registerMany(providers);
};

const SSOAuthEventsMapper = {
  onSSOAutoRegistration: 'admin.auth.autoRegistration',
};

module.exports = {
  providerRegistry,
  getStrategyCallbackURL,
  syncProviderRegistryWithConfig,
  authEventsMapper: { ...authEventsMapper, ...SSOAuthEventsMapper },
};
