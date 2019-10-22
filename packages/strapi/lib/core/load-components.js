'use strict';

const { join } = require('path');
const { exists } = require('fs-extra');
const loadFiles = require('../load/load-files');

module.exports = async ({ dir }) => {
  const componentsDir = join(dir, 'components');

  if (!(await exists(componentsDir))) {
    return {};
  }

  return await loadFiles(componentsDir, '*.*(js|json)');
};
