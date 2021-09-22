'use strict';

const { join } = require('path');
const _ = require('lodash');
const { pathExists } = require('fs-extra');
const loadFiles = require('../../load/load-files');

module.exports = async strapi => {
  if (!(await pathExists(strapi.dirs.components))) {
    return {};
  }

  const map = await loadFiles(strapi.dirs.components, '*/*.*(js|json)');

  return Object.keys(map).reduce((acc, category) => {
    Object.keys(map[category]).forEach(key => {
      const schema = map[category][key];

      const filePath = join(strapi.dirs.components, category, schema.__filename__);

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
};
