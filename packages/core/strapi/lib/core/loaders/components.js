'use strict';

const { join } = require('path');
const _ = require('lodash');
const { pathExists } = require('fs-extra');
const loadFiles = require('../../load/load-files');

module.exports = async (strapi) => {
  const localComponentsMap = await loadLocalComponents(strapi);
  const pluginComponentsMap = await loadPluginComponents(strapi);

  const map = _.defaultsDeep(localComponentsMap, pluginComponentsMap);

  return Object.keys(map).reduce((acc, category) => {
    Object.keys(map[category]).forEach((key) => {
      const schema = map[category][key];

      if (!schema.collectionName) {
        const filePath = join(strapi.dirs.components, category, schema.__filename__);
        return strapi.stopWithError(
          `Component ${key} is missing a "collectionName" property.\nVerify file ${filePath}.`
        );
      }

      const uid = `${category}.${key}`;

      acc[uid] = Object.assign(schema, {
        __schema__: _.cloneDeep(schema),
        uid,
        category,
        modelType: 'component',
        modelName: key,
        globalId: schema.globalId || _.upperFirst(_.camelCase(`component_${uid}`)),
      });
    });

    return acc;
  }, {});
};

const loadPluginComponents = async (strapi) => {
  const plugins = strapi.config.get('enabledPlugins');

  if (!plugins) {
    return {};
  }

  let components = {};

  for (let plugin in plugins) {
    const pluginConfig = plugins[plugin];
    const componentsDir = join(pluginConfig.pathToPlugin, 'server', 'components');

    if (await pathExists(componentsDir)) {
      const componentCategories = await loadFiles(componentsDir, '*/*.*(js|json)');
      const prefix = `${pluginConfig.info.componentsPrefix || plugin}-`;
      const prefixedCategoriesMap = _.mapKeys(componentCategories, (_, key) => {
        if (key.startsWith(prefix)) {
          return key;
        }
        return `${prefix}${key}`;
      });
      _.merge(components, prefixedCategoriesMap);
    }
  }

  return components;
};

async function loadLocalComponents(strapi) {
  let localComponentsMap = {};

  if (await pathExists(strapi.dirs.components)) {
    localComponentsMap = await loadFiles(strapi.dirs.components, '*/*.*(js|json)');
  }
  return localComponentsMap;
}
