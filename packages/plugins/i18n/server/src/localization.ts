import type { Core } from '@strapi/types';
import type { ContentTypesService } from './services/content-types';
import type { LocaleService } from './services/locales';

/** Adapts i18n services to core's capability without resolving them before registration finishes. */
export const createLocalizationProvider = (strapi: Core.Strapi): Core.LocalizationProvider => {
  const getContentTypesService = () =>
    strapi.plugin('i18n').service<ReturnType<ContentTypesService>>('content-types');
  const getLocalesService = () =>
    strapi.plugin('i18n').service<ReturnType<LocaleService>>('locales');

  return {
    isLocalizedContentType(model) {
      return getContentTypesService().isLocalizedContentType(model);
    },
    async getDefaultLocale() {
      // The core store is untyped: only a code string is a default locale
      const value: unknown = await getLocalesService().getDefaultLocale();
      return typeof value === 'string' ? value : null;
    },
    async getLocales() {
      const locales: Array<{ code: string; name: string }> | null | undefined =
        await getLocalesService().find();

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
