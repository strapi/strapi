import type { Core } from '@strapi/types';
import type { ContentTypesService } from './services/content-types';

/** Adapts i18n services to core's capability without resolving them before registration finishes. */
export const createLocalizationProvider = (strapi: Core.Strapi): Core.LocalizationProvider => {
  const getContentTypesService = () =>
    strapi.plugin('i18n').service<ReturnType<ContentTypesService>>('content-types');

  return {
    isLocalizedContentType(model) {
      return getContentTypesService().isLocalizedContentType(model);
    },
    getDefaultLocale() {
      return strapi.plugin('i18n').service('locales').getDefaultLocale();
    },
    getNestedPopulateOfNonLocalizedAttributes(modelUID) {
      return getContentTypesService().getNestedPopulateOfNonLocalizedAttributes(modelUID);
    },
    fillNonLocalizedAttributes(entry, relatedEntry, options) {
      getContentTypesService().fillNonLocalizedAttributes(entry, relatedEntry, options);
    },
  };
};
