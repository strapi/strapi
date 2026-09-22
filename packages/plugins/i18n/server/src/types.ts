import type { LocaleService } from './public-services';
import type {} from '@strapi/types';

export type { Locale, LocaleFilters, LocaleService } from './public-services';

/** Import this module from an application declaration file to opt in to service inference. */
declare module '@strapi/types' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Public {
    interface DefaultServiceRegistry {
      'plugin::i18n.locales': LocaleService;
    }
  }
}
