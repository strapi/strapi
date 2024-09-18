import type { LocaleService } from '../services/locales';
import type { PermissionsService } from '../services/permissions';
import type { ContentTypesService } from '../services/content-types';
import type { MetricsService } from '../services/metrics';
import type { ISOLocalesService } from '../services/iso-locales';
import type { LocalizationsService } from '../services/localizations';

type S = {
  permissions: PermissionsService;
  metrics: MetricsService;
  locales: LocaleService;
  localizations: LocalizationsService;
  ['iso-locales']: ISOLocalesService;
  ['content-types']: ContentTypesService;
};

const getCoreStore = () => {
  return strapi.store({ type: 'plugin', name: 'i18n' });
};

// retrieve a local service
const getService = <T extends keyof S>(name: T): ReturnType<S[T]> => {
  return strapi.plugin('i18n').service(name);
};

export { getService, getCoreStore };
