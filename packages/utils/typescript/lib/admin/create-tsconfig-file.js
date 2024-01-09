'use strict';

const path = require('path');
const fs = require('fs-extra');
const adminTsConfig = require('../../tsconfigs/admin.json');

module.exports = async (dest) => {
  const tsConfig = {
    ...adminTsConfig,
    include: ['../../../src/admin/*', '../../../src/**/**/admin/src/*'],
    exclude: ['node_modules', '**/*.test.js', '*.js'],
  };

  const filePath = path.join(dest, 'admin', 'src', 'tsconfig.json');

  try {
    await fs.ensureFile(filePath);

    await fs.writeJSON(filePath, tsConfig, { spaces: 2 });
  } catch (err) {
    console.log(err);
  }
};
