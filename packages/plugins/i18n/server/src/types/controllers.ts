import type { Core } from '@strapi/types';

/** Admin and Content API actions on locales. */
export type LocalesController = {
  listLocales: Core.ControllerHandler;
  createLocale: Core.ControllerHandler;
  updateLocale: Core.ControllerHandler;
  deleteLocale: Core.ControllerHandler;
};

/** Admin action listing the ISO locales a locale can be created from. */
export type IsoLocalesController = {
  listIsoLocales: Core.ControllerHandler;
};

/** Admin actions supporting localized content types in the Content Manager. */
export type ContentTypesController = {
  getNonLocalizedAttributes: Core.ControllerHandler;
  getFillFromLocaleData: Core.ControllerHandler;
};

/** Admin actions on the i18n plugin settings. */
export type SettingsController = {
  getSettings: Core.ControllerHandler;
  updateSettings: Core.ControllerHandler;
};

/** Admin actions reading AI localization jobs. */
export type AILocalizationJobsController = {
  getJobForCollectionType: Core.ControllerHandler;
  getJobForSingleType: Core.ControllerHandler;
};
