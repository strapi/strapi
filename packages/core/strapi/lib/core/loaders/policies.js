'use strict';

const { join, extname, basename } = require('path');
const fse = require('fs-extra');

const { importDefault } = require('../../utils');

// TODO:: allow folders with index.js inside for bigger policies
module.exports = async function loadPolicies(strapi) {
  const dir = strapi.dirs.dist.policies;

  if (!(await fse.pathExists(dir))) {
    return;
  }

  const policies = {};
  const paths = await fse.readdir(dir, { withFileTypes: true });

  for (const fd of paths) {
    const { name } = fd;
    const fullPath = join(dir, name);
    console.log(name);
    if (fd.isFile() && !name.endsWith('.test.js') && extname(name) === '.js') {
      const key = basename(name, '.js');
      policies[key] = importDefault(fullPath);
    }
  }

  strapi.container.get('policies').add(`global::`, policies);
};
