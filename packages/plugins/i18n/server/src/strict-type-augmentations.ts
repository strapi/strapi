import type { LocaleService } from './types/services';

/** Import this module from an application declaration file to opt in to stricter i18n types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface DefaultServices {
        'plugin::i18n.locales': LocaleService;
      }
    }
  }
}
