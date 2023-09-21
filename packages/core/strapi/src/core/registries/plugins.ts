import { has } from 'lodash/fp';

import type { Strapi, Common } from '@strapi/types';

type PluginMap = Record<string, Common.Plugin>;

const pluginsRegistry = (strapi: Strapi) => {
  const plugins: PluginMap = {};

  return {
    get(name: string) {
      return plugins[name];
    },
    getAll() {
      return plugins;
    },
    add(name: string, pluginConfig: Common.Plugin) {
      if (has(name, plugins)) {
        throw new Error(`Plugin ${name} has already been registered.`);
      }

      const pluginModule = strapi.container.get('modules').add(`plugin::${name}`, pluginConfig);
      plugins[name] = pluginModule;

      return plugins[name];
    },
  };
};

export default pluginsRegistry;
