import type { Core } from '@strapi/types';

import { getPluginsThatNeedDocumentation } from './utils/get-plugins-that-need-documentation';
import type { PluginConfig } from '../types';

export type OverrideService = ReturnType<typeof createService>;

const createService = ({ strapi }: { strapi: Core.Strapi }) => {
  const registeredOverrides: Partial<PluginConfig>[] = [];
  const excludedFromGeneration: string[] = [];

  return {
    registeredOverrides,
    excludedFromGeneration,
    /**
     *
     * @param {(string | string[])} api - The name of the api or and array of apis to exclude from generation
     */
    excludeFromGeneration(api: string | string[]) {
      if (Array.isArray(api)) {
        excludedFromGeneration.push(...api);

        return;
      }

      excludedFromGeneration.push(api);
    },

    isEnabled(name: string) {
      return excludedFromGeneration.includes(name);
    },

    registerOverride(
      override: Partial<PluginConfig> | string,
      opts?: { pluginOrigin: string; excludeFromGeneration?: string[] }
    ) {
      const { pluginOrigin, excludeFromGeneration = [] } = opts ?? {};

      const pluginsThatNeedDocumentation = getPluginsThatNeedDocumentation(
        strapi.config.get('plugin::documentation')
      );
      // Don't apply the override if the plugin is not in the list of plugins that need documentation
      if (pluginOrigin && !pluginsThatNeedDocumentation.includes(pluginOrigin)) return;

      let overrideToRegister: unknown = override;
      // Parse yaml if we receive a string
      if (typeof override === 'string') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        overrideToRegister = require('yaml').parse(override);
      }

      // Only an object can hold OpenAPI parts, YAML can also parse to a scalar, an array or null.
      // Warn and skip instead of throwing, as this runs during register and must not prevent boot
      if (
        typeof overrideToRegister !== 'object' ||
        overrideToRegister === null ||
        Array.isArray(overrideToRegister) === true
      ) {
        let receivedType: string = typeof overrideToRegister;
        if (overrideToRegister === null) {
          receivedType = 'null';
        } else if (Array.isArray(overrideToRegister) === true) {
          receivedType = 'array';
        }

        strapi.log.warn(
          `[documentation] Ignoring override from "${pluginOrigin ?? 'app'}": expected an object, received ${receivedType}`
        );

        return;
      }

      // Exclude apis only once the override is valid, so a skipped override changes nothing
      if (excludeFromGeneration.length > 0) {
        this.excludeFromGeneration(excludeFromGeneration);
      }

      registeredOverrides.push(overrideToRegister as Partial<PluginConfig>);
    },
  };
};

export default createService;
