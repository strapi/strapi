'use strict';

const { join, extname, basename } = require('path');
const fse = require('fs-extra');
const jiti = require('jiti')(__dirname);

// TODO:: allow folders with index.js inside for bigger policies
module.exports = async function loadPolicies(strapi) {
  const dir = strapi.dirs.policies;

  if (!(await fse.pathExists(dir))) {
    return;
  }

  const policies = {};
  const paths = await fse.readdir(dir, { withFileTypes: true });

  for (const fd of paths) {
    const { name } = fd;
    const fullPath = join(dir, name);

    if (fd.isFile()) {
      const ext = extname(name);
      switch (ext) {
        case '.js':
        case '.cjs':
          policies[basename(name, ext)] = require(fullPath);
          break;
        case '.mjs':
        case '.ts':
          try {
            const esModule = jiti(fullPath);

            if (!esModule || !esModule.default) {
              throw new Error(`The file has no default export`);
            }

            policies[basename(name, ext)] = esModule.default;
          } catch (error) {
            throw new Error(`Could not load es/ts module policy ${fullPath}: ${error.message}`);
          }
          break;
      }
    }
  }

  strapi.container.get('policies').add(`global::`, policies);
};
