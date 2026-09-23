import type { SentryService } from './types/services';

/** Import this module from an application declaration file to opt in to stricter Sentry types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface DefaultServices {
        'plugin::sentry.sentry': SentryService;
      }
    }
  }
}
