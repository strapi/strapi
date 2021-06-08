'use strict';

// const { reduce } = require('lodash/fp');
const getEnabledPlugins = require('./get-enabled-plugins');
const createPlugin = require('./create-plugin');

const createPluginProvider = async strapi => {
  const enabledPlugins = await getEnabledPlugins(strapi);
  const plugins = {};
  for (const pluginName in enabledPlugins) {
    const enabledPlugin = enabledPlugins[pluginName];
    plugins[pluginName] = await createPlugin(strapi, pluginName, enabledPlugin);
  }

  const provider = pluginName => provider.get(pluginName);

  Object.assign(provider, {
    get(pluginName) {
      return plugins[pluginName];
    },
    getAll() {
      return Object.values(plugins);
    },
  });

  return provider;
};

module.exports = createPluginProvider;
