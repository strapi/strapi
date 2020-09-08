'use strict';

const _ = require('lodash');
const { join } = require('path');
const { exists } = require('fs-extra');
const loadFiles = require('../load/load-files');
const getSupportedFileExtensions = require('../utils/getSupportedFileExtensions');

module.exports = async strapi => {
  const componentsDir = join(strapi.dir, 'components');

  if (!(await exists(componentsDir))) {
    return {};
  }

  const fileExtensions = getSupportedFileExtensions(strapi.config);
  const map = await loadFiles(componentsDir, `*/*.*(${fileExtensions})`);

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
};
