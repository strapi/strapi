'use strict';

const { join } = require('path');
const { exists } = require('fs-extra');
const loadFiles = require('../load/load-files');

module.exports = async ({ dir }) => {
  const componentsDir = join(dir, 'components');

  if (!(await exists(componentsDir))) {
    return {};
  }

  const map = await loadFiles(componentsDir, '*/*.*(js|json)');

  return Object.keys(map).reduce((acc, category) => {
    Object.keys(map[category]).forEach(key => {
      acc[`${category}.${key}`] = Object.assign(map[category][key], {
        category,
        modelName: key,
      });
    });
    return acc;
  }, {});
};
