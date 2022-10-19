'use strict';

const { join } = require('path');
const { pathExists } = require('fs-extra');
const loadFiles = require('../../load/load-files');
const { createComponent } = require('../domain/component');

module.exports = async (strapi) => {
  if (!(await pathExists(strapi.dirs.dist.components))) {
    return {};
  }

  const map = await loadFiles(strapi.dirs.dist.components, '*/*.*(js|json)');

  return Object.keys(map).reduce((acc, category) => {
    Object.keys(map[category]).forEach((key) => {
      const schema = map[category][key];
      const uid = `${category}.${key}`;

      if (!schema.collectionName) {
        // NOTE: We're using the filepath from the app directory instead of the dist for information purpose
        const filePath = join(strapi.dirs.app.components, category, schema.__filename__);

        return strapi.stopWithError(
          `Component ${key} is missing a "collectionName" property.\nVerify file ${filePath}.`
        );
      }

      acc[uid] = createComponent(uid, category, key, schema);
    });

    return acc;
  }, {});
};
