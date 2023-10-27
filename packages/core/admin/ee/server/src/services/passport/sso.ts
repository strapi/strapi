import '@strapi/types';
import passport from '../../../../../server/src/services/passport';
import createProviderRegistry from './provider-registry';

export const providerRegistry = createProviderRegistry();
const errorMessage = 'SSO is disabled. Its functionnalities cannot be accessed.';

export const getStrategyCallbackURL = (providerName: string) => {
  if (!strapi.EE.features.isEnabled('sso')) {
    throw new Error(errorMessage);
  }

  return `/admin/connect/${providerName}`;
};

export const syncProviderRegistryWithConfig = () => {
  if (!strapi.EE.features.isEnabled('sso')) {
    throw new Error(errorMessage);
  }

  const { providers = [] } = strapi.config.get('admin.auth', {}) as any;

  // @ts-expect-error
  providerRegistry.registerMany(providers);
};

export const SSOAuthEventsMapper = {
  onSSOAutoRegistration: 'admin.auth.autoRegistration',
};

export default {
  providerRegistry,
  getStrategyCallbackURL,
  syncProviderRegistryWithConfig,
  authEventsMapper: { ...passport.authEventsMapper, ...SSOAuthEventsMapper },
};
