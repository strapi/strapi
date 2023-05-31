'use strict';

const getPluginsThatNeedDocumentation = (config) => {
  // Default plugins that need documentation generated
  const defaultPlugins = ['upload', 'users-permissions'];

  // User specified plugins that need documentation generated
  const userPluginsConfig = config['x-strapi-config'].plugins;

  if (userPluginsConfig === null) {
    // The user hasn't specified any plugins to document, use the defaults
    return defaultPlugins;
  }

  if (userPluginsConfig.length) {
    // The user has specified certain plugins to document, use them
    return userPluginsConfig;
  }

  // The user has specified that no plugins should be documented
  return [];
};

module.exports = { getPluginsThatNeedDocumentation };
