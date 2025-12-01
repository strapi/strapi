import { has } from 'lodash/fp';

import type { Core } from '@strapi/types';

type PluginMap = Record<string, Core.Plugin>;

const pluginsRegistry = (strapi: Core.Strapi) => {
  const plugins: PluginMap = {};

  return {
    get(name: string) {
      return plugins[name];
    },
    getAll() {
      return plugins;
    },
    add(name: string, pluginConfig: Core.Plugin, options?: { force?: boolean }) {
      if (has(name, plugins) && !options?.force) {
        throw new Error(`Plugin ${name} has already been registered.`);
      }

      const pluginModule = strapi.get('modules').add(`plugin::${name}`, pluginConfig);
      plugins[name] = pluginModule;

      return plugins[name];
    },

    /**
     * Removes a plugin by name
     */
    remove(name: string) {
      delete plugins[name];
      return this;
    },

    /**
     * Clears all plugins
     */
    clear() {
      for (const key of Object.keys(plugins)) {
        delete plugins[key];
      }
      return this;
    },
  };
};

export default pluginsRegistry;
