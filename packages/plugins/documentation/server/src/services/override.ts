import type { Core } from '@strapi/types';

import { getPluginsThatNeedDocumentation } from './utils/get-plugins-that-need-documentation';
import type { PluginConfig } from '../types';

export type OverrideService = ReturnType<typeof createService>;

const createService = ({ strapi }: { strapi: Core.Strapi }) => {
  const registeredOverrides: Partial<PluginConfig>[] = [];
  const excludedFromGeneration: string[] = [];

  return {
    /**
     * The registered overrides, merged by `generateFullDoc` in registration order.
     *
     * @internal
     */
    registeredOverrides,
    /**
     * The APIs and plugins left out of the generated paths. Names are kept as given, duplicates
     * included.
     *
     * @internal
     */
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

    /**
     * Whether `name` is excluded from generation. Despite its name, `true` means excluded.
     *
     * @internal
     */
    isEnabled(name: string) {
      return excludedFromGeneration.includes(name);
    },

    registerOverride(
      override: Partial<PluginConfig>,
      opts?: { pluginOrigin: string; excludeFromGeneration?: string[] }
    ) {
      const { pluginOrigin, excludeFromGeneration = [] } = opts ?? {};

      const pluginsThatNeedDocumentation = getPluginsThatNeedDocumentation(
        strapi,
        strapi.config.get('plugin::documentation')
      );
      // Don't apply the override if the plugin is not in the list of plugins that need documentation
      if (pluginOrigin && !pluginsThatNeedDocumentation.includes(pluginOrigin)) return;

      if (excludeFromGeneration.length) {
        this.excludeFromGeneration(excludeFromGeneration);
      }

      let overrideToRegister = override;
      // Parse yaml if we receive a string
      if (typeof override === 'string') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        overrideToRegister = require('yaml').parse(overrideToRegister);
      }
      // receive an object we can register it directly
      registeredOverrides.push(overrideToRegister);
    },
  };
};

export default createService;
