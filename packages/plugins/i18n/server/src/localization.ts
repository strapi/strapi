import type { Core } from '@strapi/types';

/** Adapts i18n services to core's capability without resolving them before registration finishes. */
export const createLocalizationProvider = (strapi: Core.Strapi): Core.LocalizationProvider => {
  const getContentTypesService = () => strapi.plugin('i18n').service('content-types');

  return {
    isLocalizedContentType(model) {
      return getContentTypesService().isLocalizedContentType(model);
    },
    getDefaultLocale() {
      return strapi.plugin('i18n').service('locales').getDefaultLocale();
    },
    async getLocales() {
      const locales: Array<{ code: string; name: string }> | null | undefined = await strapi
        .plugin('i18n')
        .service('locales')
        .find();

      return (locales ?? []).map(({ code, name }) => ({ code, name }));
    },
    getNestedPopulateOfNonLocalizedAttributes(modelUID) {
      return getContentTypesService().getNestedPopulateOfNonLocalizedAttributes(modelUID);
    },
    getNonLocalizedAttributes(model) {
      return getContentTypesService().getNonLocalizedAttributes(model);
    },
    fillNonLocalizedAttributes(entry, relatedEntry, options) {
      getContentTypesService().fillNonLocalizedAttributes(entry, relatedEntry, options);
    },
  };
};
