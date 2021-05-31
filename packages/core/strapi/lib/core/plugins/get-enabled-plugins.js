'use strict';

const { dirname, join } = require('path');
const { statSync, existsSync } = require('fs');
const _ = require('lodash');
const { get, has, pick, pickBy, defaultsDeep, map, prop, pipe } = require('lodash/fp');
const { nameToSlug } = require('@strapi/utils');

const isStrapiPlugin = info => get('strapi.kind', info) === 'plugin';

const toDetailedDeclaration = declaration => {
  if (typeof declaration === 'boolean') {
    return { enabled: declaration };
  }

  let detailedDeclaration = pick('enabled', declaration);
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
  const installedPlugins = {};
  for (const dep in strapi.config.info.dependencies) {
    const packagePath = join(dep, 'package.json');
    const packageInfo = require(packagePath);

    if (isStrapiPlugin(packageInfo)) {
      const cleanPluginName = nameToSlug(packageInfo.strapi.name);
      installedPlugins[cleanPluginName] = toDetailedDeclaration({
        enabled: true,
        resolve: packagePath,
      });
    }
  }

  const declaredPlugins = {};
  _.forEach(strapi.config.plugins, (declaration, pluginName) => {
    const cleanPluginName = nameToSlug(pluginName);
    declaredPlugins[cleanPluginName] = toDetailedDeclaration(declaration);
  });

  const declaredPluginsResolves = map(prop('pathToPlugin'), declaredPlugins);
  const installedPluginsNotAlreadyUsed = pickBy(
    p => !declaredPluginsResolves.includes(p.pathToPlugin),
    installedPlugins
  );
  const enabledPlugins = pipe(
    defaultsDeep(installedPluginsNotAlreadyUsed),
    pickBy(p => p.enabled)
  )(declaredPlugins);

  return enabledPlugins;
};

module.exports = getEnabledPlugins;
