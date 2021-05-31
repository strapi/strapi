'use strict';

const { reduce } = require('lodash/fp');
const getEnabledPlugins = require('./get-enabled-plugins');
const createPlugin = require('./create-plugin');

const createPluginProvider = async strapi => {
  const enabledPlugins = await getEnabledPlugins(strapi);
  const createdPlugins = {};
  for (const pluginName in enabledPlugins) {
    const enabledPlugin = enabledPlugins[pluginName];
    createdPlugins[pluginName] = await createPlugin(strapi, pluginName, enabledPlugin.pathToPlugin);
  }

  const getAllContentTypes = () =>
    reduce((all, plugin) => {
      all.push(...plugin.getAllContentTypes());
      return all;
    }, [])(createdPlugins);

  return {
    plugin: name => createdPlugins[name],
    getAllContentTypes,
  };
};

module.exports = createPluginProvider;
