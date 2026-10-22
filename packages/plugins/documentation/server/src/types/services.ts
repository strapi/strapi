import type { Services } from '../services';
import type { Config, PluginConfig } from '../types';

export type { Services } from '../services';

/**
 * The registered `override` service: lets plugins and applications add their own OpenAPI parts to
 * the generated documentation.
 */
export type OverrideService = Omit<Services['override'], 'registerOverride'> & {
  /**
   * Registers an OpenAPI part merged into every generated documentation version, or only into the
   * version its `info.version` names.
   *
   * @param override - The OpenAPI part, or its YAML or JSON text. Text is parsed when it is
   * registered, and a parse error is thrown to the caller.
   * @param opts.pluginOrigin - The plugin the override documents. The override is skipped when that
   * plugin is not in the documented plugins.
   * @param opts.excludeFromGeneration - APIs and plugins left out of the generated paths, as
   * `excludeFromGeneration` does.
   */
  registerOverride(
    override: Partial<PluginConfig> | string,
    opts?: { pluginOrigin?: string; excludeFromGeneration?: string[] }
  ): void;
};

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
        'plugin::documentation.override': OverrideService;
      }
    }
  }
}
