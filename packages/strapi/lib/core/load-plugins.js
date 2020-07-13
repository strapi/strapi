'use strict';

const { join } = require('path');
const { existsSync } = require('fs-extra');
const { readdirSync } = require('fs');
const _ = require('lodash');
const findPackagePath = require('../load/package-path');
const loadFiles = require('../load/load-files');
const loadConfig = require('../load/load-config-files');

module.exports = async ({ dir, config }) => {
  const localPlugins = await loadLocalPlugins({ dir, config });
  const plugins = await loadPlugins({
    installedPlugins: config.installedPlugins,
    config,
  });

  const pluginsIntersection = _.intersection(Object.keys(localPlugins), Object.keys(plugins));

  if (pluginsIntersection.length > 0) {
    throw new Error(
      `You have some local plugins with the same name as npm installed plugins:\n${pluginsIntersection
        .map(p => `- ${p}`)
        .join('\n')}`
    );
  }

  // check for conflicts
  return _.merge(plugins, localPlugins);
};

const loadLocalPlugins = async ({ dir, config }) => {
  const pluginsDir = join(dir, 'plugins');

  if (!existsSync(pluginsDir)) return {};

  const plugins = {};

  for (const plugin of readdirSync(pluginsDir)) {
    if (typeof config.plugins[plugin] !== 'undefined' && config.plugins[plugin].enabled === false)
      continue;

    const pluginDir = join(pluginsDir, plugin);

    const [files, configs] = await Promise.all([
      loadFiles(pluginDir, '{!(config)/*.*(js|json),package.json}'),
      loadConfig(pluginDir, 'config/**/*.+(js|json)'),
    ]);

    plugins[plugin] = _.merge(files, configs);
  }

  return plugins;
};

const loadPlugins = async ({ installedPlugins, config }) => {
  let plugins = {};

  for (let plugin of installedPlugins) {
    if (typeof config.plugins[plugin] !== 'undefined' && config.plugins[plugin].enabled === false)
      continue;

    const pluginPath = findPackagePath(`strapi-plugin-${plugin}`);

    const files = await loadFiles(
      pluginPath,
      '{!(config|node_modules|test)/*.*(js|json),package.json}'
    );

    const { config: pluginConfig } = await loadConfig(pluginPath);

    const userConfig = config.get(['plugins', plugin], {});

    const mergedConfig = _.merge(pluginConfig, userConfig);

    _.set(plugins, plugin, _.assign({}, files, { config: mergedConfig }));
  }

  return plugins;
};
