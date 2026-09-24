import type { LocaleService } from '../types/services';
import type { PermissionsService } from '../services/permissions';
import type { ContentTypesService } from '../services/content-types';
import type { MetricsService } from '../services/metrics';
import type { ISOLocalesService } from '../services/iso-locales';
import type { LocalizationsService } from '../services/localizations';
import type { SanitizeService } from '../services/sanitize';
import type { SettingsService } from '../services/settings';
import type { createAILocalizationsService } from '../services/ai-localizations';
import type { createAILocalizationJobsService } from '../services/ai-localization-jobs';
import type { createAITranslationsService } from '../services/ai-translations';
import type { createFillFromLocaleService } from '../services/fill-from-locale';

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
  'ai-translations': ReturnType<typeof createAITranslationsService>;
  'fill-from-locale': ReturnType<typeof createFillFromLocaleService>;
};

const getCoreStore = () => {
  return strapi.store({ type: 'plugin', name: 'i18n' });
};

type ServiceInstance<T extends keyof S> = S[T] extends (...args: any) => any
  ? ReturnType<S[T]>
  : S[T];

// retrieve a local service
const getService = <T extends keyof S>(name: T): ServiceInstance<T> => {
  return strapi.plugin('i18n').service<ServiceInstance<T>>(name);
};

export { getService, getCoreStore };
