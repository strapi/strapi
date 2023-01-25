'use strict';

const ee = require('@strapi/strapi/ee');
const { authEventsMapper } = require('../../../../server/services/passport');
const createProviderRegistry = require('./provider-registry');

const providerRegistry = createProviderRegistry();
const errorMessage = 'SSO is disabled. Its functionnalities cannot be accessed.';

const getStrategyCallbackURL = (providerName) => {
  if (!ee.features.isEnabled('sso')) {
    throw new Error(errorMessage);
  }

  return `/admin/connect/${providerName}`;
};

const syncProviderRegistryWithConfig = () => {
  if (!ee.features.isEnabled('sso')) {
    throw new Error(errorMessage);
  }

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
