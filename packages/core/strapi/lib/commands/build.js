'use strict';
const path = require('path');

const tsUtils = require('../utils/typescript');
const { buildAdmin, buildTypeScript } = require('./builders');

/**
 * `$ strapi build`
 */
module.exports = async ({ optimization, forceBuild = true }) => {
  let dir = process.cwd();

  const isTSProject = await tsUtils.isTypeScriptProject(dir);

  // Typescript
  if (isTSProject) {
    await buildTypeScript({ srcDir: dir, watch: false });

    // Update the dir path for the next steps
    dir = path.join(dir, 'dist');
  }

  await buildAdmin({ dir, optimization, forceBuild, isTSProject });
};
