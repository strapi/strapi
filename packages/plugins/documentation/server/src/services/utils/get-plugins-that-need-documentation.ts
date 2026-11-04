import type { Core } from '@strapi/types';

import type { PluginConfig } from '../../types';

const getPluginsThatNeedDocumentation = (strapi: Core.Strapi, config: PluginConfig) => {
  // Default plugins that need documentation generated
  const defaultPlugins = ['upload', 'users-permissions'];

  // User specified plugins that need documentation generated
  const userPluginsConfig = config['x-strapi-config'].plugins;

  if (userPluginsConfig === null) {
    // The user hasn't specified any plugins to document, use the defaults that are installed
    return defaultPlugins.filter((plugin) => strapi.plugin(plugin) !== undefined);
  }

  if (userPluginsConfig.length) {
    // The user has specified certain plugins to document, use them
    return userPluginsConfig;
  }

  // The user has specified that no plugins should be documented
  return [];
};

export { getPluginsThatNeedDocumentation };
