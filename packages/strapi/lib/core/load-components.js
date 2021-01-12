'use strict';

const { join } = require('path');
const _ = require('lodash');
const { exists } = require('fs-extra');
const loadFiles = require('../load/load-files');
const findPackagePath = require('../load/package-path');

module.exports = async ({ dir, config }) => {
  const localComponents = await loadLocalComponents({ dir, config });
  const components = await loadExternalComponents({
    installedPlugins: config.installedPlugins,
    config,
  });

  const componentsIntersection = _.intersection(Object.keys(loadExternalComponents), Object.keys(components));

  if (components.length > 0) {
    throw new Error(
      `You have some local components with the same name as npm installed plugins:\n${componentsIntersection
        .map(p => `- ${p}`)
        .join('\n')}`
    );
  }

  // check for conflicts
  return _.merge(components, localComponents);
};

const loadLocalComponents = async ({ dir }) => {
  const componentsDir = join(dir, 'components');
  return loadComponents(componentsDir)
};

const loadExternalComponents = async ({ installedPlugins }) => {
  let components = {};

  for (let plugin of installedPlugins) {
    const pluginPath = findPackagePath(`strapi-plugin-${plugin}`);
    const componentsDir = join(pluginPath, 'components');
    const component = await loadComponents(componentsDir);
    _.merge(components,  component);
  }

  return components;
};

async function loadComponents(componentsDir) {
  if (!(await exists(componentsDir))) {
    return {};
  }

  const map = await loadFiles(componentsDir, '*/*.*(js|json)');

  return Object.keys(map).reduce((acc, category) => {
    Object.keys(map[category]).forEach(key => {
      const schema = map[category][key];

      const filePath = join(componentsDir, category, schema.__filename__);

      if (!schema.collectionName) {
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
}
