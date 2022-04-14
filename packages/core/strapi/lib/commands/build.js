'use strict';
const path = require('path');

const tsUtils = require('@strapi/typescript-utils');
const { buildAdmin, buildTypeScript } = require('./builders');

/**
 * `$ strapi build`
 */
module.exports = async ({ optimization, forceBuild = true }) => {
  let buildDestDir = process.cwd();
  const srcDir = process.cwd();

  const useTypeScriptServer = await tsUtils.isUsingTypeScript(srcDir);

  // Typescript
  if (useTypeScriptServer) {
    await buildTypeScript({ srcDir, watch: false });

    // Update the dir path for the next steps
    buildDestDir = path.join(srcDir, 'dist');
  }

  await buildAdmin({
    buildDestDir,
    forceBuild,
    isTSProject: useTypeScriptServer,
    optimization,
    srcDir,
  });
};
