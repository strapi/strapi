import type { Core } from '@strapi/types';

const createAIContainer = ({ strapi }: { strapi: Core.Strapi }) => {
  const getAIFeatureConfig = async () => {
    const i18nSettings = await strapi.plugin('i18n').service('settings').getSettings();
    const uploadSettings = await strapi.plugin('upload').service('upload').getSettings();

    return {
      isAIi18nConfigured: Boolean(i18nSettings?.aiLocalizations),
      isAIMediaLibraryConfigured: Boolean(uploadSettings?.aiMetadata),
    };
  };

  return {
    getAIFeatureConfig,
  };
};

export { createAIContainer };
