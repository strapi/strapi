import type { SentryConfig } from './config';
import type { SentryService } from './services';

export type * as Config from './config';
export type * as Services from './services';

/** Default contracts loaded with the plugin's server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface DefaultServices {
        'plugin::sentry.sentry': SentryService;
      }

      interface DefaultConfigs {
        'plugin::sentry': SentryConfig;
      }
    }
  }
}
