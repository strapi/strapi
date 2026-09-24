import type { Core } from '@strapi/types';

/** Creates the localization capability used by core, including apps without a localization plugin. */
export const createLocalizationService = (): Core.Localization => {
  let provider: Core.LocalizationProvider | undefined;

  return {
    register(localizationProvider) {
      provider = localizationProvider;
    },
    isLocalizedContentType(model) {
      return provider?.isLocalizedContentType(model) ?? false;
    },
    async getDefaultLocale() {
      return provider?.getDefaultLocale() ?? null;
    },
    getNestedPopulateOfNonLocalizedAttributes(modelUID) {
      return provider?.getNestedPopulateOfNonLocalizedAttributes(modelUID) ?? [];
    },
    fillNonLocalizedAttributes(entry, relatedEntry, options) {
      provider?.fillNonLocalizedAttributes(entry, relatedEntry, options);
    },
  };
};
