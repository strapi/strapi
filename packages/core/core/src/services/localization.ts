import type { Modules } from '@strapi/types';

const PROVIDER_METHODS = [
  'isLocalizedContentType',
  'getDefaultLocale',
  'getLocales',
  'getNestedPopulateOfNonLocalizedAttributes',
  'getNonLocalizedAttributes',
  'fillNonLocalizedAttributes',
] as const satisfies ReadonlyArray<keyof Modules.Localization.Provider>;

/** Creates the localization capability used by core, including apps without a localization plugin. */
export const createLocalizationService = (): Modules.Localization.Service => {
  let provider: Modules.Localization.Provider | undefined;

  return {
    register(localizationProvider) {
      if (provider !== undefined) {
        throw new Error('A localization provider is already registered for this application.');
      }

      // Fail at registration rather than on first use, which can be inside a sync hook
      for (const name of PROVIDER_METHODS) {
        if (typeof localizationProvider[name] !== 'function') {
          throw new Error(`Localization provider is missing "${name}"`);
        }
      }

      provider = localizationProvider;
    },
    isEnabled() {
      return provider !== undefined;
    },
    isLocalizedContentType(model) {
      return provider?.isLocalizedContentType(model) ?? false;
    },
    async getDefaultLocale() {
      return (await provider?.getDefaultLocale()) ?? null;
    },
    async getLocales() {
      return (await provider?.getLocales()) ?? [];
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
