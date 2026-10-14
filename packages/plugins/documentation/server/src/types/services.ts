import type { Services } from '../services';
import type { PluginConfig } from '../types';

export type { Services } from '../services';

/** Default contracts loaded with the Documentation server types. */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      /** The plugin config merged with its defaults. */
      interface PackageConfigs {
        'plugin::documentation': PluginConfig;
      }

      interface PackageServices {
        'plugin::documentation.documentation': Services['documentation'];
        'plugin::documentation.override': Services['override'];
      }
    }
  }
}
