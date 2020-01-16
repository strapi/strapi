'use strict';

const _ = require('lodash');
const { join } = require('path');
const { exists } = require('fs-extra');
const { LoadingError } = require('./errors');
const loadFiles = require('../load/load-files');

module.exports = async ({ dir }) => {
  const componentsDir = join(dir, 'components');

  if (!(await exists(componentsDir))) {
    return {};
  }

  const map = await loadFiles(componentsDir, '*/*.*(js|json)');

  return Object.keys(map).reduce((acc, category) => {
    Object.keys(map[category]).forEach(key => {
      const schema = map[category][key];

      const filePath = join(componentsDir, category, schema.__filename__);

      if (!schema.connection) {
        throw new LoadingError(
          `Component ${key} is missing a "connection" property. (Check file ${filePath})`
        );
      }

      if (!schema.collectionName) {
        throw new LoadingError(
          `Component ${key} is missing a "collectionName" property. (Check file ${filePath})`
        );
      }

      acc[`${category}.${key}`] = Object.assign(schema, {
        __schema__: _.cloneDeep(schema),
        uid: key,
        category,
        modelType: 'component',
        modelName: key,
        globalId:
          schema.globalId || _.upperFirst(_.camelCase(`component_${key}`)),
      });
    });
    return acc;
  }, {});
};
