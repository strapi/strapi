'use strict';
const path = require('path');

const tsUtils = require('../utils/typescript');
const { buildAdmin, buildTypeScript } = require('./builders');

/**
 * `$ strapi build`
 */
module.exports = async ({ optimization, forceBuild = true }) => {
  let buildDestDir = process.cwd();
  const srcDir = process.cwd();

  const isTSProject = await tsUtils.isTypeScriptProject(srcDir);

  // Typescript
  if (isTSProject) {
    await buildTypeScript({ srcDir, watch: false });

    // Update the dir path for the next steps
    buildDestDir = path.join(srcDir, 'dist');
  }

  await buildAdmin({
    buildDestDir,
    forceBuild,
    isTSProject,
    optimization,
    srcDir,
  });
};
