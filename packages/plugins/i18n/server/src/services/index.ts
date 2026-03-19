import permissions from './permissions';
import metrics from './metrics';
import localizations from './localizations';
import locales from './locales';
import isoLocales from './iso-locales';
import contentTypes from './content-types';
import sanitize from './sanitize';
import { createSettingsService } from './settings';
import { createAILocalizationsService } from './ai-localizations';
import { createAILocalizationJobsService } from './ai-localization-jobs';
import { createFillFromLocaleService } from './fill-from-locale';

export default {
  permissions,
  metrics,
  localizations,
  locales,
  sanitize,
  'iso-locales': isoLocales,
  'content-types': contentTypes,
  'ai-localizations': createAILocalizationsService,
  'ai-localization-jobs': createAILocalizationJobsService,
  settings: createSettingsService,
  'fill-from-locale': createFillFromLocaleService,
};
