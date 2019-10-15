'use strict';

const { join } = require('path');
const { existsSync } = require('fs-extra');
const _ = require('lodash');
const findPackagePath = require('../load/package-path');
const loadFiles = require('../load/load-files');
const loadConfig = require('../load/load-config-files');

module.exports = async ({ dir, config }) => {
  const localPlugins = await loadLocalPlugins({ dir });
  const plugins = await loadPlugins({
    installedPlugins: config.installedPlugins,
  });

  const pluginsIntersection = _.intersection(
    Object.keys(localPlugins),
    Object.keys(plugins)
  );

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

const loadLocalPlugins = async ({ dir }) => {
  const pluginsDir = join(dir, 'plugins');

  if (!existsSync(pluginsDir)) return {};

  const [files, configs] = await Promise.all([
    loadFiles(pluginsDir, '{*/!(config)/*.*(js|json),*/package.json}'),
    loadConfig(pluginsDir, '*/config/**/*.+(js|json)'),
  ]);

  return _.merge(files, configs);
};

const loadPlugins = async ({ installedPlugins }) => {
  let plugins = {};

  for (let plugin of installedPlugins) {
    const pluginPath = findPackagePath(`strapi-plugin-${plugin}`);

    const files = await loadFiles(
      pluginPath,
      '{!(config|node_modules|test)//*.*(js|json),package.json}'
    );

    const conf = await loadConfig(pluginPath);

    _.set(plugins, plugin, _.assign({}, conf, files));
  }

  return plugins;
};
