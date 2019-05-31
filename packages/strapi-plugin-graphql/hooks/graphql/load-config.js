const loadUtils = require('strapi/lib/load');
const _ = require('lodash');

const loadApisGraphqlConfig = appPath =>
  loadUtils.loadFiles(appPath, 'api/**/config/*.graphql?(.js)');

const loadPluginsGraphqlConfig = async installedPlugins => {
  const root = {};

  for (let pluginName of installedPlugins) {
    const pluginDir = loadUtils.findPackagePath(`strapi-plugin-${pluginName}`);

    const result = await loadUtils.loadFiles(
      pluginDir,
      'config/*.graphql?(.js)'
    );
    _.set(root, ['plugins', pluginName], result);
  }
  return root;
};

const loadLocalPluginsGraphqlConfig = async appPath =>
  loadUtils.loadFiles(appPath, 'plugins/**/config/*.graphql?(.js)');

/**
 * Loads the graphql config files
 */
module.exports = async ({ appPath, installedPlugins }) => {
  const [apis, plugins, localPlugins] = await Promise.all([
    loadApisGraphqlConfig(appPath),
    loadPluginsGraphqlConfig(installedPlugins),
    loadLocalPluginsGraphqlConfig(appPath),
  ]);

  return _.merge({}, apis, plugins, localPlugins);
};
