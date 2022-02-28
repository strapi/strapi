'use strict';

const { join, extname, basename } = require('path');
const fse = require('fs-extra');

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

    if (fd.isFile() && extname(name) === '.js') {
      const key = basename(name, '.js');
      policies[key] = require(fullPath);
    }
  }

  strapi.container.get('policies').add(`global::`, policies);
};
