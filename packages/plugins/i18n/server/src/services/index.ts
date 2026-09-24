import type { Core } from '@strapi/types';
import permissions from './permissions';
import metrics from './metrics';
import localizations from './localizations';
import locales from './locales';
import isoLocales from './iso-locales';
import contentTypes from './content-types';
import sanitize from './sanitize';
import { createSettingsService } from './settings';
import { createAILocalizationsService } from './ai-localizations';
import { createAITranslationsService } from './ai-translations';
import { createAILocalizationJobsService } from './ai-localization-jobs';
import { createFillFromLocaleService } from './fill-from-locale';

type Services = {
  [TUID in keyof Strapi.Registries.PackageServices as TUID extends `plugin::i18n.${infer TName}`
    ? TName
    : never]:
    | Strapi.Registries.PackageServices[TUID]
    | ((params: { strapi: Core.Strapi }) => Strapi.Registries.PackageServices[TUID]);
};

export default {
  permissions,
  metrics,
  localizations,
  locales,
  sanitize,
  'iso-locales': isoLocales,
  'content-types': contentTypes,
  'ai-localizations': createAILocalizationsService,
  'ai-translations': createAITranslationsService,
  'ai-localization-jobs': createAILocalizationJobsService,
  settings: createSettingsService,
  'fill-from-locale': createFillFromLocaleService,
} satisfies Services;
