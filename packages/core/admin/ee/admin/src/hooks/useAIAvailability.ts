export const useAIAvailability = (): boolean => {
  const isAiEnabled = window.strapi.ai?.enabled !== false;
  // TODO do we really need to check license + entitlements when the server returns a boolean for ai.enabled?
  // const isEE = window.strapi?.isEE;
  // const isStrapiManagedAiFeatureEnabled = window.strapi.features.isEnabled('cms-ai');
  // const isByokAiFeatureEnabled = window.strapi.features.isEnabled('cms-ai-byok');

  return isAiEnabled;
};
