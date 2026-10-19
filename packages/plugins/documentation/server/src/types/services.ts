import type { Services } from '../services';
import type { Config, PluginConfig } from '../types';

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

      /**
       * The access settings of the documentation page, written with `restrictedAccess: false` at the
       * first start. `password` is the bcrypt hash of the access password, missing until one is set.
       */
      interface Stores {
        plugin_documentation_config: Config;
      }

      interface PackageServices {
        'plugin::documentation.documentation': Services['documentation'];
        'plugin::documentation.override': Services['override'];
      }
    }
  }
}
