'use strict';

const tsUtils = require('@strapi/typescript-utils');
const { buildAdmin, buildTypeScript } = require('./builders');

/**
 * `$ strapi build`
 */
module.exports = async ({ optimization, forceBuild = true }) => {
  let buildDestDir = process.cwd();
  const srcDir = process.cwd();

  const useTypeScriptServer = await tsUtils.isUsingTypeScript(srcDir);
  const compiledDirectoryPath = useTypeScriptServer ? tsUtils.resolveConfigOptions(`${srcDir}/tsconfig.json`).options?.outDir : null

  // Typescript
  if (useTypeScriptServer) {
    await buildTypeScript({ srcDir, watch: false });

    // Update the dir path for the next steps
    buildDestDir = compiledDirectoryPath;
  }

  await buildAdmin({
    buildDestDir,
    forceBuild,
    optimization,
    srcDir,
  });
};
