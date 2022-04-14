'use strict';

const { dirname, join, resolve } = require('path');
const { statSync, existsSync } = require('fs');
const _ = require('lodash');
const { get, has, pick, pickBy, defaultsDeep, map, prop, pipe } = require('lodash/fp');
const { isKebabCase } = require('@strapi/utils');
const getUserPluginsConfig = require('./get-user-plugins-config');

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
      pathToPlugin = resolve(strapi.dirs.app.root, declaration.resolve);

      if (!existsSync(pathToPlugin) || !statSync(pathToPlugin).isDirectory()) {
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
    internalPlugins[packageInfo.strapi.name] = {
      ...toDetailedDeclaration({ enabled: true, resolve: packagePath }),
      info: packageInfo.strapi,
    };
  }

  const installedPlugins = {};
  for (const dep in strapi.config.get('info.dependencies', {})) {
    const packagePath = join(dep, 'package.json');
    let packageInfo;
    try {
      packageInfo = require(packagePath);
    } catch {
      continue;
    }

    if (isStrapiPlugin(packageInfo)) {
      validatePluginName(packageInfo.strapi.name);
      installedPlugins[packageInfo.strapi.name] = {
        ...toDetailedDeclaration({ enabled: true, resolve: packagePath }),
        info: {
          ...packageInfo.strapi,
          packageName: packageInfo.name,
        },
      };
    }
  }

  const declaredPlugins = {};
  const userPluginsConfig = await getUserPluginsConfig();

  _.forEach(userPluginsConfig, (declaration, pluginName) => {
    validatePluginName(pluginName);

    declaredPlugins[pluginName] = {
      ...toDetailedDeclaration(declaration),
      info: {},
    };

    const { pathToPlugin } = declaredPlugins[pluginName];

    // for manually resolved plugins
    if (pathToPlugin) {
      const packagePath = join(pathToPlugin, 'package.json');
      const packageInfo = require(packagePath);

      if (isStrapiPlugin(packageInfo)) {
        declaredPlugins[pluginName].info = packageInfo.strapi || {};
      }
    }
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
