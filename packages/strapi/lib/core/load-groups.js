'use strict';

const { join } = require('path');
const { exists } = require('fs-extra');
const loadFiles = require('../load/load-files');

module.exports = async ({ dir }) => {
  const groupsDir = join(dir, 'groups');

  if (!(await exists(groupsDir))) {
    return {};
  }

  return await loadFiles(groupsDir, '*.*(js|json)');
};
