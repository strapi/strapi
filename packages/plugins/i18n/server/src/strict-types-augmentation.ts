import type { LocaleService } from './types/services';
import type {} from '@strapi/types';

/** Import this module from an application declaration file to opt in to stricter i18n types. */
declare module '@strapi/types' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Public {
    interface DefaultServiceRegistry {
      'plugin::i18n.locales': LocaleService;
    }
  }
}
