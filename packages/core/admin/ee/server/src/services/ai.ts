import type { Core } from '@strapi/types';

const createAIService = ({ strapi }: { strapi: Core.Strapi }) => {
  const isAIAvailable = () => {
    const isAIEnabled = strapi.config.get('admin.ai.enabled', true);
    const hasAccess = strapi.ee.features.isEnabled('cms-ai');

    return isAIEnabled && hasAccess;
  };

  const getAIFeatureConfig = async () => {
    const i18nSettings = await strapi.plugin('i18n').service('settings').getSettings();
    const uploadSettings = await strapi.plugin('upload').service('upload').getSettings();

    return {
      isAIi18nConfigured: Boolean(i18nSettings?.aiLocalizations),
      isAIMediaLibraryConfigured: Boolean(uploadSettings?.aiMetadata),
    };
  };

  return {
    isAIAvailable,
    getAIFeatureConfig,
  };
};

export { createAIService };
