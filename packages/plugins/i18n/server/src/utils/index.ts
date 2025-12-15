import type { LocaleService } from '../services/locales';
import type { PermissionsService } from '../services/permissions';
import type { ContentTypesService } from '../services/content-types';
import type { MetricsService } from '../services/metrics';
import type { ISOLocalesService } from '../services/iso-locales';
import type { LocalizationsService } from '../services/localizations';
import type { SanitizeService } from '../services/sanitize';
import type { SettingsService } from '../services/settings';
import type { createAILocalizationsService } from '../services/ai-localizations';
import type { createAILocalizationJobsService } from '../services/ai-localization-jobs';

type S = {
  permissions: PermissionsService;
  metrics: MetricsService;
  locales: LocaleService;
  localizations: LocalizationsService;
  settings: SettingsService;
  ['iso-locales']: ISOLocalesService;
  ['content-types']: ContentTypesService;
  sanitize: SanitizeService;
  ['ai-localizations']: ReturnType<typeof createAILocalizationsService>;
  'ai-localization-jobs': ReturnType<typeof createAILocalizationJobsService>;
};

const getCoreStore = () => {
  return strapi.store({ type: 'plugin', name: 'i18n' });
};

// retrieve a local service
const getService = <T extends keyof S>(
  name: T
): S[T] extends (...args: any) => any ? ReturnType<S[T]> : S[T] => {
  return strapi.plugin('i18n').service(name);
};

export { getService, getCoreStore };
