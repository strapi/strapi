export const useAIAvailability = (): boolean => {
  console.log('useAiAvailability', {
    'window.strapi.ai?.enabled': window.strapi.ai?.enabled,
    'window.strapi?.isEE': window.strapi?.isEE,
    "window.strapi.features.isEnabled('cms-ai')": window.strapi.features.isEnabled('cms-ai'),
    "window.strapi.features.isEnabled('cms-ai-byok')":
      window.strapi.features.isEnabled('cms-ai-byok'),
    'window.strapi.features.config': window.strapi.features.config,
  });
  const isAiEnabled = window.strapi.ai?.enabled !== false;
  // TODO do we really need to check license + entitlements when the server returns a boolean for ai.enabled?
  // const isEE = window.strapi?.isEE;
  // const isStrapiManagedAiFeatureEnabled = window.strapi.features.isEnabled('cms-ai');
  // const isByokAiFeatureEnabled = window.strapi.features.isEnabled('cms-ai-byok');

  return isAiEnabled;
};
