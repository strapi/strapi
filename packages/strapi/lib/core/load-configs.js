'use strict';

const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');

const findPackagePath = require('../load/package-path');
const loadFiles = require('../load/load-files');
const requireFileAndParse = require('../load/require-file-parse');

module.exports = async ({ appPath, installedPlugins }) => {
  const [config, admin, api, plugins, localPlugins] = await Promise.all([
    loadAppConfig(appPath),
    loadAdminConfig(),
    loadApisConfig(appPath),
    loadPluginsConfig(installedPlugins),
    loadLocalPluginsConfig(appPath),
  ]);

  return {
    config,
    admin,
    api,
    plugins: _.merge(plugins, localPlugins),
  };
};

const loadConfig = dir => {
  return loadFiles(dir, 'config/**/*.+(js|json)', {
    requireFn: requireFileAndParse,
    shouldUseFileNameAsKey,
  });
};

const prefixedPaths = [
  ...['staging', 'production', 'development'].reduce((acc, env) => {
    return acc.concat(
      `environments/${env}/database`,
      `environments/${env}/security`,
      `environments/${env}/request`,
      `environments/${env}/response`,
      `environments/${env}/server`
    );
  }, []),
  'functions',
  'policies',
  'locales',
  'hook',
  'middleware',
  'language',
  'queries',
  'layout',
];

const shouldUseFileNameAsKey = file => {
  return _.some(prefixedPaths, e => file.startsWith(`config/${e}`))
    ? true
    : false;
};

// Loads an app config folder
const loadAppConfig = async appPath => {
  const { config } = await loadConfig(appPath);
  return config;
};

// Loads the strapi-admin config folder
const loadAdminConfig = () => loadConfig(findPackagePath('strapi-admin'));

// Loads every apis config folder
const loadApisConfig = async appPath => {
  let apis = {};
  const apisDir = path.resolve(appPath, 'api');
  const apiNames = await fs.readdir(apisDir);

  for (let apiDir of apiNames) {
    const apiConfig = await loadConfig(path.resolve(apisDir, apiDir));

    _.set(apis, apiDir, apiConfig);
  }

  return apis;
};

const loadLocalPluginsConfig = async appPath => {
  let localPlugins = {};
  const pluginsDir = path.resolve(appPath, 'plugins');
  const pluginsName = await fs.readdir(pluginsDir);

  for (let pluginDir of pluginsName) {
    const pluginsConfig = await loadConfig(path.resolve(pluginsDir, pluginDir));

    _.set(localPlugins, pluginDir, pluginsConfig);
  }

  return localPlugins;
};

// Loads installed plugins config
const loadPluginsConfig = async pluginsNames => {
  let plugins = {};
  for (let plugin of pluginsNames) {
    const pluginConfig = await loadConfig(
      findPackagePath(`strapi-plugin-${plugin}`)
    );

    _.set(plugins, plugin, pluginConfig);
  }

  return plugins;
};
