import type { Core } from '@strapi/types';

/** Creates the localization capability used by core, including apps without a localization plugin. */
export const createLocalizationService = (): Core.Localization => {
  let provider: Core.LocalizationProvider | undefined;

  return {
    register(localizationProvider) {
      provider = localizationProvider;
    },
    isEnabled() {
      return provider !== undefined;
    },
    isLocalizedContentType(model) {
      return provider?.isLocalizedContentType(model) ?? false;
    },
    async getDefaultLocale() {
      return provider?.getDefaultLocale() ?? null;
    },
    async getLocales() {
      return provider?.getLocales() ?? [];
    },
    getNestedPopulateOfNonLocalizedAttributes(modelUID) {
      return provider?.getNestedPopulateOfNonLocalizedAttributes(modelUID) ?? [];
    },
    getNonLocalizedAttributes(model) {
      return provider?.getNonLocalizedAttributes(model) ?? [];
    },
    fillNonLocalizedAttributes(entry, relatedEntry, options) {
      provider?.fillNonLocalizedAttributes(entry, relatedEntry, options);
    },
  };
};
