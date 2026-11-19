import { has } from 'lodash';

import type { Core } from '@strapi/types';
import type { Module, RawModule } from '../domain/module';

/** Plugins keyed by name: the module registered under `plugin::<name>` for each. */
type PluginMap = Record<string, Module>;

const pluginsRegistry = (strapi: Core.Strapi) => {
  const plugins: PluginMap = {};

  return {
    get(name: string) {
      return plugins[name];
    },
    getAll() {
      return plugins;
    },
    add(name: string, pluginConfig: RawModule) {
      if (has(plugins, name)) {
        throw new Error(`Plugin ${name} has already been registered.`);
      }

      const pluginModule = strapi.get('modules').add(`plugin::${name}`, pluginConfig);
      plugins[name] = pluginModule;

      return plugins[name];
    },
  };
};

export default pluginsRegistry;
