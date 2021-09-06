'use strict';

const { dirname, join } = require('path');
const { statSync, existsSync } = require('fs');
const _ = require('lodash');
const { get, has, pick, pickBy, defaultsDeep, map, prop, pipe } = require('lodash/fp');
const { isKebabCase } = require('@strapi/utils');
const loadConfigFile = require('../../app-configuration/load-config-file');

const isStrapiPlugin = info => get('strapi.kind', info) === 'plugin';
const INTERNAL_PLUGINS = [
  '@strapi/plugin-content-manager',
  '@strapi/plugin-content-type-builder',
  '@strapi/plugin-email',
  '@strapi/plugin-upload',
];

const validatePluginName = pluginName => {
  if (!isKebabCase(pluginName)) {
    throw new Error(`Plugin name "${pluginName}" is not in kebab (an-example-of-kebab-case)`);
  }
};

const toDetailedDeclaration = declaration => {
  if (typeof declaration === 'boolean') {
    return { enabled: declaration };
  }

  let detailedDeclaration = pick(['enabled'], declaration);
  if (has('resolve', declaration)) {
    let pathToPlugin = '';
    try {
      pathToPlugin = dirname(require.resolve(declaration.resolve));
    } catch (e) {
      if (existsSync(declaration.resolve) && statSync(declaration.resolve).isDirectory()) {
        pathToPlugin = declaration.resolve;
      } else {
        throw new Error(`${declaration.resolve} couldn't be resolved`);
      }
    }

    detailedDeclaration.pathToPlugin = pathToPlugin;
  }
  return detailedDeclaration;
};

const getEnabledPlugins = async strapi => {
  const internalPlugins = {};
  for (const dep of INTERNAL_PLUGINS) {
    const packagePath = join(dep, 'package.json');
    const packageInfo = require(packagePath);

    validatePluginName(packageInfo.strapi.name);
    internalPlugins[packageInfo.strapi.name] = toDetailedDeclaration({
      enabled: true,
      resolve: packagePath,
    });
  }

  const installedPlugins = {};
  for (const dep in strapi.config.get('info.dependencies', {})) {
    const packagePath = join(dep, 'package.json');
    const packageInfo = require(packagePath);

    if (isStrapiPlugin(packageInfo)) {
      validatePluginName(packageInfo.strapi.name);
      installedPlugins[packageInfo.strapi.name] = toDetailedDeclaration({
        enabled: true,
        resolve: packagePath,
      });
    }
  }

  const declaredPlugins = {};
  const userPluginConfigPath = join(strapi.dir, 'config', 'plugins.js');
  const userPluginsConfig = existsSync(userPluginConfigPath)
    ? loadConfigFile(userPluginConfigPath)
    : {};
  _.forEach(userPluginsConfig, (declaration, pluginName) => {
    validatePluginName(pluginName);
    declaredPlugins[pluginName] = toDetailedDeclaration(declaration);
  });

  const declaredPluginsResolves = map(prop('pathToPlugin'), declaredPlugins);
  const installedPluginsNotAlreadyUsed = pickBy(
    p => !declaredPluginsResolves.includes(p.pathToPlugin),
    installedPlugins
  );
  const enabledPlugins = pipe(
    defaultsDeep(declaredPlugins),
    defaultsDeep(installedPluginsNotAlreadyUsed),
    pickBy(p => p.enabled)
  )(internalPlugins);

  return enabledPlugins;
};

module.exports = getEnabledPlugins;
