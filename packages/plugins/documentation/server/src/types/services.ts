import type { Services } from '../services';

export type { Services } from '../services';

/** Default contracts loaded with the Documentation server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageServices {
        'plugin::documentation.documentation': Services['documentation'];
        'plugin::documentation.override': Services['override'];
      }
    }
  }
}
